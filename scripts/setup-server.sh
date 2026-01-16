#!/bin/bash
# =============================================================================
# Ortho Patient App - Server Setup Script
# =============================================================================
# Скрипт для первоначальной настройки сервера
# Запускать с правами root: sudo ./setup-server.sh
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфигурация
PROJECT_ROOT="/opt/ortho-innovations"
DEPLOY_USER="deploy"
GITLAB_REPO="git@gitlab.com:your-group/ortho-innovations.git"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root"
    exit 1
fi

log_info "=========================================="
log_info "Ortho Patient App - Server Setup"
log_info "=========================================="

# 1. Обновление системы
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

# 2. Установка необходимых пакетов
log_info "Installing required packages..."
apt-get install -y \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    nginx \
    certbot \
    python3-certbot-nginx \
    htop \
    vim \
    ufw

# 3. Установка Docker
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    log_success "Docker installed successfully"
else
    log_info "Docker already installed"
fi

# 4. Создание пользователя для деплоя
log_info "Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    log_success "Deploy user created"
else
    log_info "Deploy user already exists"
fi

# 5. Настройка SSH для GitLab CI/CD
log_info "Setting up SSH for deploy user..."
DEPLOY_HOME="/home/$DEPLOY_USER"
SSH_DIR="$DEPLOY_HOME/.ssh"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Генерация SSH ключа если не существует
if [ ! -f "$SSH_DIR/id_ed25519" ]; then
    ssh-keygen -t ed25519 -f "$SSH_DIR/id_ed25519" -N "" -C "deploy@ortho-server"
    log_success "SSH key generated"
    log_warning "Add this public key to GitLab CI/CD variables as SSH_PRIVATE_KEY:"
    cat "$SSH_DIR/id_ed25519"
    echo ""
    log_warning "Add this public key to GitLab deploy keys:"
    cat "$SSH_DIR/id_ed25519.pub"
fi

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR"

# 6. Создание директории проекта
log_info "Creating project directory..."
mkdir -p "$PROJECT_ROOT"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_ROOT"

# 7. Клонирование репозитория (если не существует)
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    log_info "Cloning repository..."
    log_warning "Please clone the repository manually:"
    echo "  cd $PROJECT_ROOT"
    echo "  git clone $GITLAB_REPO ."
else
    log_info "Repository already cloned"
fi

# 8. Настройка Nginx
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/ortho-patient-app << 'EOF'
server {
    listen 80;
    server_name patient.orthoinnovations.ae;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ortho-patient-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
log_success "Nginx configured"

# 9. Настройка firewall
log_info "Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
log_success "Firewall configured"

# 10. Создание systemd сервиса для автозапуска
log_info "Creating systemd service..."
cat > /etc/systemd/system/ortho-patient-app.service << EOF
[Unit]
Description=Ortho Patient App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=$DEPLOY_USER
WorkingDirectory=$PROJECT_ROOT/frontend/patient-app
ExecStart=/usr/bin/docker compose -f docker-compose.dev.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.dev.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ortho-patient-app
log_success "Systemd service created"

# 11. Создание скрипта для получения SSL сертификата
log_info "Creating SSL setup script..."
cat > /opt/setup-ssl.sh << 'EOF'
#!/bin/bash
# Запустите этот скрипт после настройки DNS
certbot --nginx -d patient.orthoinnovations.ae --non-interactive --agree-tos -m admin@orthoinnovations.ae
EOF
chmod +x /opt/setup-ssl.sh

log_info "=========================================="
log_success "Server setup completed!"
log_info "=========================================="

echo ""
log_info "Next steps:"
echo "1. Add SSH public key to GitLab deploy keys"
echo "2. Clone repository to $PROJECT_ROOT"
echo "3. Configure GitLab CI/CD variables:"
echo "   - SSH_PRIVATE_KEY: contents of $SSH_DIR/id_ed25519"
echo "   - DEPLOY_SERVER: $(hostname -I | awk '{print $1}')"
echo "   - DEPLOY_USER: $DEPLOY_USER"
echo "4. Configure DNS for patient.orthoinnovations.ae"
echo "5. Run /opt/setup-ssl.sh to obtain SSL certificate"
echo "6. Create .env file in $PROJECT_ROOT/frontend/patient-app"
