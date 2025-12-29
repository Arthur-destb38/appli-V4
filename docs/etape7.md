


### Étape 7 — Pré-release & Publication

🎯 Objectif général

Finaliser le MVP pour le rendre publiable sur les stores (App Store / Play Store) ou testable via TestFlight / Internal testing. Cette étape clôt le cycle de développement en garantissant une application stable, identifiable (icône, splash, bundle), conforme sur le plan légal (Privacy Policy, consentements) et prête pour la collecte de feedbacks utilisateurs.

But : obtenir un build signé et testable sur des devices réels sans crash ni régression majeure.

⸻

🧱 Préparation visuelle et configuration

Assets et identité app
	•	Icône officielle (format carré 1024x1024, fond sombre + logo Gorillax rouge).
	•	Splash screen cohérent avec la palette du thème.
	•	Nom affiché : Gorillax Gym.
	•	Configurer les métadonnées dans app.json :

{
  "expo": {
    "name": "Gorillax Gym",
    "slug": "gorillax-gym",
    "scheme": "gorillax",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#0F0F0F" },
    "ios": { "bundleIdentifier": "com.gorillax.gym" },
    "android": { "package": "com.gorillax.gym", "versionCode": 1 }
  }
}


	•	Vérifier la cohérence du nom et du slug sur toutes les plateformes.

Vérifications de performance
	•	Tests sur appareils physiques réels (Android + iOS).
	•	Vérification du temps de démarrage, fluidité des transitions et absence de crashs (sur create → follow → share).
	•	Profilage rapide via Expo dev tools ou Android Profiler pour repérer les ralentissements.

⸻

⚙️ Préparation build & publication

Build
	1.	Nettoyer les dépendances (pnpm install --frozen-lockfile).
	2.	Générer le build iOS/Android :

pnpm expo build:ios
pnpm expo build:android


	3.	Signer les builds (automatiquement via Expo ou manuellement selon compte développeur).
	4.	Tester les builds sur des devices physiques.
	5.	Déployer l'API FastAPI + DB en prod (URL publique) et pointer l'app dessus pour la partie réseau avant toute distribution TestFlight/APK.

TestFlight (iOS)
	•	Utiliser Expo Application Services (EAS) pour créer le build et le soumettre à TestFlight.
	•	Inviter un petit groupe de testeurs (amis, collaborateurs, potentiels utilisateurs).

Internal Testing (Android)
	•	Créer un canal interne sur Google Play Console.
	•	Déployer la version de test.
	•	Activer le lien de distribution restreint.

⸻

⚖️ Conformité légale & Privacy Policy

Politique de confidentialité
	•	Créer une page dédiée (Notion / GitHub Pages) décrivant :
	•	Données locales (séances, séries, etc.) non partagées sans action explicite.
	•	Données de partage volontaire (consentement requis pour share).
	•	Aucun tracking publicitaire ni vente de données.
	•	Droit de suppression (contacter support via email/app form).

Gestion des consentements
	•	Première utilisation → popup :
	•	“En utilisant Gorillax Gym, vous acceptez la Politique de confidentialité.”
	•	Premier partage → popup spécifique :
	•	“Acceptez-vous de rendre vos séances visibles publiquement ?” (champ consent_to_public_share activé)

Ces consentements doivent être persistés localement et côté API.

⸻

🧩 Migrations & stabilité backend

Migrations de schéma (API)
	•	Utiliser Alembic pour gérer les évolutions de la base :
	•	alembic revision --autogenerate -m "Add share table"
	•	alembic upgrade head
	•	Maintenir la compatibilité ascendante (aucune perte de données entre builds testés).

Vérification du seed & endpoints
	•	Relancer le seed de base et tester les endpoints /health, /exercises, /share/workouts/{id}.
	•	Vérifier que la synchro client-serveur fonctionne sans blocage.

⸻

✅ Definition of Done (DoD)
	•	Les builds iOS & Android sont générés, signés, installables et testés sans crash.
	•	Les assets visuels (icône, splash, nom) sont cohérents et définitifs.
	•	Les testeurs accèdent à l’app via TestFlight ou Play Console.
	•	La Privacy Policy est accessible depuis les paramètres de l’app.
	•	Le consentement public est demandé et persisté avant tout partage.
	•	La base est migrée proprement via Alembic (aucune régression sur les modèles existants) et l’API/DB sont déployées en prod pour que le réseau fonctionne en distribution.
	•	Les suites automatisées (lint, unitaires, intégration, Detox/E2E) tournent en CI et sont vertes avant signature.

⸻

🔍 Tests rapides
	1.	Parcours complet : création → ajout exos → suivi → partage → duplication → feed → historique.
	2.	Crash test : kill + reopen → aucune perte de données.
	3.	Consentement : bloquer le partage si non accepté.
	4.	Installation : TestFlight & Android internal → pas d’erreur d’import.
	5.	UI : icône et splash cohérents, thème stable.

⸻

⚠️ Points d’attention
	•	Tester sur appareils différents (iPhone SE, Android milieu de gamme).
	•	Vérifier la taille du build (< 200 Mo pour iOS, < 150 Mo pour Android).
	•	Corriger les warnings avant soumission (même mineurs).
	•	Vérifier les métadonnées store : description courte, images d’écran cohérentes, mention de la politique de confidentialité.

⸻

💡 Résumé opérationnel
	•	L’application devient distribuable et testable.
	•	Les fondations techniques (builds, migrations, privacy) sont solides.
	•	L’expérience utilisateur est complète, sans trou majeur.
	•	Prochaine étape logique : collecte des retours utilisateurs, itérations UX et ajustements avant release publique.

Cette dernière étape marque la naissance officielle du MVP : un produit cohérent, stable et publiable, prêt à être confronté au réel.
