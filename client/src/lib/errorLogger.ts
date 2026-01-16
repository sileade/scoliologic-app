/**
 * Local Error Logger with 2-day auto-cleanup
 * Stores errors in localStorage and automatically cleans up old entries
 */

interface ErrorLogEntry {
  id: string;
  timestamp: number;
  type: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
}

const STORAGE_KEY = 'ortho_error_logs';
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
const MAX_ENTRIES = 100; // Maximum number of entries to keep

class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {
    this.cleanup();
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 60 * 1000);
    }
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  error(message: string, error?: Error, extra?: Record<string, unknown>): void {
    this.log('error', message, error, extra);
  }

  warning(message: string, extra?: Record<string, unknown>): void {
    this.log('warning', message, undefined, extra);
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this.log('info', message, undefined, extra);
  }

  private log(
    type: ErrorLogEntry['type'],
    message: string,
    error?: Error,
    extra?: Record<string, unknown>
  ): void {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      message,
      stack: error?.stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      extra,
    };

    if (type === 'error') {
      console.error(`[ErrorLogger] ${message}`, error, extra);
    } else if (type === 'warning') {
      console.warn(`[ErrorLogger] ${message}`, extra);
    } else {
      console.log(`[ErrorLogger] ${message}`, extra);
    }

    this.saveEntry(entry);
  }

  private saveEntry(entry: ErrorLogEntry): void {
    if (typeof window === 'undefined') return;
    try {
      const logs = this.getLogs();
      logs.push(entry);
      const trimmedLogs = logs.slice(-MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedLogs));
    } catch (e) {
      console.error('Failed to save error log:', e);
    }
  }

  getLogs(): ErrorLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getLogsByType(type: ErrorLogEntry['type']): ErrorLogEntry[] {
    return this.getLogs().filter((log) => log.type === type);
  }

  getRecentLogs(hours: number = 24): ErrorLogEntry[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.getLogs().filter((log) => log.timestamp > cutoff);
  }

  cleanup(): void {
    if (typeof window === 'undefined') return;
    try {
      const logs = this.getLogs();
      const cutoff = Date.now() - MAX_AGE_MS;
      const filteredLogs = logs.filter((log) => log.timestamp > cutoff);
      if (filteredLogs.length !== logs.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLogs));
        console.log(`[ErrorLogger] Cleaned up ${logs.length - filteredLogs.length} old entries`);
      }
    } catch (e) {
      console.error('Failed to cleanup error logs:', e);
    }
  }

  clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }

  exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }

  getStats(): { total: number; errors: number; warnings: number; info: number; oldestEntry: Date | null } {
    const logs = this.getLogs();
    return {
      total: logs.length,
      errors: logs.filter((l) => l.type === 'error').length,
      warnings: logs.filter((l) => l.type === 'warning').length,
      info: logs.filter((l) => l.type === 'info').length,
      oldestEntry: logs.length > 0 ? new Date(Math.min(...logs.map((l) => l.timestamp))) : null,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const errorLogger = ErrorLogger.getInstance();

export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.onerror = (message, source, lineno, colno, error) => {
    errorLogger.error(
      typeof message === 'string' ? message : 'Unknown error',
      error || undefined,
      { source, lineno, colno }
    );
    return false;
  };

  window.onunhandledrejection = (event) => {
    errorLogger.error(
      'Unhandled Promise Rejection',
      event.reason instanceof Error ? event.reason : undefined,
      { reason: String(event.reason) }
    );
  };

  console.log('[ErrorLogger] Global error handlers initialized');
}
