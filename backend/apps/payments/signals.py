import logging
from datetime import timedelta

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.quotas.models import UserQuota

from .models import ReferralReward, Subscription, SubscriptionStatus, Transaction, TransactionStatus

logger = logging.getLogger("apps")


@receiver(post_save, sender=Transaction)
def grant_subscription_on_payment_success(sender, instance: Transaction, created, **kwargs):
    """
    Module 4 : "Attribution instantanée des privilèges dès confirmation du
    webhook de paiement." Idempotent : si cette transaction a déjà généré un
    abonnement (le webhook KPay peut être rappelé plusieurs fois), on ne
    fait rien de plus.
    """
    if instance.status != TransactionStatus.COMPLETED:
        return
    if hasattr(instance, "subscription"):
        return

    plan = instance.plan
    end_date = timezone.now() + timedelta(days=plan.duration_days)
    subscription = Subscription.objects.create(
        user=instance.user,
        plan=plan,
        source_transaction=instance,
        status=SubscriptionStatus.ACTIVE,
        end_date=end_date,
    )

    instance.user.is_premium = True
    instance.user.save(update_fields=["is_premium"])

    referrer = getattr(instance.user, "referred_by", None)
    if referrer is not None:
        ReferralReward.objects.create(
            referrer=referrer,
            referred_user=instance.user,
            subscription=subscription,
            amount=settings.REFERRAL_SUBSCRIPTION_BONUS,
        )

        quota, _created = UserQuota.objects.get_or_create(
            user=referrer,
            defaults={"daily_limit": settings.FREE_DAILY_GENERATION_LIMIT},
        )
        quota.daily_limit += settings.REFERRAL_SUBSCRIPTION_BONUS
        quota.save(update_fields=["daily_limit"])

    logger.info(
        "Abonnement activé pour %s (plan=%s) suite au paiement %s",
        instance.user,
        plan,
        instance.provider_transaction_id,
    )
