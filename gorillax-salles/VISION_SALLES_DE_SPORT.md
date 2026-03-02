# Gorillax — Intégration salles de sport

## Objectif

Permettre d’utiliser l’application Gorillax dans les salles de sport via :
1. Une **carte virtuelle** (pass Wallet Apple / Google) que l’utilisateur présente sur un lecteur.
2. Un **système interne** déployé dans la salle, sur ou à proximité des machines, qui reconnaît l’utilisateur et connecte son compte aux **machines connectées**.

---

## Vision utilisateur

- L’utilisateur a un **pass** (carte virtuelle) dans **Apple Wallet** ou **Google Wallet**.
- À l’entrée ou sur une machine, il **présente le pass** (code-barres / QR ou NFC) sur un **détecteur / lecteur**.
- Le système de la salle **identifie l’utilisateur** et **connecte son compte Gorillax** aux machines (tapis, vélos, etc.) pour afficher son profil, sa séance en cours, ses objectifs, etc.

---

## Faisabilité technique

**Oui, c’est possible.** Aucun blocage technique fondamental.

| Élément | Statut |
|--------|--------|
| Pass Wallet (Apple / Google) avec code scannable | Standard (barcode / QR sur le pass) |
| Lecteur en salle qui lit le code et envoie l’ID à un serveur | Standard (bornes, portiques, lecteurs sur machines) |
| Backend qui associe token du pass ↔ compte Gorillax | API classique |
| Machines avec écran / connectivité qui reçoivent l’identité | Déjà répandu dans les salles équipées |

**Enjeux principaux :**
- **Intégration côté salle** : développer et déployer le système interne (logiciel + éventuel serveur local ou cloud).
- **Matériel** : selon les salles — lecteurs, tablettes/écrans sur les machines, réseau.
- **Partenariats** : accord des salles pour installer et utiliser le système (aspect commercial et opérationnel).

---

## Architecture cible (résumé)

### 1. Côté utilisateur (déjà prévu / à compléter)

- **App Gorillax** : compte utilisateur, séances, objectifs.
- **Pass Wallet** : généré par l’app ou le backend, contient un **identifiant unique** (token) par utilisateur. Ajout dans Apple Wallet et Google Wallet. À la salle : l’utilisateur affiche le pass, le lecteur scanne le code (barre / QR ou NFC).

### 2. Côté salle — système interne à déployer

1. **Lecteur (détecteur)**  
   À l’entrée ou sur chaque machine : scan du pass (code-barres ou NFC). Le lecteur envoie l’identifiant scanné à un **service central** de la salle.

2. **Service central (backend salle)**  
   - Reçoit l’identifiant du pass (token / member ID).  
   - Appelle l’**API Gorillax** pour résoudre : « ce token = quel utilisateur ? » (et optionnellement récupérer profil, dernière séance, objectifs).  
   - Transmet l’identité (et les infos utiles) aux **machines connectées**.

3. **Machines connectées**  
   - Écrans / tablettes sur ou à côté des machines : affichage d’une **webapp ou app** (profil Gorillax, séance en cours, consignes).  
   - Ou appareils connectés (tapis, vélos, etc.) qui reçoivent l’ID utilisateur et peuvent synchroniser avec Gorillax (données de séance, objectifs).

4. **Déploiement**  
   Le système interne est déployé **par salle** : serveur local (ou cloud dédié) + clients sur les machines (webapp ou app) qui se connectent à ce serveur.

### 3. Lien avec Gorillax

- **API Gorillax** : endpoint(s) du type « token du pass → utilisateur + infos nécessaires » pour que le backend salle sache qui est devant la machine et quelles données afficher/envoyer.

---

## Prochaines étapes (à détailler dans le nouveau projet)

1. **Pass Wallet** : spécification et génération du pass (Apple Wallet + Google Wallet), format du token, sécurité.  
2. **API Gorillax** : conception des endpoints « résolution token → utilisateur » et éventuellement « données séance / objectifs pour affichage machine ».  
3. **Système interne salle** : architecture (serveur, lecteurs, logiciel), protocole lecteur ↔ serveur, serveur ↔ machines.  
4. **Interface sur les machines** : webapp ou app légère pour afficher le profil / la séance et interagir avec les machines connectées.  
5. **Déploiement et partenariats** : déploiement par salle, maintenance, accords avec les salles.

---

*Document de vision — à utiliser comme base pour le nouveau dossier / projet « suite salles de sport ».*
