<p align="center">
  <img src="mobile/assets/logo-source.png" width="120" alt="KOUROU AI" />
</p>

<h1 align="center">KOUROU AI</h1>
<p align="center">
  Plateforme SaaS éducative propulsée par l'IA pour la préparation aux concours
  administratifs camerounais (ENAM, Police, Douanes, ENS…).
</p>

---

## Aperçu

KOUROU AI accompagne les candidats aux concours administratifs à travers des
QCM générés par IA, des corrections détaillées, un tuteur IA conversationnel
et un suivi de progression — avec des abonnements payables par Mobile Money
(MTN MoMo, Orange Money via CinetPay).

Le projet est livré en deux parties :

| Dossier | Contenu | Stack |
|---|---|---|
| [`backend/`](backend) | API REST | Django 5.2 + DRF, PostgreSQL, Redis, Celery, Gemini API |
| [`mobile/`](mobile) | Application mobile | React Native + Expo SDK 54, TypeScript, Redux Toolkit |

Documentation complète : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
[`docs/API.md`](docs/API.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Modules (cahier des charges)

| # | Module | Où le trouver |
|---|---|---|
| 1 | Authentification & Profils | `backend/apps/accounts/` |
| 2 | Génération & entraînement IA | `backend/apps/ai_engine/` |
| 3 | Quotas & tokens | `backend/apps/quotas/` |
| 4 | Paiement & abonnements | `backend/apps/payments/` |
| 5 | Back-office & administration | `backend/apps/backoffice/` + `/admin/` |

Authentification : inscription possible via `phone_number` ou `email`, mais la connexion se fait désormais uniquement par `email + password`.

Chaque module est une app Django indépendante (modèles, serializers, vues,
URLs, tests) et un ensemble d'écrans mobiles dédiés — voir
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour le détail.

## Démarrage rapide (avec Docker — recommandé)

```bash
# 1. Configuration
cp backend/.env.example backend/.env
# -> éditer backend/.env : au minimum SECRET_KEY, GEMINI_API_KEY,
#    CINETPAY_API_KEY / CINETPAY_SITE_ID (voir commentaires dans le fichier)

# 2. Lancer toute la stack (PostgreSQL, Redis, Django, Celery, Nginx)
docker compose up --build

# 3. Charger les données de démonstration (concours, plans tarifaires)
docker compose exec backend python manage.py loaddata initial_exams initial_plans

# 4. Créer un compte administrateur
docker compose exec backend python manage.py createsuperuser
```

L'API est alors disponible sur `http://localhost/api/`, la documentation
interactive sur `http://localhost/api/docs/`, et l'admin sur
`http://localhost/admin/`.

## Démarrage rapide (sans Docker, développement local)

```bash
# --- Backend ---
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements/development.txt
cp .env.example .env   # éditer POSTGRES_*, GEMINI_API_KEY, etc.
python manage.py migrate
python manage.py loaddata initial_exams initial_plans
python manage.py setup_periodic_tasks
python manage.py runserver

# Dans un 2e terminal : le worker Celery (nécessaire pour le tuteur IA et les quotas)
celery -A config worker --loglevel=info
# Dans un 3e terminal : le planificateur (reset quotidien des quotas)
celery -A config beat --loglevel=info

# --- Mobile ---
cd mobile
npm install
cp .env.example .env   # renseigner EXPO_PUBLIC_API_BASE_URL (voir commentaires)
npx expo start
```

Prérequis locaux : Python 3.12+, Node.js 20+, PostgreSQL 16+, Redis 7+.

## Tests

```bash
cd backend
pytest                    # 32 tests — auth, catalogue, cache IA, quotas, paiements
```

```bash
cd mobile
npm run typecheck         # tsc --noEmit
npm run lint               # eslint
```

## Ce qu'il faut fournir pour une mise en production réelle

Le code est complet et fonctionnel, mais certaines valeurs ne peuvent
évidemment pas être générées à votre place :

- Une clé **Gemini API** ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) — vérifier le nom de modèle courant sur [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models), les modèles Gemini étant renouvelés régulièrement.
- Un compte marchand **CinetPay** (ou adapter `backend/apps/payments/gateways/` pour Monetbil / Notch Pay).
- Un **VPS** avec domaine + certificat SSL — voir [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
- Un vrai fournisseur **SMS** pour les codes OTP (`backend/apps/accounts/services.py` — le mode `console` actuel journalise simplement les codes, pratique pour développer sans dépenser de crédits SMS).

## Licence

Projet livré à Morel Nkonga Tadjuidje — usage libre pour KOUROU AI.
