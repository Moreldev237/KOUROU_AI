import hashlib
import hmac
import json
import logging
import uuid

from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.exceptions import PaymentGatewayError

from . import serializers as s
from .gateways import get_gateway
from .models import Subscription, SubscriptionPlan, Transaction, TransactionStatus

logger = logging.getLogger("apps")


@extend_schema(tags=["Paiements"])
class SubscriptionPlanListView(generics.ListAPIView):
    """Catalogue des plans disponibles (abonnement mensuel ou pack concours ponctuel)."""

    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = s.SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]


@extend_schema(
    tags=["Paiements"],
    request=s.InitiatePaymentRequestSerializer,
    responses={201: s.TransactionSerializer},
)
class InitiatePaymentView(APIView):
    """Crée une transaction et renvoie l'URL Mobile Money à ouvrir côté mobile (WebView)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "payments"

    def post(self, request):
        serializer = s.InitiatePaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.validated_data["plan"]

        transaction = Transaction.objects.create(
            user=request.user,
            plan=plan,
            provider_transaction_id=f"pending-{uuid.uuid4()}",
            amount_fcfa=plan.price_fcfa,
        )

        try:
            result = get_gateway().initiate_payment(transaction=transaction)
        except PaymentGatewayError:
            transaction.status = TransactionStatus.FAILED
            transaction.save(update_fields=["status"])
            raise

        transaction.provider_transaction_id = result.provider_transaction_id
        transaction.gateway = settings.PAYMENT_GATEWAY
        transaction.payment_url = result.payment_url
        transaction.raw_init_response = result.raw_response
        transaction.save(update_fields=["provider_transaction_id", "gateway", "payment_url", "raw_init_response"])

        return Response(s.TransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Paiements"],
    request=s.KPayWebhookSerializer,
    responses={200: None},
    description="Endpoint public signé (sans authentification) appelé par KPay — jamais par le mobile.",
)
class PaymentWebhookView(APIView):
    """
    Reçoit la notification KPay, vérifie sa signature HMAC sur le corps brut,
    puis confirme le statut via l'API KPay avant tout crédit.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        signature = request.headers.get("X-KPAY-Signature", "")
        expected_signature = hmac.new(
            settings.KPAY_WEBHOOK_SECRET.encode(), request.body, hashlib.sha256
        ).hexdigest()
        if not settings.KPAY_WEBHOOK_SECRET or not signature or not hmac.compare_digest(signature, expected_signature):
            return Response({"detail": "Signature KPay invalide."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            payload = json.loads(request.body)
        except (TypeError, ValueError):
            return Response({"detail": "Corps JSON KPay invalide."}, status=status.HTTP_400_BAD_REQUEST)

        provider_transaction_id = payload.get("paymentId")
        external_id = payload.get("externalId")
        if not provider_transaction_id and not external_id:
            return Response({"detail": "paymentId ou externalId manquant."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            txn = (
                Transaction.objects.get(provider_transaction_id=provider_transaction_id)
                if provider_transaction_id
                else Transaction.objects.get(id=external_id)
            )
        except Transaction.DoesNotExist:
            logger.warning("Webhook KPay reçu pour une transaction inconnue : %s", provider_transaction_id or external_id)
            return Response(status=status.HTTP_200_OK)

        result = get_gateway().verify_transaction(provider_transaction_id=txn.provider_transaction_id)
        txn.raw_verification_response = result.raw_response
        if result.is_successful:
            txn.status = TransactionStatus.COMPLETED
        elif payload.get("status") in {"FAILED", "CANCELLED"}:
            txn.status = TransactionStatus.FAILED
        txn.save(update_fields=["status", "raw_verification_response"])  # déclenche signals.py si COMPLETED

        return Response(status=status.HTTP_200_OK)


@extend_schema(tags=["Paiements"])
class TransactionHistoryView(generics.ListAPIView):
    """Historique des transactions du candidat (Module 1 : tableau de bord)."""

    serializer_class = s.TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Transaction.objects.none()
        return Transaction.objects.filter(user=self.request.user)


@extend_schema(tags=["Paiements"], responses={200: s.SubscriptionSerializer})
class MySubscriptionView(APIView):
    """Abonnement actif du candidat connecté, s'il en a un."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscription = (
            Subscription.objects.filter(user=request.user, status="active").order_by("-end_date").first()
        )
        if subscription is None or not subscription.is_active_now:
            return Response(None)
        return Response(s.SubscriptionSerializer(subscription).data)


@extend_schema(tags=["Paiements"], responses={200: s.UnlockedPackSerializer(many=True)})
class MyUnlockedPacksView(generics.ListAPIView):
    """Retourne uniquement les supports Drive liés aux abonnements actifs du candidat."""

    serializer_class = s.UnlockedPackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        subscriptions = (
            Subscription.objects.filter(user=request.user, status="active", end_date__gt=timezone.now())
            .select_related("plan")
            .order_by("-end_date")
        )
        plans = []
        seen = set()
        for subscription in subscriptions:
            if subscription.plan_id not in seen and subscription.plan.google_drive_url:
                subscription.plan.access_until = subscription.end_date
                plans.append(subscription.plan)
                seen.add(subscription.plan_id)
        serializer = self.get_serializer(plans, many=True)
        return Response(serializer.data)
