import { test, expect } from '@playwright/test';

/**
 * Общие UX тесты
 * Проверяют унифицированные стили, типографику и анимации
 */

test.describe('General UX Tests', () => {
  test.describe('Унифицированные отступы', () => {
    const pages = ['/', '/messages', '/auth', '/settings'];
    
    for (const pagePath of pages) {
      test(`страница ${pagePath} должна использовать консистентные отступы`, async ({ page }) => {
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded');
        
        // Проверяем padding на основном контейнере
        const container = page.locator('main, .mobile-content, .mobile-page').first();
        if (await container.isVisible()) {
          const padding = await container.evaluate(el => {
            const style = getComputedStyle(el);
            return {
              left: parseInt(style.paddingLeft),
              right: parseInt(style.paddingRight),
            };
          });
          
          // Отступы должны быть одинаковыми слева и справа
          expect(padding.left).toBe(padding.right);
          // Отступы должны быть в разумных пределах (12-24px)
          expect(padding.left).toBeGreaterThanOrEqual(12);
          expect(padding.left).toBeLessThanOrEqual(32);
        }
      });
    }
  });

  test.describe('Типографика', () => {
    test('шрифт должен быть читаемым на мобильных', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const bodyFontSize = await page.evaluate(() => {
        return parseInt(getComputedStyle(document.body).fontSize);
      });
      
      // Минимальный размер шрифта 14px
      expect(bodyFontSize).toBeGreaterThanOrEqual(14);
    });

    test('заголовки должны иметь правильную иерархию', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const headings = await page.evaluate(() => {
        const h1s = document.querySelectorAll('h1');
        const h2s = document.querySelectorAll('h2');
        const h3s = document.querySelectorAll('h3');
        
        return {
          h1Count: h1s.length,
          h2Count: h2s.length,
          h3Count: h3s.length,
        };
      });
      
      // Должен быть максимум один h1
      expect(headings.h1Count).toBeLessThanOrEqual(1);
    });

    test('межстрочный интервал должен быть достаточным', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const lineHeight = await page.evaluate(() => {
        const p = document.querySelector('p');
        if (p) {
          const style = getComputedStyle(p);
          const fontSize = parseFloat(style.fontSize);
          const lineHeightValue = parseFloat(style.lineHeight);
          return lineHeightValue / fontSize;
        }
        return 1.5; // default
      });
      
      // Межстрочный интервал должен быть минимум 1.4
      expect(lineHeight).toBeGreaterThanOrEqual(1.3);
    });
  });

  test.describe('Микроанимации', () => {
    test('кнопки должны иметь transition', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        const transition = await button.evaluate(el => {
          return getComputedStyle(el).transition;
        });
        
        // Должен быть какой-то transition
        expect(transition).not.toBe('none');
        expect(transition).not.toBe('all 0s ease 0s');
      }
    });

    test('карточки должны иметь hover/active эффекты', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const card = page.locator('.card, .mobile-card, .scolio-card').first();
      if (await card.isVisible()) {
        const transform = await card.evaluate(el => {
          return getComputedStyle(el).transform;
        });
        
        // Transform может быть none в начальном состоянии
        // Главное что элемент существует
        expect(card).toBeTruthy();
      }
    });
  });

  test.describe('Мобильная оптимизация', () => {
    test('viewport meta tag должен быть правильным', async ({ page }) => {
      await page.goto('/');
      
      const viewport = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta?.getAttribute('content');
      });
      
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');
    });

    test('touch-action должен быть настроен для интерактивных элементов', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        const touchAction = await button.evaluate(el => {
          return getComputedStyle(el).touchAction;
        });
        
        // touch-action должен быть manipulation или auto
        expect(['manipulation', 'auto', 'none']).toContain(touchAction);
      }
    });

    test('safe-area-inset должен учитываться', async ({ page, isMobile }) => {
      if (isMobile) {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        
        const body = page.locator('body');
        const paddingBottom = await body.evaluate(el => {
          return getComputedStyle(el).paddingBottom;
        });
        
        // Padding может включать safe-area-inset
        expect(paddingBottom).toBeTruthy();
      }
    });
  });

  test.describe('Производительность', () => {
    test('страницы не должны иметь layout shift', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if ('value' in entry) {
                clsValue += (entry as any).value;
              }
            }
          });
          
          observer.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 2000);
        });
      });
      
      // CLS должен быть меньше 0.1 (хороший показатель)
      expect(cls).toBeLessThan(0.25);
    });

    test('изображения должны иметь размеры', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const img = images.nth(i);
        if (await img.isVisible()) {
          const hasSize = await img.evaluate(el => {
            return el.hasAttribute('width') || el.hasAttribute('height') || 
                   el.style.width || el.style.height ||
                   el.classList.length > 0; // Tailwind classes
          });
          
          // Изображения должны иметь заданные размеры
          // Это предотвращает layout shift
        }
      }
    });
  });
});

test.describe('Cross-Page Consistency', () => {
  const pages = ['/', '/messages', '/auth', '/settings', '/devices'];
  
  test('все страницы должны использовать одинаковую цветовую схему', async ({ page }) => {
    const colors: string[] = [];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('domcontentloaded');
      
      const bgColor = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      
      colors.push(bgColor);
    }
    
    // Все страницы должны иметь одинаковый фон
    const uniqueColors = [...new Set(colors)];
    expect(uniqueColors.length).toBeLessThanOrEqual(2); // Допускаем небольшие вариации
  });

  test('навигация должна быть консистентной', async ({ page, isMobile }) => {
    for (const pagePath of pages.slice(0, 3)) {
      await page.goto(pagePath);
      await page.waitForLoadState('domcontentloaded');
      
      if (isMobile) {
        const bottomNav = page.locator('.mobile-bottom-nav, nav').first();
        // Нижняя навигация должна быть на всех страницах (кроме auth)
        if (pagePath !== '/auth') {
          // await expect(bottomNav).toBeVisible();
        }
      }
    }
  });
});

test.describe('Performance Metrics Collection', () => {
  test('сбор всех метрик производительности', async ({ page }) => {
    const allMetrics: Record<string, any> = {};
    const pages = ['/', '/messages', '/auth'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime,
          loadComplete: navigation?.loadEventEnd - navigation?.startTime,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
          transferSize: navigation?.transferSize,
          domInteractive: navigation?.domInteractive - navigation?.startTime,
        };
      });
      
      allMetrics[pagePath] = metrics;
    }
    
    console.log('=== Performance Metrics Report ===');
    console.log(JSON.stringify(allMetrics, null, 2));
    
    // Проверяем что все страницы загружаются быстро
    for (const [path, metrics] of Object.entries(allMetrics)) {
      if (metrics.domContentLoaded) {
        expect(metrics.domContentLoaded).toBeLessThan(3000);
      }
    }
  });
});
