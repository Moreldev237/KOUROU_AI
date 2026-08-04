# Référence API — KOUROU AI

Documentation interactive générée automatiquement à partir du code (toujours
à jour) : `GET /api/docs/` (Swagger) ou `GET /api/redoc/` (Redoc). Ce document
est un résumé pour référence rapide.

Toutes les routes sont préfixées par `/api/`. Sauf mention contraire,
l'authentification se fait par `Authorization: Bearer <access_token>`.

Format d'erreur uniforme sur toute l'API :
```json
{ "error": { "code": "quota_exceeded", "message": "...", "details": {} } }
```

## Authentification — `/api/auth/`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `register/` | non | Inscription par `phone_number` (déclenche un OTP) ou par `email`+`password` (actif immédiatement) |
| POST | `otp/verify/` | non | `{phone_number, code}` → active le compte, renvoie `{user, access, refresh}` |
| POST | `otp/resend/` | non | `{phone_number, purpose?}` |
| POST | `login/` | non | `{email, password}` — connexion par e-mail uniquement |
| POST | `token/refresh/` | non | `{refresh}` → nouveau `access` |
| POST | `password-reset/request/` | non | `{email}` |
| POST | `password-reset/confirm/` | non | `{email, code, new_password}` |
| GET/PATCH | `me/` | oui | Profil du candidat connecté |

## Catalogue des concours

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/exams/` | Liste des concours actifs (paginée) |
| GET | `/api/exams/{code}/` | Détail + matières (version allégée, `topics_count`) |
| GET | `/api/subjects/?exam={id}` | Matières d'un concours |
| GET | `/api/subjects/{id}/` | Détail d'une matière + liste complète des thèmes |
| GET | `/api/topics/?subject={id}` | Thèmes d'une matière |

## Moteur IA — `/api/ai/`

| Méthode | Route | Description |
|---|---|---|
| POST | `qcm/generate/` | `{exam, subject, topic?, mode?, difficulty?, question_count?}` → session + questions (cache-first) |
| POST | `qcm/answer/` | `{question, selected_choice_key}` → `{is_correct, correct_choice_key, explanation}` |
| GET | `qcm/history/` | Historique des sessions du candidat |
| GET | `qcm/sessions/{id}/` | Détail d'une session |
| POST | `tutor/chat/` | **SSE** — `{message, conversation?, exam?, subject?, topic?}` — voir `docs/ARCHITECTURE.md §4` |
| GET | `tutor/conversations/` | Liste des conversations |
| GET | `tutor/conversations/{id}/messages/` | Historique des messages d'une conversation |

`mode` : `qcm_batch` \| `guided_exercise`. `difficulty` : `facile` \| `moyen` \| `difficile`.

## Quotas — `/api/quotas/`

| Méthode | Route | Description |
|---|---|---|
| GET | `me/` | `{daily_limit, used_today, remaining, is_unlimited, last_reset_date}` |

## Paiements — `/api/payments/`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `plans/` | oui | Catalogue des plans tarifaires |
| POST | `initiate/` | oui | `{plan}` → crée une transaction, renvoie `payment_url` (à ouvrir en WebView) |
| POST | `webhook/cinetpay/` | **non** (public) | Appelé uniquement par CinetPay — jamais par le mobile |
| GET | `transactions/` | oui | Historique des transactions du candidat |
| GET | `subscription/me/` | oui | Abonnement actif, ou `null` |

## Back-office — `/api/backoffice/` (staff uniquement)

| Méthode | Route | Description |
|---|---|---|
| GET | `stats/` | Statistiques globales : utilisateurs, tokens consommés, taux de cache, revenus |

La gestion des utilisateurs (suspension, réactivation), du catalogue et des
plans se fait via `/admin/` (Django Admin, personnalisé par app).

## Exemple de flux complet (inscription par e-mail → premier QCM)

```bash
# 1. Inscription
curl -X POST /api/auth/register/ -H "Content-Type: application/json" -d '{
  "email": "candidat@exemple.cm", "password": "motdepasse123", "full_name": "Jean Candidat"
}'
# -> { "user": {...}, "access": "...", "refresh": "..." }

# 2. Générer un QCM (cache-first)
curl -X POST /api/ai/qcm/generate/ -H "Authorization: Bearer <access>" -d '{
  "exam": 1, "subject": 2, "difficulty": "moyen", "question_count": 5
}'

# 3. Répondre à une question
curl -X POST /api/ai/qcm/answer/ -H "Authorization: Bearer <access>" -d '{
  "question": 42, "selected_choice_key": "B"
}'
```
