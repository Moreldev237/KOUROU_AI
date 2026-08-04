import logging
from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Subscription, SubscriptionStatus, Transaction, TransactionStatus

logger = logging.getLogger("apps")


@receiver(post_save, sender=Transaction)
def grant_subscription_on_payment_success(sender, instance: Transaction, created, **kwargs):
    """
    Module 4 : "Attribution instantanée des privilèges dès confirmation du
    webhook de paiement." Idempotent : si cette transaction a déjà généré un
    abonnement (le webhook CinetPay peut être rappelé plusieurs fois), on ne
    fait rien de plus.
    """
    if instance.status != TransactionStatus.COMPLETED:
        return
    if hasattr(instance, "subscription"):
        return

    plan = instance.plan
    end_date = timezone.now() + timedelta(days=plan.duration_days)
    Subscription.objects.create(
        user=instance.user,
        plan=plan,
        source_transaction=instance,
        status=SubscriptionStatus.ACTIVE,
        end_date=end_date,
    )

    instance.user.is_premium = True
    instance.user.save(update_fields=["is_premium"])

    logger.info(
        "Abonnement activé pour %s (plan=%s) suite au paiement %s",
        instance.user,
        plan,
        instance.provider_transaction_id,
    )
