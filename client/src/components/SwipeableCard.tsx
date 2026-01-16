import { ReactNode, useRef, useState, useCallback } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  leftColor?: string;
  rightColor?: string;
  threshold?: number;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  leftColor = 'bg-red-500',
  rightColor = 'bg-green-500',
  threshold = 80,
  className = ''
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - startX.current;
    
    // Ограничиваем свайп
    const maxOffset = threshold * 1.2;
    if (delta < 0 && onSwipeLeft) {
      setOffset(Math.max(delta, -maxOffset));
    } else if (delta > 0 && onSwipeRight) {
      setOffset(Math.min(delta, maxOffset));
    }
  }, [isDragging, threshold, onSwipeLeft, onSwipeRight]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    if (offset <= -threshold && onSwipeLeft) {
      // Вибрация
      if (navigator.vibrate) navigator.vibrate(25);
      onSwipeLeft();
    } else if (offset >= threshold && onSwipeRight) {
      if (navigator.vibrate) navigator.vibrate(25);
      onSwipeRight();
    }
    
    setOffset(0);
  }, [offset, threshold, onSwipeLeft, onSwipeRight]);

  const leftProgress = Math.min(Math.max(-offset / threshold, 0), 1);
  const rightProgress = Math.min(Math.max(offset / threshold, 0), 1);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Левое действие (при свайпе вправо) */}
      {rightAction && (
        <div 
          className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 ${rightColor} text-white`}
          style={{ 
            width: Math.max(offset, 0),
            opacity: rightProgress
          }}
        >
          {rightAction}
        </div>
      )}

      {/* Правое действие (при свайпе влево) */}
      {leftAction && (
        <div 
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 ${leftColor} text-white`}
          style={{ 
            width: Math.max(-offset, 0),
            opacity: leftProgress
          }}
        >
          {leftAction}
        </div>
      )}

      {/* Основная карточка */}
      <div
        ref={cardRef}
        className="relative bg-white"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
