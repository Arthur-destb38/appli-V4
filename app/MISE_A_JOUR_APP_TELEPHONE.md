# Mettre à jour l’app sur ton téléphone

Quand tu as fait des modifs dans le code, voici comment les avoir sur l’app déjà téléchargée sur ton téléphone.

---

## Option 1 : Mise à jour OTA (sans rebuild)

**À utiliser si** tu as déjà installé le **dernier build** (celui avec la config OTA).

1. Dans le terminal, depuis le dossier **`app`** :
   ```bash
   cd /Users/arthurdestribats/Downloads/appli_V3-main/app
   npx eas-cli update --branch production --message "Dernières modifs"
   ```

2. Sur ton téléphone :
   - **Ferme complètement** l’app (la quitter, pas juste mettre en arrière-plan).
   - **Rouvre** Gorillax Gym.

3. L’app récupère la mise à jour et tu vois les changements. **Pas besoin de rebuild.**

---

## Option 2 : Rebuild + TestFlight (si l’OTA ne marche pas)

**À utiliser si** après l’option 1 tu ne vois **aucun changement** → ton app est une ancienne version qui ne reçoit pas les OTA.

1. **Lancer un nouveau build** :
   ```bash
   cd /Users/arthurdestribats/Downloads/appli_V3-main/app
   npx eas-cli build --platform ios --profile production
   ```
   Attendre la fin du build (environ 15–40 min).

2. **Envoyer sur TestFlight** (quand le build est terminé) :
   ```bash
   npx eas-cli submit --platform ios --latest
   ```

3. **Sur ton téléphone** : ouvre **TestFlight** → **Gorillax Gym** → **Mettre à jour** (ou **Installer**).

Après avoir installé cette version, les **prochaines** modifs pourront se faire uniquement avec l’**option 1** (`eas update`), sans refaire de build.

---

## En résumé

| Situation | Action |
|-----------|--------|
| Tu as le dernier build installé | `eas update` → fermer / rouvrir l’app. Pas de rebuild. |
| Tu as une ancienne version / rien ne change après OTA | Rebuild → submit TestFlight → mettre à jour l’app depuis TestFlight. |
