/**
 * useOfflineQuery - Хук для кэширования API-запросов с поддержкой оффлайн-режима
 * Интегрируется с React Query и IndexedDB для бесшовной работы без сети
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offlineStorage';

interface OfflineQueryOptions<TData> extends Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> {
  /** Время жизни кэша в секундах (по умолчанию 1 час) */
  cacheTTL?: number;
  /** Использовать устаревшие данные при оффлайне */
  useStaleWhenOffline?: boolean;
  /** Приоритет кэша: 'cache-first' | 'network-first' */
  cacheStrategy?: 'cache-first' | 'network-first';
}

/**
 * Хук для запросов с автоматическим кэшированием в IndexedDB
 */
export function useOfflineQuery<TData>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options: OfflineQueryOptions<TData> = {}
) {
  const {
    cacheTTL = 3600,
    useStaleWhenOffline = true,
    cacheStrategy = 'network-first',
    ...queryOptions
  } = options;

  const [isOnline, setIsOnline] = useState(offlineStorage.getIsOnline());
  const [cachedData, setCachedData] = useState<TData | null>(null);
  const cacheKey = queryKey.join(':');

  // Подписка на изменения сетевого статуса
  useEffect(() => {
    const unsubscribe = offlineStorage.onNetworkChange(setIsOnline);
    return unsubscribe;
  }, []);

  // Загрузка данных из кэша при монтировании
  useEffect(() => {
    const loadCachedData = async () => {
      const cached = await offlineStorage.get<TData>(cacheKey);
      if (cached) {
        setCachedData(cached);
      }
    };
    loadCachedData();
  }, [cacheKey]);

  // Обёртка над queryFn с кэшированием
  const wrappedQueryFn = useCallback(async (): Promise<TData> => {
    // Cache-first стратегия
    if (cacheStrategy === 'cache-first') {
      const cached = await offlineStorage.get<TData>(cacheKey);
      if (cached) {
        // Обновляем кэш в фоне если онлайн
        if (isOnline) {
          queryFn().then(freshData => {
            offlineStorage.set(cacheKey, freshData, cacheTTL);
          }).catch(console.error);
        }
        return cached;
      }
    }

    // Если оффлайн, возвращаем кэш
    if (!isOnline) {
      const cached = await offlineStorage.get<TData>(cacheKey);
      if (cached) {
        console.log('[useOfflineQuery] Returning cached data (offline):', cacheKey);
        return cached;
      }
      throw new Error('No cached data available and device is offline');
    }

    // Network-first: запрашиваем свежие данные
    try {
      const data = await queryFn();
      // Сохраняем в кэш
      await offlineStorage.set(cacheKey, data, cacheTTL);
      return data;
    } catch (error) {
      // При ошибке сети пробуем вернуть кэш
      if (useStaleWhenOffline) {
        const cached = await offlineStorage.get<TData>(cacheKey);
        if (cached) {
          console.log('[useOfflineQuery] Returning stale cached data:', cacheKey);
          return cached;
        }
      }
      throw error;
    }
  }, [cacheKey, queryFn, isOnline, cacheTTL, cacheStrategy, useStaleWhenOffline]);

  const query = useQuery({
    queryKey,
    queryFn: wrappedQueryFn,
    ...queryOptions,
    // Отключаем автоматические запросы при оффлайне
    enabled: queryOptions.enabled !== false && (isOnline || cachedData !== null),
    // Используем кэшированные данные как начальные
    initialData: cachedData ?? undefined,
  });

  return {
    ...query,
    isOnline,
    isCached: cachedData !== null,
  };
}

/**
 * Хук для мутаций с поддержкой оффлайн-очереди
 */
export function useOfflineMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    /** URL для отложенного запроса */
    offlineUrl?: string;
    /** HTTP метод для отложенного запроса */
    offlineMethod?: string;
    /** Callback при успешной синхронизации */
    onSyncSuccess?: (data: TData) => void;
    /** Invalidate queries после успеха */
    invalidateQueries?: string[][];
  } = {}
) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(offlineStorage.getIsOnline());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = offlineStorage.onNetworkChange(setIsOnline);
    return unsubscribe;
  }, []);

  // Обновляем счётчик отложенных запросов
  useEffect(() => {
    const updatePendingCount = async () => {
      const requests = await offlineStorage.getPendingRequests();
      setPendingCount(requests.length);
    };
    updatePendingCount();
  }, [isOnline]);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      if (!isOnline && options.offlineUrl) {
        // Добавляем в очередь для отправки позже
        await offlineStorage.queueRequest(
          options.offlineMethod || 'POST',
          options.offlineUrl,
          variables
        );
        
        // Обновляем счётчик
        const requests = await offlineStorage.getPendingRequests();
        setPendingCount(requests.length);
        
        // Возвращаем оптимистичный результат
        return { queued: true, variables } as unknown as TData;
      }

      const result = await mutationFn(variables);
      
      // Инвалидируем кэш
      if (options.invalidateQueries) {
        for (const queryKey of options.invalidateQueries) {
          queryClient.invalidateQueries({ queryKey });
        }
      }

      return result;
    },
  });

  return {
    ...mutation,
    isOnline,
    pendingCount,
  };
}

/**
 * Хук для отображения статуса оффлайн-режима
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(offlineStorage.getIsOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState<{
    cacheSize: number;
    pendingRequests: number;
    oldestEntry: number | null;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = offlineStorage.onNetworkChange(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const updateStats = async () => {
      const s = await offlineStorage.getStats();
      setStats(s);
      setPendingCount(s.pendingRequests);
    };
    updateStats();
    
    // Обновляем статистику каждые 30 секунд
    const interval = setInterval(updateStats, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const clearCache = useCallback(async () => {
    await offlineStorage.clear();
    const s = await offlineStorage.getStats();
    setStats(s);
  }, []);

  const syncNow = useCallback(async () => {
    await offlineStorage.syncPendingRequests();
    const s = await offlineStorage.getStats();
    setStats(s);
    setPendingCount(s.pendingRequests);
  }, []);

  return {
    isOnline,
    pendingCount,
    stats,
    clearCache,
    syncNow,
  };
}
