# Sécurité - Gorillax API

## Authentification sécurisée

### Configuration requise

1. **Secret JWT sécurisé**
   ```bash
   # Générer un secret sécurisé
   python scripts/generate_secret.py
   
   # Ajouter au fichier .env
   AUTH_SECRET=your_generated_secret_here
   ```

2. **Variables d'environnement**
   ```bash
   # Obligatoire
   AUTH_SECRET=your_secure_secret_32_chars_min
   
   # Optionnel - Rate limiting
   RATE_LIMIT_ENABLED=true
   MAX_LOGIN_ATTEMPTS=5
   LOGIN_COOLDOWN_MINUTES=15
   ```

### Fonctionnalités de sécurité

#### 1. Rate Limiting
- **5 tentatives max** par utilisateur/IP en 15 minutes
- Cooldown automatique après échec
- Nettoyage automatique des anciennes tentatives

#### 2. Validation des mots de passe
- **Minimum 8 caractères**
- Au moins 1 minuscule, 1 majuscule, 1 chiffre
- Protection contre les mots de passe faibles
- Limitation à 128 caractères max

#### 3. Validation des noms d'utilisateur
- **3-30 caractères**
- Caractères autorisés : lettres, chiffres, `-`, `_`
- Noms réservés bloqués (admin, root, etc.)

#### 4. Tokens JWT sécurisés
- **Access tokens** : 30 minutes
- **Refresh tokens** : 14 jours
- Révocation possible en base
- Signature HMAC-SHA256

#### 5. Hachage des mots de passe
- **PBKDF2** avec 100,000 itérations
- Salt aléatoire par mot de passe
- Comparaison timing-safe

### Endpoints sécurisés

```
POST /auth/register  - Inscription avec validation
POST /auth/login     - Connexion avec rate limiting
POST /auth/refresh   - Renouvellement de token
GET  /auth/me        - Profil utilisateur
POST /auth/logout    - Déconnexion sécurisée
```

### Bonnes pratiques

#### En développement
```bash
# Utiliser un secret généré
python scripts/generate_secret.py

# Activer le rate limiting
RATE_LIMIT_ENABLED=true
```

#### En production
```bash
# Secret fort obligatoire (32+ caractères)
AUTH_SECRET=$(python scripts/generate_secret.py)

# HTTPS uniquement
# Reverse proxy (nginx/cloudflare)
# Monitoring des tentatives de connexion
```

### Monitoring

#### Logs à surveiller
- Tentatives de connexion échouées répétées
- Utilisation de mots de passe faibles
- Tokens expirés/invalides
- Rate limiting déclenché

#### Métriques importantes
- Taux d'échec de connexion par IP
- Nombre de comptes créés par jour
- Durée de vie moyenne des sessions

### Limitations actuelles

#### À implémenter en Phase 2
- [ ] Validation d'email obligatoire
- [ ] Reset password par email
- [ ] OAuth (Google, Apple)
- [ ] 2FA/MFA
- [ ] Device tracking
- [ ] Géolocalisation des connexions

#### Configuration avancée
- [ ] CORS strict en production
- [ ] Headers de sécurité (HSTS, CSP)
- [ ] Logging centralisé
- [ ] Alertes automatiques

### Dépannage

#### Erreurs communes

**"AUTH_SECRET must be changed from default value"**
```bash
python scripts/generate_secret.py
# Copier le secret généré dans .env
```

**"Too many failed attempts"**
```bash
# Attendre la fin du cooldown (15 min par défaut)
# Ou réduire MAX_LOGIN_ATTEMPTS en développement
```

**"Password must contain..."**
```bash
# Utiliser un mot de passe avec :
# - 8+ caractères
# - 1 minuscule, 1 majuscule, 1 chiffre
```

### Contact sécurité

Pour signaler une vulnérabilité :
- Email : security@gorillax.com
- Pas de divulgation publique avant correction