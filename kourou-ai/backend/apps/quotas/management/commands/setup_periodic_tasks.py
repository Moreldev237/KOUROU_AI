"""
Enregistre la tâche planifiée de réinitialisation quotidienne des quotas
gratuits. À exécuter une fois après le tout premier déploiement (et à nouveau
si l'horaire souhaité change) :

    python manage.py setup_periodic_tasks
"""
from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, PeriodicTask


class Command(BaseCommand):
    help = "Enregistre la tâche Celery Beat de réinitialisation quotidienne des quotas gratuits."

    def handle(self, *args, **options):
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute="0",
            hour="0",
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone="Africa/Douala",
        )
        task, created = PeriodicTask.objects.update_or_create(
            name="Réinitialisation quotidienne des quotas gratuits",
            defaults={
                "crontab": schedule,
                "task": "apps.quotas.tasks.reset_daily_quotas_task",
                "enabled": True,
            },
        )
        verb = "créée" if created else "mise à jour"
        self.stdout.write(
            self.style.SUCCESS(f"Tâche planifiée {verb} : « {task.name} » (tous les jours à minuit, Africa/Douala).")
        )
