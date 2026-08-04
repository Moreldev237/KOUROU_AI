"""
Point d'entrée Celery pour KOUROU AI.

Utilisé pour :
- décharger la journalisation des tokens consommés (hors du cycle requête/réponse) ;
- réinitialiser chaque nuit les quotas gratuits journaliers (Module 3) ;
- pré-générer / réchauffer le cache de contenus IA pour les sujets populaires.
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("kourou_ai")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Requête de débogage Celery : {self.request!r}")
