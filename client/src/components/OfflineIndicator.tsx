import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Cloud, CloudOff, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkStatus } from "@/hooks/useOfflineQuery";

/**
 * Offline indicator component that shows when the user is offline
 * Enhanced with IndexedDB sync status
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, syncNow } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBanner(true);
    } else if (wasOffline) {
      // Показываем "back online" message и синхронизируем
      setShowBanner(true);
      handleSync();
      setTimeout(() => {
        if (pendingCount === 0) {
          setShowBanner(false);
          setWasOffline(false);
        }
      }, 3000);
    }
  }, [isOnline, wasOffline, pendingCount]);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  // Показываем если оффлайн или есть отложенные запросы
  if (!showBanner && isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]",
        "px-4 py-2 rounded-full shadow-lg",
        "flex items-center gap-2 text-sm font-medium",
        "transition-all duration-300 ease-out",
        !isOnline 
          ? "bg-orange-500 text-white" 
          : pendingCount > 0
            ? "bg-yellow-500 text-white"
            : "bg-green-500 text-white"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff size={16} />
          <span>Вы офлайн — данные из кэша</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs ml-1">
              {pendingCount} изменений сохранено
            </span>
          )}
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud size={16} />
          <span>Синхронизация {pendingCount} изменений...</span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="ml-1 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          </button>
        </>
      ) : (
        <>
          <CheckCircle size={16} />
          <span>Подключение восстановлено</span>
        </>
      )}
    </div>
  );
}

/**
 * OfflineBanner - Полноэкранный баннер для оффлайн-режима (верхняя часть экрана)
 */
export function OfflineBanner() {
  const { isOnline, pendingCount } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg animate-fade-in">
      <div className="flex items-center justify-center gap-2">
        <CloudOff className="w-4 h-4" />
        <span>Вы работаете в оффлайн-режиме</span>
        {pendingCount > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
            {pendingCount} изменений будут синхронизированы
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to check online status (legacy support)
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

/**
 * OfflineWrapper - Обёртка для компонентов с поддержкой оффлайн-режима
 */
interface OfflineWrapperProps {
  children: React.ReactNode;
  /** Показывать placeholder при оффлайне */
  showPlaceholder?: boolean;
  /** Кастомный placeholder */
  placeholder?: React.ReactNode;
}

export function OfflineWrapper({
  children,
  showPlaceholder = false,
  placeholder,
}: OfflineWrapperProps) {
  const { isOnline } = useNetworkStatus();

  if (!isOnline && showPlaceholder) {
    return (
      placeholder || (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <WifiOff className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Нет подключения к сети</p>
          <p className="text-sm mt-1">Эта функция недоступна в оффлайн-режиме</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}

export default OfflineIndicator;
