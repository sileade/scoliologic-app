#!/bin/bash
# =============================================================================
# Ortho Patient App - GitLab Webhook Server
# =============================================================================
# Простой webhook сервер для автоматического деплоя при push в GitLab
# Альтернатива GitLab CI/CD для прямого деплоя на сервер
#
# Установка:
#   1. Скопируйте этот скрипт на сервер
#   2. Настройте systemd сервис (см. ниже)
#   3. Добавьте webhook в GitLab: Settings → Webhooks
#      URL: http://your-server:9000/deploy
#      Secret Token: ваш_секретный_токен
#      Trigger: Push events (только main branch)
#
# Требования: socat или netcat
# =============================================================================

# Конфигурация
WEBHOOK_PORT=9000
WEBHOOK_SECRET="${GITLAB_WEBHOOK_SECRET:-your-secret-token-change-me}"
DEPLOY_SCRIPT="/opt/ortho-innovations/frontend/patient-app/scripts/deploy.sh"
LOG_FILE="/var/log/ortho-webhook.log"

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Проверка зависимостей
if ! command -v socat &> /dev/null; then
    echo "Installing socat..."
    apt-get update && apt-get install -y socat
fi

log "Starting webhook server on port $WEBHOOK_PORT..."

# Обработчик запросов
handle_request() {
    read -r request_line
    
    # Читаем заголовки
    content_length=0
    gitlab_token=""
    while read -r header; do
        header=$(echo "$header" | tr -d '\r')
        [ -z "$header" ] && break
        
        if [[ "$header" == Content-Length:* ]]; then
            content_length=$(echo "$header" | cut -d' ' -f2)
        fi
        if [[ "$header" == X-Gitlab-Token:* ]]; then
            gitlab_token=$(echo "$header" | cut -d' ' -f2)
        fi
    done
    
    # Читаем тело запроса
    body=""
    if [ "$content_length" -gt 0 ]; then
        body=$(head -c "$content_length")
    fi
    
    # Проверяем путь
    if [[ "$request_line" == *"/deploy"* ]]; then
        # Проверяем токен
        if [ "$gitlab_token" != "$WEBHOOK_SECRET" ]; then
            log "ERROR: Invalid webhook token"
            echo -e "HTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\n\r\n{\"error\": \"Invalid token\"}"
            return
        fi
        
        # Проверяем, что это push в main
        if echo "$body" | grep -q '"ref":"refs/heads/main"'; then
            log "Received valid webhook for main branch"
            
            # Запускаем деплой в фоне
            (
                log "Starting deployment..."
                if bash "$DEPLOY_SCRIPT" --backup >> "$LOG_FILE" 2>&1; then
                    log "Deployment completed successfully"
                else
                    log "ERROR: Deployment failed"
                fi
            ) &
            
            echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\": \"deployment started\"}"
        else
            log "Ignoring push to non-main branch"
            echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\": \"ignored, not main branch\"}"
        fi
    elif [[ "$request_line" == *"/health"* ]]; then
        echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\": \"ok\"}"
    else
        echo -e "HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\n\r\n{\"error\": \"not found\"}"
    fi
}

# Запуск сервера
while true; do
    socat TCP-LISTEN:$WEBHOOK_PORT,reuseaddr,fork EXEC:"bash -c 'handle_request'" 2>/dev/null || {
        log "Server error, restarting in 5s..."
        sleep 5
    }
done
