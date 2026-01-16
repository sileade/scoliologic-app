/**
 * Утилиты для улучшения доступности (accessibility)
 */

/**
 * Генерация уникального ID для связывания label и input
 */
let idCounter = 0;
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Хелпер для создания aria-label из контекста
 */
export function createAriaLabel(
  action: string,
  target: string,
  context?: string
): string {
  const parts = [action, target];
  if (context) parts.push(`(${context})`);
  return parts.join(' ');
}

/**
 * Хелпер для объявления live region сообщений
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Удаляем после объявления
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Хелпер для управления фокусом
 */
export const focusManager = {
  /**
   * Сохранение текущего фокуса
   */
  saveFocus(): HTMLElement | null {
    return document.activeElement as HTMLElement | null;
  },

  /**
   * Восстановление фокуса
   */
  restoreFocus(element: HTMLElement | null): void {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  },

  /**
   * Перемещение фокуса на первый фокусируемый элемент
   */
  focusFirst(container: HTMLElement): void {
    const focusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  },

  /**
   * Trap фокуса внутри контейнера (для модальных окон)
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },
};

/**
 * Хук для обработки клавиатурной навигации
 */
export function handleKeyboardNavigation(
  e: React.KeyboardEvent,
  handlers: {
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
  }
): void {
  switch (e.key) {
    case 'Enter':
      handlers.onEnter?.();
      break;
    case ' ':
      handlers.onSpace?.();
      break;
    case 'Escape':
      handlers.onEscape?.();
      break;
    case 'ArrowUp':
      e.preventDefault();
      handlers.onArrowUp?.();
      break;
    case 'ArrowDown':
      e.preventDefault();
      handlers.onArrowDown?.();
      break;
    case 'ArrowLeft':
      handlers.onArrowLeft?.();
      break;
    case 'ArrowRight':
      handlers.onArrowRight?.();
      break;
  }
}

/**
 * Проверка предпочтения reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Проверка предпочтения высокого контраста
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * CSS класс для скрытия элементов визуально, но не от screen readers
 */
export const srOnlyClass = 'sr-only';

/**
 * Стили для sr-only (добавить в глобальные стили)
 */
export const srOnlyStyles = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
