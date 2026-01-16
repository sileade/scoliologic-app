FROM python:3.11-slim

LABEL maintainer="Scoliologic <dev@scoliologic.ru>"
LABEL description="GitOps Pull Agent for automatic deployment"

# Установка зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    docker.io \
    docker-compose \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Создание рабочей директории
WORKDIR /app

# Копирование файлов агента
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pull_agent.py .
COPY config.py .
COPY notifier.py .
COPY healthcheck.py .

# Создание директории для данных
RUN mkdir -p /app/data /app/repo

# Права на выполнение
RUN chmod +x pull_agent.py

# Переменные окружения по умолчанию
ENV PYTHONUNBUFFERED=1
ENV CHECK_INTERVAL=300
ENV AUTO_DEPLOY=true
ENV ROLLBACK_ON_FAILURE=true

# Health check
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD python healthcheck.py || exit 1

# Запуск агента
CMD ["python", "pull_agent.py"]
