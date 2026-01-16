import { test, expect, Page } from '@playwright/test';

/**
 * Симуляция пользовательских сессий для сбора метрик вовлечённости
 * Имитирует реальное поведение пользователей на разных страницах
 */

interface SessionMetrics {
  sessionId: string;
  userType: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  pages: PageMetrics[];
  totalClicks: number;
  totalScrolls: number;
  navigationPath: string[];
}

interface PageMetrics {
  path: string;
  enterTime: number;
  exitTime: number;
  timeOnPage: number;
  clicks: number;
  scrollDepth: number;
  interactions: string[];
}

// Хранилище метрик для всех сессий
const allSessionMetrics: SessionMetrics[] = [];

// Функция для трекинга кликов на странице
async function trackClicks(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return (window as any).__clickCount || 0;
  });
}

// Функция для симуляции скролла
async function simulateScroll(page: Page, depth: number): Promise<void> {
  await page.evaluate((scrollDepth) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, maxScroll * scrollDepth);
  }, depth);
  await page.waitForTimeout(300);
}

// Функция для симуляции чтения контента
async function simulateReading(page: Page, duration: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < duration) {
    // Небольшие скроллы как при чтении
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 100);
    });
    await page.waitForTimeout(500 + Math.random() * 1000);
  }
}

test.describe('User Session Simulation - Metrics Collection', () => {
  
  test.describe.configure({ mode: 'serial' });

  // Симуляция: Новый пользователь изучает приложение
  test('Сессия 1: Новый пользователь - первое знакомство', async ({ page }) => {
    const sessionMetrics: SessionMetrics = {
      sessionId: `session_${Date.now()}_new_user`,
      userType: 'new_user',
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      pages: [],
      totalClicks: 0,
      totalScrolls: 0,
      navigationPath: []
    };

    // Инжектируем трекер кликов
    await page.addInitScript(() => {
      (window as any).__clickCount = 0;
      document.addEventListener('click', () => {
        (window as any).__clickCount++;
      });
    });

    // 1. Начинаем с главной страницы
    let pageStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/');
    
    // Изучаем Dashboard (15-20 секунд)
    await simulateReading(page, 5000);
    await simulateScroll(page, 0.5);
    await simulateReading(page, 3000);
    await simulateScroll(page, 1.0);
    
    // Кликаем по быстрым действиям
    const chatButton = page.locator('a[href="/messages"], button:has-text("Чат")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();
      sessionMetrics.totalClicks++;
    }
    
    sessionMetrics.pages.push({
      path: '/',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: await trackClicks(page),
      scrollDepth: 100,
      interactions: ['scroll', 'click_chat']
    });

    // 2. Переходим в Messages
    pageStart = Date.now();
    await page.waitForURL('**/messages**', { timeout: 5000 }).catch(() => {
      // Если не перешли, переходим вручную
    });
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/messages');
    
    // Изучаем список чатов (10 секунд)
    await simulateReading(page, 4000);
    
    // Пробуем кликнуть на чат
    const chatItem = page.locator('.mobile-list-item, button').first();
    if (await chatItem.isVisible()) {
      await chatItem.click();
      sessionMetrics.totalClicks++;
      await page.waitForTimeout(2000);
    }
    
    sessionMetrics.pages.push({
      path: '/messages',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 1,
      scrollDepth: 50,
      interactions: ['view_chat_list', 'click_chat']
    });

    // 3. Переходим в Auth (проверяем авторизацию)
    pageStart = Date.now();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/auth');
    
    // Изучаем страницу авторизации (8 секунд)
    await simulateReading(page, 3000);
    
    // Проверяем кнопку Госуслуг
    const gosuslugiBtn = page.locator('button:has-text("Госуслуги")').first();
    if (await gosuslugiBtn.isVisible()) {
      // Наводим курсор (hover)
      await gosuslugiBtn.hover();
      await page.waitForTimeout(1000);
    }
    
    sessionMetrics.pages.push({
      path: '/auth',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 30,
      interactions: ['view_auth', 'hover_gosuslugi']
    });

    // Завершаем сессию
    sessionMetrics.endTime = Date.now();
    sessionMetrics.totalDuration = sessionMetrics.endTime - sessionMetrics.startTime;
    sessionMetrics.totalClicks = sessionMetrics.pages.reduce((sum, p) => sum + p.clicks, 0);
    
    allSessionMetrics.push(sessionMetrics);
    
    console.log('=== Session 1 Metrics ===');
    console.log(JSON.stringify(sessionMetrics, null, 2));
    
    expect(sessionMetrics.totalDuration).toBeGreaterThan(5000);
  });

  // Симуляция: Активный пользователь проверяет уведомления
  test('Сессия 2: Активный пользователь - проверка сообщений', async ({ page }) => {
    const sessionMetrics: SessionMetrics = {
      sessionId: `session_${Date.now()}_active_user`,
      userType: 'active_user',
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      pages: [],
      totalClicks: 0,
      totalScrolls: 0,
      navigationPath: []
    };

    // 1. Быстро проверяем Dashboard
    let pageStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/');
    
    // Активный пользователь быстро сканирует (3-5 секунд)
    await page.waitForTimeout(2000);
    
    sessionMetrics.pages.push({
      path: '/',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 20,
      interactions: ['quick_scan']
    });

    // 2. Сразу идёт в Messages
    pageStart = Date.now();
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/messages');
    
    // Проверяет сообщения (8-10 секунд)
    await simulateReading(page, 4000);
    await simulateScroll(page, 0.7);
    
    sessionMetrics.pages.push({
      path: '/messages',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 70,
      interactions: ['check_messages', 'scroll_list']
    });

    // 3. Проверяет устройства
    pageStart = Date.now();
    await page.goto('/devices');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/devices');
    
    await simulateReading(page, 3000);
    
    sessionMetrics.pages.push({
      path: '/devices',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 50,
      interactions: ['check_devices']
    });

    // Завершаем сессию
    sessionMetrics.endTime = Date.now();
    sessionMetrics.totalDuration = sessionMetrics.endTime - sessionMetrics.startTime;
    
    allSessionMetrics.push(sessionMetrics);
    
    console.log('=== Session 2 Metrics ===');
    console.log(JSON.stringify(sessionMetrics, null, 2));
    
    expect(sessionMetrics.pages.length).toBeGreaterThanOrEqual(3);
  });

  // Симуляция: Пользователь ищет информацию
  test('Сессия 3: Пользователь - поиск информации', async ({ page }) => {
    const sessionMetrics: SessionMetrics = {
      sessionId: `session_${Date.now()}_info_seeker`,
      userType: 'info_seeker',
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      pages: [],
      totalClicks: 0,
      totalScrolls: 0,
      navigationPath: []
    };

    // 1. Dashboard
    let pageStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/');
    
    await page.waitForTimeout(1500);
    
    sessionMetrics.pages.push({
      path: '/',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 10,
      interactions: ['quick_view']
    });

    // 2. Settings - ищет настройки
    pageStart = Date.now();
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/settings');
    
    await simulateReading(page, 4000);
    await simulateScroll(page, 0.8);
    
    sessionMetrics.pages.push({
      path: '/settings',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 80,
      interactions: ['explore_settings', 'deep_scroll']
    });

    // 3. Profile
    pageStart = Date.now();
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/profile');
    
    await simulateReading(page, 3000);
    
    sessionMetrics.pages.push({
      path: '/profile',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 60,
      interactions: ['view_profile']
    });

    // Завершаем сессию
    sessionMetrics.endTime = Date.now();
    sessionMetrics.totalDuration = sessionMetrics.endTime - sessionMetrics.startTime;
    
    allSessionMetrics.push(sessionMetrics);
    
    console.log('=== Session 3 Metrics ===');
    console.log(JSON.stringify(sessionMetrics, null, 2));
    
    expect(sessionMetrics.navigationPath.length).toBeGreaterThanOrEqual(3);
  });

  // Симуляция: Мобильный пользователь
  test('Сессия 4: Мобильный пользователь - быстрая проверка', async ({ page }) => {
    const sessionMetrics: SessionMetrics = {
      sessionId: `session_${Date.now()}_mobile_user`,
      userType: 'mobile_user',
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      pages: [],
      totalClicks: 0,
      totalScrolls: 0,
      navigationPath: []
    };

    // Мобильные пользователи обычно быстрее
    
    // 1. Dashboard
    let pageStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/');
    
    await page.waitForTimeout(2000);
    await simulateScroll(page, 0.3);
    
    sessionMetrics.pages.push({
      path: '/',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 30,
      interactions: ['mobile_scan']
    });

    // 2. Messages - основная цель
    pageStart = Date.now();
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/messages');
    
    await page.waitForTimeout(3000);
    
    sessionMetrics.pages.push({
      path: '/messages',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 0,
      scrollDepth: 40,
      interactions: ['check_messages_mobile']
    });

    // Завершаем сессию
    sessionMetrics.endTime = Date.now();
    sessionMetrics.totalDuration = sessionMetrics.endTime - sessionMetrics.startTime;
    
    allSessionMetrics.push(sessionMetrics);
    
    console.log('=== Session 4 Metrics ===');
    console.log(JSON.stringify(sessionMetrics, null, 2));
    
    expect(sessionMetrics.totalDuration).toBeLessThan(30000); // Мобильные сессии короче
  });

  // Симуляция: Пользователь авторизуется
  test('Сессия 5: Пользователь - процесс авторизации', async ({ page }) => {
    const sessionMetrics: SessionMetrics = {
      sessionId: `session_${Date.now()}_auth_user`,
      userType: 'auth_user',
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      pages: [],
      totalClicks: 0,
      totalScrolls: 0,
      navigationPath: []
    };

    // 1. Сразу на страницу авторизации
    let pageStart = Date.now();
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    sessionMetrics.navigationPath.push('/auth');
    
    // Изучает опции авторизации
    await page.waitForTimeout(2000);
    
    // Проверяет кнопку Госуслуг
    const gosuslugiBtn = page.locator('button:has-text("Госуслуги")').first();
    if (await gosuslugiBtn.isVisible()) {
      await gosuslugiBtn.hover();
      await page.waitForTimeout(500);
      sessionMetrics.totalClicks++;
    }
    
    // Проверяет альтернативные методы
    const phoneBtn = page.locator('button:has-text("Телефон")').first();
    if (await phoneBtn.isVisible()) {
      await phoneBtn.hover();
      await page.waitForTimeout(500);
    }
    
    sessionMetrics.pages.push({
      path: '/auth',
      enterTime: pageStart,
      exitTime: Date.now(),
      timeOnPage: Date.now() - pageStart,
      clicks: 1,
      scrollDepth: 50,
      interactions: ['view_auth_options', 'hover_gosuslugi', 'hover_phone']
    });

    // Завершаем сессию
    sessionMetrics.endTime = Date.now();
    sessionMetrics.totalDuration = sessionMetrics.endTime - sessionMetrics.startTime;
    
    allSessionMetrics.push(sessionMetrics);
    
    console.log('=== Session 5 Metrics ===');
    console.log(JSON.stringify(sessionMetrics, null, 2));
    
    expect(sessionMetrics.pages[0].interactions.length).toBeGreaterThan(1);
  });

  // Итоговый отчёт по всем сессиям
  test('Генерация итогового отчёта по метрикам', async ({ page }) => {
    // Собираем агрегированные метрики
    const report = {
      totalSessions: allSessionMetrics.length,
      avgSessionDuration: 0,
      avgPagesPerSession: 0,
      avgTimeOnPage: {} as Record<string, number>,
      avgScrollDepth: {} as Record<string, number>,
      mostVisitedPages: {} as Record<string, number>,
      userTypeBreakdown: {} as Record<string, number>,
      interactionPatterns: {} as Record<string, number>
    };

    // Расчёт средней длительности сессии
    report.avgSessionDuration = allSessionMetrics.reduce((sum, s) => sum + s.totalDuration, 0) / allSessionMetrics.length;
    
    // Расчёт среднего количества страниц за сессию
    report.avgPagesPerSession = allSessionMetrics.reduce((sum, s) => sum + s.pages.length, 0) / allSessionMetrics.length;
    
    // Агрегация по страницам
    const pageMetrics: Record<string, { totalTime: number; count: number; totalScroll: number }> = {};
    
    for (const session of allSessionMetrics) {
      // Подсчёт типов пользователей
      report.userTypeBreakdown[session.userType] = (report.userTypeBreakdown[session.userType] || 0) + 1;
      
      for (const pageData of session.pages) {
        // Подсчёт посещений страниц
        report.mostVisitedPages[pageData.path] = (report.mostVisitedPages[pageData.path] || 0) + 1;
        
        // Агрегация времени и скролла
        if (!pageMetrics[pageData.path]) {
          pageMetrics[pageData.path] = { totalTime: 0, count: 0, totalScroll: 0 };
        }
        pageMetrics[pageData.path].totalTime += pageData.timeOnPage;
        pageMetrics[pageData.path].count++;
        pageMetrics[pageData.path].totalScroll += pageData.scrollDepth;
        
        // Подсчёт взаимодействий
        for (const interaction of pageData.interactions) {
          report.interactionPatterns[interaction] = (report.interactionPatterns[interaction] || 0) + 1;
        }
      }
    }
    
    // Расчёт средних значений по страницам
    for (const [path, metrics] of Object.entries(pageMetrics)) {
      report.avgTimeOnPage[path] = Math.round(metrics.totalTime / metrics.count);
      report.avgScrollDepth[path] = Math.round(metrics.totalScroll / metrics.count);
    }

    console.log('\n========================================');
    console.log('=== ИТОГОВЫЙ ОТЧЁТ ПО МЕТРИКАМ UX ===');
    console.log('========================================\n');
    console.log(JSON.stringify(report, null, 2));
    console.log('\n========================================\n');
    
    // Проверки
    expect(report.totalSessions).toBeGreaterThanOrEqual(5);
    expect(report.avgSessionDuration).toBeGreaterThan(0);
  });
});
