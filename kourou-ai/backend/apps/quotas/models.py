from django.conf import settings
from django.db import models


class UserQuota(models.Model):
    """Quota gratuit journalier d'un utilisateur (Module 3)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quota")
    daily_limit = models.PositiveIntegerField(default=0)
    used_today = models.PositiveIntegerField(default=0)
    last_reset_date = models.DateField(auto_now_add=True)

    class Meta:
        db_table = "quotas_user_quota"
        verbose_name = "Quota utilisateur"
        verbose_name_plural = "Quotas utilisateurs"

    def __str__(self):
        return f"{self.user} : {self.used_today}/{self.daily_limit}"


class TokenUsageLog(models.Model):
    """
    Journal détaillé de la consommation de tokens Gemini, ventilé par
    utilisateur et par endpoint — alimente les statistiques du Module 5
    (Back-office : tokens consommés vs revenus).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="token_usage_logs"
    )
    endpoint = models.CharField(max_length=50)
    tokens_used = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "quotas_token_usage_log"
        indexes = [models.Index(fields=["created_at"]), models.Index(fields=["user", "created_at"])]
        verbose_name = "Journal de consommation de tokens"
        verbose_name_plural = "Journaux de consommation de tokens"

    def __str__(self):
        return f"{self.user} — {self.endpoint} — {self.tokens_used} tokens"
