/**
 * Health Check API для мониторинга состояния приложения
 * Используется Docker, Kubernetes, Load Balancers и Pull-агентом
 */
import { Router, Request, Response } from 'express';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis?: ComponentHealth;
    ollama?: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
}

// Время запуска приложения
const startTime = Date.now();

/**
 * Проверка подключения к PostgreSQL
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db) {
      return {
        status: 'down',
        latency: Date.now() - start,
        message: 'Database not configured',
      };
    }
    await db.execute(sql`SELECT 1`);
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Проверка подключения к Redis (если используется)
 */
async function checkRedis(): Promise<ComponentHealth> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return { status: 'up', message: 'Redis not configured' };
  }

  const start = Date.now();
  try {
    // Простая проверка через HTTP если Redis Sentinel или через TCP
    const response = await fetch(`http://redis:6379/ping`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
    
    // Redis не отвечает по HTTP, это нормально
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'degraded',
      latency: Date.now() - start,
      message: 'Redis check skipped',
    };
  }
}

/**
 * Проверка подключения к Ollama
 */
async function checkOllama(): Promise<ComponentHealth> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
  const start = Date.now();
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    }
    
    return {
      status: 'degraded',
      latency: Date.now() - start,
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * GET /api/health
 * Основной endpoint для health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const [database, redis, ollama] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkOllama(),
    ]);

    const checks = { database, redis, ollama };
    
    // Определяем общий статус
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (database.status === 'down') {
      status = 'unhealthy';
    } else if (database.status === 'degraded' || ollama.status === 'down') {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };

    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    res.status(httpStatus).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health/live
 * Liveness probe - приложение запущено
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/ready
 * Readiness probe - приложение готово принимать трафик
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const database = await checkDatabase();
    
    if (database.status === 'up') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics
 * Prometheus-compatible метрики
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const memUsage = process.memoryUsage();
    
    const metrics = `
# HELP scoliologic_app_uptime_seconds Application uptime in seconds
# TYPE scoliologic_app_uptime_seconds gauge
scoliologic_app_uptime_seconds ${uptime}

# HELP scoliologic_app_memory_heap_used_bytes Heap memory used
# TYPE scoliologic_app_memory_heap_used_bytes gauge
scoliologic_app_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP scoliologic_app_memory_heap_total_bytes Total heap memory
# TYPE scoliologic_app_memory_heap_total_bytes gauge
scoliologic_app_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP scoliologic_app_memory_rss_bytes Resident set size
# TYPE scoliologic_app_memory_rss_bytes gauge
scoliologic_app_memory_rss_bytes ${memUsage.rss}

# HELP scoliologic_app_info Application information
# TYPE scoliologic_app_info gauge
scoliologic_app_info{version="${process.env.npm_package_version || '1.0.0'}",node_version="${process.version}"} 1
`.trim();

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('# Error generating metrics');
  }
});

export default router;
