import uuid

from django.conf import settings
from django.db import models


class BillingCycle(models.TextChoices):
    ONE_TIME = "one_time", "Accès ponctuel (Pack Concours)"
    MONTHLY = "monthly", "Abonnement mensuel récurrent"


class SubscriptionPlan(models.Model):
    """Un plan tarifaire proposé au candidat (Module 4)."""

    code = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    exam = models.ForeignKey(
        "exams.Exam",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="plans",
        help_text="Laisser vide pour un plan valable sur tous les concours.",
    )
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    price_fcfa = models.PositiveIntegerField(help_text="Prix en FCFA (XAF).")
    duration_days = models.PositiveIntegerField(default=30)
    # Tous les plans actifs débloquent aujourd'hui un accès illimité (voir
    # apps/payments/signals.py) ; ce champ est conservé pour permettre plus
    # tard des offres à quota élevé mais non illimité, sans changer le modèle.
    is_unlimited_generation = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "payments_subscription_plan"
        ordering = ["order", "price_fcfa"]
        verbose_name = "Plan d'abonnement"
        verbose_name_plural = "Plans d'abonnement"

    def __str__(self):
        return f"{self.name} — {self.price_fcfa} FCFA"


class TransactionStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    COMPLETED = "completed", "Réussie"
    FAILED = "failed", "Échouée"


class Transaction(models.Model):
    """Une tentative de paiement Mobile Money (Module 4)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="transactions")
    gateway = models.CharField(max_length=30, default="cinetpay")
    provider_transaction_id = models.CharField(max_length=100, unique=True)
    amount_fcfa = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING)
    payment_url = models.URLField(blank=True)
    raw_init_response = models.JSONField(null=True, blank=True)
    raw_verification_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_transaction"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"

    def __str__(self):
        return f"{self.provider_transaction_id} — {self.amount_fcfa} FCFA ({self.status})"


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "active", "Actif"
    EXPIRED = "expired", "Expiré"
    CANCELLED = "cancelled", "Annulé"


class Subscription(models.Model):
    """L'abonnement effectivement détenu par un candidat suite à un paiement réussi."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")
    # Lien vers la transaction à l'origine de cet abonnement : sert aussi de
    # verrou d'idempotence (le webhook de paiement peut être rappelé plusieurs
    # fois par CinetPay ; voir apps/payments/signals.py).
    source_transaction = models.OneToOneField(
        Transaction, null=True, blank=True, on_delete=models.SET_NULL, related_name="subscription"
    )
    status = models.CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.ACTIVE)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()

    class Meta:
        db_table = "payments_subscription"
        ordering = ["-start_date"]
        verbose_name = "Abonnement"
        verbose_name_plural = "Abonnements"

    def __str__(self):
        return f"{self.user} — {self.plan} ({self.status})"

    @property
    def is_active_now(self) -> bool:
        from django.utils import timezone

        return self.status == SubscriptionStatus.ACTIVE and self.end_date > timezone.now()
