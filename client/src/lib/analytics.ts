/**
 * Система аналитики для отслеживания UX-метрик
 * Собирает данные о взаимодействии пользователей с интерфейсом
 */

interface AnalyticsEvent {
  type: string;
  page: string;
  element?: string;
  value?: string | number;
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

interface PageMetrics {
  page: string;
  enterTime: number;
  exitTime?: number;
  scrollDepth: number;
  clicks: number;
  interactions: AnalyticsEvent[];
}

interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  pages: PageMetrics[];
  totalClicks: number;
  totalInteractions: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  viewport: { width: number; height: number };
}

// Генерация уникального ID сессии
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Определение типа устройства
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

class Analytics {
  private sessionId: string;
  private events: AnalyticsEvent[] = [];
  private currentPage: PageMetrics | null = null;
  private sessionMetrics: SessionMetrics;
  private scrollDepthMax = 0;
  private isInitialized = false;

  constructor() {
    this.sessionId = generateSessionId();
    this.sessionMetrics = {
      sessionId: this.sessionId,
      startTime: Date.now(),
      pages: [],
      totalClicks: 0,
      totalInteractions: 0,
      deviceType: getDeviceType(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  }

  /**
   * Инициализация аналитики
   */
  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Отслеживание кликов
    document.addEventListener('click', this.handleClick.bind(this));

    // Отслеживание скролла
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

    // Отслеживание изменения размера окна
    window.addEventListener('resize', this.handleResize.bind(this));

    // Отслеживание ухода со страницы
    window.addEventListener('beforeunload', this.handleUnload.bind(this));

    // Отслеживание видимости страницы
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    console.log('[Analytics] Initialized with session:', this.sessionId);
  }

  /**
   * Трекинг перехода на страницу
   */
  trackPageView(pageName: string): void {
    // Закрываем предыдущую страницу
    if (this.currentPage) {
      this.currentPage.exitTime = Date.now();
      this.currentPage.scrollDepth = this.scrollDepthMax;
      this.sessionMetrics.pages.push({ ...this.currentPage });
    }

    // Открываем новую страницу
    this.currentPage = {
      page: pageName,
      enterTime: Date.now(),
      scrollDepth: 0,
      clicks: 0,
      interactions: [],
    };
    this.scrollDepthMax = 0;

    this.trackEvent('page_view', { page: pageName });
    console.log('[Analytics] Page view:', pageName);
  }

  /**
   * Трекинг события
   */
  trackEvent(
    type: string,
    data: { element?: string; value?: string | number; page?: string; metadata?: Record<string, unknown> } = {}
  ): void {
    const event: AnalyticsEvent = {
      type,
      page: data.page || this.currentPage?.page || 'unknown',
      element: data.element,
      value: data.value,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: data.metadata,
    };

    this.events.push(event);
    this.sessionMetrics.totalInteractions++;

    if (this.currentPage) {
      this.currentPage.interactions.push(event);
    }
  }

  /**
   * Трекинг клика по элементу
   */
  trackClick(element: string, value?: string | number): void {
    this.trackEvent('click', { element, value });
    this.sessionMetrics.totalClicks++;
    if (this.currentPage) {
      this.currentPage.clicks++;
    }
  }

  /**
   * Трекинг времени на элементе
   */
  trackTimeOnElement(element: string, duration: number): void {
    this.trackEvent('time_on_element', { element, value: duration });
  }

  /**
   * Трекинг взаимодействия с формой
   */
  trackFormInteraction(formName: string, action: 'focus' | 'blur' | 'submit' | 'error', field?: string): void {
    this.trackEvent('form_interaction', {
      element: formName,
      value: action,
      metadata: { field },
    });
  }

  /**
   * Трекинг свайпа
   */
  trackSwipe(direction: 'left' | 'right' | 'up' | 'down', element?: string): void {
    this.trackEvent('swipe', { element, value: direction });
  }

  /**
   * Трекинг pull-to-refresh
   */
  trackPullToRefresh(page: string): void {
    this.trackEvent('pull_to_refresh', { page });
  }

  /**
   * Обработчик клика
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const element = this.getElementIdentifier(target);
    this.trackClick(element);
  }

  /**
   * Обработчик скролла
   */
  private handleScroll(): void {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

    if (scrollPercent > this.scrollDepthMax) {
      this.scrollDepthMax = scrollPercent;
    }
  }

  /**
   * Обработчик изменения размера
   */
  private handleResize(): void {
    this.sessionMetrics.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    this.sessionMetrics.deviceType = getDeviceType();
  }

  /**
   * Обработчик ухода со страницы
   */
  private handleUnload(): void {
    this.sessionMetrics.endTime = Date.now();
    if (this.currentPage) {
      this.currentPage.exitTime = Date.now();
      this.currentPage.scrollDepth = this.scrollDepthMax;
      this.sessionMetrics.pages.push({ ...this.currentPage });
    }

    // Отправка данных на сервер
    this.sendMetrics();
  }

  /**
   * Обработчик изменения видимости
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.trackEvent('page_hidden');
    } else {
      this.trackEvent('page_visible');
    }
  }

  /**
   * Получение идентификатора элемента
   */
  private getElementIdentifier(element: HTMLElement): string {
    // Приоритет: data-analytics > id > aria-label > className > tagName
    if (element.dataset.analytics) return element.dataset.analytics;
    if (element.id) return `#${element.id}`;
    if (element.getAttribute('aria-label')) return `[aria-label="${element.getAttribute('aria-label')}"]`;
    if (element.className && typeof element.className === 'string') {
      const mainClass = element.className.split(' ')[0];
      if (mainClass) return `.${mainClass}`;
    }
    return element.tagName.toLowerCase();
  }

  /**
   * Получение метрик сессии
   */
  getSessionMetrics(): SessionMetrics {
    return {
      ...this.sessionMetrics,
      endTime: Date.now(),
    };
  }

  /**
   * Получение метрик текущей страницы
   */
  getCurrentPageMetrics(): PageMetrics | null {
    if (!this.currentPage) return null;
    return {
      ...this.currentPage,
      exitTime: Date.now(),
      scrollDepth: this.scrollDepthMax,
    };
  }

  /**
   * Получение всех событий
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Отправка метрик на сервер
   */
  private sendMetrics(): void {
    const metrics = this.getSessionMetrics();
    
    // Используем sendBeacon для надежной отправки при закрытии страницы
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', JSON.stringify(metrics));
    } else {
      // Fallback для старых браузеров
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
        keepalive: true,
      }).catch(() => {});
    }
  }

  /**
   * Экспорт метрик для отладки
   */
  exportMetrics(): string {
    return JSON.stringify({
      session: this.getSessionMetrics(),
      events: this.events,
      currentPage: this.getCurrentPageMetrics(),
    }, null, 2);
  }
}

// Singleton instance
export const analytics = new Analytics();

// React hook для использования аналитики
export function useAnalytics() {
  return analytics;
}

// HOC для автоматического трекинга страниц
export function withPageTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName: string
) {
  return function PageTrackedComponent(props: P) {
    React.useEffect(() => {
      analytics.trackPageView(pageName);
    }, []);

    return React.createElement(WrappedComponent, props);
  };
}

// Импорт React для HOC
import React from 'react';
