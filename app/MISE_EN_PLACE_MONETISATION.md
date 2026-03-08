# Mise en place de la monétisation Gorillax

## Ce qui est déjà fait (code)

### Backend (prêt à déployer)
- Champs abonnement sur le modèle User (`subscription_tier`, `ai_programs_generated`, etc.)
- Migration auto des colonnes au démarrage
- Routes `/subscriptions/webhook`, `/subscriptions/status`, `/subscriptions/restore`
- Gating sur `/programs/generate` (1 programme gratuit, puis paywall)
- Marketplace coachs complet (routes `/marketplace/*`)
- Tous les schemas et dépendances

### Frontend (prêt côté code)
- Hook `useSubscription` + Provider intégré au layout
- Écran Paywall (modal) avec choix mensuel/annuel
- Gating sur la création de programme (affiche le paywall si limite atteinte)
- Section "Abonnement" dans les Settings
- Composants `PremiumBadge` et `PremiumGate` réutilisables
- Traductions FR/EN complètes
- `purchasesApi.native.ts` pour iOS/Android, stub web

---

## Ce que TU dois faire

### Étape 1 — Créer un compte RevenueCat
1. Va sur https://www.revenuecat.com et crée un compte
2. Crée un nouveau projet "Gorillax"

### Étape 2 — Configurer App Store Connect (iOS)
1. Dans App Store Connect → Mon app → Abonnements
2. Crée un groupe d'abonnements "Gorillax Premium"
3. Crée 2 abonnements :
   - **Identifiant produit** : `gorillax_premium_monthly` → 4,99 €/mois
   - **Identifiant produit** : `gorillax_premium_yearly` → 39,99 €/an
4. Remplis les métadonnées (nom d'affichage, description)

### Étape 3 — Configurer Google Play Console (Android)
1. Dans Google Play Console → Mon app → Monétiser → Abonnements
2. Crée les mêmes 2 abonnements :
   - `gorillax_premium_monthly` → 4,99 €/mois
   - `gorillax_premium_yearly` → 39,99 €/an

### Étape 4 — Lier les stores à RevenueCat
1. Dans RevenueCat dashboard → Project Settings → Apps
2. Ajoute une app iOS :
   - Bundle ID : `com.gorillax.gym`
   - Colle le **App-Specific Shared Secret** depuis App Store Connect
3. Ajoute une app Android :
   - Package name : `com.gorillax.gym`
   - Upload le fichier JSON du **Service Account** Google Play

### Étape 5 — Configurer les produits dans RevenueCat
1. Va dans RevenueCat → Products → ajoute les 2 product IDs
2. Va dans Offerings → crée un offering "default"
3. Ajoute un package "Monthly" → lie à `gorillax_premium_monthly`
4. Ajoute un package "Annual" → lie à `gorillax_premium_yearly`
5. Va dans Entitlements → crée un entitlement "premium"
6. Lie les 2 produits à l'entitlement "premium"

### Étape 6 — Récupérer tes clés API
1. Dans RevenueCat → Project Settings → API Keys
2. Copie la **Public iOS API Key** (commence par `appl_`)
3. Copie la **Public Android API Key** (commence par `goog_`)
4. Colle-les dans `app/src/services/purchasesApi.native.ts` :
   ```
   const REVENUECAT_IOS_KEY = 'appl_TA_VRAIE_CLE_ICI';
   const REVENUECAT_ANDROID_KEY = 'goog_TA_VRAIE_CLE_ICI';
   ```

### Étape 7 — Configurer le Webhook RevenueCat
1. Dans RevenueCat → Project Settings → Webhooks
2. Ajoute un webhook :
   - **URL** : `https://appli-v2.onrender.com/subscriptions/webhook`
   - **Authorization header** : choisis un secret (ex: `whsec_GorillaxPremium2024`)
3. Sur Render, ajoute la variable d'environnement :
   ```
   REVENUECAT_WEBHOOK_SECRET=whsec_GorillaxPremium2024
   ```

### Étape 8 — Déployer le backend
1. Push le code sur Git
2. Le backend sur Render va se redéployer automatiquement
3. Les nouvelles colonnes et tables seront créées au démarrage

### Étape 9 — Builder l'app native
```bash
cd app
npx expo prebuild          # Génère les projets natifs
npx expo run:ios           # Test sur simulateur iOS
# ou
eas build --platform ios   # Build pour TestFlight
eas build --platform android  # Build pour Google Play
```

> RevenueCat ne fonctionne PAS sur le web (localhost). Tu DOIS tester sur un appareil réel ou simulateur iOS/Android.

### Étape 10 — Tester en sandbox
1. Sur iOS : crée un compte Sandbox dans App Store Connect → Users → Sandbox Testers
2. Sur Android : ajoute des license testers dans Google Play Console → Settings → License testing
3. Ouvre l'app → Crée un programme (gratuit, le 1er)
4. Essaie d'en créer un 2ème → le paywall doit s'afficher
5. Achète via le sandbox → vérifie que le statut passe à "premium"
6. Vérifie sur Render les logs du webhook

---

## Résumé des fichiers modifiés/créés

### Backend
| Fichier | Action |
|---------|--------|
| `api/src/api/models.py` | Modifié — champs User + 4 nouveaux modèles |
| `api/src/api/db.py` | Modifié — migration auto |
| `api/src/api/schemas.py` | Modifié — nouveaux schemas |
| `api/src/api/utils/dependencies.py` | Modifié — gating |
| `api/src/api/routes/programs.py` | Modifié — limite AI |
| `api/src/api/main.py` | Modifié — nouveaux routers |
| `api/src/api/routes/subscriptions.py` | **Créé** |
| `api/src/api/routes/marketplace.py` | **Créé** |

### Frontend
| Fichier | Action |
|---------|--------|
| `app/app.json` | Modifié — plugin RevenueCat |
| `app/app/_layout.tsx` | Modifié — SubscriptionProvider + route paywall |
| `app/app/programme/create.tsx` | Modifié — check paywall avant génération |
| `app/src/hooks/useAuth.tsx` | Modifié — interface User |
| `app/src/hooks/usePreferences.tsx` | Modifié — traductions premium |
| `app/app/settings.tsx` | Modifié — section abonnement |
| `app/src/services/subscriptionApi.ts` | **Créé** |
| `app/src/services/purchasesApi.ts` | **Créé** — stub web |
| `app/src/services/purchasesApi.native.ts` | **Créé** — SDK natif |
| `app/src/hooks/useSubscription.tsx` | **Créé** |
| `app/app/paywall.tsx` | **Créé** |
| `app/src/components/PremiumBadge.tsx` | **Créé** |
| `app/src/components/PremiumGate.tsx` | **Créé** |

---

## Variables d'environnement à ajouter sur Render

| Variable | Valeur |
|----------|--------|
| `REVENUECAT_WEBHOOK_SECRET` | Le secret choisi à l'étape 7 |

## Clés à mettre dans le code

| Fichier | Variable | Source |
|---------|----------|--------|
| `purchasesApi.native.ts` | `REVENUECAT_IOS_KEY` | RevenueCat dashboard → API Keys → iOS |
| `purchasesApi.native.ts` | `REVENUECAT_ANDROID_KEY` | RevenueCat dashboard → API Keys → Android |
