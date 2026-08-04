#!/bin/sh
# Point d'entrée unique pour les 3 rôles du conteneur backend (voir
# docker-compose.yml) : "web" (API Django/Gunicorn), "worker" (Celery) et
# "beat" (planificateur Celery). Garder UN SEUL Dockerfile pour les trois
# évite de dupliquer les dépendances et simplifie la maintenance.
set -e

echo "Attente de PostgreSQL sur ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
until python -c "
import os, socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect((os.environ.get('POSTGRES_HOST', 'db'), int(os.environ.get('POSTGRES_PORT', 5432))))
except OSError:
    sys.exit(1)
"; do
  sleep 1
done
echo "PostgreSQL est disponible."

case "$1" in
  web)
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
    python manage.py setup_periodic_tasks
    exec gunicorn config.asgi:application \
      --bind 0.0.0.0:8000 \
      --worker-class uvicorn_worker.UvicornWorker \
      --workers "${GUNICORN_WORKERS:-3}" \
      --access-logfile - \
      --error-logfile -
    ;;
  worker)
    exec celery -A config worker --loglevel=info --concurrency="${CELERY_CONCURRENCY:-2}"
    ;;
  beat)
    exec celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    ;;
  *)
    exec "$@"
    ;;
esac
