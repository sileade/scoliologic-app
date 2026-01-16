import { useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * Top loading bar component that shows progress during page transitions
 * Similar to NProgress but built with React
 */
export function LoadingBar() {
  const [location] = useLocation();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start loading animation
    setIsVisible(true);
    setProgress(0);
    
    // Animate progress
    const timer1 = setTimeout(() => setProgress(30), 50);
    const timer2 = setTimeout(() => setProgress(60), 150);
    const timer3 = setTimeout(() => setProgress(80), 300);
    const timer4 = setTimeout(() => setProgress(100), 400);
    const timer5 = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [location]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-200 ease-out shadow-lg shadow-primary/50"
        style={{ 
          width: `${progress}%`,
          boxShadow: '0 0 10px var(--primary), 0 0 5px var(--primary)'
        }}
      />
    </div>
  );
}

/**
 * Hook to manually control loading state
 */
export function useLoadingBar() {
  const [isLoading, setIsLoading] = useState(false);

  const start = () => setIsLoading(true);
  const done = () => setIsLoading(false);

  return { isLoading, start, done };
}

/**
 * Global loading context for API calls
 */
import { createContext, useContext, ReactNode } from "react";

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setLoading: () => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: setIsLoading }}>
      {children}
      <GlobalLoadingBar isLoading={isLoading} />
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  return useContext(LoadingContext);
}

function GlobalLoadingBar({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const timer1 = setTimeout(() => setProgress(20), 100);
      const timer2 = setTimeout(() => setProgress(40), 300);
      const timer3 = setTimeout(() => setProgress(60), 600);
      const timer4 = setTimeout(() => setProgress(80), 1000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    } else {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          boxShadow: '0 0 10px var(--primary), 0 0 5px var(--primary)'
        }}
      />
    </div>
  );
}

export default LoadingBar;
