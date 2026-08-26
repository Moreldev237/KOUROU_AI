"""
Réglages actifs pendant l'exécution des tests (`pytest`, CI).

Utilise SQLite en mémoire plutôt que PostgreSQL pour que la suite de tests
démarre en une fraction de seconde, sans dépendre d'un service externe. Ne
JAMAIS utiliser ce module pour autre chose que les tests automatisés.
"""
from .base import *  # noqa: F401,F403

DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Pas de Redis/Celery réels pendant les tests : tâches exécutées en synchrone,
# cache en mémoire locale.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # hachage rapide, tests uniquement

SMS_BACKEND = "console"
