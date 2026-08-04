# KOUROU AI — Mobile (Expo SDK 54)

Application React Native / TypeScript pour candidats aux concours
administratifs camerounais. Voir [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
pour le détail de l'architecture (routes, state management, streaming SSE).

## Démarrage

```bash
npm install
cp .env.example .env
# éditer EXPO_PUBLIC_API_BASE_URL (voir commentaires dans .env.example —
# "localhost" ne fonctionne PAS depuis un téléphone/simulateur physique)
npx expo start
```

Puis scanner le QR code avec l'app **Expo Go**, ou appuyer sur `a`
(émulateur Android) / `i` (simulateur iOS) / `w` (web).

## Structure

```
app/               # Écrans (Expo Router — un fichier = une route)
src/
├── api/             # Stockage sécurisé des tokens JWT
├── store/
│   ├── api/            # RTK Query, un fichier par domaine backend
│   └── authSlice.ts     # Utilisateur courant
├── hooks/            # useAuth, useTutorStream (streaming SSE)
├── components/       # Composants réutilisables
├── theme/             # Couleurs (extraites du logo), typographie, espacements
└── types/             # Types alignés sur les serializers Django
```

## Scripts

| Commande | Effet |
|---|---|
| `npm start` | Démarre Metro (choix de la plateforme au clavier) |
| `npm run android` / `ios` / `web` | Démarre directement sur une plateforme |
| `npm run typecheck` | `tsc --noEmit` — vérifié sans erreur avant livraison |
| `npm run lint` | ESLint (`eslint-config-expo`) — vérifié sans erreur avant livraison |

## Notes d'implémentation

- **Tokens JWT** stockés via `expo-secure-store` (Keychain/Keystore natif),
  jamais dans `AsyncStorage`. Rafraîchissement automatique sur 401
  (`src/store/api/baseApi.ts`).
- **Tuteur IA en streaming** : `react-native-sse` (pas `fetch`+`ReadableStream`,
  au support inégal sur Hermes) — voir `src/hooks/useTutorStream.ts`.
- **Paiement Mobile Money** : `app/payment-webview.tsx` ouvre l'URL CinetPay
  dans une WebView et détecte automatiquement le retour de paiement.
- Aucune donnée sensible (clé Gemini, clé CinetPay) n'existe côté mobile :
  tous les appels IA et paiement passent par le backend.

## Prochaines améliorations possibles

- Sélection de thème précis (actuellement : sélection au niveau matière ;
  le backend supporte déjà le filtrage par `topic` sur `qcm/generate/`).
- Persistance hors-ligne du catalogue des concours (`redux-persist` +
  `expo-sqlite` ou `AsyncStorage`) pour un usage sur réseau instable.
- Notifications push (rappel quotidien d'entraînement) via `expo-notifications`.
