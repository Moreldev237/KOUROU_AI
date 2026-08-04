"""
KOUROU AI — Configuration Django de base.

Ce fichier contient tout ce qui est commun aux environnements. Les fichiers
`development.py` et `production.py` importent ce module puis ne surchargent
que ce qui doit réellement différer (DEBUG, hôtes autorisés, e-mail, etc.).
"""
from datetime import timedelta
from pathlib import Path

import environ

# --- Chemins ---------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

# --- Sécurité de base --------------------------------------------------------
SECRET_KEY = env("SECRET_KEY", default="insecure-dev-key-change-me-in-prod")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1", "10.0.2.2"],
)

# --- Applications ------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "drf_spectacular",
]

# Architecture modulaire : chaque "module" du cahier des charges correspond à
# une app Django indépendante avec ses propres models/serializers/views/urls.
LOCAL_APPS = [
    "apps.accounts",       # Module 1 — Authentification & Profils
    "apps.exams",          # Catalogue des concours & programmes officiels
    "apps.ai_engine",      # Module 2 — Génération & entraînement IA
    "apps.quotas",         # Module 3 — Quotas & tokens
    "apps.payments",       # Module 4 — Paiement & abonnements
    "apps.backoffice",     # Module 5 — Back-office & administration
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Base de données ---------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="kourou_ai"),
        "USER": env("POSTGRES_USER", default="kourou_ai"),
        "PASSWORD": env("POSTGRES_PASSWORD", default=""),
        "HOST": env("POSTGRES_HOST", default="localhost"),
        "PORT": env("POSTGRES_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
    }
}

# --- Authentification ---------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

# Permet la connexion par numéro de téléphone (Mobile Money) OU par e-mail,
# conformément au Module 1 du cahier des charges.
AUTHENTICATION_BACKENDS = [
    "apps.accounts.backends.PhoneOrEmailBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalisation ---------------------------------------------------
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Douala"
USE_I18N = True
USE_TZ = True

# --- Fichiers statiques / médias --------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Django REST Framework ---------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    # Rate limiting (exigence non-fonctionnelle : protection anti-scraping/DDoS).
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "otp": "5/min",
        "ai_generation": "30/min",
        "tutor_chat": "20/min",
        "payments": "20/min",
    },
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=45),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "KOUROU AI — API",
    "DESCRIPTION": (
        "Documentation technique de l'API de KOUROU AI, plateforme de "
        "préparation aux concours administratifs propulsée par l'IA."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# --- CORS ---------------------------------------------------------------------
# Le mobile Expo n'est pas soumis à CORS (ce n'est pas un navigateur), mais on
# garde ce réglage pour Expo Web, le simulateur, ou un futur client web admin.
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# --- Cache Redis ---------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/0"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT": None,  # Chaque appelant fixe son propre TTL (voir cache_service).
    }
}

# --- Celery ---------------------------------------------------------------------
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/2")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# --- Google Gemini API (Module 2) -----------------------------------------------
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
# Voir .env.example : garder ce nom de modèle configurable, les modèles Gemini
# étant renouvelés fréquemment par Google.
GEMINI_MODEL_NAME = env("GEMINI_MODEL_NAME", default="gemini-2.5-flash")
GEMINI_ENABLE_CONTEXT_CACHING = env.bool("GEMINI_ENABLE_CONTEXT_CACHING", default=True)

# --- Paiement Mobile Money (Module 4) --------------------------------------------
PAYMENT_GATEWAY = env("PAYMENT_GATEWAY", default="cinetpay")
CINETPAY_API_KEY = env("CINETPAY_API_KEY", default="")
CINETPAY_SITE_ID = env("CINETPAY_SITE_ID", default="")
CINETPAY_BASE_URL = env("CINETPAY_BASE_URL", default="https://api-checkout.cinetpay.com/v2")
CINETPAY_CURRENCY = env("CINETPAY_CURRENCY", default="XAF")
PAYMENT_NOTIFY_URL = env("PAYMENT_NOTIFY_URL", default="")
PAYMENT_RETURN_URL = env("PAYMENT_RETURN_URL", default="")

# --- Quotas (Module 3) -----------------------------------------------------------
FREE_DAILY_GENERATION_LIMIT = env.int("FREE_DAILY_GENERATION_LIMIT", default=10)

# --- SMS / OTP --------------------------------------------------------------------
# "console" (dev, log uniquement) ou "custom" (brancher un vrai fournisseur SMS
# camerounais avant la mise en production réelle).
SMS_BACKEND = env("SMS_BACKEND", default="console")

# --- E-mail / SMTP --------------------------------------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@kourou-ai.local")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# --- Logging ------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} — {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}
