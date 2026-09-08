"""Passerelle KPay pour les paiements hébergés Mobile Money."""
import logging

import requests
from django.conf import settings

from common.exceptions import PaymentGatewayError

from .base import InitiationResult, PaymentGateway, VerificationResult

logger = logging.getLogger("apps")


class KPayGateway(PaymentGateway):
    def __init__(self):
        self.api_key = settings.KPAY_API_KEY
        self.secret_key = settings.KPAY_SECRET_KEY
        self.base_url = settings.KPAY_BASE_URL.rstrip("/")

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key, "X-Secret-Key": self.secret_key}

    def initiate_payment(self, *, transaction) -> InitiationResult:
        payload = {
            "amount": transaction.amount_fcfa,
            "currency": settings.KPAY_CURRENCY,
            "externalId": str(transaction.id),
            "returnUrl": settings.PAYMENT_RETURN_URL,
            "cancelUrl": settings.PAYMENT_CANCEL_URL,
            "description": f"KOUROU AI — {transaction.plan.name}",
            "metadata": {"transactionId": str(transaction.id), "planId": transaction.plan_id},
        }
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/payments/init",
                headers=self._headers(),
                json=payload,
                timeout=15,
            )
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.exception("Erreur réseau lors de l'initiation KPay")
            raise PaymentGatewayError() from exc

        if response.status_code != 201 or not data.get("id") or not data.get("gatewayUrl"):
            logger.error("Échec d'initiation KPay : %s", data)
            raise PaymentGatewayError(data.get("message") or "Échec de l'initiation du paiement.")

        return InitiationResult(
            payment_url=data["gatewayUrl"],
            provider_transaction_id=str(data["id"]),
            raw_response=data,
        )

    def verify_transaction(self, *, provider_transaction_id: str) -> VerificationResult:
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/payments/{provider_transaction_id}",
                headers=self._headers(),
                timeout=15,
            )
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            logger.exception("Erreur réseau lors de la vérification KPay")
            raise PaymentGatewayError() from exc

        provider_status = str(data.get("status") or "")
        return VerificationResult(
            is_successful=response.status_code == 200 and provider_status == "COMPLETED",
            provider_status=provider_status or str(data.get("message") or ""),
            raw_response=data,
        )