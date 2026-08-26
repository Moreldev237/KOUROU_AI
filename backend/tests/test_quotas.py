import pytest
from django.conf import settings

from apps.quotas import services as quota_services
from common.exceptions import QuotaExceededException


@pytest.mark.django_db
class TestQuotaService:
    def test_new_user_gets_default_daily_limit(self, registered_user):
        quota = quota_services.get_or_create_quota(registered_user)
        assert quota.daily_limit == settings.FREE_DAILY_GENERATION_LIMIT
        assert quota.used_today == 0

    def test_consume_quota_increments_usage(self, registered_user):
        quota_services.consume_quota(registered_user)
        quota = quota_services.get_or_create_quota(registered_user)
        assert quota.used_today == 1

    def test_consume_quota_raises_when_exhausted(self, registered_user):
        quota = quota_services.get_or_create_quota(registered_user)
        quota.used_today = quota.daily_limit
        quota.save(update_fields=["used_today"])

        with pytest.raises(QuotaExceededException):
            quota_services.consume_quota(registered_user)

    def test_premium_users_bypass_quota(self, registered_user):
        registered_user.is_premium = True
        registered_user.save(update_fields=["is_premium"])

        quota = quota_services.get_or_create_quota(registered_user)
        quota.used_today = quota.daily_limit
        quota.save(update_fields=["used_today"])

        # Ne doit PAS lever d'exception pour un compte premium.
        quota_services.consume_quota(registered_user)

    def test_reset_all_daily_quotas(self, registered_user):
        quota = quota_services.get_or_create_quota(registered_user)
        quota.used_today = 5
        quota.save(update_fields=["used_today"])

        updated_count = quota_services.reset_all_daily_quotas()
        quota.refresh_from_db()
        assert updated_count >= 1
        assert quota.used_today == 0


@pytest.mark.django_db
class TestQuotaEndpoint:
    def test_my_quota_endpoint(self, auth_client):
        response = auth_client.get("/api/quotas/me/")
        assert response.status_code == 200
        assert response.data["remaining"] == settings.FREE_DAILY_GENERATION_LIMIT
