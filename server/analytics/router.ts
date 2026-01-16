/**
 * Серверный роутер для сбора и хранения аналитики
 */
import { Router } from 'express';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

// Директория для хранения аналитики
const ANALYTICS_DIR = join(process.cwd(), 'analytics-data');

// Создаем директорию если не существует
if (!existsSync(ANALYTICS_DIR)) {
  mkdirSync(ANALYTICS_DIR, { recursive: true });
}

interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  pages: Array<{
    page: string;
    enterTime: number;
    exitTime?: number;
    scrollDepth: number;
    clicks: number;
    interactions: Array<{
      type: string;
      page: string;
      element?: string;
      value?: string | number;
      timestamp: number;
    }>;
  }>;
  totalClicks: number;
  totalInteractions: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  viewport: { width: number; height: number };
}

/**
 * POST /api/analytics - Получение метрик сессии
 */
router.post('/', (req, res) => {
  try {
    const metrics: SessionMetrics = req.body;
    
    // Валидация
    if (!metrics.sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    // Добавляем timestamp сервера
    const enrichedMetrics = {
      ...metrics,
      serverTimestamp: Date.now(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    // Сохраняем в файл (для простоты, в production использовать БД)
    const filename = `analytics_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = join(ANALYTICS_DIR, filename);
    
    appendFileSync(filepath, JSON.stringify(enrichedMetrics) + '\n');

    console.log(`[Analytics] Saved session ${metrics.sessionId}: ${metrics.totalClicks} clicks, ${metrics.pages.length} pages`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Analytics] Error saving metrics:', error);
    res.status(500).json({ error: 'Failed to save metrics' });
  }
});

/**
 * GET /api/analytics/summary - Получение сводки по аналитике
 */
router.get('/summary', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const filename = `analytics_${today}.jsonl`;
    const filepath = join(ANALYTICS_DIR, filename);

    if (!existsSync(filepath)) {
      return res.json({
        date: today,
        sessions: 0,
        totalClicks: 0,
        totalPageViews: 0,
        avgTimeOnPage: 0,
        avgScrollDepth: 0,
        deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
        topPages: [],
        topElements: [],
      });
    }

    const content = readFileSync(filepath, 'utf-8');
    const sessions = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as SessionMetrics);

    // Агрегация метрик
    let totalClicks = 0;
    let totalPageViews = 0;
    let totalTimeOnPage = 0;
    let totalScrollDepth = 0;
    let pageCount = 0;
    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
    const pageViews: Record<string, number> = {};
    const elementClicks: Record<string, number> = {};

    for (const session of sessions) {
      totalClicks += session.totalClicks;
      deviceBreakdown[session.deviceType]++;

      for (const page of session.pages) {
        totalPageViews++;
        pageViews[page.page] = (pageViews[page.page] || 0) + 1;

        if (page.exitTime && page.enterTime) {
          totalTimeOnPage += page.exitTime - page.enterTime;
          pageCount++;
        }

        totalScrollDepth += page.scrollDepth;

        for (const interaction of page.interactions) {
          if (interaction.type === 'click' && interaction.element) {
            elementClicks[interaction.element] = (elementClicks[interaction.element] || 0) + 1;
          }
        }
      }
    }

    // Топ страницы
    const topPages = Object.entries(pageViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    // Топ элементы
    const topElements = Object.entries(elementClicks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([element, clicks]) => ({ element, clicks }));

    res.json({
      date: today,
      sessions: sessions.length,
      totalClicks,
      totalPageViews,
      avgTimeOnPage: pageCount > 0 ? Math.round(totalTimeOnPage / pageCount / 1000) : 0, // в секундах
      avgScrollDepth: totalPageViews > 0 ? Math.round(totalScrollDepth / totalPageViews) : 0,
      deviceBreakdown,
      topPages,
      topElements,
    });
  } catch (error) {
    console.error('[Analytics] Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

/**
 * GET /api/analytics/report - Детальный отчет по UX-метрикам
 */
router.get('/report', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const filename = `analytics_${today}.jsonl`;
    const filepath = join(ANALYTICS_DIR, filename);

    if (!existsSync(filepath)) {
      return res.json({ error: 'No data for today', sessions: [] });
    }

    const content = readFileSync(filepath, 'utf-8');
    const sessions = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as SessionMetrics);

    // Детальный анализ по страницам
    const pageAnalysis: Record<string, {
      views: number;
      avgTime: number;
      avgScrollDepth: number;
      avgClicks: number;
      bounceRate: number;
      topInteractions: Array<{ type: string; count: number }>;
    }> = {};

    for (const session of sessions) {
      for (const page of session.pages) {
        if (!pageAnalysis[page.page]) {
          pageAnalysis[page.page] = {
            views: 0,
            avgTime: 0,
            avgScrollDepth: 0,
            avgClicks: 0,
            bounceRate: 0,
            topInteractions: [],
          };
        }

        const pa = pageAnalysis[page.page];
        pa.views++;
        pa.avgScrollDepth = (pa.avgScrollDepth * (pa.views - 1) + page.scrollDepth) / pa.views;
        pa.avgClicks = (pa.avgClicks * (pa.views - 1) + page.clicks) / pa.views;

        if (page.exitTime && page.enterTime) {
          const timeOnPage = (page.exitTime - page.enterTime) / 1000;
          pa.avgTime = (pa.avgTime * (pa.views - 1) + timeOnPage) / pa.views;
        }

        // Bounce rate (менее 10 секунд и 0 кликов)
        if (page.exitTime && page.enterTime) {
          const timeOnPage = (page.exitTime - page.enterTime) / 1000;
          if (timeOnPage < 10 && page.clicks === 0) {
            pa.bounceRate = (pa.bounceRate * (pa.views - 1) + 100) / pa.views;
          } else {
            pa.bounceRate = (pa.bounceRate * (pa.views - 1)) / pa.views;
          }
        }
      }
    }

    // Округление значений
    for (const page of Object.values(pageAnalysis)) {
      page.avgTime = Math.round(page.avgTime * 10) / 10;
      page.avgScrollDepth = Math.round(page.avgScrollDepth);
      page.avgClicks = Math.round(page.avgClicks * 10) / 10;
      page.bounceRate = Math.round(page.bounceRate);
    }

    res.json({
      date: today,
      totalSessions: sessions.length,
      pageAnalysis,
      rawSessions: sessions.slice(-10), // Последние 10 сессий для отладки
    });
  } catch (error) {
    console.error('[Analytics] Error getting report:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

export default router;
