# KOUROU AI — Backend (Django 5.2 + DRF)

Voir [`../README.md`](../README.md) pour le démarrage rapide (Docker ou
local), et [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) /
[`../docs/API.md`](../docs/API.md) pour le détail technique.

## Commandes utiles

```bash
# Tests (32 tests, SQLite en mémoire — voir config/settings/test.py)
pytest
pytest --cov=apps                      # avec couverture

# Documentation API interactive en local
python manage.py runserver
# -> http://localhost:8000/api/docs/

# Générer le schéma OpenAPI en fichier (utile pour un client généré automatiquement)
python manage.py spectacular --file schema.yaml

# Réinitialiser/enregistrer la tâche planifiée de reset des quotas
python manage.py setup_periodic_tasks

# Charger les données de démonstration
python manage.py loaddata initial_exams initial_plans

# Shell Django enrichi (nécessite django-extensions, inclus en dev)
python manage.py shell_plus
```

## Environnements de settings (`config/settings/`)

| Fichier | Utilisé pour |
|---|---|
| `base.py` | Réglages communs |
| `development.py` | `runserver` local (CORS ouvert, e-mails en console) |
| `production.py` | Déploiement (HTTPS forcé, Whitenoise, SMTP réel) |
| `test.py` | `pytest` (SQLite en mémoire, Celery en synchrone, hachage rapide) |

Sélectionné via `DJANGO_SETTINGS_MODULE` (voir `.env.example`).

## Ajouter une passerelle de paiement

`apps/payments/gateways/base.py` définit l'interface `PaymentGateway`
(`initiate_payment`, `verify_transaction`). Pour ajouter Monetbil ou Notch
Pay : créer `gateways/monetbil.py` implémentant cette interface, puis
l'enregistrer dans `gateways/__init__.py::get_gateway()`. Aucun autre fichier
n'a besoin de changer.

## Ajouter un fournisseur SMS réel

`apps/accounts/services.py::send_sms()` journalise actuellement les codes
OTP en console (`SMS_BACKEND=console`, pratique en développement). Avant la
mise en production, implémenter l'appel à votre fournisseur SMS dans cette
même fonction et changer `SMS_BACKEND` dans `.env`.

## Rappel sécurité paiement

`apps/payments/gateways/cinetpay.py` et `apps/payments/views.py::PaymentWebhookView`
ne font JAMAIS confiance au contenu du webhook CinetPay : chaque notification
déclenche un appel serveur-à-serveur de vérification (`/v2/payment/check`)
avant toute activation d'abonnement. Conserver ce principe si vous ajoutez
une autre passerelle.
