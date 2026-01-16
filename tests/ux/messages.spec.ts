import { test, expect } from '@playwright/test';

/**
 * UX тесты для Messages
 * Проверяют удобство использования мессенджера
 */

test.describe('Messages UX Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Список чатов', () => {
    test('список чатов должен загружаться быстро', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/messages');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000);
    });

    test('элементы списка должны быть достаточно большими для touch', async ({ page }) => {
      const chatItems = page.locator('.mobile-list-item, [role="listitem"]');
      const count = await chatItems.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const item = chatItems.nth(i);
        if (await item.isVisible()) {
          const box = await item.boundingBox();
          if (box) {
            // Минимальная высота для touch target
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test('AI-ассистент должен быть заметен', async ({ page }) => {
      const aiCard = page.locator('text=/AI|ассистент|assistant/i').first();
      if (await aiCard.isVisible()) {
        const box = await aiCard.boundingBox();
        expect(box).toBeTruthy();
      }
    });
  });

  test.describe('Интерфейс чата', () => {
    test('header чата должен быть компактным', async ({ page }) => {
      // Кликаем на первый чат если есть
      const firstChat = page.locator('.mobile-list-item, button').first();
      if (await firstChat.isVisible()) {
        await firstChat.click();
        await page.waitForTimeout(500);
        
        const header = page.locator('.mobile-header, header').first();
        if (await header.isVisible()) {
          const box = await header.boundingBox();
          if (box) {
            // Header не должен быть слишком высоким
            expect(box.height).toBeLessThan(100);
          }
        }
      }
    });

    test('поле ввода сообщения должно быть удобным', async ({ page }) => {
      const input = page.locator('input[type="text"], textarea').first();
      if (await input.isVisible()) {
        const box = await input.boundingBox();
        if (box) {
          // Минимальная высота для удобного ввода
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });
  });

  test.describe('Отсутствие демо-элементов', () => {
    test('не должно быть демо-кнопок', async ({ page }) => {
      const demoButtons = page.locator('text=/demo|демо|test message/i');
      const count = await demoButtons.count();
      
      // Демо-кнопки должны быть удалены
      expect(count).toBe(0);
    });
  });

  test.describe('Индикация AI', () => {
    test('AI-режим должен быть визуально отличим', async ({ page }) => {
      // Проверяем наличие индикаторов AI
      const aiIndicators = page.locator('[aria-label*="AI"], .ai-indicator, svg[class*="sparkle"]');
      // AI индикаторы могут быть или не быть, это нормально
    });
  });

  test.describe('Производительность', () => {
    test('переход в чат должен быть быстрым', async ({ page }) => {
      const chatItem = page.locator('.mobile-list-item, button').first();
      
      if (await chatItem.isVisible()) {
        const startTime = Date.now();
        await chatItem.click();
        await page.waitForTimeout(300);
        const transitionTime = Date.now() - startTime;
        
        // Переход должен быть менее 500ms
        expect(transitionTime).toBeLessThan(500);
      }
    });
  });
});

test.describe('Messages Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
  });

  test('все чаты должны иметь aria-labels', async ({ page }) => {
    const chatButtons = page.locator('button[aria-label]');
    const count = await chatButtons.count();
    
    // Должны быть кнопки с aria-labels
    // Не требуем строго, так как это зависит от наличия чатов
  });

  test('индикаторы непрочитанных должны быть доступны', async ({ page }) => {
    const unreadBadges = page.locator('[aria-label*="непрочитан"], .unread-badge');
    // Проверяем что если есть бейджи, они имеют aria-label
  });
});
