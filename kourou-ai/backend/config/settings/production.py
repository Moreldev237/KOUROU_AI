"""Réglages actifs en production (`DJANGO_SETTINGS_MODULE=config.settings.production`)."""
from .base import *  # noqa: F401,F403
from .base import env, MIDDLEWARE  # noqa: F401

DEBUG = False

# En production, ALLOWED_HOSTS et CORS_ALLOWED_ORIGINS DOIVENT être renseignés
# explicitement dans le .env (voir .env.example) — jamais de wildcard "*".
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ["localhost", "127.0.0.1"]:  # noqa: F405
    raise RuntimeError(
        "ALLOWED_HOSTS doit être configuré explicitement en production (voir .env)."
    )

# Sécurité renforcée derrière Nginx en HTTPS.
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
X_FRAME_OPTIONS = "DENY"

# Fichiers statiques servis directement par Gunicorn/Whitenoise (pas besoin de
# Nginx pour ça, ce qui simplifie le déploiement décrit dans DEPLOYMENT.md).
MIDDLEWARE = [MIDDLEWARE[0], "whitenoise.middleware.WhiteNoiseMiddleware", *MIDDLEWARE[1:]]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@kourou-ai.com")
