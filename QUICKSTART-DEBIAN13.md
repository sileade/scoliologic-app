# Быстрый старт: Ortho Patient App на Debian 13

## Установка одной командой

Для полностью автоматической установки выполните одну команду:

```bash
curl -fsSL https://raw.githubusercontent.com/sileade/ortho-patient-app/main/install.sh | bash
```

Скрипт автоматически выполнит все необходимые действия: установит Docker, клонирует репозиторий, сгенерирует безопасные пароли, создаст .env файл и запустит приложение.

---

## Альтернативная установка (пошагово)

Если вы предпочитаете контролировать каждый шаг, следуйте инструкциям ниже.

### Шаг 1: Установка Docker

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка зависимостей
sudo apt install -y curl wget git ca-certificates gnupg openssl

# Добавление репозитория Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### Шаг 2: Клонирование и настройка

```bash
# Создание директории
sudo mkdir -p /opt/ortho-patient-app
sudo chown $USER:$USER /opt/ortho-patient-app
cd /opt/ortho-patient-app

# Клонирование репозитория
git clone https://github.com/sileade/ortho-patient-app.git .

# Автоматическая генерация .env файла
cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
DATABASE_URL=postgresql://ortho:\${DB_PASSWORD}@db:5432/ortho_patient
NODE_ENV=production
VITE_APP_TITLE=Ortho Innovations Patient App
PORT=3000
EOF
```

### Шаг 3: Запуск

```bash
# Запуск контейнеров
docker compose -f docker-compose.dev.yml up -d --build

# Ожидание готовности (30 секунд)
sleep 30

# Применение миграций
docker compose -f docker-compose.dev.yml exec app pnpm db:push
```

### Шаг 4: Проверка

```bash
# Статус контейнеров
docker compose -f docker-compose.dev.yml ps

# Получение IP адреса
echo "Приложение: http://$(hostname -I | awk '{print $1}'):3000"
echo "Админка: http://$(hostname -I | awk '{print $1}'):3000/admin"
```

---

## Основные команды

| Действие | Команда |
|----------|---------|
| Запуск | `docker compose -f docker-compose.dev.yml up -d` |
| Остановка | `docker compose -f docker-compose.dev.yml down` |
| Перезапуск | `docker compose -f docker-compose.dev.yml restart` |
| Логи | `docker compose -f docker-compose.dev.yml logs -f` |
| Статус | `docker compose -f docker-compose.dev.yml ps` |

---

## Решение проблем

### Контейнер не запускается

```bash
docker compose -f docker-compose.dev.yml logs app
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build --force-recreate
```

### Ошибка подключения к БД

```bash
docker compose -f docker-compose.dev.yml restart db
sleep 10
docker compose -f docker-compose.dev.yml restart app
```

### Порт 3000 занят

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Приложение недоступно по IP

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

---

## Обновление

```bash
cd /opt/ortho-patient-app
git pull origin main
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml exec app pnpm db:push
```

---

## Бэкап базы данных

```bash
# Создание бэкапа
docker compose -f docker-compose.dev.yml exec db pg_dump -U ortho ortho_patient > backup_$(date +%Y%m%d).sql

# Восстановление
docker compose -f docker-compose.dev.yml exec -T db psql -U ortho ortho_patient < backup_file.sql
```
