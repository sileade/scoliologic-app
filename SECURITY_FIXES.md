# Исправления безопасности v1.1.0

**Дата:** 26 января 2026 г.
**Автор:** Manus AI

Этот документ описывает критические исправления безопасности, внесённые в проект Scoliologic Patient App.

## Сводка изменений

| Приоритет | Исправление | Файлы | Статус |
|:---|:---|:---|:---|
| **Критический** | Замена HMAC на RSA-SHA256 для ЕСИА | `server/esia/service.ts` | ✅ Готово |
| **Критический** | Устранение доступа AI к plainText | `server/messenger/service.ts` | ✅ Готово |
| **Высокий** | Перенос state ЕСИА в Redis | `server/esia/router.ts` | ✅ Готово |
| **Высокий** | Расширение тестового покрытия | `tests/` | ✅ Готово |
| **Средний** | Внедрение ESLint | `.eslintrc.cjs`, `package.json` | ✅ Готово |

## Детальное описание

### 1. Замена HMAC на RSA-SHA256 для ЕСИА

**Проблема:** Использование HMAC для создания `client_secret` не соответствует требованиям ЕСИА для продуктивной среды.

**Решение:** Реализована поддержка криптографической подписи RSA-SHA256 с использованием приватного ключа.

**Изменения в `server/esia/service.ts`:**
- Добавлена функция `loadPrivateKey()` для загрузки ключа из переменной окружения или файла
- Добавлена функция `loadCertificate()` для загрузки сертификата
- Функция `createClientSecret()` теперь использует `crypto.createSign('RSA-SHA256')`
- Добавлена функция `isProductionReady()` для проверки готовности к продакшену

**Конфигурация:**
```env
ESIA_PRIVATE_KEY=<base64-encoded-private-key>
ESIA_CERTIFICATE=<pem-certificate>
# или
ESIA_PRIVATE_KEY_PATH=/path/to/private.key
ESIA_CERTIFICATE_PATH=/path/to/certificate.pem
```

### 2. Устранение доступа AI к plainText

**Проблема:** AI-ассистент получал доступ к незашифрованному тексту сообщений пациентов, нарушая принцип E2EE.

**Решение:** Полностью разделены AI-чаты и чаты с врачами. AI работает только в специальных чатах типа `patient_ai`.

**Изменения в `server/messenger/service.ts`:**
- Удалено поле `plainText` из интерфейса `EncryptedMessagePayload`
- Добавлен новый интерфейс `AIMessagePayload` для AI-чатов
- Функция `storeEncryptedMessage()` - для зашифрованных сообщений (чаты с врачами)
- Функция `storeAIMessage()` - для сообщений в AI-чатах
- AI по умолчанию отключен в чатах с врачами (`aiActive: false`)
- `shouldAIRespond()` возвращает `false` для всех чатов кроме `patient_ai`

**Архитектура безопасности:**
```
Чат с врачом (patient_doctor):
  - E2EE шифрование
  - Сервер НЕ имеет доступа к содержимому
  - AI отключен

AI-чат (patient_ai):
  - Без шифрования (пользователь осведомлен)
  - AI имеет доступ к сообщениям
  - Только общие вопросы, без медицинских данных
```

### 3. Перенос state ЕСИА в Redis

**Проблема:** Хранение `state` в памяти сервера не поддерживает горизонтальное масштабирование.

**Решение:** State теперь хранится в Redis с TTL 10 минут.

**Изменения в `server/esia/router.ts`:**
- Добавлены функции `saveState()` и `consumeState()`
- Интеграция с Redis через `cacheGet`, `cacheSet`, `cacheDel`
- Fallback на локальное хранилище при недоступности Redis
- Добавлен endpoint `/auth/esia/health` для проверки статуса

**Преимущества:**
- Поддержка нескольких экземпляров сервера
- Автоматическая очистка устаревших state
- One-time use для защиты от replay-атак

### 4. Расширение тестового покрытия

**Добавлены новые тесты:**

| Файл | Описание |
|:---|:---|
| `tests/integration/esia.test.ts` | Интеграционные тесты ЕСИА |
| `tests/e2e/auth.spec.ts` | E2E тесты авторизации |
| `tests/unit/messenger-security.test.ts` | Тесты безопасности мессенджера |

**Покрытие:**
- Генерация и валидация state
- Формирование URL авторизации
- Декодирование JWT токенов
- Проверка уровней верификации
- Изоляция E2EE
- Разделение AI и doctor чатов

### 5. Внедрение ESLint

**Добавлены файлы:**
- `.eslintrc.cjs` - конфигурация ESLint

**Добавлены зависимости:**
- `eslint`
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-plugin-security`

**Новые скрипты:**
- `pnpm lint` - проверка кода
- `pnpm lint:fix` - автоматическое исправление

**CI/CD:** ESLint интегрирован в GitHub Actions pipeline.

## Рекомендации по развёртыванию

### Для продуктивной среды ЕСИА:

1. Получите сертификат и приватный ключ в ЕСИА
2. Настройте переменные окружения:
   ```env
   ESIA_PRIVATE_KEY=<your-private-key>
   ESIA_CERTIFICATE=<your-certificate>
   ESIA_CLIENT_ID=<your-registered-client-id>
   ESIA_ENVIRONMENT=prod
   ```

3. Проверьте готовность:
   ```bash
   curl https://your-app.com/auth/esia/health
   ```

### Для Redis:

1. Убедитесь что Redis доступен:
   ```env
   REDIS_URL=redis://your-redis-host:6379
   ```

2. При недоступности Redis приложение будет использовать локальное хранилище (не рекомендуется для продакшена).

## Миграция

Изменения обратно совместимы. Существующие чаты продолжат работать. Новые чаты с врачами будут создаваться с `aiActive: false`.

## Контакты

При возникновении вопросов по безопасности обращайтесь к команде разработки.
