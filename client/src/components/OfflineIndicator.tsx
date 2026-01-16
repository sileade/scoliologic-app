import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Offline indicator component that shows when the user is offline
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Show "back online" message briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner && !isOffline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]",
        "px-4 py-2 rounded-full shadow-lg",
        "flex items-center gap-2 text-sm font-medium",
        "transition-all duration-300 ease-out",
        isOffline 
          ? "bg-orange-500 text-white" 
          : "bg-green-500 text-white"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff size={16} />
          <span>Вы офлайн — данные из кэша</span>
        </>
      ) : (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>Подключение восстановлено</span>
        </>
      )}
    </div>
  );
}

/**
 * Hook to check online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default OfflineIndicator;
