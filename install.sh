#!/bin/bash

#===============================================================================
# Ortho Patient App - Автоматический установщик для Debian 13
# Версия: 1.0
# Использование: curl -fsSL https://raw.githubusercontent.com/sileade/ortho-patient-app/main/install.sh | bash
# Или: ./install.sh
#===============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Конфигурация
INSTALL_DIR="/opt/ortho-patient-app"
REPO_URL="https://github.com/sileade/ortho-patient-app.git"
COMPOSE_FILE="docker-compose.dev.yml"

#===============================================================================
# Функции
#===============================================================================

print_banner() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                               ║${NC}"
    echo -e "${BLUE}║        ${GREEN}Ortho Patient App - Автоматическая установка${BLUE}          ║${NC}"
    echo -e "${BLUE}║                                                               ║${NC}"
    echo -e "${BLUE}║        Debian 13 + Docker Compose                             ║${NC}"
    echo -e "${BLUE}║                                                               ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "Скрипт запущен от root. Рекомендуется запускать от обычного пользователя с sudo."
    fi
}

check_os() {
    log_info "Проверка операционной системы..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        log_success "Обнаружена ОС: $OS $VER"
    else
        log_error "Не удалось определить операционную систему"
        exit 1
    fi
}

install_dependencies() {
    log_info "Установка базовых зависимостей..."
    
    sudo apt update -qq
    sudo apt install -y -qq curl wget git ca-certificates gnupg lsb-release openssl > /dev/null 2>&1
    
    log_success "Базовые зависимости установлены"
}

install_docker() {
    log_info "Проверка Docker..."
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
        log_success "Docker уже установлен (версия $DOCKER_VERSION)"
        return
    fi
    
    log_info "Установка Docker..."
    
    # Удаление старых версий
    sudo apt remove -y docker docker-engine docker.io containerd runc > /dev/null 2>&1 || true
    
    # Добавление репозитория Docker
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Для Debian 13 используем bookworm
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      bookworm stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Установка Docker
    sudo apt update -qq
    sudo apt install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    
    # Добавление пользователя в группу docker
    sudo usermod -aG docker $USER
    
    log_success "Docker установлен"
}

setup_project_directory() {
    log_info "Настройка директории проекта..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warn "Директория $INSTALL_DIR уже существует"
        read -p "Удалить и установить заново? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo rm -rf "$INSTALL_DIR"
        else
            log_info "Используем существующую директорию"
            cd "$INSTALL_DIR"
            return
        fi
    fi
    
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $USER:$USER "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    log_success "Директория создана: $INSTALL_DIR"
}

clone_repository() {
    log_info "Клонирование репозитория..."
    
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        log_info "Репозиторий уже клонирован, обновляем..."
        git pull origin main > /dev/null 2>&1 || true
    else
        git clone "$REPO_URL" . > /dev/null 2>&1
    fi
    
    log_success "Репозиторий готов"
}

generate_env_file() {
    log_info "Генерация файла .env..."
    
    # Генерация безопасных паролей
    DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
    
    # Создание .env файла
    cat > .env << EOF
#===============================================================================
# Ortho Patient App - Конфигурация
# Сгенерировано автоматически: $(date)
#===============================================================================

# База данных PostgreSQL
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://ortho:\${DB_PASSWORD}@db:5432/ortho_patient

# JWT токены
JWT_SECRET=${JWT_SECRET}

# Окружение
NODE_ENV=production

# Приложение
VITE_APP_TITLE=Ortho Innovations Patient App
PORT=3000
EOF
    
    # Сохранение паролей в отдельный файл для администратора
    cat > .credentials << EOF
#===============================================================================
# ВАЖНО: Сохраните этот файл в безопасном месте!
# Сгенерировано: $(date)
#===============================================================================

DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
EOF
    
    chmod 600 .env .credentials
    
    log_success "Файл .env создан автоматически"
    log_warn "Пароли сохранены в файле .credentials - сохраните его!"
}

start_containers() {
    log_info "Запуск контейнеров..."
    
    # Используем sudo для docker если пользователь ещё не в группе docker
    if groups $USER | grep -q docker; then
        docker compose -f "$COMPOSE_FILE" up -d --build
    else
        sudo docker compose -f "$COMPOSE_FILE" up -d --build
    fi
    
    log_success "Контейнеры запущены"
}

wait_for_database() {
    log_info "Ожидание готовности базы данных..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U ortho > /dev/null 2>&1; then
            log_success "База данных готова"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo ""
    log_error "База данных не отвечает после $max_attempts попыток"
    return 1
}

run_migrations() {
    log_info "Применение миграций базы данных..."
    
    docker compose -f "$COMPOSE_FILE" exec -T app pnpm db:push > /dev/null 2>&1 || true
    
    log_success "Миграции применены"
}

get_server_ip() {
    hostname -I | awk '{print $1}'
}

print_success_message() {
    local IP=$(get_server_ip)
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║              ✓ Установка завершена успешно!                   ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Приложение доступно по адресам:${NC}"
    echo ""
    echo -e "  • Локально:    ${GREEN}http://localhost:3000${NC}"
    echo -e "  • По сети:     ${GREEN}http://${IP}:3000${NC}"
    echo ""
    echo -e "${BLUE}Админ-панель для врачей:${NC}"
    echo ""
    echo -e "  • Локально:    ${GREEN}http://localhost:3000/admin${NC}"
    echo -e "  • По сети:     ${GREEN}http://${IP}:3000/admin${NC}"
    echo ""
    echo -e "${YELLOW}Полезные команды:${NC}"
    echo ""
    echo "  • Статус:      docker compose -f $COMPOSE_FILE ps"
    echo "  • Логи:        docker compose -f $COMPOSE_FILE logs -f"
    echo "  • Остановка:   docker compose -f $COMPOSE_FILE down"
    echo "  • Перезапуск:  docker compose -f $COMPOSE_FILE restart"
    echo ""
    echo -e "${RED}ВАЖНО: Сохраните файл .credentials с паролями!${NC}"
    echo ""
}

#===============================================================================
# Основной скрипт
#===============================================================================

main() {
    print_banner
    check_root
    check_os
    install_dependencies
    install_docker
    setup_project_directory
    clone_repository
    generate_env_file
    start_containers
    wait_for_database
    run_migrations
    print_success_message
}

# Запуск
main "$@"
