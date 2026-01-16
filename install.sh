#!/bin/bash
# =============================================================================
# Scoliologic Patient App - Автоматическая установка
# =============================================================================
# Скрипт для быстрого развёртывания приложения на Debian/Ubuntu
# 
# Использование:
#   curl -fsSL https://raw.githubusercontent.com/sileade/scoliologic-app/main/install.sh | bash
#   или
#   ./install.sh [--with-traefik] [--with-monitoring] [--with-gpu]
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Конфигурация по умолчанию
INSTALL_DIR=${INSTALL_DIR:-/opt/scoliologic}
REPO_URL="https://github.com/sileade/scoliologic-app.git"
WITH_TRAEFIK=false
WITH_MONITORING=false
WITH_GPU=false

# Логирование
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Баннер
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   ███████╗ ██████╗ ██████╗ ██╗     ██╗ ██████╗               ║"
    echo "║   ██╔════╝██╔════╝██╔═══██╗██║     ██║██╔═══██╗              ║"
    echo "║   ███████╗██║     ██║   ██║██║     ██║██║   ██║              ║"
    echo "║   ╚════██║██║     ██║   ██║██║     ██║██║   ██║              ║"
    echo "║   ███████║╚██████╗╚██████╔╝███████╗██║╚██████╔╝              ║"
    echo "║   ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝              ║"
    echo "║                                                               ║"
    echo "║           Scoliologic Patient App Installer                   ║"
    echo "║                     Version 2.0.0                             ║"
    echo "║                                                               ║"
    echo "║   • PostgreSQL 16 + Redis + Ollama AI                        ║"
    echo "║   • Госуслуги (ЕСИА) + МИС интеграция                        ║"
    echo "║   • E2EE мессенджер + GitOps автодеплой                      ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Проверка root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Этот скрипт должен быть запущен от root"
        log_info "Используйте: sudo $0"
        exit 1
    fi
}

# Проверка системы
check_system() {
    log_info "Проверка системы..."
    
    # Проверка ОС
    if [[ ! -f /etc/debian_version ]] && [[ ! -f /etc/lsb-release ]]; then
        log_error "Этот скрипт поддерживает только Debian/Ubuntu"
        exit 1
    fi
    
    # Проверка архитектуры
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" ]]; then
        log_error "Неподдерживаемая архитектура: $ARCH"
        exit 1
    fi
    
    # Проверка памяти
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    if [[ $TOTAL_MEM -lt 2048 ]]; then
        log_warning "Рекомендуется минимум 2GB RAM (текущий: ${TOTAL_MEM}MB)"
    fi
    
    # Проверка диска
    FREE_DISK=$(df -m / | awk 'NR==2 {print $4}')
    if [[ $FREE_DISK -lt 10240 ]]; then
        log_warning "Рекомендуется минимум 10GB свободного места (текущий: ${FREE_DISK}MB)"
    fi
    
    log_success "Система совместима: $(uname -s) $ARCH, RAM: ${TOTAL_MEM}MB, Disk: ${FREE_DISK}MB"
}

# Установка зависимостей
install_dependencies() {
    log_info "Установка зависимостей..."
    
    apt-get update -qq
    apt-get install -y -qq \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        git \
        jq \
        openssl \
        pwgen \
        htop \
        nano \
        wget \
        unzip
    
    log_success "Зависимости установлены"
}

# Установка Docker
install_docker() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
        log_info "Docker уже установлен (версия $DOCKER_VERSION)"
        return
    fi
    
    log_info "Установка Docker..."
    
    # Определяем дистрибутив
    if [[ -f /etc/lsb-release ]]; then
        DISTRO="ubuntu"
    else
        DISTRO="debian"
    fi
    
    # Добавление репозитория Docker
    curl -fsSL https://download.docker.com/linux/${DISTRO}/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/${DISTRO} $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Запуск Docker
    systemctl enable docker
    systemctl start docker
    
    log_success "Docker установлен"
}

# Установка Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | cut -d ',' -f1)
        log_info "Docker Compose уже установлен (версия $COMPOSE_VERSION)"
        return
    fi
    
    log_info "Установка Docker Compose..."
    
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r '.tag_name')
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose установлен"
}

# Клонирование репозитория
clone_repository() {
    log_info "Клонирование репозитория..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warning "Директория $INSTALL_DIR уже существует"
        read -p "Обновить существующую установку? [Y/n] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            cd "$INSTALL_DIR"
            git fetch origin
            git reset --hard origin/main
            log_success "Репозиторий обновлён"
            return
        fi
    fi
    
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    log_success "Репозиторий клонирован в $INSTALL_DIR"
}

# Генерация .env файла
generate_env() {
    log_info "Генерация конфигурации..."
    
    cd "$INSTALL_DIR"
    
    if [[ -f .env ]]; then
        log_warning ".env файл уже существует"
        read -p "Перезаписать? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Генерация секретов
    JWT_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(pwgen -s 32 1)
    GRAFANA_PASSWORD=$(pwgen -s 16 1)
    
    cat > .env << EOF
# =============================================================================
# Scoliologic Patient App - Environment Configuration
# Generated: $(date)
# =============================================================================

# Приложение
NODE_ENV=production
PORT=3000
VITE_APP_TITLE=Scoliologic Patient App

# База данных PostgreSQL
POSTGRES_USER=scoliologic
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=scoliologic_db
DATABASE_URL=postgresql://scoliologic:${DB_PASSWORD}@postgres:5432/scoliologic_db

# JWT
JWT_SECRET=${JWT_SECRET}

# OAuth сервер
OAUTH_SERVER_URL=https://oauth.scoliologic.ru

# =============================================================================
# ЕСИА (Госуслуги) - ЗАПОЛНИТЕ РЕАЛЬНЫМИ ДАННЫМИ
# =============================================================================
ESIA_CLIENT_ID=
ESIA_CLIENT_SECRET=
ESIA_REDIRECT_URI=https://app.scoliologic.ru/api/auth/esia/callback
ESIA_SCOPE=openid fullname snils
ESIA_ENVIRONMENT=test

# =============================================================================
# МИС интеграция - ЗАПОЛНИТЕ РЕАЛЬНЫМИ ДАННЫМИ
# =============================================================================
MIS_API_URL=
MIS_API_KEY=

# =============================================================================
# Ollama AI
# =============================================================================
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT=60000

# =============================================================================
# GitOps Pull Agent
# =============================================================================
GIT_REPO_URL=${REPO_URL}
GIT_BRANCH=main
GIT_TOKEN=
CHECK_INTERVAL=300
AUTO_DEPLOY=true
ROLLBACK_ON_FAILURE=true

# =============================================================================
# Уведомления (опционально)
# =============================================================================
SLACK_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# =============================================================================
# Traefik (если используется)
# =============================================================================
ACME_EMAIL=admin@scoliologic.ru
TRAEFIK_AUTH=

# =============================================================================
# Мониторинг (если используется)
# =============================================================================
GRAFANA_USER=admin
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}
EOF

    chmod 600 .env
    
    # Сохраняем credentials
    cat > .credentials << EOF
# =============================================================================
# ВАЖНО: Сохраните этот файл в безопасном месте!
# Generated: $(date)
# =============================================================================

Database Password: ${DB_PASSWORD}
JWT Secret: ${JWT_SECRET}
Grafana Password: ${GRAFANA_PASSWORD}
EOF
    chmod 600 .credentials
    
    log_success "Конфигурация сгенерирована"
    log_warning "ВАЖНО: Заполните ESIA_CLIENT_ID, ESIA_CLIENT_SECRET, MIS_API_URL, MIS_API_KEY в .env!"
}

# Инициализация базы данных
init_database() {
    log_info "Создание скрипта инициализации БД..."
    
    mkdir -p "$INSTALL_DIR/deploy"
    
    cat > "$INSTALL_DIR/deploy/init-db.sql" << 'EOF'
-- Scoliologic Patient App - Database Initialization
-- PostgreSQL 16

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Функция обновления timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Логирование
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully';
END $$;
EOF

    log_success "Скрипт инициализации БД создан"
}

# Настройка Nginx
setup_nginx() {
    log_info "Настройка Nginx..."
    
    mkdir -p "$INSTALL_DIR/deploy/nginx/conf.d"
    
    cat > "$INSTALL_DIR/deploy/nginx/nginx.conf" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    include /etc/nginx/conf.d/*.conf;
}
EOF

    cat > "$INSTALL_DIR/deploy/nginx/conf.d/default.conf" << 'EOF'
upstream app {
    server app:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://app;
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

    location /api/health {
        proxy_pass http://app;
        access_log off;
    }
}
EOF

    log_success "Nginx настроен"
}

# Настройка Prometheus
setup_prometheus() {
    log_info "Настройка Prometheus..."
    
    mkdir -p "$INSTALL_DIR/deploy/prometheus"
    
    cat > "$INSTALL_DIR/deploy/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'scoliologic-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
EOF

    log_success "Prometheus настроен"
}

# Настройка Grafana
setup_grafana() {
    log_info "Настройка Grafana..."
    
    mkdir -p "$INSTALL_DIR/deploy/grafana/provisioning/datasources"
    mkdir -p "$INSTALL_DIR/deploy/grafana/provisioning/dashboards"
    
    cat > "$INSTALL_DIR/deploy/grafana/provisioning/datasources/datasources.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOF

    log_success "Grafana настроен"
}

# Генерация самоподписанного SSL сертификата
generate_ssl() {
    log_info "Генерация SSL сертификата..."
    
    mkdir -p "$INSTALL_DIR/deploy/ssl"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$INSTALL_DIR/deploy/ssl/privkey.pem" \
        -out "$INSTALL_DIR/deploy/ssl/fullchain.pem" \
        -subj "/C=RU/ST=Moscow/L=Moscow/O=Scoliologic/CN=localhost" 2>/dev/null
    
    chmod 600 "$INSTALL_DIR/deploy/ssl/privkey.pem"
    
    log_success "SSL сертификат сгенерирован (самоподписанный)"
    log_warning "Для production используйте Let's Encrypt или реальный сертификат"
}

# Создание systemd сервиса
create_systemd_service() {
    log_info "Создание systemd сервиса..."
    
    cat > /etc/systemd/system/scoliologic.service << EOF
[Unit]
Description=Scoliologic Patient App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable scoliologic.service
    
    log_success "Systemd сервис создан"
}

# Запуск приложения
start_application() {
    log_info "Запуск приложения..."
    
    cd "$INSTALL_DIR"
    
    # Определяем профили
    PROFILES=""
    if [[ "$WITH_TRAEFIK" == "true" ]]; then
        PROFILES="$PROFILES --profile traefik"
    fi
    
    if [[ "$WITH_MONITORING" == "true" ]]; then
        PROFILES="$PROFILES --profile monitoring"
    fi
    
    # Запуск основных сервисов
    docker-compose $PROFILES up -d
    
    log_success "Контейнеры запущены"
}

# Ожидание готовности сервисов
wait_for_services() {
    log_info "Ожидание готовности сервисов..."
    
    local max_attempts=60
    local attempt=1
    
    # Ждём PostgreSQL
    while [[ $attempt -le $max_attempts ]]; do
        if docker exec scoliologic-postgres pg_isready -U scoliologic > /dev/null 2>&1; then
            log_success "PostgreSQL готов"
            break
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "PostgreSQL не отвечает"
        return 1
    fi
    
    # Ждём приложение
    attempt=1
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            log_success "Приложение готово"
            break
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_warning "Приложение ещё запускается, проверьте логи: docker-compose logs -f app"
    fi
}

# Загрузка модели Ollama
setup_ollama() {
    log_info "Загрузка модели Ollama (это может занять несколько минут)..."
    
    # Ждём запуска Ollama
    sleep 15
    
    docker exec scoliologic-ollama ollama pull llama3.2:3b 2>/dev/null || {
        log_warning "Не удалось загрузить модель автоматически"
        log_info "Выполните вручную: docker exec -it scoliologic-ollama ollama pull llama3.2:3b"
    }
    
    log_success "Ollama настроен"
}

# Вывод информации после установки
print_summary() {
    local IP=$(hostname -I | awk '{print $1}')
    
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║              ✓ УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!                   ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Директория установки:${NC} $INSTALL_DIR"
    echo
    echo -e "${BLUE}Доступ к приложению:${NC}"
    echo "  • Локально:  http://localhost:3000"
    echo "  • По сети:   http://${IP}:3000"
    echo
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ВАЖНО: Заполните следующие параметры в .env:                 ║${NC}"
    echo -e "${YELLOW}║                                                               ║${NC}"
    echo -e "${YELLOW}║  • ESIA_CLIENT_ID      - ID приложения в ЕСИА                 ║${NC}"
    echo -e "${YELLOW}║  • ESIA_CLIENT_SECRET  - Секрет приложения ЕСИА               ║${NC}"
    echo -e "${YELLOW}║  • MIS_API_URL         - URL API медицинской системы          ║${NC}"
    echo -e "${YELLOW}║  • MIS_API_KEY         - Ключ API МИС                         ║${NC}"
    echo -e "${YELLOW}║  • GIT_TOKEN           - GitHub токен для GitOps              ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Полезные команды:${NC}"
    echo "  cd $INSTALL_DIR"
    echo "  docker-compose logs -f app        # Логи приложения"
    echo "  docker-compose logs -f pull-agent # Логи GitOps агента"
    echo "  docker-compose logs -f ollama     # Логи AI"
    echo "  docker-compose restart app        # Перезапуск"
    echo "  docker-compose down               # Остановка"
    echo "  systemctl status scoliologic      # Статус сервиса"
    echo
    echo -e "${RED}Пароли сохранены в: $INSTALL_DIR/.credentials${NC}"
    echo
}

# Парсинг аргументов
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --with-traefik)
                WITH_TRAEFIK=true
                shift
                ;;
            --with-monitoring)
                WITH_MONITORING=true
                shift
                ;;
            --with-gpu)
                WITH_GPU=true
                shift
                ;;
            --install-dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            -h|--help)
                echo "Использование: $0 [опции]"
                echo
                echo "Опции:"
                echo "  --with-traefik     Использовать Traefik вместо Nginx"
                echo "  --with-monitoring  Включить Prometheus + Grafana"
                echo "  --with-gpu         Включить поддержку GPU для Ollama"
                echo "  --install-dir DIR  Директория установки (по умолчанию: /opt/scoliologic)"
                echo "  -h, --help         Показать эту справку"
                exit 0
                ;;
            *)
                log_error "Неизвестная опция: $1"
                exit 1
                ;;
        esac
    done
}

# Главная функция
main() {
    parse_args "$@"
    
    print_banner
    check_root
    check_system
    install_dependencies
    install_docker
    install_docker_compose
    clone_repository
    generate_env
    init_database
    setup_nginx
    setup_prometheus
    setup_grafana
    generate_ssl
    create_systemd_service
    start_application
    wait_for_services
    setup_ollama
    print_summary
}

# Запуск
main "$@"
