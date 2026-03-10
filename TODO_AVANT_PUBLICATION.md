# TODO avant publication — Gorillax

> Mis à jour le 9 mars 2026

---

## 🔴 Bloquant (sans ça, l'app ne peut pas être soumise)

- [x] **Politique de confidentialité** — `https://appli-v2.onrender.com/privacy` ✅
- [x] **Build iOS production** — `eas build --profile production --platform ios`
- [x] **Soumission App Store** — `eas submit --platform ios` (après build production)
- [ ] **Screenshots App Store** — 3 tailles obligatoires : 6.7" / 6.5" / 5.5"
- [x] **Compte Apple Developer** actif (99$/an)

---

## 🟠 Important (à faire avant ou juste après publication)

### Monétisation
- [ ] **Tester le paywall en sandbox iOS** — créer un Sandbox Tester dans App Store Connect → vérifier que l'achat fonctionne et que le statut passe à "premium"
- [ ] **Vérifier le webhook RevenueCat** — après un achat sandbox, vérifier les logs Render que `/subscriptions/webhook` reçoit bien les événements
- [ ] **Clé Android RevenueCat** — remplacer `test_OQGCIamnOStYOysxXgRotpuduKY` par la vraie clé `goog_` quand vous publiez sur Android

### App Store Connect
- [ ] **Description de l'app** — titre (30 car. max), sous-titre, description complète, mots-clés
- [ ] **Catégorie** — Santé et remise en forme
- [ ] **Classement d'âge** — remplir le questionnaire Apple
- [ ] **Icône 1024x1024** — vérifier qu'elle est sans transparence

---

## 🟡 Technique (améliorations recommandées)

### Code
- [x] **`purchasesApi.ts` (web)** — import `react-native` inutile supprimé. Stub pur sans dépendance native. ✅
- [ ] **Images en base64** — actuellement stockées en base64 dans la BDD. Fonctionnel pour le lancement, mais à migrer vers Supabase Storage post-v1 pour la scalabilité.

### Backend
- [ ] **SMTP / email** — non configuré. La vérification email est désactivée. À configurer si tu veux activer la validation email à l'inscription.

---

## 🟢 Post-publication (optionnel mais recommandé)

- [ ] **Sentry** — crash reporting (crashes iOS/Android remontés automatiquement)
- [ ] **Analytics** — PostHog ou Mixpanel (comprendre comment les utilisateurs utilisent l'app)
- [ ] **Monitoring Render** — alertes sur les erreurs 500 et uptime
- [ ] **CI/CD** — GitHub Actions + EAS pour builds automatiques sur push
- [ ] **Marketplace coachs** — backend prêt, UI frontend à créer si tu veux activer la feature
- [ ] **Agents Claude** — agents spécialisés (frontend, backend, debug, git) pour améliorer l'app post-publication

---

## ✅ Déjà fait

- [x] Transactions rollback (programs.py, marketplace.py)
- [x] Clé iOS RevenueCat configurée (`appl_RsTmVWKIvJFrCMSBhtdlVuoFbOL`)
- [x] Webhook RevenueCat configuré → `appli-v2.onrender.com/subscriptions/webhook`
- [x] `REVENUECAT_WEBHOOK_SECRET` sur Render
- [x] Entitlement "premium" avec Monthly + Yearly
- [x] Rate limiting login (5 tentatives → 2 min de cooldown)
- [x] CORS restreint en production
- [x] Routes admin/seed désactivées en production
- [x] `.env` non commité
- [x] Error boundaries React
- [x] `USE_LOCAL_API = false` (app pointe vers Render)
