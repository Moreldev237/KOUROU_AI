# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

# --- Dépendances système ---------------------------------------------------
# libpq-dev + gcc : compilation de psycopg2 ; curl : healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# --- Dépendances Python (couche mise en cache séparément du code) ----------
COPY requirements/ requirements/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements/production.txt

# --- Code de l'application ---------------------------------------------------
COPY . .

RUN chmod +x docker/entrypoint.sh

# Utilisateur non-root (bonne pratique de sécurité en production).
RUN addgroup --system django && adduser --system --ingroup django django \
    && chown -R django:django /app
USER django

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/api/schema/ || exit 1

ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["web"]
