"""
Point d'entrée ASGI de KOUROU AI.

Utilisé en production via `gunicorn config.asgi:application -k uvicorn_worker.UvicornWorker`
afin que les réponses en streaming (Server-Sent Events du tuteur IA) ne
bloquent pas un worker synchrone entier pendant toute la durée du flux.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

application = get_asgi_application()
