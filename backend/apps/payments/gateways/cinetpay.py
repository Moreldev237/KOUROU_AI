"""
Passerelle CinetPay — https://docs.cinetpay.com

⚠️ Point de sécurité CRITIQUE : CinetPay n'envoie PAS le statut du paiement
dans son appel de notification (`notify_url`), précisément pour empêcher un
attaquant de falsifier un webhook et se faire créditer un abonnement gratuit.
Le webhook signale seulement qu'une transaction a évolué (avec son
identifiant `cpm_trans_id`) : c'est à notre serveur de rappeler l'API
CinetPay (`POST /v2/payment/check`) pour obtenir le statut réel AVANT de
créditer quoi que ce soit. Voir `PaymentWebhookView` dans views.py.
"""
import logging

import requests
from django.conf import settings

from common.exceptions import PaymentGatewayError

from .base import InitiationResult, PaymentGateway, VerificationResult

logger = logging.getLogger("apps")


class CinetPayGateway(PaymentGateway):
    def __init__(self):
        self.api_key = settings.CINETPAY_API_KEY
        self.site_id = settings.CINETPAY_SITE_ID
        self.base_url = settings.CINETPAY_BASE_URL.rstrip("/")
        self.currency = settings.CINETPAY_CURRENCY  # "XAF" pour le Cameroun (zone CEMAC)

    def initiate_payment(self, *, transaction) -> InitiationResult:
        user = transaction.user
        name_parts = (user.full_name or "Candidat KOUROU").split(" ", 1)
        payload = {
            "apikey": self.api_key,
            "site_id": self.site_id,
            "transaction_id": str(transaction.id),
            "amount": transaction.amount_fcfa,
            "currency": self.currency,
            "description": f"KOUROU AI — {transaction.plan.name}",
            "customer_name": name_parts[0],
            "customer_surname": name_parts[1] if len(name_parts) > 1 else "KOUROU",
            "customer_phone_number": user.phone_number or "",
            "customer_email": user.email or "contact@kourou-ai.cm",
            "notify_url": settings.PAYMENT_NOTIFY_URL,
            "return_url": settings.PAYMENT_RETURN_URL,
            "channels": "MOBILE_MONEY",
        }
        try:
            response = requests.post(f"{self.base_url}/payment", json=payload, timeout=15)
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.exception("Erreur réseau lors de l'initiation CinetPay")
            raise PaymentGatewayError() from exc

        if data.get("code") != "201":
            logger.error("Échec d'initiation CinetPay : %s", data)
            raise PaymentGatewayError(data.get("message") or "Échec de l'initiation du paiement.")

        return InitiationResult(
            payment_url=data["data"]["payment_url"],
            provider_transaction_id=str(transaction.id),
            raw_response=data,
        )

    def verify_transaction(self, *, provider_transaction_id: str) -> VerificationResult:
        payload = {"apikey": self.api_key, "site_id": self.site_id, "transaction_id": provider_transaction_id}
        try:
            response = requests.post(f"{self.base_url}/payment/check", json=payload, timeout=15)
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.exception("Erreur réseau lors de la vérification CinetPay")
            raise PaymentGatewayError() from exc

        provider_status = (data.get("data") or {}).get("status", "")
        is_successful = data.get("code") == "00" and provider_status == "ACCEPTED"
        return VerificationResult(
            is_successful=is_successful,
            provider_status=provider_status or data.get("message", ""),
            raw_response=data,
        )
