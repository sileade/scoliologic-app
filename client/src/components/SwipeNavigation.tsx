import { useEffect, useRef, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SwipeNavigationProps {
  children: ReactNode;
  showBackButton?: boolean;
  title?: string;
}

export function SwipeNavigation({ children, showBackButton = true, title }: SwipeNavigationProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const { language } = useLanguage();

  // Check if we're on the home page
  const isHomePage = location === "/" || location === "";

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isHomePage) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isHorizontalSwipe.current = false;
      
      // Only start swipe from left edge (first 30px)
      if (touch.clientX <= 30) {
        setIsSwipingBack(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipingBack) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Determine if horizontal swipe on first significant movement
      if (!isHorizontalSwipe.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }

      if (isHorizontalSwipe.current && deltaX > 0) {
        // Calculate progress (0 to 1) based on screen width
        const progress = Math.min(deltaX / (window.innerWidth * 0.4), 1);
        setSwipeProgress(progress);
        
        // Prevent scrolling while swiping
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (swipeProgress > 0.5) {
        // Complete the swipe - go back
        goBack();
      }
      
      // Reset state
      setSwipeProgress(0);
      setIsSwipingBack(false);
      isHorizontalSwipe.current = false;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSwipingBack, swipeProgress, isHomePage, setLocation]);

  return (
    <div ref={containerRef} className="relative min-h-full">
      {/* Swipe indicator */}
      {isSwipingBack && swipeProgress > 0 && (
        <div 
          className="fixed left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-primary/20 to-transparent z-50 flex items-center justify-start pl-2 transition-opacity"
          style={{ opacity: swipeProgress }}
        >
          <div 
            className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"
            style={{ transform: `scale(${0.5 + swipeProgress * 0.5})` }}
          >
            <ChevronLeft className="w-6 h-6 text-primary" />
          </div>
        </div>
      )}

      {/* Back button header - only show on non-home pages */}
      {showBackButton && !isHomePage && (
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/50 lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors -ml-1"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-sm font-medium">
                {language === 'ru' ? 'Назад' : 'Back'}
              </span>
            </button>
            {title && (
              <span className="text-sm font-semibold text-foreground truncate">
                {title}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Page content with swipe transform */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ 
          transform: isSwipingBack ? `translateX(${swipeProgress * 100}px)` : 'none',
          opacity: isSwipingBack ? 1 - swipeProgress * 0.3 : 1
        }}
      >
        {children}
      </div>
    </div>
  );
}
