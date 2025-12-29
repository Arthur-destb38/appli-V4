#!/usr/bin/env bash
#
# 🦍 Gorillax - Script de déploiement automatisé
# 
# Usage: ./deploy.sh [options]
#   --api-only    Lance uniquement l'API
#   --app-only    Lance uniquement l'app mobile
#   --tunnel      Lance l'app avec un tunnel public (accessible depuis n'importe où)
#   --install     Installe les dépendances sans lancer
#   --help        Affiche l'aide
#
# Ce script:
#   1. Détecte l'OS (Mac/Linux/Windows)
#   2. Vérifie les prérequis (Python, Node, pnpm)
#   3. Crée l'environnement virtuel Python
#   4. Installe les dépendances (API + App)
#   5. Lance l'application (API + App mobile)
#

set -e  # Arrêter en cas d'erreur

# ============================================
# COULEURS ET FORMATAGE
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ============================================
# FONCTIONS UTILITAIRES
# ============================================

print_banner() {
    echo -e "${CYAN}"
    echo "  ██████╗  ██████╗ ██████╗ ██╗██╗     ██╗      █████╗ ██╗  ██╗"
    echo "  ██╔════╝ ██╔═══██╗██╔══██╗██║██║     ██║     ██╔══██╗╚██╗██╔╝"
    echo "  ██║  ███╗██║   ██║██████╔╝██║██║     ██║     ███████║ ╚███╔╝ "
    echo "  ██║   ██║██║   ██║██╔══██╗██║██║     ██║     ██╔══██║ ██╔██╗ "
    echo "  ╚██████╔╝╚██████╔╝██║  ██║██║███████╗███████╗██║  ██║██╔╝ ██╗"
    echo "   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${BOLD}  🦍 Script de déploiement automatisé${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

show_help() {
    echo "Usage: ./deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  --api-only    Lance uniquement l'API FastAPI"
    echo "  --app-only    Lance uniquement l'app mobile Expo"
    echo "  --tunnel      Lance avec un tunnel public (accessible depuis n'importe où)"
    echo "  --install     Installe les dépendances sans lancer l'application"
    echo "  --help        Affiche cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./deploy.sh              # Installation complète + lancement"
    echo "  ./deploy.sh --tunnel     # Lancement avec tunnel public"
    echo "  ./deploy.sh --install    # Installation uniquement"
    echo "  ./deploy.sh --api-only   # Lance seulement l'API"
    echo ""
}

# ============================================
# DÉTECTION DE L'OS
# ============================================

detect_os() {
    log_step "📍 Détection de l'environnement"
    
    case "$(uname -s)" in
        Linux*)     OS="Linux";;
        Darwin*)    OS="Mac";;
        CYGWIN*|MINGW*|MSYS*) OS="Windows";;
        *)          OS="Unknown";;
    esac
    
    log_info "Système d'exploitation: ${BOLD}$OS${NC}"
    
    # Architecture
    ARCH=$(uname -m)
    log_info "Architecture: ${BOLD}$ARCH${NC}"
    
    if [ "$OS" = "Unknown" ]; then
        log_error "Système d'exploitation non supporté"
        exit 1
    fi
}

# ============================================
# VÉRIFICATION DES PRÉREQUIS
# ============================================

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# ============================================
# INSTALLATION AUTOMATIQUE DE NODE.JS
# ============================================

install_node() {
    log_info "Détection de la méthode d'installation pour $OS..."
    
    # Créer un dossier local pour Node si besoin
    LOCAL_NODE_DIR="$SCRIPT_DIR/.local_node"
    
    case "$OS" in
        Mac)
            # Essayer Homebrew d'abord
            if check_command brew; then
                log_info "Installation via Homebrew..."
                brew install node@20
                brew link node@20 --force --overwrite 2>/dev/null || true
                export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
                export PATH="/usr/local/opt/node@20/bin:$PATH"
            else
                # Télécharger Node.js directement (portable, sans sudo)
                log_info "Téléchargement de Node.js 20 (portable)..."
                mkdir -p "$LOCAL_NODE_DIR"
                
                # Détecter l'architecture
                if [ "$ARCH" = "arm64" ]; then
                    NODE_ARCH="arm64"
                else
                    NODE_ARCH="x64"
                fi
                
                NODE_VERSION="v20.18.0"
                NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
                
                log_info "Téléchargement depuis $NODE_URL..."
                curl -fsSL "$NODE_URL" -o "$LOCAL_NODE_DIR/node.tar.gz"
                
                log_info "Extraction..."
                tar -xzf "$LOCAL_NODE_DIR/node.tar.gz" -C "$LOCAL_NODE_DIR" --strip-components=1
                rm -f "$LOCAL_NODE_DIR/node.tar.gz"
                
                # Ajouter au PATH
                export PATH="$LOCAL_NODE_DIR/bin:$PATH"
                log_success "Node.js installé localement dans $LOCAL_NODE_DIR"
            fi
            ;;
        Linux)
            # Essayer les gestionnaires de paquets d'abord
            if check_command apt-get; then
                log_info "Installation via NodeSource (apt)..."
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
                sudo apt-get install -y nodejs 2>/dev/null
            elif check_command dnf; then
                log_info "Installation via dnf..."
                sudo dnf install -y nodejs 2>/dev/null
            elif check_command pacman; then
                log_info "Installation via pacman..."
                sudo pacman -S --noconfirm nodejs npm 2>/dev/null
            else
                # Fallback: téléchargement direct
                log_info "Téléchargement de Node.js 20 (portable)..."
                mkdir -p "$LOCAL_NODE_DIR"
                
                NODE_VERSION="v20.18.0"
                NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz"
                
                curl -fsSL "$NODE_URL" -o "$LOCAL_NODE_DIR/node.tar.gz"
                tar -xzf "$LOCAL_NODE_DIR/node.tar.gz" -C "$LOCAL_NODE_DIR" --strip-components=1
                rm -f "$LOCAL_NODE_DIR/node.tar.gz"
                
                export PATH="$LOCAL_NODE_DIR/bin:$PATH"
                log_success "Node.js installé localement dans $LOCAL_NODE_DIR"
            fi
            ;;
        Windows)
            if check_command choco; then
                log_info "Installation via Chocolatey..."
                choco install nodejs-lts -y 2>/dev/null
            elif check_command winget; then
                log_info "Installation via winget..."
                winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements 2>/dev/null
            else
                log_error "Impossible d'installer Node.js automatiquement sur Windows"
                log_info "  → Téléchargez Node.js 20 LTS depuis https://nodejs.org"
                log_info "  → Ou installez Chocolatey: https://chocolatey.org/install"
            fi
            ;;
    esac
    
    # Recharger le PATH
    hash -r 2>/dev/null || true
}

# ============================================
# INSTALLATION AUTOMATIQUE DE PYTHON
# ============================================

install_python() {
    log_info "Détection de la méthode d'installation pour $OS..."
    
    case "$OS" in
        Mac)
            if check_command brew; then
                log_info "Installation via Homebrew..."
                brew install python@3.12
                brew link python@3.12 --force --overwrite 2>/dev/null || true
                export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"
                export PATH="/usr/local/opt/python@3.12/bin:$PATH"
            else
                log_error "Homebrew requis pour installer Python sur Mac"
                log_info "  → Installez Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            fi
            ;;
        Linux)
            if check_command apt-get; then
                log_info "Installation via apt..."
                sudo apt-get update 2>/dev/null
                sudo apt-get install -y python3 python3-pip python3-venv 2>/dev/null
            elif check_command dnf; then
                log_info "Installation via dnf..."
                sudo dnf install -y python3 python3-pip 2>/dev/null
            elif check_command pacman; then
                log_info "Installation via pacman..."
                sudo pacman -S --noconfirm python python-pip 2>/dev/null
            else
                log_error "Gestionnaire de paquets non reconnu"
            fi
            ;;
        Windows)
            if check_command choco; then
                log_info "Installation via Chocolatey..."
                choco install python -y 2>/dev/null
            elif check_command winget; then
                log_info "Installation via winget..."
                winget install Python.Python.3.12 --accept-source-agreements --accept-package-agreements 2>/dev/null
            else
                log_error "Chocolatey ou winget requis pour installer Python sur Windows"
                log_info "  → Téléchargez Python depuis https://python.org"
            fi
            ;;
    esac
    
    # Recharger le PATH
    hash -r 2>/dev/null || true
}

check_prerequisites() {
    log_step "🔍 Vérification des prérequis"
    
    local missing=0
    
    # Python
    if check_command python3; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        log_success "Python 3 trouvé (v$PYTHON_VERSION)"
        PYTHON_CMD="python3"
    elif check_command python; then
        PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
        if [[ "$PYTHON_VERSION" == 3* ]]; then
            log_success "Python 3 trouvé (v$PYTHON_VERSION)"
            PYTHON_CMD="python"
        else
            log_warning "Python 3 requis (trouvé: Python $PYTHON_VERSION) - tentative d'installation..."
            install_python
            if check_command python3; then
                PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
                log_success "Python 3 installé avec succès (v$PYTHON_VERSION)"
                PYTHON_CMD="python3"
            else
                log_error "Échec de l'installation automatique de Python"
                missing=1
            fi
        fi
    else
        log_warning "Python 3 non trouvé - tentative d'installation automatique..."
        install_python
        
        # Re-vérifier après installation
        if check_command python3; then
            PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
            log_success "Python 3 installé avec succès (v$PYTHON_VERSION)"
            PYTHON_CMD="python3"
        else
            log_error "Échec de l'installation automatique de Python"
            log_info "  → Installez manuellement Python 3.10+ depuis https://python.org"
            missing=1
        fi
    fi
    
    # Node.js
    if check_command node; then
        NODE_VERSION=$(node --version 2>&1)
        log_success "Node.js trouvé ($NODE_VERSION)"
        
        # Vérifier si c'est Node 20+ (recommandé)
        NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 20 ]; then
            log_warning "Node.js 20+ recommandé pour Expo (trouvé: $NODE_VERSION)"
        fi
    else
        log_warning "Node.js non trouvé - tentative d'installation automatique..."
        install_node
        
        # Re-vérifier après installation
        if check_command node; then
            NODE_VERSION=$(node --version 2>&1)
            log_success "Node.js installé avec succès ($NODE_VERSION)"
        else
            log_error "Échec de l'installation automatique de Node.js"
            log_info "  → Installez manuellement Node.js 20 LTS depuis https://nodejs.org"
            missing=1
        fi
    fi
    
    # pnpm
    if check_command pnpm; then
        PNPM_VERSION=$(pnpm --version 2>&1)
        log_success "pnpm trouvé (v$PNPM_VERSION)"
    else
        log_warning "pnpm non trouvé - installation automatique..."
        if check_command npm; then
            npm install -g pnpm
            if check_command pnpm; then
                log_success "pnpm installé avec succès"
            else
                log_error "Échec de l'installation de pnpm"
                missing=1
            fi
        else
            log_error "npm non trouvé - impossible d'installer pnpm"
            missing=1
        fi
    fi
    
    # Git (optionnel mais utile)
    if check_command git; then
        GIT_VERSION=$(git --version 2>&1 | cut -d' ' -f3)
        log_success "Git trouvé (v$GIT_VERSION)"
    else
        log_warning "Git non trouvé (optionnel)"
    fi
    
    if [ $missing -eq 1 ]; then
        echo ""
        log_error "Des prérequis sont manquants. Veuillez les installer avant de continuer."
        exit 1
    fi
    
    log_success "Tous les prérequis sont satisfaits !"
}

# ============================================
# INSTALLATION DE L'API
# ============================================

install_api() {
    log_step "🐍 Installation de l'API FastAPI"
    
    cd "$SCRIPT_DIR/api"
    
    # Déterminer le chemin selon l'OS
    if [ "$OS" = "Windows" ]; then
        VENV_ACTIVATE=".venv/Scripts/activate"
        PIP_CMD=".venv/Scripts/pip"
        PYTHON_VENV_CMD=".venv/Scripts/python"
    else
        VENV_ACTIVATE=".venv/bin/activate"
        PIP_CMD=".venv/bin/pip"
        PYTHON_VENV_CMD=".venv/bin/python"
    fi
    
    # Créer ou recréer l'environnement virtuel si nécessaire
    if [ ! -d ".venv" ] || [ ! -f "$PIP_CMD" ]; then
        log_info "Création de l'environnement virtuel Python..."
        if [ -d ".venv" ]; then
            log_warning "Venv existant mais pip manquant, recréation..."
            rm -rf .venv
        fi
        $PYTHON_CMD -m venv .venv
        if [ ! -f "$PIP_CMD" ]; then
            log_error "Échec de la création du venv. Vérifiez que Python est correctement installé."
            exit 1
        fi
        log_success "Environnement virtuel créé"
    else
        log_info "Environnement virtuel existant détecté"
    fi
    
    # Activer le venv et installer les dépendances
    log_info "Installation des dépendances Python..."
    
    # Upgrade pip et installer les dépendances
    if [ -f "$PIP_CMD" ]; then
        $PIP_CMD install --upgrade pip -q || {
            log_warning "Échec de l'upgrade pip, tentative avec python -m pip..."
            $PYTHON_VENV_CMD -m pip install --upgrade pip -q || {
                log_error "Impossible d'installer pip. Vérifiez votre installation Python."
                exit 1
            }
        }
        $PIP_CMD install fastapi uvicorn sqlmodel sqlalchemy pydantic alembic python-dotenv httpx -q || {
            log_warning "Échec avec pip, tentative avec python -m pip..."
            $PYTHON_VENV_CMD -m pip install fastapi uvicorn sqlmodel sqlalchemy pydantic alembic python-dotenv httpx -q || {
                log_error "Impossible d'installer les dépendances."
                exit 1
            }
        }
    else
        log_error "pip n'a pas été trouvé dans le venv après création. Vérifiez Python."
        exit 1
    fi
    
    log_success "Dépendances API installées"
    
    # Créer le fichier .env s'il n'existe pas
    if [ ! -f ".env" ]; then
        log_info "Création du fichier .env par défaut..."
        cat > .env << 'EOF'
# Configuration Gorillax API
# Généré automatiquement par deploy.sh

# Clé secrète pour l'authentification JWT
# (Changez cette valeur en production !)
AUTH_SECRET=gorillax-dev-secret-change-in-production

# URL de la base de données (optionnel, SQLite par défaut)
# DATABASE_URL=sqlite:///./src/gorillax.db

# URL du fichier d'exercices (optionnel)
# EXERCISES_URL=https://example.com/exercises.json
EOF
        log_success "Fichier .env créé avec les valeurs par défaut"
    else
        log_info "Fichier .env existant détecté"
    fi
    
    # Initialiser la base de données si nécessaire
    if [ ! -f "src/gorillax.db" ]; then
        log_info "Initialisation de la base de données..."
        if [ "$OS" = "Windows" ]; then
            .venv/Scripts/python -c "from api.db import init_db; init_db()"
        else
            .venv/bin/python -c "from api.db import init_db; init_db()" 2>/dev/null || true
        fi
        log_success "Base de données initialisée"
    fi
    
    cd "$SCRIPT_DIR"
}

# ============================================
# INSTALLATION DE L'APP MOBILE
# ============================================

install_app() {
    log_step "📱 Installation de l'App Mobile (Expo)"
    
    cd "$SCRIPT_DIR/app"
    
    # Installer les dépendances Node
    log_info "Installation des dépendances Node.js..."
    pnpm install --silent 2>/dev/null || pnpm install
    
    log_success "Dépendances App installées"
    
    cd "$SCRIPT_DIR"
}

# ============================================
# DÉTECTION DE L'IP LOCALE
# ============================================

get_local_ip() {
    case "$OS" in
        Mac)
            LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
            ;;
        Linux)
            LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
            ;;
        Windows)
            LOCAL_IP=$(ipconfig | grep -i "IPv4" | head -1 | awk '{print $NF}' || echo "localhost")
            ;;
        *)
            LOCAL_IP="localhost"
            ;;
    esac
    
    if [ -z "$LOCAL_IP" ] || [ "$LOCAL_IP" = "" ]; then
        LOCAL_IP="localhost"
    fi
}

# ============================================
# VÉRIFICATION DES PORTS
# ============================================

check_port() {
    local port=$1
    if [ "$OS" = "Windows" ]; then
        netstat -an | grep ":$port " | grep -q LISTEN && return 0 || return 1
    else
        lsof -i ":$port" &>/dev/null && return 0 || return 1
    fi
}

kill_port() {
    local port=$1
    log_warning "Le port $port est occupé, tentative de libération..."
    
    if [ "$OS" = "Windows" ]; then
        # Windows: trouver et tuer le processus
        for pid in $(netstat -ano | grep ":$port " | grep LISTEN | awk '{print $5}'); do
            taskkill /PID $pid /F 2>/dev/null || true
        done
    else
        # Mac/Linux: utiliser lsof
        local pid=$(lsof -ti ":$port" 2>/dev/null)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            sleep 1
        fi
    fi
    
    if check_port $port; then
        log_error "Impossible de libérer le port $port"
        return 1
    else
        log_success "Port $port libéré"
        return 0
    fi
}

# ============================================
# LANCEMENT DE L'API
# ============================================

start_api() {
    log_step "🚀 Lancement de l'API FastAPI"
    
    cd "$SCRIPT_DIR/api"
    
    # Vérifier si le port 8000 est libre
    if check_port 8000; then
        kill_port 8000 || {
            log_error "Le port 8000 est occupé et ne peut pas être libéré"
            log_info "Essayez: lsof -i :8000 puis kill <PID>"
            exit 1
        }
    fi
    
    log_info "Démarrage de l'API sur http://$LOCAL_IP:8000"
    
    # Lancer l'API en arrière-plan
    if [ "$OS" = "Windows" ]; then
        .venv/Scripts/uvicorn src.api.main:app --host 0.0.0.0 --port 8000 &
    else
        .venv/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8000 &
    fi
    
    API_PID=$!
    
    # Attendre que l'API soit prête
    log_info "Attente du démarrage de l'API..."
    local retries=0
    while [ $retries -lt 30 ]; do
        if curl -s "http://localhost:8000/health" &>/dev/null; then
            log_success "API démarrée avec succès !"
            log_info "  → Swagger UI: http://$LOCAL_IP:8000/docs"
            
            # Lancer le seed des données de démo
            log_info "Chargement des données de démo..."
            if [ "$OS" = "Windows" ]; then
                PYTHONPATH=. .venv/Scripts/python scripts/seed_demo.py 2>/dev/null || log_warning "Seed déjà effectué ou erreur"
            else
                PYTHONPATH=. .venv/bin/python scripts/seed_demo.py 2>/dev/null || log_warning "Seed déjà effectué ou erreur"
            fi
            log_success "Données de démo chargées !"
            
            cd "$SCRIPT_DIR"
            return 0
        fi
        sleep 1
        retries=$((retries + 1))
    done
    
    log_error "L'API n'a pas démarré dans les temps"
    cd "$SCRIPT_DIR"
    exit 1
}

# ============================================
# LANCEMENT DE L'APP MOBILE
# ============================================

start_app() {
    log_step "📱 Lancement de l'App Mobile (Expo)"
    
    cd "$SCRIPT_DIR/app"
    
    # Vérifier si le port 8081 est libre
    if check_port 8081; then
        kill_port 8081 || log_warning "Le port 8081 est occupé, Expo pourrait utiliser un autre port"
    fi
    
    # Installer ngrok si tunnel demandé
    if [ "$USE_TUNNEL" = true ]; then
        log_info "Mode tunnel activé - Installation de @expo/ngrok..."
        if ! npm list -g @expo/ngrok &>/dev/null; then
            npm install -g @expo/ngrok 2>/dev/null || sudo npm install -g @expo/ngrok 2>/dev/null || {
                log_warning "Installation de @expo/ngrok échouée, tentative locale..."
                pnpm add @expo/ngrok 2>/dev/null || npm install @expo/ngrok 2>/dev/null
            }
        fi
    fi
    
    # =============================================
    # MISE À JOUR AUTOMATIQUE DE L'IP LOCALE
    # =============================================
    local API_CONFIG_FILE="$SCRIPT_DIR/app/src/utils/api.ts"
    if [ -f "$API_CONFIG_FILE" ]; then
        log_info "Mise à jour de l'IP locale dans api.ts..."
        # Remplacer l'IP dans la ligne LOCAL_API_IP
        if [ "$OS" = "Mac" ]; then
            sed -i '' "s|const LOCAL_API_IP = 'http://[^']*'|const LOCAL_API_IP = 'http://$LOCAL_IP:8000'|g" "$API_CONFIG_FILE"
        else
            sed -i "s|const LOCAL_API_IP = 'http://[^']*'|const LOCAL_API_IP = 'http://$LOCAL_IP:8000'|g" "$API_CONFIG_FILE"
        fi
        log_success "IP locale configurée: $LOCAL_IP"
    else
        log_warning "Fichier api.ts non trouvé, configuration manuelle requise"
    fi
    
    log_info "Configuration de l'URL de l'API: http://$LOCAL_IP:8000"
    
    if [ "$USE_TUNNEL" = true ]; then
        log_info "Démarrage d'Expo avec tunnel public..."
    else
        log_info "Démarrage d'Expo..."
    fi
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  🦍 Gorillax est prêt !${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}API:${NC}     http://$LOCAL_IP:8000"
    echo -e "  ${CYAN}Swagger:${NC} http://$LOCAL_IP:8000/docs"
    if [ "$USE_TUNNEL" = true ]; then
        echo -e "  ${CYAN}App:${NC}     ${BOLD}URL publique dans le QR code ci-dessous${NC}"
        echo -e "           ${YELLOW}(accessible depuis n'importe où !)${NC}"
    else
        echo -e "  ${CYAN}App:${NC}     Scannez le QR code avec Expo Go"
        echo -e "           ${YELLOW}(même réseau Wi-Fi requis)${NC}"
    fi
    echo ""
    echo -e "  ${YELLOW}Commandes Expo:${NC}"
    echo -e "    ${BOLD}i${NC} → Ouvrir sur simulateur iOS"
    echo -e "    ${BOLD}a${NC} → Ouvrir sur émulateur Android"
    echo -e "    ${BOLD}w${NC} → Ouvrir dans le navigateur"
    echo ""
    echo -e "  ${RED}Ctrl+C${NC} pour arrêter"
    echo ""
    
    # Lancer Expo avec les variables d'environnement
    if [ "$USE_TUNNEL" = true ]; then
        EXPO_PUBLIC_API_URL="http://$LOCAL_IP:8000" \
        EXPO_DEV_SERVER_PORT=8081 \
        pnpm start -- --tunnel --clear
    else
        # Expo affiche le QR code automatiquement
        EXPO_PUBLIC_API_URL="http://$LOCAL_IP:8000" \
        EXPO_DEV_SERVER_PORT=8081 \
        pnpm start -- --clear
    fi
}

# ============================================
# NETTOYAGE À LA FERMETURE
# ============================================

cleanup() {
    echo ""
    log_info "Arrêt de l'application..."
    
    # Tuer l'API si elle tourne
    if [ -n "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    
    # Tuer les processus sur les ports utilisés
    if [ "$OS" != "Windows" ]; then
        lsof -ti :8000 | xargs kill -9 2>/dev/null || true
        lsof -ti :8081 | xargs kill -9 2>/dev/null || true
    fi
    
    log_success "Application arrêtée proprement"
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT SIGTERM

# ============================================
# MAIN
# ============================================

main() {
    # Récupérer le répertoire du script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Parser les arguments
    API_ONLY=false
    APP_ONLY=false
    INSTALL_ONLY=false
    USE_TUNNEL=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --api-only)
                API_ONLY=true
                shift
                ;;
            --app-only)
                APP_ONLY=true
                shift
                ;;
            --tunnel)
                USE_TUNNEL=true
                shift
                ;;
            --install)
                INSTALL_ONLY=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Option inconnue: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Afficher la bannière
    print_banner
    
    # Détection de l'OS
    detect_os
    
    # Vérification des prérequis
    check_prerequisites
    
    # Installation
    if [ "$APP_ONLY" = false ]; then
        install_api
    fi
    
    if [ "$API_ONLY" = false ]; then
        install_app
    fi
    
    # Si --install, on s'arrête là
    if [ "$INSTALL_ONLY" = true ]; then
        echo ""
        log_success "Installation terminée avec succès !"
        echo ""
        log_info "Pour lancer l'application: ./deploy.sh"
        exit 0
    fi
    
    # Récupérer l'IP locale
    get_local_ip
    
    # Lancement
    if [ "$APP_ONLY" = false ]; then
        start_api
    fi
    
    if [ "$API_ONLY" = false ]; then
        start_app
    elif [ "$API_ONLY" = true ]; then
        # Si API only, on attend
        echo ""
        log_success "API lancée sur http://$LOCAL_IP:8000"
        log_info "Appuyez sur Ctrl+C pour arrêter"
        wait $API_PID
    fi
}

# Lancer le script
main "$@"

