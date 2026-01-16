/**
 * Redis клиент и утилиты для кэширования
 * 
 * Обеспечивает персистентное кэширование данных
 * с поддержкой TTL и паттернов ключей.
 */

import { createClient, RedisClientType } from 'redis';

// Типы
interface CacheOptions {
  ttl?: number;  // Time to live в секундах
  prefix?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
}

// Singleton клиент
let redisClient: RedisClientType | null = null;
let isConnected = false;

// Статистика
const stats: CacheStats = {
  hits: 0,
  misses: 0,
  keys: 0,
};

// Конфигурация
const config = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300', 10), // 5 минут
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'scoliologic:',
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Инициализация Redis клиента
 */
export async function initRedis(): Promise<boolean> {
  if (redisClient && isConnected) {
    return true;
  }

  try {
    redisClient = createClient({
      url: config.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > config.maxRetries) {
            console.error('[Redis] Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return config.retryDelay * Math.pow(2, retries);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    redisClient.on('end', () => {
      console.log('[Redis] Connection closed');
      isConnected = false;
    });

    await redisClient.connect();
    return true;
  } catch (error: any) {
    console.error('[Redis] Failed to connect:', error.message);
    return false;
  }
}

/**
 * Получение клиента Redis
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

/**
 * Проверка подключения
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Формирование полного ключа с префиксом
 */
function makeKey(key: string, prefix?: string): string {
  return `${prefix || config.keyPrefix}${key}`;
}

/**
 * Получение данных из кэша
 */
export async function cacheGet<T>(
  key: string,
  options?: CacheOptions
): Promise<T | null> {
  if (!isConnected || !redisClient) {
    return null;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    const data = await redisClient.get(fullKey);

    if (data) {
      stats.hits++;
      return JSON.parse(data) as T;
    }

    stats.misses++;
    return null;
  } catch (error: any) {
    console.error('[Redis] Get error:', error.message);
    return null;
  }
}

/**
 * Сохранение данных в кэш
 */
export async function cacheSet<T>(
  key: string,
  data: T,
  options?: CacheOptions
): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    const ttl = options?.ttl || config.defaultTTL;
    const serialized = JSON.stringify(data);

    await redisClient.setEx(fullKey, ttl, serialized);
    stats.keys++;
    return true;
  } catch (error: any) {
    console.error('[Redis] Set error:', error.message);
    return false;
  }
}

/**
 * Удаление данных из кэша
 */
export async function cacheDel(
  key: string,
  options?: CacheOptions
): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    const result = await redisClient.del(fullKey);
    if (result > 0) stats.keys--;
    return result > 0;
  } catch (error: any) {
    console.error('[Redis] Del error:', error.message);
    return false;
  }
}

/**
 * Удаление данных по паттерну
 */
export async function cacheDelPattern(
  pattern: string,
  options?: CacheOptions
): Promise<number> {
  if (!isConnected || !redisClient) {
    return 0;
  }

  try {
    const fullPattern = makeKey(pattern, options?.prefix);
    const keys = await redisClient.keys(fullPattern);

    if (keys.length === 0) {
      return 0;
    }

    const result = await redisClient.del(keys);
    stats.keys -= result;
    return result;
  } catch (error: any) {
    console.error('[Redis] DelPattern error:', error.message);
    return 0;
  }
}

/**
 * Проверка существования ключа
 */
export async function cacheExists(
  key: string,
  options?: CacheOptions
): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    const result = await redisClient.exists(fullKey);
    return result === 1;
  } catch (error: any) {
    console.error('[Redis] Exists error:', error.message);
    return false;
  }
}

/**
 * Установка TTL для существующего ключа
 */
export async function cacheExpire(
  key: string,
  ttl: number,
  options?: CacheOptions
): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    const result = await redisClient.expire(fullKey, ttl);
    return result === 1;
  } catch (error: any) {
    console.error('[Redis] Expire error:', error.message);
    return false;
  }
}

/**
 * Получение оставшегося TTL
 */
export async function cacheTTL(
  key: string,
  options?: CacheOptions
): Promise<number> {
  if (!isConnected || !redisClient) {
    return -2;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    return await redisClient.ttl(fullKey);
  } catch (error: any) {
    console.error('[Redis] TTL error:', error.message);
    return -2;
  }
}

/**
 * Инкремент числового значения
 */
export async function cacheIncr(
  key: string,
  options?: CacheOptions
): Promise<number | null> {
  if (!isConnected || !redisClient) {
    return null;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    return await redisClient.incr(fullKey);
  } catch (error: any) {
    console.error('[Redis] Incr error:', error.message);
    return null;
  }
}

/**
 * Декремент числового значения
 */
export async function cacheDecr(
  key: string,
  options?: CacheOptions
): Promise<number | null> {
  if (!isConnected || !redisClient) {
    return null;
  }

  try {
    const fullKey = makeKey(key, options?.prefix);
    return await redisClient.decr(fullKey);
  } catch (error: any) {
    console.error('[Redis] Decr error:', error.message);
    return null;
  }
}

/**
 * Получение или установка значения (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T | null> {
  // Пробуем получить из кэша
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) {
    return cached;
  }

  // Получаем свежие данные
  try {
    const data = await fetchFn();
    await cacheSet(key, data, options);
    return data;
  } catch (error: any) {
    console.error('[Redis] GetOrSet fetch error:', error.message);
    return null;
  }
}

/**
 * Очистка всего кэша приложения
 */
export async function cacheClear(): Promise<boolean> {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const pattern = `${config.keyPrefix}*`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    stats.keys = 0;
    return true;
  } catch (error: any) {
    console.error('[Redis] Clear error:', error.message);
    return false;
  }
}

/**
 * Получение статистики кэша
 */
export function getCacheStats(): CacheStats & { hitRate: number } {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
  };
}

/**
 * Сброс статистики
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
}

/**
 * Проверка здоровья Redis
 */
export async function checkRedisHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
  stats?: CacheStats & { hitRate: number };
}> {
  if (!redisClient) {
    return { available: false, error: 'Client not initialized' };
  }

  const start = Date.now();

  try {
    await redisClient.ping();
    return {
      available: true,
      latency: Date.now() - start,
      stats: getCacheStats(),
    };
  } catch (error: any) {
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Закрытие соединения
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Декоратор для кэширования результатов функций
 * @example
 * class MyService {
 *   @cached((id) => `user:${id}`, { ttl: 300 })
 *   async getUser(id: string) { ... }
 * }
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  options?: CacheOptions
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: Parameters<T>) {
      const key = keyGenerator(...args);
      
      const cachedValue = await cacheGet(key, options);
      if (cachedValue !== null) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      await cacheSet(key, result, options);
      return result;
    } as T;

    return descriptor;
  };
}

// Экспорт конфигурации для тестирования
export const redisConfig = config;
