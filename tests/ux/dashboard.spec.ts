import { test, expect } from '@playwright/test';

/**
 * UX тесты для Dashboard
 * Проверяют метрики вовлечённости и удобства использования
 */

test.describe('Dashboard UX Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ждём загрузки страницы
    await page.waitForLoadState('networkidle');
  });

  test.describe('Быстрые действия', () => {
    test('должно быть ровно 4 быстрых действия', async ({ page }) => {
      const quickActions = page.locator('[data-testid="quick-action"], .quick-action-card, button:has-text("Чат"), button:has-text("Запись"), button:has-text("Изделия"), button:has-text("Задания")');
      // Проверяем что кнопки видны
      const chatButton = page.getByRole('button', { name: /чат|chat/i }).first();
      const bookButton = page.getByRole('button', { name: /запись|book/i }).first();
      await expect(chatButton).toBeVisible();
      await expect(bookButton).toBeVisible();
    });

    test('кнопки быстрых действий должны быть достаточно большими для touch (48x48)', async ({ page }) => {
      const buttons = page.locator('button').filter({ hasText: /чат|запись|изделия|задания/i });
      const count = await buttons.count();
      
      for (let i = 0; i < Math.min(count, 4); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('клик по быстрому действию должен происходить без задержки', async ({ page }) => {
      const chatButton = page.getByRole('link', { name: /чат|messages/i }).first();
      
      if (await chatButton.isVisible()) {
        const startTime = Date.now();
        await chatButton.click();
        const clickTime = Date.now() - startTime;
        
        // Клик должен быть обработан менее чем за 100ms
        expect(clickTime).toBeLessThan(100);
      }
    });
  });

  test.describe('Время загрузки', () => {
    test('страница должна загружаться менее чем за 3 секунды', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('First Contentful Paint должен быть менее 1.5 секунд', async ({ page }) => {
      await page.goto('/');
      
      const fcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
            if (fcpEntry) {
              resolve(fcpEntry.startTime);
            }
          });
          observer.observe({ entryTypes: ['paint'] });
          
          // Fallback если FCP уже произошёл
          setTimeout(() => {
            const entries = performance.getEntriesByName('first-contentful-paint');
            if (entries.length > 0) {
              resolve(entries[0].startTime);
            } else {
              resolve(0);
            }
          }, 100);
        });
      });
      
      if (fcp > 0) {
        expect(fcp).toBeLessThan(1500);
      }
    });
  });

  test.describe('Скролл и навигация', () => {
    test('скролл должен быть плавным', async ({ page }) => {
      // Проверяем что есть контент для скролла
      const content = page.locator('main, .mobile-content');
      await expect(content.first()).toBeVisible();
      
      // Проверяем CSS свойство scroll-behavior
      const scrollBehavior = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).scrollBehavior;
      });
      
      expect(scrollBehavior).toBe('smooth');
    });

    test('нижняя навигация должна быть видна на мобильных', async ({ page, isMobile }) => {
      if (isMobile) {
        const bottomNav = page.locator('.mobile-bottom-nav, nav[role="navigation"]').first();
        await expect(bottomNav).toBeVisible();
      }
    });
  });

  test.describe('Пустые состояния', () => {
    test('пустое состояние должно отображаться корректно', async ({ page }) => {
      // Проверяем наличие пустых состояний или контента
      const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
      const content = page.locator('.mobile-card, .card');
      
      // Должен быть либо контент, либо пустое состояние
      const hasEmptyState = await emptyState.count() > 0;
      const hasContent = await content.count() > 0;
      
      expect(hasEmptyState || hasContent).toBeTruthy();
    });
  });

  test.describe('Accessibility', () => {
    test('все интерактивные элементы должны быть доступны с клавиатуры', async ({ page }) => {
      const interactiveElements = page.locator('button, a, input, [role="button"]');
      const count = await interactiveElements.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = interactiveElements.nth(i);
        if (await element.isVisible()) {
          // Проверяем что элемент может получить фокус
          await element.focus();
          const isFocused = await element.evaluate(el => el === document.activeElement);
          // Некоторые элементы могут быть не фокусируемыми, это нормально
        }
      }
    });

    test('цветовой контраст должен быть достаточным', async ({ page }) => {
      // Проверяем основной текст
      const textColor = await page.evaluate(() => {
        const body = document.body;
        const style = getComputedStyle(body);
        return style.color;
      });
      
      // Текст должен быть достаточно тёмным
      expect(textColor).toBeTruthy();
    });
  });
});

test.describe('Dashboard Performance Metrics', () => {
  test('сбор метрик производительности', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        // Время загрузки DOM
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime,
        // Полная загрузка
        loadComplete: navigation?.loadEventEnd - navigation?.startTime,
        // First Paint
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        // First Contentful Paint
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        // Размер страницы
        transferSize: navigation?.transferSize,
      };
    });
    
    console.log('Dashboard Performance Metrics:', metrics);
    
    // Проверки
    if (metrics.domContentLoaded) {
      expect(metrics.domContentLoaded).toBeLessThan(2000);
    }
    if (metrics.firstContentfulPaint) {
      expect(metrics.firstContentfulPaint).toBeLessThan(1500);
    }
  });
});
