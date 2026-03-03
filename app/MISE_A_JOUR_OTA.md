# Mise à jour OTA (Over-The-Air)

## Pourquoi « ça ne change rien » ?

La mise à jour OTA **ne s’applique qu’à l’app qui a été installée avec le bon build**. Si tu as encore une **ancienne** version (avant qu’on configure les updates), cette version **ne va pas chercher** les mises à jour. Donc `eas update` envoie bien la mise à jour, mais ton téléphone ne la reçoit pas.

---

## Checklist pour que l’OTA marche

### 1. Tu as bien la **dernière** version de l’app sur ton téléphone ?

- Ouvre **TestFlight** sur ton iPhone.
- Regarde la version de **Gorillax Gym** (ex. « Build 4 » ou numéro de version).
- Si une **mise à jour** est proposée → installe-la. C’est ce build qui sait récupérer les OTA.
- Si tu n’as jamais installé le build qu’on a fait après avoir ajouté `runtimeVersion` + `updates` + `channel`, alors **aucune** mise à jour OTA ne s’affichera tant que tu n’as pas cette version installée.

### 2. Envoyer une mise à jour OTA

Dans le dossier **`app`** :

```bash
cd /Users/arthurdestribats/Downloads/appli_V3-main/app
npx eas-cli update --branch production --message "Description de la modif"
```

Ou avec le script npm (en mettant ta description à la place de `"Ma modif"`) :

```bash
npm run update:ota -- "Ma modif"
```

### 3. Sur le téléphone

- **Ferme complètement** l’app (pas juste mettre en arrière-plan : la quitter).
- **Rouvre** Gorillax Gym.
- L’app vérifie les mises à jour au démarrage. Tu peux avoir besoin de la **fermer et rouvrir une 2e fois** si la première ouverture était trop rapide.

---

## Si après ça tu ne vois toujours pas les changements

1. **Vérifier que le bon build est installé**  
   Dans TestFlight, regarde le numéro de build. Il doit être celui du **dernier** build iOS que tu as fait (celui avec la config OTA), pas un ancien.

2. **Vérifier que l’update a bien été publiée**  
   Va sur [expo.dev](https://expo.dev) → ton projet **gorillax-gym** → onglet **Updates**. Tu dois voir une entrée récente sur le branch **production**.

3. **En dernier recours : refaire un build**  
   Si tu préfères ne plus dépendre de l’OTA pour cette version, tu peux refaire un build complet et le soumettre sur TestFlight. Une fois cette nouvelle version installée, les **prochains** `eas update` fonctionneront sans refaire un build.

---

## Résumé

- **OTA = seulement pour l’app installée avec le build qui a la config updates.**
- Si l’app sur ton téléphone est une **vieille** version TestFlight → installe la **dernière** dans TestFlight, puis refais un `eas update` et ferme/rouvre l’app.
- Commande : `npx eas-cli update --branch production --message "Ta description"`.
