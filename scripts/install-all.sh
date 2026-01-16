#!/bin/bash
# =============================================================================
# Ortho Patient App - One-Click Server Installation
# =============================================================================
# Полностью автоматизированная установка и настройка сервера
# Запуск: curl -sSL https://raw.githubusercontent.com/your-repo/scripts/install-all.sh | sudo bash
# Или: sudo ./install-all.sh
# =============================================================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Конфигурация - ИЗМЕНИТЕ ЭТИ ЗНАЧЕНИЯ
PROJECT_ROOT="/opt/ortho-innovations"
APP_DIR="frontend/patient-app"
COMPOSE_FILE="docker-compose.dev.yml"
DEPLOY_USER="deploy"
GITLAB_REPO="git@gitlab.com:your-group/ortho-innovations.git"
DOMAIN="patient.orthoinnovations.ae"
ADMIN_EMAIL="admin@orthoinnovations.ae"

# Логирование
log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Баннер
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     ORTHO INNOVATIONS - AUTOMATED SERVER SETUP               ║"
echo "║     Patient App Deployment System                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Проверка root
[[ $EUID -ne 0 ]] && error "This script must be run as root (sudo)"

# =============================================================================
# 1. ОБНОВЛЕНИЕ СИСТЕМЫ
# =============================================================================
log "Step 1/8: Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
success "System updated"

# =============================================================================
# 2. УСТАНОВКА ЗАВИСИМОСТЕЙ
# =============================================================================
log "Step 2/8: Installing dependencies..."
apt-get install -y -qq \
    curl wget git ca-certificates gnupg lsb-release \
    nginx certbot python3-certbot-nginx \
    htop vim ufw fail2ban \
    > /dev/null 2>&1
success "Dependencies installed"

# =============================================================================
# 3. УСТАНОВКА DOCKER
# =============================================================================
log "Step 3/8: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null 2>&1
    systemctl enable docker
    systemctl start docker
    success "Docker installed"
else
    success "Docker already installed"
fi

# =============================================================================
# 4. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ DEPLOY
# =============================================================================
log "Step 4/8: Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    success "Deploy user created"
else
    usermod -aG docker "$DEPLOY_USER"
    success "Deploy user already exists, added to docker group"
fi

# Настройка SSH
DEPLOY_HOME="/home/$DEPLOY_USER"
SSH_DIR="$DEPLOY_HOME/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [ ! -f "$SSH_DIR/id_ed25519" ]; then
    ssh-keygen -t ed25519 -f "$SSH_DIR/id_ed25519" -N "" -C "deploy@ortho-server" > /dev/null 2>&1
    success "SSH key generated"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR"

# =============================================================================
# 5. НАСТРОЙКА ПРОЕКТА
# =============================================================================
log "Step 5/8: Setting up project directory..."
mkdir -p "$PROJECT_ROOT"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_ROOT"

# Создание .env файла если не существует
ENV_FILE="$PROJECT_ROOT/$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    mkdir -p "$(dirname "$ENV_FILE")"
    cat > "$ENV_FILE" << 'ENVEOF'
# Database
DB_PASSWORD=ortho_secure_password_change_me
DATABASE_URL=postgresql://ortho:${DB_PASSWORD}@db:5432/ortho_patient

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-me
OAUTH_SERVER_URL=
OWNER_NAME=
OWNER_OPEN_ID=

# Forge API
BUILT_IN_FORGE_API_KEY=
BUILT_IN_FORGE_API_URL=

# Frontend
VITE_APP_ID=
VITE_APP_TITLE=Ortho Innovations
VITE_APP_LOGO=
VITE_OAUTH_PORTAL_URL=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=

# Firebase (Push notifications)
VITE_FIREBASE_API_KEY=AIzaSyB_kgiOiqLwZkWq-ENi64GYyJSwAKK7dBQ
VITE_FIREBASE_AUTH_DOMAIN=ortho-innovations.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ortho-innovations
VITE_FIREBASE_STORAGE_BUCKET=ortho-innovations.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=914686839626
VITE_FIREBASE_APP_ID=1:914686839626:web:167c8a6ca7af14d85e4fb3
VITE_FIREBASE_VAPID_KEY=BLvxBh3zA6oKMU-UGpFKgWumw5JfvFQL9Of26hwfarqJTfd_4WSxudNM8-0zikjVer7R3wFk5ELVlMrDyebQ6wQ

# Analytics
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
ENVEOF
    chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
    warn ".env file created - PLEASE EDIT WITH YOUR VALUES: $ENV_FILE"
fi

# =============================================================================
# 6. НАСТРОЙКА NGINX
# =============================================================================
log "Step 6/8: Configuring Nginx..."
cat > /etc/nginx/sites-available/ortho-patient-app << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60;
        proxy_send_timeout 60;
    }

    # Health check
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/ortho-patient-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
success "Nginx configured"

# =============================================================================
# 7. НАСТРОЙКА FIREWALL
# =============================================================================
log "Step 7/8: Configuring firewall..."
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow ssh > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
success "Firewall configured"

# =============================================================================
# 8. СОЗДАНИЕ SYSTEMD СЕРВИСА
# =============================================================================
log "Step 8/8: Creating systemd service..."
cat > /etc/systemd/system/ortho-patient-app.service << EOF
[Unit]
Description=Ortho Patient App
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=$DEPLOY_USER
WorkingDirectory=$PROJECT_ROOT/$APP_DIR
ExecStart=/usr/bin/docker compose -f $COMPOSE_FILE up -d
ExecStop=/usr/bin/docker compose -f $COMPOSE_FILE down
ExecReload=/usr/bin/docker compose -f $COMPOSE_FILE restart
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ortho-patient-app
success "Systemd service created"

# =============================================================================
# СОЗДАНИЕ СКРИПТА ДЕПЛОЯ
# =============================================================================
cat > /usr/local/bin/ortho-deploy << 'DEPLOYEOF'
#!/bin/bash
set -e
cd /opt/ortho-innovations
git fetch origin main
git reset --hard origin/main
cd frontend/patient-app
docker compose -f docker-compose.dev.yml down --remove-orphans
docker image prune -f
docker compose -f docker-compose.dev.yml up -d --build
sleep 15
docker compose -f docker-compose.dev.yml ps
echo "Deployment completed at $(date)"
DEPLOYEOF
chmod +x /usr/local/bin/ortho-deploy

# =============================================================================
# ВЫВОД РЕЗУЛЬТАТОВ
# =============================================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    INSTALLATION COMPLETE                     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Server IP:${NC} $(hostname -I | awk '{print $1}')"
echo -e "${GREEN}Deploy user:${NC} $DEPLOY_USER"
echo -e "${GREEN}Project path:${NC} $PROJECT_ROOT/$APP_DIR"
echo ""
echo -e "${YELLOW}═══ GITLAB CI/CD VARIABLES ═══${NC}"
echo ""
echo -e "${CYAN}SSH_PRIVATE_KEY:${NC}"
cat "$SSH_DIR/id_ed25519"
echo ""
echo -e "${CYAN}DEPLOY_SERVER:${NC} $(hostname -I | awk '{print $1}')"
echo -e "${CYAN}DEPLOY_USER:${NC} $DEPLOY_USER"
echo ""
echo -e "${YELLOW}═══ NEXT STEPS ═══${NC}"
echo "1. Clone repository: cd $PROJECT_ROOT && git clone $GITLAB_REPO ."
echo "2. Edit .env file: nano $ENV_FILE"
echo "3. Add SSH public key to GitLab deploy keys:"
cat "$SSH_DIR/id_ed25519.pub"
echo ""
echo "4. Add CI/CD variables in GitLab (Settings → CI/CD → Variables)"
echo "5. Get SSL certificate: certbot --nginx -d $DOMAIN"
echo "6. Start app: ortho-deploy"
echo ""
echo -e "${GREEN}Quick deploy command: ortho-deploy${NC}"
