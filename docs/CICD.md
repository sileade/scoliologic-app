# GitLab CI/CD Pipeline Documentation

## Обзор

Этот документ описывает настройку CI/CD pipeline для автоматического развёртывания приложения Ortho Patient App на сервере при коммите в ветку `main`.

## Архитектура Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    TEST     │ ──▶ │    BUILD    │ ──▶ │   DEPLOY    │
│             │     │             │     │             │
│ - typecheck │     │ - docker    │     │ - ssh       │
│ - unit-tests│     │   build     │     │ - deploy    │
│ - lint      │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Этапы Pipeline

### 1. Test Stage

| Job | Описание | Триггер |
|-----|----------|---------|
| `typecheck` | Проверка типов TypeScript | main, MR |
| `unit-tests` | Запуск unit тестов | main, MR |
| `lint` | Линтинг кода (не блокирует) | main, MR |

### 2. Build Stage

| Job | Описание | Триггер |
|-----|----------|---------|
| `build-docker` | Сборка Docker образа | main |

### 3. Deploy Stage

| Job | Описание | Триггер |
|-----|----------|---------|
| `deploy-production` | Автоматический деплой | main (auto) |
| `rollback` | Откат к предыдущей версии | main (manual) |
| `restart-containers` | Перезапуск контейнеров | main (manual) |
| `view-logs` | Просмотр логов | main (manual) |

## Настройка GitLab CI/CD Variables

Перейдите в **Settings → CI/CD → Variables** и добавьте:

| Variable | Type | Protected | Masked | Описание |
|----------|------|-----------|--------|----------|
| `SSH_PRIVATE_KEY` | Variable | ✓ | ✓ | Приватный SSH ключ для доступа к серверу |
| `DEPLOY_SERVER` | Variable | ✓ | ✗ | IP адрес или hostname сервера |
| `DEPLOY_USER` | Variable | ✓ | ✗ | Пользователь для SSH (например, `deploy`) |

### Генерация SSH ключа

```bash
# На локальной машине или сервере
ssh-keygen -t ed25519 -C "gitlab-ci@ortho" -f ~/.ssh/gitlab_deploy

# Содержимое приватного ключа добавить в SSH_PRIVATE_KEY
cat ~/.ssh/gitlab_deploy

# Публичный ключ добавить на сервер
cat ~/.ssh/gitlab_deploy.pub >> ~/.ssh/authorized_keys
```

## Настройка сервера

### 1. Первоначальная настройка (одна команда)

```bash
# Полная автоматическая установка всего необходимого
sudo ./scripts/install-all.sh

# Или только базовая настройка
sudo ./scripts/setup-server.sh
```

Скрипт `install-all.sh` автоматически:
- Установит Docker, Nginx, и все зависимости
- Создаст пользователя deploy с SSH ключом
- Настроит Nginx и firewall
- Создаст systemd сервис для автозапуска
- Выведет все необходимые данные для GitLab CI/CD

### 2. Структура директорий на сервере

```
/opt/ortho-innovations/
├── frontend/
│   └── patient-app/
│       ├── docker-compose.dev.yml
│       ├── Dockerfile
│       ├── .env
│       └── ...
└── ...
```

### 3. Настройка .env файла

```bash
cd /opt/ortho-innovations/frontend/patient-app
cp .env.example .env
nano .env
```

## Процесс деплоя

### Автоматический деплой

1. Разработчик делает push в ветку `main`
2. GitLab запускает pipeline
3. Проходят тесты (typecheck, unit-tests)
4. Собирается Docker образ
5. SSH подключение к серверу
6. Выполняется:
   ```bash
   cd /opt/ortho-innovations
   git pull origin main
   cd frontend/patient-app
   docker compose -f docker-compose.dev.yml down
   docker compose -f docker-compose.dev.yml up -d --build
   ```
7. Проверяется health check

### Ручной деплой

```bash
# На сервере
cd /opt/ortho-innovations/frontend/patient-app
./scripts/deploy.sh
```

### Откат

Через GitLab UI:
1. Перейти в **CI/CD → Pipelines**
2. Найти нужный pipeline
3. Нажать **rollback** (manual job)

Через командную строку:
```bash
cd /opt/ortho-innovations/frontend/patient-app
./scripts/deploy.sh --rollback
```

## Мониторинг

### Просмотр логов

```bash
# Все логи
docker compose -f docker-compose.dev.yml logs -f

# Только приложение
docker compose -f docker-compose.dev.yml logs -f app

# Последние 100 строк
docker compose -f docker-compose.dev.yml logs --tail=100
```

### Проверка статуса

```bash
# Статус контейнеров
docker compose -f docker-compose.dev.yml ps

# Health check
curl http://localhost:3000/api/health
```

## Troubleshooting

### Pipeline не запускается

1. Проверьте, что файл `.gitlab-ci.yml` находится в корне репозитория
2. Убедитесь, что GitLab Runner доступен и имеет тег `docker`

### Ошибка SSH подключения

1. Проверьте переменную `SSH_PRIVATE_KEY` (должен быть полный ключ)
2. Убедитесь, что публичный ключ добавлен в `~/.ssh/authorized_keys` на сервере
3. Проверьте, что сервер доступен по SSH

### Контейнеры не запускаются

```bash
# Проверить логи
docker compose -f docker-compose.dev.yml logs

# Проверить конфигурацию
docker compose -f docker-compose.dev.yml config

# Пересобрать без кэша
docker compose -f docker-compose.dev.yml build --no-cache
```

### База данных недоступна

```bash
# Проверить статус PostgreSQL
docker compose -f docker-compose.dev.yml exec db pg_isready

# Проверить подключение
docker compose -f docker-compose.dev.yml exec app psql $DATABASE_URL -c "SELECT 1"
```

## Безопасность

1. **SSH ключи** — используйте отдельные ключи для CI/CD
2. **Переменные** — помечайте sensitive данные как Protected и Masked
3. **Firewall** — ограничьте доступ к серверу только с IP GitLab Runner
4. **Secrets** — не храните секреты в репозитории, используйте CI/CD Variables

## Контакты

При возникновении проблем обращайтесь:
- Email: dev@orthoinnovations.ae
- Slack: #ortho-devops
