import { test, expect } from '@playwright/test';

/**
 * UX тесты для Auth
 * Проверяют удобство процесса авторизации
 */

test.describe('Auth UX Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Кнопка Госуслуг', () => {
    test('кнопка Госуслуг должна быть заметной', async ({ page }) => {
      const gosuslugiButton = page.locator('button:has-text("Госуслуги"), button:has-text("ЕСИА"), [data-testid="gosuslugi-button"]').first();
      
      if (await gosuslugiButton.isVisible()) {
        const box = await gosuslugiButton.boundingBox();
        if (box) {
          // Кнопка должна быть достаточно большой
          expect(box.height).toBeGreaterThanOrEqual(48);
          expect(box.width).toBeGreaterThanOrEqual(200);
        }
      }
    });

    test('кнопка Госуслуг должна быть в верхней части экрана', async ({ page }) => {
      const gosuslugiButton = page.locator('button:has-text("Госуслуги"), button:has-text("ЕСИА")').first();
      
      if (await gosuslugiButton.isVisible()) {
        const box = await gosuslugiButton.boundingBox();
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        
        if (box) {
          // Кнопка должна быть в верхней половине экрана
          expect(box.y).toBeLessThan(viewportHeight * 0.6);
        }
      }
    });

    test('кнопка Госуслуг должна иметь тень для выделения', async ({ page }) => {
      const gosuslugiButton = page.locator('button:has-text("Госуслуги"), button:has-text("ЕСИА")').first();
      
      if (await gosuslugiButton.isVisible()) {
        const boxShadow = await gosuslugiButton.evaluate(el => {
          return getComputedStyle(el).boxShadow;
        });
        
        // Должна быть тень (не 'none')
        expect(boxShadow).not.toBe('none');
      }
    });
  });

  test.describe('Альтернативные методы входа', () => {
    test('альтернативные методы должны быть менее заметными', async ({ page }) => {
      const gosuslugiButton = page.locator('button:has-text("Госуслуги"), button:has-text("ЕСИА")').first();
      const altButtons = page.locator('button:has-text("Телефон"), button:has-text("Email")');
      
      if (await gosuslugiButton.isVisible() && await altButtons.first().isVisible()) {
        const gosuslugiBox = await gosuslugiButton.boundingBox();
        const altBox = await altButtons.first().boundingBox();
        
        if (gosuslugiBox && altBox) {
          // Госуслуги должны быть больше или равны альтернативным
          expect(gosuslugiBox.height).toBeGreaterThanOrEqual(altBox.height);
        }
      }
    });

    test('альтернативные методы должны быть компактными', async ({ page }) => {
      const altButtons = page.locator('button:has-text("Телефон"), button:has-text("Email")');
      const count = await altButtons.count();
      
      for (let i = 0; i < count; i++) {
        const button = altButtons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // Альтернативные кнопки должны быть компактными
            expect(box.height).toBeLessThanOrEqual(60);
          }
        }
      }
    });
  });

  test.describe('Формы ввода', () => {
    test('поля ввода должны быть достаточно большими', async ({ page }) => {
      const inputs = page.locator('input[type="text"], input[type="tel"], input[type="email"]');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const box = await input.boundingBox();
          if (box) {
            // Минимальная высота для удобного ввода на мобильных
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test('поля ввода должны иметь размер шрифта 16px для предотвращения зума на iOS', async ({ page }) => {
      const inputs = page.locator('input');
      const count = await inputs.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const fontSize = await input.evaluate(el => {
            return getComputedStyle(el).fontSize;
          });
          
          const fontSizeNum = parseInt(fontSize);
          expect(fontSizeNum).toBeGreaterThanOrEqual(16);
        }
      }
    });
  });

  test.describe('Общий UX', () => {
    test('страница не должна содержать лишних features', async ({ page }) => {
      // Проверяем отсутствие лишних элементов
      const unnecessaryElements = page.locator('text=/premium|upgrade|subscribe/i');
      const count = await unnecessaryElements.count();
      
      expect(count).toBe(0);
    });

    test('страница должна быть центрирована на мобильных', async ({ page, isMobile }) => {
      if (isMobile) {
        const container = page.locator('main, .auth-container, form').first();
        if (await container.isVisible()) {
          const box = await container.boundingBox();
          const viewportWidth = await page.evaluate(() => window.innerWidth);
          
          if (box) {
            // Контейнер должен быть примерно по центру
            const leftMargin = box.x;
            const rightMargin = viewportWidth - (box.x + box.width);
            const marginDiff = Math.abs(leftMargin - rightMargin);
            
            // Разница в отступах не должна быть больше 50px
            expect(marginDiff).toBeLessThan(50);
          }
        }
      }
    });
  });

  test.describe('Производительность', () => {
    test('страница авторизации должна загружаться быстро', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/auth');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      // Auth страница должна загружаться очень быстро
      expect(loadTime).toBeLessThan(2000);
    });
  });
});

test.describe('Auth Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('форма должна быть доступна с клавиатуры', async ({ page }) => {
    // Нажимаем Tab для навигации
    await page.keyboard.press('Tab');
    
    // Проверяем что фокус перешёл на интерактивный элемент
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName.toLowerCase();
    });
    
    expect(['button', 'input', 'a', 'select', 'textarea']).toContain(focusedElement);
  });

  test('кнопки должны иметь понятные labels', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        // Кнопка должна иметь текст или aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });
});
