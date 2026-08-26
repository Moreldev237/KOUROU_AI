from django.apps import AppConfig


class QuotasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.quotas"
    label = "quotas"
    verbose_name = "Quotas & Tokens"
