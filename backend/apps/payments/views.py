import logging

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
            provider_transaction_id="",  # renseigné juste après (voir plus bas)
            amount_fcfa=plan.price_fcfa,
        )
        # CinetPay a besoin de connaître le transaction_id AVANT l'appel : on
        # utilise l'UUID généré côté serveur comme identifiant transmis.
        transaction.provider_transaction_id = str(transaction.id)
        transaction.save(update_fields=["provider_transaction_id"])

        try:
            result = get_gateway().initiate_payment(transaction=transaction)
        except PaymentGatewayError:
            transaction.status = TransactionStatus.FAILED
            transaction.save(update_fields=["status"])
            raise

        transaction.payment_url = result.payment_url
        transaction.raw_init_response = result.raw_response
        transaction.save(update_fields=["payment_url", "raw_init_response"])

        return Response(s.TransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Paiements"],
    request=s.CinetPayWebhookSerializer,
    responses={200: None},
    description="Endpoint public (sans authentification) appelé par CinetPay — jamais par le mobile.",
)
class PaymentWebhookView(APIView):
    """
    Reçoit la notification CinetPay (`notify_url`). Conformément à la doc
    CinetPay, ce endpoint ne fait JAMAIS confiance au contenu du webhook :
    il rappelle systématiquement l'API en serveur à serveur pour connaître le
    vrai statut avant de créditer quoi que ce soit (voir gateways/cinetpay.py).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        provider_transaction_id = request.POST.get("cpm_trans_id") or request.data.get("cpm_trans_id")
        if not provider_transaction_id:
            return Response({"detail": "cpm_trans_id manquant."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            txn = Transaction.objects.get(provider_transaction_id=provider_transaction_id)
        except Transaction.DoesNotExist:
            logger.warning("Webhook CinetPay reçu pour une transaction inconnue : %s", provider_transaction_id)
            # 200 pour indiquer à CinetPay que la notification est bien reçue
            # (et donc qu'il n'a pas besoin de réessayer indéfiniment).
            return Response(status=status.HTTP_200_OK)

        result = get_gateway().verify_transaction(provider_transaction_id=provider_transaction_id)
        txn.raw_verification_response = result.raw_response
        txn.status = TransactionStatus.COMPLETED if result.is_successful else TransactionStatus.FAILED
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
