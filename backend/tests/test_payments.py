from unittest.mock import patch

import pytest

from apps.payments.gateways.base import InitiationResult, VerificationResult
from apps.payments.models import Subscription, Transaction, TransactionStatus


@pytest.mark.django_db
class TestSubscriptionPlans:
    def test_list_plans(self, auth_client, plan):
        response = auth_client.get("/api/payments/plans/")
        assert response.status_code == 200
        codes = [p["code"] for p in response.data["results"]]
        assert plan.code in codes


@pytest.mark.django_db
class TestInitiatePayment:
    @patch("apps.payments.views.get_gateway")
    def test_initiate_creates_pending_transaction(self, mock_get_gateway, auth_client, registered_user, plan):
        mock_gateway = mock_get_gateway.return_value
        mock_gateway.initiate_payment.return_value = InitiationResult(
            payment_url="https://checkout.cinetpay.com/fake", provider_transaction_id="fake-id", raw_response={}
        )

        response = auth_client.post("/api/payments/initiate/", {"plan": plan.id}, format="json")

        assert response.status_code == 201
        assert response.data["payment_url"] == "https://checkout.cinetpay.com/fake"
        txn = Transaction.objects.get(user=registered_user, plan=plan)
        assert txn.status == TransactionStatus.PENDING


@pytest.mark.django_db
class TestPaymentWebhookAndSubscriptionActivation:
    @patch("apps.payments.views.get_gateway")
    def test_successful_webhook_activates_subscription_and_premium(
        self, mock_get_gateway, registered_user, plan, api_client
    ):
        txn = Transaction.objects.create(
            user=registered_user, plan=plan, provider_transaction_id="txn-123", amount_fcfa=plan.price_fcfa
        )
        mock_gateway = mock_get_gateway.return_value
        mock_gateway.verify_transaction.return_value = VerificationResult(
            is_successful=True, provider_status="ACCEPTED", raw_response={}
        )

        response = api_client.post("/api/payments/webhook/cinetpay/", {"cpm_trans_id": "txn-123"})
        assert response.status_code == 200

        txn.refresh_from_db()
        registered_user.refresh_from_db()
        assert txn.status == TransactionStatus.COMPLETED
        assert registered_user.is_premium is True
        assert Subscription.objects.filter(user=registered_user, plan=plan, source_transaction=txn).exists()

    @patch("apps.payments.views.get_gateway")
    def test_webhook_is_idempotent(self, mock_get_gateway, registered_user, plan, api_client):
        txn = Transaction.objects.create(
            user=registered_user, plan=plan, provider_transaction_id="txn-456", amount_fcfa=plan.price_fcfa
        )
        mock_gateway = mock_get_gateway.return_value
        mock_gateway.verify_transaction.return_value = VerificationResult(
            is_successful=True, provider_status="ACCEPTED", raw_response={}
        )

        api_client.post("/api/payments/webhook/cinetpay/", {"cpm_trans_id": "txn-456"})
        api_client.post("/api/payments/webhook/cinetpay/", {"cpm_trans_id": "txn-456"})  # rejoué par CinetPay

        assert Subscription.objects.filter(user=registered_user, plan=plan).count() == 1

    @patch("apps.payments.views.get_gateway")
    def test_failed_verification_does_not_activate_subscription(
        self, mock_get_gateway, registered_user, plan, api_client
    ):
        Transaction.objects.create(
            user=registered_user, plan=plan, provider_transaction_id="txn-789", amount_fcfa=plan.price_fcfa
        )
        mock_gateway = mock_get_gateway.return_value
        mock_gateway.verify_transaction.return_value = VerificationResult(
            is_successful=False, provider_status="REFUSED", raw_response={}
        )

        api_client.post("/api/payments/webhook/cinetpay/", {"cpm_trans_id": "txn-789"})

        registered_user.refresh_from_db()
        assert registered_user.is_premium is False
        assert not Subscription.objects.filter(user=registered_user, plan=plan).exists()
