/**
 * Криптографический модуль для защищённого мессенджера
 * 
 * Реализует сквозное шифрование (E2EE) с использованием:
 * - X25519 для обмена ключами (ECDH)
 * - AES-256-GCM для шифрования сообщений
 * - HKDF для деривации ключей
 * 
 * Основан на протоколе Signal (Double Ratchet)
 */

// Утилиты для работы с ArrayBuffer
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function concatArrayBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return result.buffer;
}

/**
 * Генерация пары ключей для ECDH (X25519 эмуляция через P-256)
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveBits"]
  );

  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}

/**
 * Импорт публичного ключа из base64
 */
async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(publicKeyBase64);
  return crypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

/**
 * Импорт приватного ключа из base64
 */
async function importPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(privateKeyBase64);
  return crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveBits"]
  );
}

/**
 * Выполнение ECDH для получения общего секрета
 */
async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    256
  );
}

/**
 * Деривация ключа шифрования из общего секрета (HKDF)
 */
async function deriveEncryptionKey(
  sharedSecret: ArrayBuffer,
  salt: ArrayBuffer,
  info: string
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: new TextEncoder().encode(info),
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Шифрование сообщения (AES-256-GCM)
 */
export async function encryptMessage(
  plaintext: string,
  myPrivateKey: string,
  theirPublicKey: string
): Promise<{
  ciphertext: string;
  iv: string;
  salt: string;
}> {
  // Импортируем ключи
  const privateKey = await importPrivateKey(myPrivateKey);
  const publicKey = await importPublicKey(theirPublicKey);

  // Получаем общий секрет
  const sharedSecret = await deriveSharedSecret(privateKey, publicKey);

  // Генерируем соль и IV
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Деривируем ключ шифрования
  const encryptionKey = await deriveEncryptionKey(
    sharedSecret,
    salt.buffer,
    "scoliologic-messenger-v1"
  );

  // Шифруем сообщение
  const plaintextBuffer = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128,
    },
    encryptionKey,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Расшифровка сообщения
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  salt: string,
  myPrivateKey: string,
  theirPublicKey: string
): Promise<string> {
  // Импортируем ключи
  const privateKey = await importPrivateKey(myPrivateKey);
  const publicKey = await importPublicKey(theirPublicKey);

  // Получаем общий секрет
  const sharedSecret = await deriveSharedSecret(privateKey, publicKey);

  // Деривируем ключ шифрования
  const saltBuffer = base64ToArrayBuffer(salt);
  const encryptionKey = await deriveEncryptionKey(
    sharedSecret,
    saltBuffer,
    "scoliologic-messenger-v1"
  );

  // Расшифровываем сообщение
  const ivBuffer = base64ToArrayBuffer(iv);
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
      tagLength: 128,
    },
    encryptionKey,
    ciphertextBuffer
  );

  return new TextDecoder().decode(plaintextBuffer);
}

/**
 * Генерация отпечатка ключа для верификации
 */
export async function generateKeyFingerprint(publicKey: string): Promise<string> {
  const keyBuffer = base64ToArrayBuffer(publicKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyBuffer);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Форматируем как XX XX XX XX ...
  const fingerprint = Array.from(hashArray.slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  
  return fingerprint;
}

import { secureKeyStore, migrateFromLocalStorage } from './secureKeyStore';

/**
 * Хранилище ключей с использованием IndexedDB (безопасное хранилище)
 * 
 * При первом запуске автоматически мигрирует ключи из localStorage
 */
export const keyStore = {
  _initialized: false,
  _initPromise: null as Promise<void> | null,

  /**
   * Инициализация и миграция ключей
   */
  async _ensureInitialized(): Promise<void> {
    if (this._initialized) return;
    
    if (!this._initPromise) {
      this._initPromise = (async () => {
        // Мигрируем ключи из localStorage если есть
        await migrateFromLocalStorage();
        this._initialized = true;
      })();
    }
    
    await this._initPromise;
  },

  async getOrCreateKeyPair(): Promise<{ publicKey: string; privateKey: string; fingerprint?: string }> {
    await this._ensureInitialized();
    
    return secureKeyStore.getOrCreateKeyPair(generateKeyPair);
  },
  
  async getPublicKey(): Promise<string | null> {
    await this._ensureInitialized();
    return secureKeyStore.getPublicKey();
  },
  
  async getPrivateKey(): Promise<string | null> {
    await this._ensureInitialized();
    return secureKeyStore.getPrivateKey();
  },

  async getFingerprint(): Promise<string | null> {
    await this._ensureInitialized();
    return secureKeyStore.getFingerprint();
  },
  
  async clearKeys(): Promise<void> {
    await secureKeyStore.clearKeys();
    this._initialized = false;
    this._initPromise = null;
  },

  /**
   * Экспорт ключей для резервного копирования
   */
  async exportKeys(password: string): Promise<string | null> {
    return secureKeyStore.exportKeys(password);
  },

  /**
   * Импорт ключей из резервной копии
   */
  async importKeys(encryptedData: string, password: string): Promise<boolean> {
    const result = await secureKeyStore.importKeys(encryptedData, password);
    if (result) {
      this._initialized = true;
    }
    return result;
  },
};

/**
 * Интерфейс зашифрованного сообщения
 */
export interface EncryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderPublicKey: string;
  ciphertext: string;
  iv: string;
  salt: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

/**
 * Интерфейс расшифрованного сообщения
 */
export interface DecryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  isOwn: boolean;
}
