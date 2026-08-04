"""
Application du quota gratuit journalier (Module 3). Les comptes premium
(`user.is_premium=True`, basculé par le Module 4 lors d'un paiement réussi)
ne sont jamais limités par cette logique.
"""
from datetime import date

from django.conf import settings
from django.db import transaction

from common.exceptions import QuotaExceededException

from .models import UserQuota


def get_or_create_quota(user) -> UserQuota:
    quota, _created = UserQuota.objects.get_or_create(
        user=user, defaults={"daily_limit": settings.FREE_DAILY_GENERATION_LIMIT}
    )
    _reset_if_new_day(quota)
    return quota


def _reset_if_new_day(quota: UserQuota) -> None:
    today = date.today()
    if quota.last_reset_date < today:
        quota.used_today = 0
        quota.last_reset_date = today
        quota.save(update_fields=["used_today", "last_reset_date"])


@transaction.atomic
def consume_quota(user, cost: int = 1) -> UserQuota:
    """Vérifie puis décrémente le quota gratuit ; lève QuotaExceededException si dépassé."""
    quota, _created = UserQuota.objects.get_or_create(
        user=user, defaults={"daily_limit": settings.FREE_DAILY_GENERATION_LIMIT}
    )
    quota = UserQuota.objects.select_for_update().get(pk=quota.pk)
    _reset_if_new_day(quota)

    if user.is_premium:
        return quota

    if quota.used_today + cost > quota.daily_limit:
        raise QuotaExceededException()

    quota.used_today += cost
    quota.save(update_fields=["used_today"])
    return quota


def reset_all_daily_quotas() -> int:
    """Utilisé par la tâche Celery Beat quotidienne (voir tasks.py)."""
    return UserQuota.objects.update(used_today=0, last_reset_date=date.today())
