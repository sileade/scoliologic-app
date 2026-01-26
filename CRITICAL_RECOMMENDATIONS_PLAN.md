# План внедрения критических рекомендаций

**Дата:** 26 января 2026 г.
**Автор:** Manus AI

Этот документ содержит 5 наиболее критичных рекомендаций, выявленных в ходе аудита кода проекта Scoliologic, и предлагает конкретные шаги для их немедленного внедрения. Эти шаги направлены на устранение уязвимостей в безопасности, улучшение масштабируемости и повышение надежности приложения.

## 1. [Критическая уязвимость] Замена демонстрационной подписи ЕСИА на промышленный стандарт PKCS#7

**Проблема:**
Текущая реализация аутентификации через ЕСИА использует HMAC для создания `client_secret`. Это демонстрационное решение, **небезопасное для промышленной эксплуатации**. Оно уязвимо для атак и не соответствует требованиям безопасности ЕСИА.

**Решение:**
Необходимо заменить HMAC-подпись на асимметричную подпись по стандарту **PKCS#7**, используя закрытый ключ, зарегистрированный в ЕСИА.

**Шаги по внедрению:**

1.  **Установить зависимость для работы с PKCS#7:**
    ```bash
    pnpm add @peculiar/x509
    ```

2.  **Модифицировать `server/esia/service.ts`:**
    - Загрузить закрытый ключ и сертификат из безопасного хранилища (например, переменные окружения или HashiCorp Vault).
    - Изменить функцию `createClientSecret` для использования криптографической подписи.

    ```typescript
    // server/esia/service.ts

    import { Crypto } from '@peculiar/webcrypto';
    import * as x509 from '@peculiar/x509';

    const crypto = new Crypto();
    x509.crypto.set(crypto);

    async function createClientSecret(scope: string, timestamp: string, clientId: string, state: string): Promise<string> {
      // 1. Загрузить приватный ключ и сертификат
      const privateKeyPem = process.env.ESIA_PRIVATE_KEY;
      const certificatePem = process.env.ESIA_CERTIFICATE;

      if (!privateKeyPem || !certificatePem) {
        throw new Error('ESIA private key or certificate is not configured.');
      }

      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        Buffer.from(privateKeyPem, 'base64'),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        true,
        ['sign']
      );

      // 2. Сформировать строку для подписи
      const message = `${scope}${timestamp}${clientId}${state}`;
      const messageBuffer = Buffer.from(message, 'utf-8');

      // 3. Создать подпись PKCS#7
      const cms = await x509.Pkcs7.sign(messageBuffer, {
        certs: [new x509.X509Certificate(certificatePem)],
        signers: [{
          key: privateKey,
          cert: new x509.X509Certificate(certificatePem),
          signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5' },
        }],
        detached: true,
      });

      return Buffer.from(cms).toString('base64');
    }
    ```

## 2. [Критическая уязвимость] Устранение доступа AI-ассистента к незашифрованным сообщениям

**Проблема:**
AI-ассистент получает доступ к **незашифрованному** тексту сообщений пациентов (`plainText` в `EncryptedMessagePayload`). Это прямое нарушение принципа сквозного шифрования (E2EE) и создает серьезный риск утечки конфиденциальной медицинской информации.

**Решение:**
Необходимо исключить передачу `plainText` на сервер. Вместо этого, AI-анализ должен происходить на стороне клиента, либо серверный AI должен работать с анонимизированными или неконфиденциальными данными.

**Шаги по внедрению:**

1.  **Удалить поле `plainText` из интерфейса `EncryptedMessagePayload` в `server/messenger/service.ts`**.

2.  **Модифицировать клиентскую часть (`client/src/lib/messenger.ts`):**
    - Убрать отправку `plainText` при вызове API.
    - Реализовать логику, при которой AI-анализ (если он необходим в реальном времени) происходит локально на устройстве пользователя перед шифрованием.

3.  **Переработать логику AI-ассистента на сервере:**
    - AI-ассистент больше не сможет анализировать содержание сообщений.
    - Его роль может быть изменена на предоставление ответов на основе неконфиденциального контекста (например, тип запроса, наличие вложений) или на общие вопросы, не связанные с медицинской информацией.

## 3. [Высокий приоритет] Перенос хранилища `state` ЕСИА в Redis для масштабируемости

**Проблема:**
Параметр `state` для защиты от CSRF-атак при авторизации через ЕСИА хранится в `Map` в памяти сервера. Это решение не будет работать при горизонтальном масштабировании, когда приложение запускается на нескольких серверах, так как `state` будет доступен только на одном из них.

**Решение:**
Перенести хранилище `state` в **Redis** с коротким временем жизни (TTL), что обеспечит централизованный и масштабируемый доступ.

**Шаги по внедрению:**

1.  **Убедиться, что Redis клиент доступен в модуле `esia/router.ts`**.

2.  **Модифицировать `server/esia/router.ts`:**
    - При генерации URL для авторизации, сохранять `state` в Redis.
    - При обработке callback-запроса, проверять `state` из Redis и удалять его.

    ```typescript
    // server/esia/router.ts
    import { cacheSet, cacheGet, cacheDel } from '../lib/redis';

    // ... в обработчике /esia/auth
    const state = generateState();
    // Сохраняем state в Redis на 10 минут
    await cacheSet(`esia_state:${state}`, JSON.stringify({ valid: true }), { ttl: 600 });
    const authUrl = getAuthorizationUrl(state);
    res.redirect(authUrl);

    // ... в обработчике /esia/callback
    const { code, state: returnedState } = req.query;

    const storedState = await cacheGet(`esia_state:${returnedState}`);
    if (!storedState) {
      return res.status(400).send('Invalid or expired state');
    }

    // Удаляем state после использования
    await cacheDel(`esia_state:${returnedState}`);
    ```

## 4. [Высокий приоритет] Расширение тестового покрытия

**Проблема:**
Недостаточное тестовое покрытие, особенно для интеграционных и E2E-тестов, увеличивает риск возникновения багов и регрессий при внесении изменений в кодовую базу.

**Решение:**
Написать тесты для ключевых бизнес-сценариев и API-эндпоинтов.

**Шаги по внедрению:**

1.  **Интеграционные тесты для tRPC:**
    - Создать тестовый файл `tests/integration/trpc.test.ts`.
    - Написать тесты для основных роутеров (`dashboard`, `patient`, `rehabilitation`), используя тестовую базу данных для изоляции.

2.  **E2E-тесты с Playwright:**
    - Создать тестовый файл `tests/e2e/auth.spec.ts`.
    - Написать E2E-тест, симулирующий полный цикл авторизации пользователя через ЕСИА.

    ```typescript
    // tests/e2e/auth.spec.ts
    import { test, expect } from '@playwright/test';

    test('Full user authentication flow via ESIA', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Войти через Госуслуги")');
      
      // Ожидаем редиректа на страницу ЕСИА
      await page.waitForURL('**/esia.gosuslugi.ru/**');

      // Здесь можно использовать моки для API ЕСИА, чтобы завершить флоу
      // ...

      // Проверяем, что после успешной авторизации пользователь попадает на дашборд
      await page.waitForURL('**/dashboard');
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });
    ```

## 5. [Средний приоритет] Внедрение ESLint для статического анализа кода

**Проблема:**
Отсутствие ESLint лишает проект важного инструмента для автоматического поиска ошибок, обеспечения единого стиля кода и соблюдения лучших практик.

**Решение:**
Интегрировать ESLint в проект и в CI/CD пайплайн.

**Шаги по внедрению:**

1.  **Установить зависимости:**
    ```bash
    pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
    ```

2.  **Создать конфигурационный файл `.eslintrc.cjs`:**
    ```javascript
    module.exports = {
      root: true,
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'react-hooks'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
      ],
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'react/react-in-jsx-scope': 'off',
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    };
    ```

3.  **Добавить скрипт в `package.json`:**
    ```json
    {
      "scripts": {
        "lint": "eslint . --ext .ts,.tsx"
      }
    }
    ```

4.  **Интегрировать в CI/CD (`.github/workflows/ci.yml`):**
    - Добавить новый шаг в `lint-and-type-check` job для запуска ESLint.

    ```yaml
    - name: Run ESLint
      run: pnpm lint
    ```
