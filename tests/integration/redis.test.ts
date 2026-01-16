/**
 * Интеграционные тесты для Redis кэширования
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initRedis,
  closeRedis,
  isRedisConnected,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheExists,
  cacheExpire,
  cacheTTL,
  cacheIncr,
  cacheDecr,
  cacheGetOrSet,
  cacheClear,
  getCacheStats,
  resetCacheStats,
  checkRedisHealth,
} from '../../server/lib/redis';

// Пропускаем тесты если Redis недоступен
const SKIP_REDIS_TESTS = process.env.SKIP_REDIS_TESTS === 'true';

describe.skipIf(SKIP_REDIS_TESTS)('Redis Cache Integration', () => {
  beforeAll(async () => {
    await initRedis();
  });

  afterAll(async () => {
    await cacheClear();
    await closeRedis();
  });

  beforeEach(async () => {
    resetCacheStats();
    // Очищаем тестовые ключи
    await cacheDelPattern('test:*');
  });

  describe('Connection', () => {
    it('should connect to Redis', () => {
      expect(isRedisConnected()).toBe(true);
    });

    it('should pass health check', async () => {
      const health = await checkRedisHealth();
      expect(health.available).toBe(true);
      expect(health.latency).toBeDefined();
      expect(health.latency).toBeLessThan(100); // менее 100ms
    });
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      const key = 'test:basic:1';
      const value = { name: 'test', count: 42 };

      const setResult = await cacheSet(key, value);
      expect(setResult).toBe(true);

      const getResult = await cacheGet<typeof value>(key);
      expect(getResult).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheGet('test:nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = 'test:delete:1';
      await cacheSet(key, 'value');
      
      const deleted = await cacheDel(key);
      expect(deleted).toBe(true);

      const result = await cacheGet(key);
      expect(result).toBeNull();
    });

    it('should check key existence', async () => {
      const key = 'test:exists:1';
      
      expect(await cacheExists(key)).toBe(false);
      
      await cacheSet(key, 'value');
      expect(await cacheExists(key)).toBe(true);
    });
  });

  describe('TTL Operations', () => {
    it('should set TTL on key', async () => {
      const key = 'test:ttl:1';
      await cacheSet(key, 'value', { ttl: 60 });

      const ttl = await cacheTTL(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should update TTL with expire', async () => {
      const key = 'test:ttl:2';
      await cacheSet(key, 'value', { ttl: 60 });

      const result = await cacheExpire(key, 120);
      expect(result).toBe(true);

      const ttl = await cacheTTL(key);
      expect(ttl).toBeGreaterThan(60);
    });

    it('should expire key after TTL', async () => {
      const key = 'test:ttl:3';
      await cacheSet(key, 'value', { ttl: 1 });

      // Ждем истечения TTL
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await cacheGet(key);
      expect(result).toBeNull();
    }, 3000);
  });

  describe('Pattern Operations', () => {
    it('should delete keys by pattern', async () => {
      // Создаем несколько ключей
      await cacheSet('test:pattern:a', 'value1');
      await cacheSet('test:pattern:b', 'value2');
      await cacheSet('test:pattern:c', 'value3');
      await cacheSet('test:other:d', 'value4');

      // Удаляем по паттерну
      const deleted = await cacheDelPattern('test:pattern:*');
      expect(deleted).toBe(3);

      // Проверяем что удалились нужные
      expect(await cacheGet('test:pattern:a')).toBeNull();
      expect(await cacheGet('test:pattern:b')).toBeNull();
      expect(await cacheGet('test:pattern:c')).toBeNull();
      expect(await cacheGet('test:other:d')).not.toBeNull();
    });
  });

  describe('Counter Operations', () => {
    it('should increment value', async () => {
      const key = 'test:counter:1';
      
      const val1 = await cacheIncr(key);
      expect(val1).toBe(1);

      const val2 = await cacheIncr(key);
      expect(val2).toBe(2);

      const val3 = await cacheIncr(key);
      expect(val3).toBe(3);
    });

    it('should decrement value', async () => {
      const key = 'test:counter:2';
      await cacheSet(key, 10);

      const val1 = await cacheDecr(key);
      expect(val1).toBe(9);

      const val2 = await cacheDecr(key);
      expect(val2).toBe(8);
    });
  });

  describe('Cache-Aside Pattern', () => {
    it('should get from cache on hit', async () => {
      const key = 'test:aside:1';
      const value = { data: 'cached' };
      await cacheSet(key, value);

      let fetchCalled = false;
      const result = await cacheGetOrSet(key, async () => {
        fetchCalled = true;
        return { data: 'fresh' };
      });

      expect(result).toEqual(value);
      expect(fetchCalled).toBe(false);
    });

    it('should fetch and cache on miss', async () => {
      const key = 'test:aside:2';
      const freshValue = { data: 'fresh' };

      let fetchCalled = false;
      const result = await cacheGetOrSet(key, async () => {
        fetchCalled = true;
        return freshValue;
      });

      expect(result).toEqual(freshValue);
      expect(fetchCalled).toBe(true);

      // Проверяем что закэшировалось
      const cached = await cacheGet(key);
      expect(cached).toEqual(freshValue);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      resetCacheStats();
      const key = 'test:stats:1';

      // Miss
      await cacheGet(key);
      
      // Set
      await cacheSet(key, 'value');
      
      // Hit
      await cacheGet(key);
      await cacheGet(key);

      const stats = getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 0);
    });
  });

  describe('Complex Data Types', () => {
    it('should handle arrays', async () => {
      const key = 'test:array:1';
      const value = [1, 2, 3, { nested: true }];

      await cacheSet(key, value);
      const result = await cacheGet<typeof value>(key);
      expect(result).toEqual(value);
    });

    it('should handle nested objects', async () => {
      const key = 'test:nested:1';
      const value = {
        level1: {
          level2: {
            level3: {
              data: 'deep',
            },
          },
        },
        array: [1, 2, 3],
      };

      await cacheSet(key, value);
      const result = await cacheGet<typeof value>(key);
      expect(result).toEqual(value);
    });

    it('should handle dates as strings', async () => {
      const key = 'test:date:1';
      const value = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await cacheSet(key, value);
      const result = await cacheGet<typeof value>(key);
      expect(result).toEqual(value);
    });
  });
});

describe('Redis Fallback Behavior', () => {
  it('should return null when Redis is not connected', async () => {
    // Закрываем соединение
    await closeRedis();

    const result = await cacheGet('any-key');
    expect(result).toBeNull();

    const setResult = await cacheSet('any-key', 'value');
    expect(setResult).toBe(false);
  });
});
