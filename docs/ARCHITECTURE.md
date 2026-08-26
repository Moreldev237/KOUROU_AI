# Architecture — KOUROU AI

## 1. Vue d'ensemble

```
┌─────────────────────┐        HTTPS/JSON         ┌──────────────────────────┐
│   Mobile (Expo)      │ ─────────────────────────> │   Nginx (reverse proxy)  │
│   React Native + TS   │ <───────────────────────── │                          │
└─────────────────────┘        SSE (tuteur IA)      └────────────┬─────────────┘
                                                                   │
                                                     ┌─────────────▼─────────────┐
                                                     │  Django (Gunicorn+Uvicorn) │
                                                     │  DRF + JWT (SimpleJWT)     │
                                                     └──┬───────┬────────┬────────┘
                                                        │       │        │
                                              ┌─────────▼┐ ┌────▼───┐ ┌──▼──────────┐
                                              │PostgreSQL│ │ Redis  │ │ Celery      │
                                              │ (données)│ │(cache +│ │ worker+beat │
                                              │          │ │ broker)│ │             │
                                              └──────────┘ └────┬───┘ └──┬──────────┘
                                                                 │        │
                                                        ┌────────▼────────▼───┐
                                                        │  Gemini API / CinetPay│
                                                        │  (services externes)  │
                                                        └───────────────────────┘
```

## 2. Architecture modulaire du backend

Chaque module du cahier des charges est une **app Django indépendante** sous
`backend/apps/`, avec sa propre structure `models.py` / `serializers.py` /
`views.py` / `urls.py` / `admin.py` / `tests`. Un module peut être modifié,
retiré ou remplacé sans toucher aux autres :

```
backend/
├── config/                 # Réglages (base/dev/prod/test), Celery, URLs racine
├── common/                 # Pagination, exceptions, throttling, permissions partagés
└── apps/
    ├── accounts/            # Module 1 — Auth (inscription par téléphone, connexion par e-mail, OTP, JWT)
    ├── exams/                # Catalogue des concours (ENAM, Police, Douanes, ENS…)
    ├── ai_engine/            # Module 2 — Génération IA, cache, tuteur (SSE)
    ├── quotas/               # Module 3 — Quotas gratuits, tokens consommés
    ├── payments/             # Module 4 — CinetPay, abonnements
    └── backoffice/           # Module 5 — Statistiques admin
```

Chaque route racine (`config/urls.py`) monte un module sous son propre
préfixe (`/api/auth/`, `/api/ai/`, `/api/payments/`…), et la documentation
OpenAPI (`/api/docs/`) est générée automatiquement à partir du code — elle ne
peut donc pas se désynchroniser de l'implémentation réelle.

## 3. Le cache IA à deux niveaux (cœur économique du projet)

Le cahier des charges vise une marge nette >80 % via un cache hybride. Concrètement :

1. **Avant tout appel Gemini**, `ai_engine/services/cache_service.py` calcule
   une clé déterministe à partir de `(concours, matière, thème, difficulté,
   nombre de questions, mode)` et vérifie :
   - **Redis** (quelques millisecondes) — cache rapide, TTL configurable ;
   - à défaut, **PostgreSQL** (`CachedGeneration`) — cache durable, sans expiration.
2. **Cache HIT** → la génération est servie à **coût zéro** (aucun appel
   Gemini), et l'entrée voit son compteur `hit_count` incrémenté.
3. **Cache MISS** → appel à l'API Gemini (`services/gemini_client.py`), avec :
   - sortie structurée forcée via schéma Pydantic (JSON garanti, pas de
     parsing fragile de texte libre) ;
   - tentative de **cache de contexte natif Gemini** (`client.caches.create`)
     pour réduire le coût des tokens d'entrée sur le programme officiel —
     avec repli silencieux si le contenu est sous le seuil minimum imposé par
     l'API (ce seuil a varié selon les générations de modèles Gemini) ;
   - le résultat est alors stocké dans les deux caches pour les prochains candidats.

Ce comportement est directement vérifié par les tests
(`backend/tests/test_ai_engine.py::test_cache_hit_never_calls_gemini`, qui
mocke Gemini et vérifie qu'il n'est **jamais appelé** sur un cache HIT).

## 4. Streaming du tuteur IA (Server-Sent Events)

Le cahier des charges exige un rendu en streaming sous 3 secondes. Choix
techniques :

- **Backend** : `StreamingHttpResponse` (pas de WebSocket/Channels, inutile
  ici) servi en **ASGI** (`gunicorn -k uvicorn_worker.UvicornWorker`) pour ne
  pas bloquer un worker synchrone pendant toute la durée d'une réponse. Nginx
  désactive explicitement le buffering sur cette route (`nginx/nginx.conf`).
- **Mobile** : `react-native-sse` plutôt que `fetch`+`ReadableStream` — le
  support de `ReadableStream` sur le moteur Hermes reste inégal selon les
  versions, alors que `react-native-sse` (basé sur XMLHttpRequest) supporte
  nativement POST + headers + body, ce qu'un `EventSource` de navigateur
  classique ne permet pas (GET uniquement).
- Format des événements émis par `/api/ai/tutor/chat/` :
  `meta` (une fois, `{conversation_id, is_new}`) → `message` (texte brut, en
  boucle) → `done` (fin) ou `error`.

## 5. Sécurité

- **JWT** (SimpleJWT) : access token courte durée (45 min), refresh token
  rotatif avec blacklist (`rest_framework_simplejwt.token_blacklist`). Le
  mobile stocke les deux tokens dans le Keychain/Keystore natif
  (`expo-secure-store`), jamais dans `AsyncStorage`.
- **Rate limiting** : `ScopedRateThrottle` par endpoint (`auth`, `otp`,
  `ai_generation`, `tutor_chat`, `payments`) + un throttle **par numéro de
  téléphone** dédié aux OTP (`common/throttling.py`), pour empêcher qu'un abus
  distribué sur plusieurs IP ne continue de spammer un même numéro.
- **Paiement CinetPay** : le webhook de notification ne contient
  volontairement pas le statut du paiement (anti-usurpation côté CinetPay).
  `PaymentWebhookView` rappelle donc systématiquement l'API CinetPay en
  serveur à serveur (`/v2/payment/check`) avant de créditer quoi que ce soit
  — voir `apps/payments/gateways/cinetpay.py`.
- **Clé Gemini** : uniquement côté serveur (variable d'environnement), jamais
  transmise au mobile.
- **Suspension de comptes** (Module 5) : `User.suspend()` / actions admin
  dans `apps/accounts/admin.py`.

## 6. Architecture mobile (Expo Router + Redux Toolkit)

```
mobile/
├── app/                    # Routes (Expo Router, fichier = écran)
│   ├── (auth)/               # Connexion, inscription, OTP, mot de passe oublié
│   ├── (tabs)/                # Accueil, Entraînement, Tuteur, Abonnement, Profil
│   ├── qcm/[id].tsx           # Session de QCM en cours
│   └── payment-webview.tsx    # Paiement Mobile Money (WebView CinetPay)
└── src/
    ├── api/                  # Stockage sécurisé des tokens
    ├── store/
    │   ├── api/                # RTK Query : un fichier par domaine (auth, exams, ai_engine, quotas, payments)
    │   └── authSlice.ts        # État utilisateur courant
    ├── hooks/                # useAuth, useTutorStream
    ├── components/           # Composants réutilisables (Button, TextField, QuotaBadge…)
    └── theme/                 # Design tokens (couleurs extraites du logo, typographie, espacements)
```

**Authentification & JWT** : `src/store/api/baseApi.ts` attache
automatiquement le token d'accès à chaque requête et, sur un 401, tente un
rafraîchissement (`/api/auth/token/refresh/`) puis rejoue la requête une
seule fois. Si le rafraîchissement échoue, l'utilisateur est proprement
déconnecté plutôt que bloqué sur des 401 en boucle. Un verrou en mémoire
évite que plusieurs requêtes en échec simultané ne déclenchent plusieurs
rafraîchissements en parallèle.

**Garde de routes** : `app/(auth)/_layout.tsx` et `app/(tabs)/_layout.tsx`
redirigent respectivement vers les onglets ou vers la connexion selon
l'état `auth.user` du store — pas de logique dupliquée dans chaque écran.

**Chargement progressif** : `GET /api/exams/{code}/` renvoie les matières en
version allégée (`topics_count`, pas la liste complète des thèmes) pour
limiter la charge réseau sur les connexions 3G/4G — la liste complète des
thèmes d'une matière se charge à la demande via `GET /api/subjects/{id}/`.

## 7. Pourquoi ces choix plutôt que d'autres

| Décision | Alternative écartée | Raison |
|---|---|---|
| SSE (StreamingHttpResponse) | WebSockets (Django Channels) | Le besoin est unidirectionnel (serveur → client) ; SSE est plus simple à déployer et suffit largement, conformément au cahier des charges. |
| `react-native-sse` | `fetch` + `ReadableStream` | Support instable de `ReadableStream` sur Hermes selon versions ; `react-native-sse` gère nativement POST+JWT, un `EventSource` web classique ne le permet pas. |
| Cache applicatif PostgreSQL+Redis en premier | Cache de contexte Gemini seul | Le cache de contexte Gemini a un seuil minimum de taille et un coût résiduel par appel ; le cache applicatif, lui, offre un coût strictement nul sur les sujets déjà générés — c'est la vraie source de marge. |
| Gunicorn + workers Uvicorn (ASGI) | Gunicorn sync pur | Nécessaire pour ne pas bloquer un worker entier pendant toute la durée d'une réponse en streaming. |
| `phone_number` utilisé pour l'inscription et l'OTP | `email` requis pour la connexion | Le compte peut naître d'un téléphone Mobile Money, mais l'accès final se fait par e-mail. |
