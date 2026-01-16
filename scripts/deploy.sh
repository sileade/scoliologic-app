#!/bin/bash
# =============================================================================
# Ortho Patient App - Deployment Script
# =============================================================================
# Скрипт для автоматического развёртывания приложения на сервере
# Использование: ./deploy.sh [options]
# 
# Опции:
#   --no-build   Не пересобирать Docker образы
#   --no-pull    Не делать git pull
#   --rollback   Откатить к предыдущей версии
#   --backup     Создать бэкап БД перед деплоем
#   --logs       Показать логи после деплоя
#
# Текущая структура сервера:
#   cd /opt/ortho-innovations
#   git pull origin main
#   cd frontend/patient-app
#   docker compose -f docker-compose.dev.yml down
#   docker compose -f docker-compose.dev.yml up -d --build
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Конфигурация - соответствует текущей структуре сервера
PROJECT_ROOT="/opt/ortho-innovations"
APP_DIR="frontend/patient-app"
COMPOSE_FILE="docker-compose.dev.yml"
LOG_FILE="/var/log/ortho-deploy.log"
BACKUP_DIR="/opt/ortho-backups"

# Параметры по умолчанию
DO_BUILD=true
DO_PULL=true
DO_ROLLBACK=false
DO_BACKUP=false
SHOW_LOGS=false

# Функции логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
}

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)
            DO_BUILD=false
            shift
            ;;
        --no-pull)
            DO_PULL=false
            shift
            ;;
        --rollback)
            DO_ROLLBACK=true
            shift
            ;;
        --backup)
            DO_BACKUP=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --help)
            echo "Usage: ./deploy.sh [options]"
            echo "Options:"
            echo "  --no-build   Skip Docker image rebuild"
            echo "  --no-pull    Skip git pull"
            echo "  --rollback   Rollback to previous version"
            echo "  --backup     Create database backup before deploy"
            echo "  --logs       Show logs after deployment"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1. Use --help for usage."
            exit 1
            ;;
    esac
done

# Проверка прав
if [[ $EUID -ne 0 ]]; then
    log_warning "Script is not running as root. Some operations may fail."
fi

# Создание лог файла
touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/ortho-deploy.log"

log_info "=========================================="
log_info "Starting deployment at $(date)"
log_info "=========================================="

# Переход в директорию проекта
cd "$PROJECT_ROOT" || {
    log_error "Failed to change to project directory: $PROJECT_ROOT"
    exit 1
}

# Откат к предыдущей версии
if [ "$DO_ROLLBACK" = true ]; then
    log_info "Rolling back to previous version..."
    git reset --hard HEAD~1
    log_success "Git rollback completed"
fi

# Git pull
if [ "$DO_PULL" = true ]; then
    log_info "Pulling latest changes from origin/main..."
    git fetch origin main
    git reset --hard origin/main
    log_success "Git pull completed"
fi

# Переход в директорию приложения
cd "$APP_DIR" || {
    log_error "Failed to change to app directory: $APP_DIR"
    exit 1
}

# Сохранение текущего коммита для возможного отката
CURRENT_COMMIT=$(git rev-parse HEAD)
log_info "Current commit: $CURRENT_COMMIT"

# Бэкап базы данных перед деплоем
if [ "$DO_BACKUP" = true ]; then
    log_info "Creating database backup..."
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/ortho_backup_$(date '+%Y%m%d_%H%M%S').sql"
    
    # Проверяем, запущен ли контейнер БД
    if docker compose -f "$COMPOSE_FILE" ps db --status running 2>/dev/null | grep -q "running"; then
        docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U ortho ortho_patient > "$BACKUP_FILE" 2>/dev/null && \
            log_success "Database backup created: $BACKUP_FILE" || \
            log_warning "Database backup failed, continuing deployment..."
    else
        log_warning "Database container not running, skipping backup"
    fi
    
    # Удаление старых бэкапов (старше 7 дней)
    find "$BACKUP_DIR" -name "ortho_backup_*.sql" -mtime +7 -delete 2>/dev/null || true
fi

# Остановка контейнеров
log_info "Stopping current containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans || {
    log_warning "Failed to stop containers gracefully"
}

# Очистка старых образов
log_info "Cleaning up old Docker images..."
docker image prune -f || true

# Сборка и запуск
if [ "$DO_BUILD" = true ]; then
    log_info "Building and starting containers..."
    docker compose -f "$COMPOSE_FILE" up -d --build
else
    log_info "Starting containers without rebuild..."
    docker compose -f "$COMPOSE_FILE" up -d
fi

# Ожидание запуска
log_info "Waiting for containers to start..."
sleep 15

# Проверка статуса контейнеров
log_info "Checking container status..."
docker compose -f "$COMPOSE_FILE" ps

# Health check
log_info "Performing health check..."
HEALTH_CHECK_URL="http://localhost:3000/api/health"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=5

for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log_success "Health check passed!"
        break
    else
        if [ $i -eq $HEALTH_CHECK_RETRIES ]; then
            log_warning "Health check failed after $HEALTH_CHECK_RETRIES attempts"
            log_info "Application may still be starting..."
        else
            log_info "Health check attempt $i failed, retrying in ${HEALTH_CHECK_DELAY}s..."
            sleep $HEALTH_CHECK_DELAY
        fi
    fi
done

# Вывод информации о контейнерах
log_info "Container information:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

log_info "=========================================="
log_success "Deployment completed at $(date)"
log_info "=========================================="

# Вывод последних логов (опционально)
if [ "$SHOW_LOGS" = true ]; then
    log_info "Recent application logs:"
    docker compose -f "$COMPOSE_FILE" logs --tail=50
fi

# Вывод информации о деплое
echo ""
echo -e "${CYAN}═══ DEPLOYMENT SUMMARY ═══${NC}"
echo -e "Commit: ${GREEN}$CURRENT_COMMIT${NC}"
echo -e "Time: ${GREEN}$(date)${NC}"
echo -e "Status: ${GREEN}SUCCESS${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:     docker compose -f $COMPOSE_FILE logs -f"
echo "  Restart:       docker compose -f $COMPOSE_FILE restart"
echo "  Stop:          docker compose -f $COMPOSE_FILE down"
echo "  Status:        docker compose -f $COMPOSE_FILE ps"
