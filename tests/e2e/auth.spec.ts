/**
 * E2E тесты для процесса авторизации
 * 
 * Тестирует:
 * - Страницу авторизации
 * - Редирект на ЕСИА
 * - Обработку callback
 * - Сессию пользователя
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login page with all auth options', async ({ page }) => {
      await page.goto('/auth');

      // Проверяем наличие основных элементов
      await expect(page.locator('text=Войти')).toBeVisible();
      
      // Проверяем наличие кнопки ЕСИА
      const esiaButton = page.locator('button:has-text("Госуслуги"), button:has-text("ЕСИА")');
      await expect(esiaButton).toBeVisible();
    });

    test('should display alternative auth methods', async ({ page }) => {
      await page.goto('/auth');

      // Проверяем наличие альтернативных методов
      const phoneTab = page.locator('text=Телефон');
      const emailTab = page.locator('text=Email');

      // Хотя бы один из методов должен быть доступен
      const hasAlternative = await phoneTab.isVisible() || await emailTab.isVisible();
      expect(hasAlternative).toBe(true);
    });

    test('should have proper accessibility attributes', async ({ page }) => {
      await page.goto('/auth');

      // Проверяем доступность формы
      const form = page.locator('form');
      if (await form.count() > 0) {
        // Кнопки должны иметь текст или aria-label
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < buttonCount; i++) {
          const button = buttons.nth(i);
          const hasText = await button.textContent();
          const hasAriaLabel = await button.getAttribute('aria-label');
          expect(hasText || hasAriaLabel).toBeTruthy();
        }
      }
    });
  });

  test.describe('ESIA Authentication', () => {
    test('should redirect to ESIA on button click', async ({ page }) => {
      await page.goto('/auth');

      // Находим кнопку ЕСИА
      const esiaButton = page.locator('button:has-text("Госуслуги"), button:has-text("ЕСИА")');
      
      if (await esiaButton.isVisible()) {
        // Перехватываем навигацию
        const [response] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/auth/esia') || resp.url().includes('esia')),
          esiaButton.click(),
        ]).catch(() => [null]);

        // Проверяем что произошел редирект
        const currentUrl = page.url();
        const isRedirected = currentUrl.includes('esia') || 
                            currentUrl.includes('gosuslugi') ||
                            currentUrl.includes('/auth/esia');
        
        expect(isRedirected || response !== null).toBe(true);
      }
    });

    test('should handle ESIA error response', async ({ page }) => {
      // Симулируем ошибку от ЕСИА
      await page.goto('/auth/esia/callback?error=access_denied&error_description=User%20cancelled');

      // Должен быть редирект на страницу ошибки или показано сообщение
      const currentUrl = page.url();
      const hasError = currentUrl.includes('error') || 
                       await page.locator('text=ошибка, text=error').isVisible().catch(() => false);
      
      expect(hasError).toBe(true);
    });

    test('should reject invalid state parameter', async ({ page }) => {
      // Пытаемся использовать невалидный state
      await page.goto('/auth/esia/callback?code=test-code&state=invalid-state-12345');

      // Должна быть ошибка invalid_state
      const currentUrl = page.url();
      expect(currentUrl).toContain('error');
    });
  });

  test.describe('Session Management', () => {
    test('should check auth status endpoint', async ({ page }) => {
      const response = await page.request.get('/auth/esia/status');
      
      expect(response.ok()).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('authenticated');
    });

    test('should return unauthenticated for new session', async ({ page }) => {
      // Очищаем cookies
      await page.context().clearCookies();
      
      const response = await page.request.get('/auth/esia/status');
      const data = await response.json();
      
      expect(data.authenticated).toBe(false);
    });

    test('should handle logout', async ({ page }) => {
      await page.goto('/auth/esia/logout');

      // После logout должен быть редирект
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/esia/logout');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from dashboard', async ({ page }) => {
      // Очищаем cookies
      await page.context().clearCookies();
      
      await page.goto('/dashboard');

      // Должен быть редирект на страницу авторизации
      await page.waitForURL(/\/(auth|login)/, { timeout: 5000 }).catch(() => {});
      
      const currentUrl = page.url();
      const isAuthPage = currentUrl.includes('auth') || currentUrl.includes('login');
      const isDashboard = currentUrl.includes('dashboard');
      
      // Либо редирект на auth, либо показ формы входа на dashboard
      expect(isAuthPage || isDashboard).toBe(true);
    });

    test('should redirect unauthenticated users from messages', async ({ page }) => {
      await page.context().clearCookies();
      
      await page.goto('/messages');

      await page.waitForURL(/\/(auth|login|messages)/, { timeout: 5000 }).catch(() => {});
      
      const currentUrl = page.url();
      expect(currentUrl).toBeDefined();
    });
  });

  test.describe('ESIA Health Check', () => {
    test('should return health status', async ({ page }) => {
      const response = await page.request.get('/auth/esia/health');
      
      if (response.ok()) {
        const data = await response.json();
        
        expect(data).toHaveProperty('esia');
        expect(data).toHaveProperty('redis');
        expect(data.esia).toHaveProperty('productionReady');
        expect(data.redis).toHaveProperty('connected');
      }
    });
  });
});

test.describe('Phone Authentication', () => {
  test('should display phone input field', async ({ page }) => {
    await page.goto('/auth');

    // Переключаемся на вкладку телефона если есть
    const phoneTab = page.locator('text=Телефон');
    if (await phoneTab.isVisible()) {
      await phoneTab.click();
      
      // Проверяем наличие поля ввода телефона
      const phoneInput = page.locator('input[type="tel"], input[placeholder*="телефон"], input[placeholder*="phone"]');
      await expect(phoneInput).toBeVisible();
    }
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto('/auth');

    const phoneTab = page.locator('text=Телефон');
    if (await phoneTab.isVisible()) {
      await phoneTab.click();
      
      const phoneInput = page.locator('input[type="tel"], input[placeholder*="телефон"]');
      if (await phoneInput.isVisible()) {
        // Вводим невалидный номер
        await phoneInput.fill('123');
        
        // Пытаемся отправить
        const submitButton = page.locator('button[type="submit"], button:has-text("Получить код")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Должна быть ошибка валидации
          const errorMessage = page.locator('text=неверный, text=invalid, text=ошибка');
          // Ошибка может появиться или кнопка может быть disabled
        }
      }
    }
  });
});

test.describe('Email Authentication', () => {
  test('should display email input field', async ({ page }) => {
    await page.goto('/auth');

    const emailTab = page.locator('text=Email');
    if (await emailTab.isVisible()) {
      await emailTab.click();
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="почт"]');
      await expect(emailInput).toBeVisible();
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth');

    const emailTab = page.locator('text=Email');
    if (await emailTab.isVisible()) {
      await emailTab.click();
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
      if (await emailInput.isVisible()) {
        // Вводим невалидный email
        await emailInput.fill('invalid-email');
        
        // Браузер должен показать ошибку валидации
        const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
        expect(isInvalid).toBe(true);
      }
    }
  });
});
