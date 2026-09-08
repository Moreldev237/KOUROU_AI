"""
Application du quota gratuit journalier (Module 3). Les comptes premium
(`user.is_premium=True`, basculé par le Module 4 lors d'un paiement réussi)
ne sont jamais limités par cette logique.
"""
from datetime import date

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from common.exceptions import QuotaExceededException
from apps.payments.models import Subscription, SubscriptionStatus

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
def consume_quota(user, cost: int = 1, exam=None) -> UserQuota:
    """Applique le quota gratuit, sauf si l'utilisateur a un abonnement valable pour le concours."""
    quota, _created = UserQuota.objects.get_or_create(
        user=user, defaults={"daily_limit": settings.FREE_DAILY_GENERATION_LIMIT}
    )
    quota = UserQuota.objects.select_for_update().get(pk=quota.pk)
    _reset_if_new_day(quota)

    has_global_access = Subscription.objects.filter(
        user=user,
        status=SubscriptionStatus.ACTIVE,
        end_date__gt=timezone.now(),
        plan__is_unlimited_generation=True,
        plan__exam__isnull=True,
    ).exists()
    has_exam_access = exam is not None and Subscription.objects.filter(
        user=user,
        status=SubscriptionStatus.ACTIVE,
        end_date__gt=timezone.now(),
        plan__is_unlimited_generation=True,
        plan__exam=exam,
    ).exists()

    if user.is_premium and exam is None:
        return quota
    if has_global_access or has_exam_access:
        return quota

    if quota.used_today + cost > quota.daily_limit:
        raise QuotaExceededException()

    quota.used_today += cost
    quota.save(update_fields=["used_today"])
    return quota


@transaction.atomic
def refund_quota(user, cost: int = 1, exam=None) -> None:
    """Restitue un coût réservé quand une génération externe n'aboutit pas."""
    has_global_access = Subscription.objects.filter(
        user=user,
        status=SubscriptionStatus.ACTIVE,
        end_date__gt=timezone.now(),
        plan__is_unlimited_generation=True,
        plan__exam__isnull=True,
    ).exists()
    has_exam_access = exam is not None and Subscription.objects.filter(
        user=user,
        status=SubscriptionStatus.ACTIVE,
        end_date__gt=timezone.now(),
        plan__is_unlimited_generation=True,
        plan__exam=exam,
    ).exists()
    if (user.is_premium and exam is None) or has_global_access or has_exam_access:
        return
    quota = UserQuota.objects.select_for_update().filter(user=user).first()
    if quota is None:
        return
    quota.used_today = max(0, quota.used_today - cost)
    quota.save(update_fields=["used_today"])


def reset_all_daily_quotas() -> int:
    """Utilisé par la tâche Celery Beat quotidienne (voir tasks.py)."""
    return UserQuota.objects.update(used_today=0, last_reset_date=date.today())
