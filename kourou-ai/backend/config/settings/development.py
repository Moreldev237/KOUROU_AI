"""Réglages actifs en développement local (`DJANGO_SETTINGS_MODULE=config.settings.development`)."""
from .base import *  # noqa: F401,F403
from .base import env  # noqa: F401

DEBUG = True

# En local, on autorise tout le monde à appeler l'API depuis un navigateur pour
# ne pas perdre de temps avec CORS pendant le développement (Expo Web, etc.).
CORS_ALLOW_ALL_ORIGINS = True

INSTALLED_APPS += ["django_extensions"]  # noqa: F405

# Si des paramètres SMTP sont fournis dans l'environnement, on les utilise.
# Sinon, on reste en mode console pour ne pas bloquer le développement local.
if env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend") == "django.core.mail.backends.smtp.EmailBackend":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST", default="")
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
    DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@kourou-ai.local")
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
