import pytest
from unittest.mock import patch

from apps.payments.gateways.base import InitiationResult, VerificationResult
from apps.payments.models import ReferralReward, Subscription, Transaction, TransactionStatus
from apps.accounts.models import User


@pytest.mark.django_db
class TestReferralRewards:
    def test_referrer_gets_bonus_on_referred_subscription(self, auth_client, registered_user, plan):
        referrer = User.objects.create_user(
            email="parrain@example.cm",
            password="motdepasse123",
            full_name="Parrain Test",
            is_active=True,
        )

        registered_user.referred_by = referrer
        registered_user.save(update_fields=["referred_by"])

        txn = Transaction.objects.create(
            user=registered_user,
            plan=plan,
            provider_transaction_id="txn-referral-123",
            amount_fcfa=plan.price_fcfa,
        )

        with patch("apps.payments.views.get_gateway") as mock_get_gateway:
            mock_gateway = mock_get_gateway.return_value
            mock_gateway.verify_transaction.return_value = VerificationResult(
                is_successful=True,
                provider_status="ACCEPTED",
                raw_response={},
            )
            response = auth_client.post("/api/payments/webhook/cinetpay/", {"cpm_trans_id": "txn-referral-123"})

        assert response.status_code == 200
        referrer.refresh_from_db()
        assert ReferralReward.objects.filter(referrer=referrer, referred_user=registered_user).exists()
        assert referrer.quota.daily_limit >= 5

    def test_no_bonus_without_referrer(self, auth_client, registered_user, plan):
        txn = Transaction.objects.create(
            user=registered_user,
            plan=plan,
            provider_transaction_id="txn-no-referrer-123",
            amount_fcfa=plan.price_fcfa,
        )

        with patch("apps.payments.views.get_gateway") as mock_get_gateway:
            mock_gateway = mock_get_gateway.return_value
            mock_gateway.verify_transaction.return_value = VerificationResult(
                is_successful=True,
                provider_status="ACCEPTED",
                raw_response={},
            )
            response = auth_client.post("/api/payments/webhook/cinetpay/", {"cpm_trans_id": "txn-no-referrer-123"})

        assert response.status_code == 200
        assert not ReferralReward.objects.filter(referred_user=registered_user).exists()
