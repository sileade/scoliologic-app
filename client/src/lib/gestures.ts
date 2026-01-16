/**
 * Библиотека жестов для мобильных устройств
 * Поддержка: свайпы, pull-to-refresh, long press, pinch-to-zoom
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Типы жестов
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type GestureState = 'idle' | 'started' | 'moving' | 'ended';

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface SwipeConfig {
  threshold?: number;      // Минимальное расстояние для свайпа (px)
  velocity?: number;       // Минимальная скорость (px/ms)
  direction?: 'horizontal' | 'vertical' | 'both';
}

interface PullToRefreshConfig {
  threshold?: number;      // Расстояние для активации (px)
  resistance?: number;     // Сопротивление (0-1)
  onRefresh: () => Promise<void>;
}

interface LongPressConfig {
  delay?: number;          // Задержка (ms)
  onLongPress: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}

// ============================================
// HOOK: useSwipe - Обработка свайпов
// ============================================
export function useSwipe(
  onSwipe: (direction: SwipeDirection) => void,
  config: SwipeConfig = {}
) {
  const { threshold = 50, velocity = 0.3, direction = 'both' } = config;
  const startPoint = useRef<TouchPoint | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    startPoint.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!startPoint.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startPoint.current.x;
    const deltaY = touch.clientY - startPoint.current.y;
    const deltaTime = Date.now() - startPoint.current.time;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const velocityX = absX / deltaTime;
    const velocityY = absY / deltaTime;

    // Определяем направление свайпа
    if (direction === 'horizontal' || direction === 'both') {
      if (absX > threshold && velocityX > velocity && absX > absY) {
        onSwipe(deltaX > 0 ? 'right' : 'left');
      }
    }

    if (direction === 'vertical' || direction === 'both') {
      if (absY > threshold && velocityY > velocity && absY > absX) {
        onSwipe(deltaY > 0 ? 'down' : 'up');
      }
    }

    startPoint.current = null;
  }, [onSwipe, threshold, velocity, direction]);

  const bind = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }

    elementRef.current = element;

    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
  }, [handleTouchStart, handleTouchEnd]);

  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart);
        elementRef.current.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchEnd]);

  return { bind };
}

// ============================================
// HOOK: usePullToRefresh - Потянуть для обновления
// ============================================
export function usePullToRefresh(config: PullToRefreshConfig) {
  const { threshold = 80, resistance = 0.5, onRefresh } = config;
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Только если прокрутка в самом верху
    if (elementRef.current && elementRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const delta = (currentY.current - startY.current) * resistance;

    if (delta > 0) {
      setPullDistance(Math.min(delta, threshold * 1.5));
      e.preventDefault();
    }
  }, [isPulling, isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    setIsPulling(false);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  const bind = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove as any);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }

    elementRef.current = element;

    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove as any, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    bind,
    pullDistance,
    isRefreshing,
    isPulling,
    progress: Math.min(pullDistance / threshold, 1)
  };
}

// ============================================
// HOOK: useLongPress - Долгое нажатие
// ============================================
export function useLongPress(config: LongPressConfig) {
  const { delay = 500, onLongPress, onPressStart, onPressEnd } = config;
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    setIsPressed(true);
    isLongPressRef.current = false;
    onPressStart?.();

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
      // Вибрация при долгом нажатии
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, delay);
  }, [delay, onLongPress, onPressStart]);

  const stop = useCallback(() => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onPressEnd?.();
  }, [onPressEnd]);

  const handlers = {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop
  };

  return { handlers, isPressed, isLongPress: isLongPressRef.current };
}

// ============================================
// HOOK: useDoubleTap - Двойное касание
// ============================================
export function useDoubleTap(
  onDoubleTap: () => void,
  onSingleTap?: () => void,
  delay: number = 300
) {
  const lastTap = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.current;

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      // Двойное касание
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onDoubleTap();
    } else {
      // Одиночное касание с задержкой
      timerRef.current = setTimeout(() => {
        onSingleTap?.();
      }, delay);
    }

    lastTap.current = now;
  }, [onDoubleTap, onSingleTap, delay]);

  return { onTouchEnd: handleTap };
}

// ============================================
// HOOK: useSwipeToDelete - Свайп для удаления
// ============================================
export function useSwipeToDelete(onDelete: () => void, threshold: number = 100) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - startX.current;
    // Только свайп влево
    if (delta < 0) {
      setOffset(Math.max(delta, -threshold * 1.5));
    }
  }, [isDragging, threshold]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (Math.abs(offset) >= threshold) {
      onDelete();
    }
    setOffset(0);
  }, [offset, threshold, onDelete]);

  return {
    offset,
    isDragging,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    style: {
      transform: `translateX(${offset}px)`,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out'
    }
  };
}

// ============================================
// HOOK: useHapticFeedback - Тактильная обратная связь
// ============================================
export function useHapticFeedback() {
  const light = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const medium = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  }, []);

  const heavy = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const success = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  }, []);

  const error = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }
  }, []);

  return { light, medium, heavy, success, error };
}

// ============================================
// Утилиты
// ============================================

// Определение мобильного устройства
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Определение touch-устройства
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Предотвращение bounce-эффекта на iOS
export function preventBounce(element: HTMLElement) {
  let startY = 0;

  element.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const currentY = e.touches[0].clientY;
    const isAtTop = scrollTop === 0 && currentY > startY;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight && currentY < startY;

    if (isAtTop || isAtBottom) {
      e.preventDefault();
    }
  }, { passive: false });
}
