import logging

from celery import shared_task

from .models import TokenUsageLog
from .services import reset_all_daily_quotas

logger = logging.getLogger("apps")


@shared_task
def reset_daily_quotas_task():
    """
    Tâche planifiée (Celery Beat) qui réinitialise chaque nuit les quotas
    gratuits journaliers de tous les utilisateurs. Programmer son exécution
    quotidienne à minuit (Africa/Douala) via l'admin django-celery-beat ou une
    entrée `beat_schedule` — voir DEPLOYMENT.md.
    """
    count = reset_all_daily_quotas()
    logger.info("Quotas réinitialisés pour %s utilisateur(s).", count)
    return count


@shared_task
def log_token_usage(user_id, tokens_used: int, endpoint: str):
    """
    Journalisation ASYNCHRONE de la consommation de tokens, décorrélée du
    cycle requête/réponse pour ne jamais ralentir la réponse à l'utilisateur.
    """
    if tokens_used <= 0:
        return
    TokenUsageLog.objects.create(user_id=user_id, tokens_used=tokens_used, endpoint=endpoint)
