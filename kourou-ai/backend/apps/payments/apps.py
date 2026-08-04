from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"
    label = "payments"
    verbose_name = "Paiements & Abonnements"

    def ready(self):
        from . import signals  # noqa: F401 — connecte les signaux au chargement de l'app
