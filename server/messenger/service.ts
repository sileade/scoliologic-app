/**
 * Сервис защищённого мессенджера
 * 
 * Сервер НЕ имеет доступа к содержимому сообщений (E2EE).
 * Сервер хранит только:
 * - Зашифрованные сообщения
 * - Публичные ключи пользователей
 * - Метаданные (время, статус доставки)
 */

import { db } from "../db";
import { eq, and, or, desc } from "drizzle-orm";

// Типы для мессенджера
export interface Chat {
  id: string;
  participantIds: string[];
  type: "patient_doctor" | "patient_ai" | "group";
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  metadata?: {
    doctorId?: string;
    doctorName?: string;
    specialty?: string;
    aiModel?: string;
  };
}

export interface EncryptedMessagePayload {
  chatId: string;
  senderId: string;
  senderPublicKey: string;
  ciphertext: string;
  iv: string;
  salt: string;
  messageType: "text" | "image" | "file" | "voice";
  replyToId?: string;
}

export interface StoredMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderPublicKey: string;
  ciphertext: string;
  iv: string;
  salt: string;
  messageType: string;
  replyToId?: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
  deliveredAt?: Date;
  readAt?: Date;
}

export interface PublicKeyRecord {
  oderId: string;
  publicKey: string;
  fingerprint: string;
  createdAt: Date;
  revokedAt?: Date;
}

// In-memory хранилище (в продакшене использовать PostgreSQL/Redis)
const chats = new Map<string, Chat>();
const messages = new Map<string, StoredMessage[]>();
const publicKeys = new Map<string, PublicKeyRecord>();
const undeliveredMessages = new Map<string, StoredMessage[]>();

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Регистрация публичного ключа пользователя
 */
export function registerPublicKey(
  userId: string,
  publicKey: string,
  fingerprint: string
): PublicKeyRecord {
  const record: PublicKeyRecord = {
    oderId: oderId,
    publicKey,
    fingerprint,
    createdAt: new Date(),
  };
  
  // Отзываем старый ключ если есть
  const existing = publicKeys.get(userId);
  if (existing) {
    existing.revokedAt = new Date();
  }
  
  publicKeys.set(userId, record);
  return record;
}

/**
 * Получение публичного ключа пользователя
 */
export function getPublicKey(userId: string): PublicKeyRecord | undefined {
  const record = publicKeys.get(userId);
  if (record && !record.revokedAt) {
    return record;
  }
  return undefined;
}

/**
 * Создание чата между пациентом и врачом
 */
export function createPatientDoctorChat(
  patientId: string,
  doctorId: string,
  doctorName: string,
  specialty: string
): Chat {
  // Проверяем существующий чат
  for (const chat of chats.values()) {
    if (
      chat.type === "patient_doctor" &&
      chat.participantIds.includes(patientId) &&
      chat.metadata?.doctorId === doctorId
    ) {
      return chat;
    }
  }
  
  const chat: Chat = {
    id: generateId(),
    participantIds: [patientId, doctorId],
    type: "patient_doctor",
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      doctorId,
      doctorName,
      specialty,
    },
  };
  
  chats.set(chat.id, chat);
  messages.set(chat.id, []);
  
  return chat;
}

/**
 * Создание чата с AI-ассистентом
 */
export function createAIChat(
  patientId: string,
  aiModel: string = "llama3"
): Chat {
  // Проверяем существующий чат
  for (const chat of chats.values()) {
    if (
      chat.type === "patient_ai" &&
      chat.participantIds.includes(patientId)
    ) {
      return chat;
    }
  }
  
  const chat: Chat = {
    id: generateId(),
    participantIds: [patientId, "ai-assistant"],
    type: "patient_ai",
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      aiModel,
    },
  };
  
  chats.set(chat.id, chat);
  messages.set(chat.id, []);
  
  return chat;
}

/**
 * Получение чатов пользователя
 */
export function getUserChats(userId: string): Chat[] {
  const userChats: Chat[] = [];
  
  for (const chat of chats.values()) {
    if (chat.participantIds.includes(userId)) {
      userChats.push(chat);
    }
  }
  
  return userChats.sort((a, b) => {
    const aTime = a.lastMessageAt?.getTime() || a.updatedAt.getTime();
    const bTime = b.lastMessageAt?.getTime() || b.updatedAt.getTime();
    return bTime - aTime;
  });
}

/**
 * Сохранение зашифрованного сообщения
 */
export function storeMessage(payload: EncryptedMessagePayload): StoredMessage {
  const message: StoredMessage = {
    id: generateId(),
    chatId: payload.chatId,
    senderId: payload.senderId,
    senderPublicKey: payload.senderPublicKey,
    ciphertext: payload.ciphertext,
    iv: payload.iv,
    salt: payload.salt,
    messageType: payload.messageType,
    replyToId: payload.replyToId,
    timestamp: new Date(),
    status: "sent",
  };
  
  // Сохраняем сообщение
  const chatMessages = messages.get(payload.chatId) || [];
  chatMessages.push(message);
  messages.set(payload.chatId, chatMessages);
  
  // Обновляем время последнего сообщения в чате
  const chat = chats.get(payload.chatId);
  if (chat) {
    chat.lastMessageAt = message.timestamp;
    chat.updatedAt = message.timestamp;
  }
  
  // Добавляем в очередь недоставленных для других участников
  if (chat) {
    for (const participantId of chat.participantIds) {
      if (participantId !== payload.senderId && participantId !== "ai-assistant") {
        const queue = undeliveredMessages.get(participantId) || [];
        queue.push(message);
        undeliveredMessages.set(participantId, queue);
      }
    }
  }
  
  return message;
}

/**
 * Получение сообщений чата
 */
export function getChatMessages(
  chatId: string,
  limit: number = 50,
  before?: string
): StoredMessage[] {
  const chatMessages = messages.get(chatId) || [];
  
  let filtered = chatMessages;
  if (before) {
    const beforeIndex = chatMessages.findIndex(m => m.id === before);
    if (beforeIndex > 0) {
      filtered = chatMessages.slice(0, beforeIndex);
    }
  }
  
  return filtered.slice(-limit);
}

/**
 * Получение недоставленных сообщений для пользователя
 */
export function getUndeliveredMessages(userId: string): StoredMessage[] {
  const queue = undeliveredMessages.get(userId) || [];
  return [...queue];
}

/**
 * Отметка сообщений как доставленных
 */
export function markAsDelivered(userId: string, messageIds: string[]): void {
  const queue = undeliveredMessages.get(userId) || [];
  const remaining = queue.filter(m => !messageIds.includes(m.id));
  undeliveredMessages.set(userId, remaining);
  
  // Обновляем статус сообщений
  for (const [chatId, chatMessages] of messages.entries()) {
    for (const message of chatMessages) {
      if (messageIds.includes(message.id)) {
        message.status = "delivered";
        message.deliveredAt = new Date();
      }
    }
  }
}

/**
 * Отметка сообщений как прочитанных
 */
export function markAsRead(chatId: string, userId: string, lastReadMessageId: string): void {
  const chatMessages = messages.get(chatId) || [];
  let foundTarget = false;
  
  for (const message of chatMessages) {
    if (message.id === lastReadMessageId) {
      foundTarget = true;
    }
    if (!foundTarget && message.senderId !== userId) {
      message.status = "read";
      message.readAt = new Date();
    }
  }
}

/**
 * Получение информации о чате
 */
export function getChat(chatId: string): Chat | undefined {
  return chats.get(chatId);
}

/**
 * Удаление сообщения (только для отправителя, в течение 24 часов)
 */
export function deleteMessage(
  messageId: string,
  userId: string
): boolean {
  for (const [chatId, chatMessages] of messages.entries()) {
    const index = chatMessages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      const message = chatMessages[index];
      
      // Проверяем права на удаление
      if (message.senderId !== userId) {
        return false;
      }
      
      // Проверяем время (24 часа)
      const hoursSinceMessage = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSinceMessage > 24) {
        return false;
      }
      
      chatMessages.splice(index, 1);
      return true;
    }
  }
  
  return false;
}

/**
 * Статистика мессенджера
 */
export function getMessengerStats(): {
  totalChats: number;
  totalMessages: number;
  activeUsers: number;
} {
  let totalMessages = 0;
  for (const chatMessages of messages.values()) {
    totalMessages += chatMessages.length;
  }
  
  return {
    totalChats: chats.size,
    totalMessages,
    activeUsers: publicKeys.size,
  };
}
