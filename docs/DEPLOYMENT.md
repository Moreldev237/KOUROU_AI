# Déploiement — KOUROU AI

## 1. Backend sur VPS (Hetzner, ~12 $/mois comme prévu au cahier des charges)

### 1.1 Provisionner le serveur

- Créer un VPS Hetzner (CX22 ou équivalent : 2 vCPU / 4 Go RAM suffisent pour démarrer).
- Ubuntu 24.04 LTS.
- Pointer un enregistrement DNS `A` de votre domaine (ex: `api.kourou-ai.cm`) vers l'IP du VPS.

### 1.2 Installer Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin -y
```

### 1.3 Déployer le projet

```bash
git clone <votre-dépôt> kourou-ai && cd kourou-ai
cp backend/.env.example backend/.env
nano backend/.env
```

Renseigner dans `backend/.env` (production) :

```env
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=False
SECRET_KEY=<générer avec: python -c "import secrets; print(secrets.token_urlsafe(50))">
ALLOWED_HOSTS=api.kourou-ai.cm
CORS_ALLOWED_ORIGINS=https://kourou-ai.cm

POSTGRES_PASSWORD=<mot de passe robuste>

GEMINI_API_KEY=<clé réelle>
GEMINI_MODEL_NAME=<vérifier le modèle courant sur ai.google.dev/gemini-api/docs/models>

CINETPAY_API_KEY=<clé réelle>
CINETPAY_SITE_ID=<site_id réel>
PAYMENT_NOTIFY_URL=https://api.kourou-ai.cm/api/payments/webhook/cinetpay/
PAYMENT_RETURN_URL=https://api.kourou-ai.cm/paiement/retour

SMS_BACKEND=<votre fournisseur SMS — voir apps/accounts/services.py>
```

```bash
docker compose up -d --build
docker compose exec backend python manage.py loaddata initial_exams initial_plans
docker compose exec backend python manage.py createsuperuser
```

### 1.4 HTTPS (Let's Encrypt)

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d api.kourou-ai.cm
```

Puis dans `nginx/nginx.conf`, ajouter un bloc `server { listen 443 ssl; ... }`
pointant vers les certificats (`/etc/letsencrypt/live/api.kourou-ai.cm/`), et
monter le dossier dans `docker-compose.yml` (ligne déjà présente en
commentaire : `./nginx/certbot/conf:/etc/letsencrypt:ro`) puis décommenter le
port `443` du service `nginx`. Ajouter une tâche cron pour le renouvellement :

```bash
0 3 * * * certbot renew --quiet && docker compose restart nginx
```

### 1.5 Vérifications post-déploiement

```bash
curl https://api.kourou-ai.cm/api/schema/         # doit renvoyer le schéma OpenAPI
curl https://api.kourou-ai.cm/api/exams/           # doit renvoyer 401 (auth requise) — c'est normal
docker compose logs -f celery_beat                 # confirmer que le reset quotidien est planifié
```

### 1.6 Sauvegardes

```bash
# Sauvegarde quotidienne de PostgreSQL (à ajouter en cron)
docker compose exec -T db pg_dump -U kourou_ai kourou_ai | gzip > backup-$(date +%F).sql.gz
```

## 2. Application mobile (Expo / EAS Build)

Le workflow managé Expo permet de compiler l'app sans installer Xcode ou
Android Studio, via **EAS Build** (service Expo, gratuit avec quota mensuel).

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure

# Mettre à jour EXPO_PUBLIC_API_BASE_URL vers votre domaine de production
# (dans un fichier .env, ou via eas.json > env par profil)

eas build --platform android --profile production   # génère un .aab pour le Play Store
eas build --platform ios --profile production        # génère un .ipa pour l'App Store (nécessite un compte Apple Developer)
```

Avant publication :
- Remplacer `com.kourouai.app` (`app.json` → `ios.bundleIdentifier` / `android.package`) par votre propre identifiant si besoin.
- Vérifier `EXPO_PUBLIC_API_BASE_URL` pointe bien vers le backend de production (HTTPS).
- Soumettre via `eas submit` ou manuellement sur Play Console / App Store Connect.

## 3. Mise à jour

```bash
git pull
docker compose up -d --build
docker compose exec backend python manage.py migrate
```

## 4. Points de vigilance avant mise en production réelle

- [ ] `SECRET_KEY` régénérée (ne jamais garder celle de développement)
- [ ] `DEBUG=False` et `ALLOWED_HOSTS` explicite
- [ ] Clé Gemini + nom de modèle vérifiés à jour
- [ ] Compte marchand CinetPay en mode production (pas sandbox)
- [ ] `PAYMENT_NOTIFY_URL` accessible publiquement en HTTPS (CinetPay doit pouvoir l'appeler)
- [ ] Fournisseur SMS réel branché (`SMS_BACKEND`)
- [ ] Sauvegardes PostgreSQL automatisées
- [ ] `python manage.py setup_periodic_tasks` exécuté (reset quotidien des quotas)
