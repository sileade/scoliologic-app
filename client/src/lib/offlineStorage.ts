/**
 * Offline Storage - Кэширование API-запросов и данных с помощью IndexedDB
 * Обеспечивает полноценную работу приложения в оффлайн-режиме
 */

const DB_NAME = 'scoliologic-offline';
const DB_VERSION = 1;

interface CachedData<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  syncStatus: 'synced' | 'pending' | 'failed';
}

interface PendingRequest {
  id: string;
  method: string;
  url: string;
  body?: unknown;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.init();
    this.setupNetworkListeners();
  }

  /**
   * Инициализация IndexedDB
   */
  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store для кэшированных API-ответов
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          cacheStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Store для отложенных запросов (offline queue)
        if (!db.objectStoreNames.contains('pendingRequests')) {
          const pendingStore = db.createObjectStore('pendingRequests', { keyPath: 'id' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store для пользовательских данных
        if (!db.objectStoreNames.contains('userData')) {
          db.createObjectStore('userData', { keyPath: 'key' });
        }

        console.log('[OfflineStorage] Database schema created');
      };
    });
  }

  /**
   * Настройка слушателей сетевого статуса
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[OfflineStorage] Network online');
      this.notifyListeners(true);
      this.syncPendingRequests();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[OfflineStorage] Network offline');
      this.notifyListeners(false);
    });
  }

  /**
   * Подписка на изменения сетевого статуса
   */
  public onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(callback => callback(isOnline));
  }

  /**
   * Проверка онлайн-статуса
   */
  public getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Получение данных из кэша
   */
  public async get<T>(key: string): Promise<T | null> {
    await this.ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Проверяем срок действия
        if (result.expiresAt < Date.now()) {
          // Данные устарели, но возвращаем их если оффлайн
          if (!this.isOnline) {
            console.log('[OfflineStorage] Returning stale data (offline):', key);
            resolve(result.data);
          } else {
            // Удаляем устаревшие данные
            this.delete(key);
            resolve(null);
          }
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Сохранение данных в кэш
   */
  public async set<T>(
    key: string, 
    data: T, 
    ttlSeconds: number = 3600,
    syncStatus: 'synced' | 'pending' = 'synced'
  ): Promise<void> {
    await this.ensureDb();

    const cachedData: CachedData<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      syncStatus,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(cachedData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Удаление данных из кэша
   */
  public async delete(key: string): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Очистка всего кэша
   */
  public async clear(): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache', 'pendingRequests'], 'readwrite');
      
      transaction.objectStore('cache').clear();
      transaction.objectStore('pendingRequests').clear();

      transaction.oncomplete = () => {
        console.log('[OfflineStorage] Cache cleared');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Добавление запроса в очередь для отправки при восстановлении сети
   */
  public async queueRequest(
    method: string,
    url: string,
    body?: unknown
  ): Promise<string> {
    await this.ensureDb();

    const request: PendingRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method,
      url,
      body,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      const dbRequest = store.add(request);

      dbRequest.onsuccess = () => {
        console.log('[OfflineStorage] Request queued:', request.id);
        resolve(request.id);
      };
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  /**
   * Получение всех отложенных запросов
   */
  public async getPendingRequests(): Promise<PendingRequest[]> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingRequests'], 'readonly');
      const store = transaction.objectStore('pendingRequests');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Удаление отложенного запроса
   */
  public async removePendingRequest(id: string): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Синхронизация отложенных запросов при восстановлении сети
   */
  public async syncPendingRequests(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log('[OfflineStorage] Starting sync of pending requests');

    try {
      const pendingRequests = await this.getPendingRequests();
      
      for (const request of pendingRequests) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: request.body ? JSON.stringify(request.body) : undefined,
          });

          if (response.ok) {
            await this.removePendingRequest(request.id);
            console.log('[OfflineStorage] Request synced:', request.id);
          } else if (request.retryCount >= 3) {
            // Удаляем после 3 неудачных попыток
            await this.removePendingRequest(request.id);
            console.error('[OfflineStorage] Request failed after 3 retries:', request.id);
          } else {
            // Увеличиваем счётчик попыток
            await this.updatePendingRequestRetryCount(request.id, request.retryCount + 1);
          }
        } catch (error) {
          console.error('[OfflineStorage] Failed to sync request:', request.id, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async updatePendingRequestRetryCount(id: string, retryCount: number): Promise<void> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const request = getRequest.result as PendingRequest;
        if (request) {
          request.retryCount = retryCount;
          store.put(request);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Ожидание готовности базы данных
   */
  private async ensureDb(): Promise<void> {
    if (this.db) return;
    
    // Ждём инициализации
    let attempts = 0;
    while (!this.db && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Получение статистики кэша
   */
  public async getStats(): Promise<{
    cacheSize: number;
    pendingRequests: number;
    oldestEntry: number | null;
  }> {
    await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache', 'pendingRequests'], 'readonly');
      
      let cacheSize = 0;
      let pendingRequests = 0;
      let oldestEntry: number | null = null;

      const cacheStore = transaction.objectStore('cache');
      const pendingStore = transaction.objectStore('pendingRequests');

      cacheStore.count().onsuccess = (e) => {
        cacheSize = (e.target as IDBRequest).result;
      };

      pendingStore.count().onsuccess = (e) => {
        pendingRequests = (e.target as IDBRequest).result;
      };

      const index = cacheStore.index('timestamp');
      index.openCursor().onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          oldestEntry = cursor.value.timestamp;
        }
      };

      transaction.oncomplete = () => {
        resolve({ cacheSize, pendingRequests, oldestEntry });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

/**
 * React Hook для работы с оффлайн-хранилищем
 */
export function useOfflineStorage() {
  return {
    get: offlineStorage.get.bind(offlineStorage),
    set: offlineStorage.set.bind(offlineStorage),
    delete: offlineStorage.delete.bind(offlineStorage),
    clear: offlineStorage.clear.bind(offlineStorage),
    queueRequest: offlineStorage.queueRequest.bind(offlineStorage),
    getPendingRequests: offlineStorage.getPendingRequests.bind(offlineStorage),
    getIsOnline: offlineStorage.getIsOnline.bind(offlineStorage),
    onNetworkChange: offlineStorage.onNetworkChange.bind(offlineStorage),
    getStats: offlineStorage.getStats.bind(offlineStorage),
  };
}
