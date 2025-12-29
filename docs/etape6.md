

### Étape 6 — Habillage & micro-UX

🎯 Objectif général

Donner à l’application une identité visuelle cohérente, moderne et plaisante à utiliser. Cette étape vise à transformer une app fonctionnelle en un produit agréable, en soignant la cohérence visuelle, les feedbacks utilisateurs (haptique, animation) et la gestion des états (loading, vide, erreur).

L’utilisateur doit sentir que tout est fluide, réactif, et vivant — même dans les moments d’attente.

⸻

🎨 Direction visuelle

Thème principal
	•	Mode sombre par défaut, avec un accent rouge (teinte Gorillax).
	•	Contraste fort entre fond, texte et boutons d’action.
	•	Palette cohérente, stockée dans un fichier de tokens (ex: theme.ts).

Exemples de tokens

colors: {
  backgroundDark: '#0F0F0F',
  surface: '#1A1A1A',
  accent: '#E63946',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  success: '#4CAF50',
  error: '#E53935'
}

	•	Prévoir une variante claire (mode jour) activable via paramètre ou détectée via Appearance API.

Typographie & tailles
	•	Police lisible et sobre (Inter, Roboto ou SF Pro).
	•	Hiérarchie visuelle claire :
	•	Titres : fontSize 20–24, fontWeight 700
	•	Texte standard : fontSize 14–16, fontWeight 400
	•	Éléments secondaires : fontSize 12, opacity 0.7

⸻

🧱 Composants visuels réutilisables

Icônes & symboles
	•	Utiliser Lucide (ou react-native-vector-icons) pour la cohérence et la légèreté.
	•	Créer un composant Icon wrapper centralisé pour uniformiser tailles et couleurs.
	•	Exemples :
	•	CheckCircle (validation série)
	•	AlertTriangle (erreur réseau)
	•	Loader2 (chargement)

États UI universels

Créer trois composants réutilisables :
	1.	LoadingState → spinner + texte optionnel
	2.	EmptyState → illustration légère + message incitatif
	3.	ErrorState → icône + bouton « Réessayer »

Ces composants garantissent une cohérence UX et évitent de dupliquer la logique d’erreur ou d’attente.

Feedback utilisateur
	•	Intégrer expo-haptics pour donner du feedback physique :
	•	Validation série → Haptics.selectionAsync()
	•	Erreur / refus → Haptics.notificationAsync('error')
	•	Retour visuel (animation ou changement de couleur) synchronisé avec l’haptique.

⸻

✨ Micro-interactions & animations

Objectif

Apporter du mouvement subtil et de la fluidité sans perturber l’attention.

Exemples à intégrer :
	•	Transition douce entre écrans (React Navigation stack).
	•	Animation à l’ajout d’un exercice (fade + scale).
	•	Feedback visuel à la validation d’une série (icône check animé).
	•	Effet rebond sur les boutons principaux (TouchableOpacity + scale transform).

Toujours viser la réactivité perceptive : 100–200ms max pour tout feedback visible.

⸻

🧭 États d’application & UX globale

États à couvrir
	•	Loading : affiché dès qu’une donnée est en cours de chargement (icône + texte court).
	•	Empty : visible quand une liste est vide (message neutre et positif, ex: “Aucune séance encore. Commence dès aujourd’hui.”).
	•	Error : affichage d’une icône + message explicite (ex: “Erreur de connexion. Réessaye.”).
	•	Success : retour clair mais discret (toast, vibration courte, couleur verte).

Consistance globale
	•	Tous les boutons ont un état visuel cohérent : hover, pressed, disabled.
	•	Les marges et rayons sont uniformes (ex: borderRadius: 12).
	•	Espacements verticaux constants (ex: spacing 8/16/24).
	•	Finaliser le feed social : duplication complète d’une séance à partir du snapshot partagé (reconstruction exercices + séries), états Suivre/Suivi clairs, gestion follow/unfollow en offline avec feedback visuel/toasts.

⸻

✅ Definition of Done (DoD)
	•	L’app dispose de 2 thèmes (clair/sombre) fonctionnels et persistants.
	•	Les icônes sont homogènes et réutilisées via un composant central.
	•	Les retours haptiques sont présents sur les actions clés (validation, erreur, partage).
	•	Les états loading / empty / error sont visibles et cohérents dans toutes les vues.
	•	Aucune page brute sans feedback utilisateur visible.
	•	Jalon M5 respecté : toutes les suites de tests (unitaires, intégration, Detox) passent avant d’entamer l’habillage.

⸻

🔍 Tests rapides
	1.	Activer/désactiver le mode sombre → couleurs et textes restent lisibles.
	2.	Forcer un chargement (ex: GET /exercises) → l’état loading s’affiche correctement.
	3.	Simuler une erreur réseau → l’état ErrorState apparaît avec un bouton « Réessayer ».
	4.	Valider une série → retour haptique + feedback visuel simultané.
	5.	Naviguer rapidement entre écrans → animations fluides, sans flicker.

⸻

⚠️ Points d’attention
	•	Ne pas multiplier les effets inutiles : privilégier la subtilité et la vitesse.
	•	Vérifier le contraste des couleurs pour l’accessibilité.
	•	Les animations doivent être non bloquantes (pas de freeze UI).
	•	Tester les performances sur téléphone milieu de gamme (Android surtout).

⸻

💡 Résumé opérationnel
	•	Habillage visuel homogène, fluide et professionnel.
	•	Retour sensoriel à chaque action clé (vue + haptique).
	•	Gestion des états universelle et centralisée.

Cette étape donne à l’app son charme d’usage quotidien : cohérente, fluide, vivante. Rien ne choque, tout répond.
