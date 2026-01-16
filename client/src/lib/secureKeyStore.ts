/**
 * Безопасное хранилище криптографических ключей на базе IndexedDB
 * 
 * Преимущества IndexedDB перед localStorage:
 * - Изолировано от JavaScript контекста (защита от XSS)
 * - Поддерживает хранение бинарных данных
 * - Асинхронный API не блокирует UI
 * - Больший объем хранилища
 */

const DB_NAME = 'scoliologic_secure_keys';
const DB_VERSION = 1;
const STORE_NAME = 'crypto_keys';

interface StoredKeyPair {
  id: string;
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  createdAt: number;
  lastUsed: number;
}

/**
 * Открытие или создание базы данных IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Создаем хранилище для ключей
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Генерация отпечатка ключа
 */
async function generateFingerprint(publicKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  return Array.from(hashArray.slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

/**
 * Безопасное хранилище ключей
 */
export const secureKeyStore = {
  KEY_ID: 'messenger_keypair',

  /**
   * Проверка поддержки IndexedDB
   */
  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  },

  /**
   * Получение существующей пары ключей
   */
  async getKeyPair(): Promise<StoredKeyPair | null> {
    if (!this.isSupported()) {
      console.warn('IndexedDB not supported, falling back to memory');
      return null;
    }

    try {
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(this.KEY_ID);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result as StoredKeyPair | undefined;
          resolve(result || null);
        };

        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Error getting key pair:', error);
      return null;
    }
  },

  /**
   * Сохранение пары ключей
   */
  async saveKeyPair(publicKey: string, privateKey: string): Promise<StoredKeyPair> {
    if (!this.isSupported()) {
      throw new Error('IndexedDB not supported');
    }

    const fingerprint = await generateFingerprint(publicKey);
    const keyPair: StoredKeyPair = {
      id: this.KEY_ID,
      publicKey,
      privateKey,
      fingerprint,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(keyPair);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(keyPair);

      transaction.oncomplete = () => db.close();
    });
  },

  /**
   * Получение или создание пары ключей
   */
  async getOrCreateKeyPair(
    generateKeyPairFn: () => Promise<{ publicKey: string; privateKey: string }>
  ): Promise<{ publicKey: string; privateKey: string; fingerprint: string }> {
    // Пробуем получить существующие ключи
    const existing = await this.getKeyPair();
    
    if (existing) {
      // Обновляем время последнего использования
      await this.updateLastUsed();
      return {
        publicKey: existing.publicKey,
        privateKey: existing.privateKey,
        fingerprint: existing.fingerprint,
      };
    }

    // Генерируем новую пару ключей
    const newKeyPair = await generateKeyPairFn();
    const saved = await this.saveKeyPair(newKeyPair.publicKey, newKeyPair.privateKey);
    
    return {
      publicKey: saved.publicKey,
      privateKey: saved.privateKey,
      fingerprint: saved.fingerprint,
    };
  },

  /**
   * Обновление времени последнего использования
   */
  async updateLastUsed(): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const existing = await this.getKeyPair();
      if (!existing) return;

      existing.lastUsed = Date.now();
      
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(existing);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();

        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  },

  /**
   * Получение только публичного ключа
   */
  async getPublicKey(): Promise<string | null> {
    const keyPair = await this.getKeyPair();
    return keyPair?.publicKey || null;
  },

  /**
   * Получение только приватного ключа
   */
  async getPrivateKey(): Promise<string | null> {
    const keyPair = await this.getKeyPair();
    return keyPair?.privateKey || null;
  },

  /**
   * Получение отпечатка ключа
   */
  async getFingerprint(): Promise<string | null> {
    const keyPair = await this.getKeyPair();
    return keyPair?.fingerprint || null;
  },

  /**
   * Удаление всех ключей (logout)
   */
  async clearKeys(): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const db = await openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(this.KEY_ID);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();

        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Error clearing keys:', error);
    }
  },

  /**
   * Полная очистка базы данных
   */
  async destroyDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  /**
   * Экспорт ключей для резервного копирования (зашифрованный)
   */
  async exportKeys(password: string): Promise<string | null> {
    const keyPair = await this.getKeyPair();
    if (!keyPair) return null;

    // Генерируем ключ из пароля
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Шифруем данные
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = encoder.encode(JSON.stringify({
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    }));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      data
    );

    // Собираем результат: salt + iv + encrypted
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode.apply(null, Array.from(result)));
  },

  /**
   * Импорт ключей из резервной копии
   */
  async importKeys(encryptedData: string, password: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Декодируем base64
      const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Извлекаем salt, iv и зашифрованные данные
      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const encrypted = data.slice(28);

      // Восстанавливаем ключ из пароля
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Расшифровываем
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        encrypted
      );

      const { publicKey, privateKey } = JSON.parse(decoder.decode(decrypted));
      
      // Сохраняем ключи
      await this.saveKeyPair(publicKey, privateKey);
      
      return true;
    } catch (error) {
      console.error('Error importing keys:', error);
      return false;
    }
  },
};

/**
 * Миграция ключей из localStorage в IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  const OLD_PRIVATE_KEY = 'scolio_messenger_private_key';
  const OLD_PUBLIC_KEY = 'scolio_messenger_public_key';

  try {
    const oldPrivate = localStorage.getItem(OLD_PRIVATE_KEY);
    const oldPublic = localStorage.getItem(OLD_PUBLIC_KEY);

    if (oldPrivate && oldPublic) {
      // Проверяем, есть ли уже ключи в IndexedDB
      const existing = await secureKeyStore.getKeyPair();
      
      if (!existing) {
        // Мигрируем ключи
        await secureKeyStore.saveKeyPair(oldPublic, oldPrivate);
        console.log('Keys migrated from localStorage to IndexedDB');
      }

      // Удаляем старые ключи из localStorage
      localStorage.removeItem(OLD_PRIVATE_KEY);
      localStorage.removeItem(OLD_PUBLIC_KEY);
      console.log('Old keys removed from localStorage');
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error migrating keys:', error);
    return false;
  }
}
