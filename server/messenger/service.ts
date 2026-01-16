/**
 * Сервис защищённого мессенджера с интегрированным AI-ассистентом
 * 
 * Логика AI-ассистента:
 * 1. AI мониторит ВСЕ сообщения пациентов в чатах с врачами
 * 2. AI отвечает первым, пока врач не ответил
 * 3. Когда врач отвечает, AI уходит в фон
 * 4. Если врач не отвечает более 1.5 часа, AI снова включается
 * 
 * Сервер НЕ имеет доступа к содержимому сообщений (E2EE).
 * AI получает только незашифрованные сообщения для анализа.
 */

import { OllamaService } from '../ai/ollama';

// Константы
const AI_RETURN_TIMEOUT_MS = 90 * 60 * 1000; // 1.5 часа в миллисекундах
const AI_ASSISTANT_ID = 'ai-assistant';

// Типы для мессенджера
export interface Chat {
  id: string;
  participantIds: string[];
  type: "patient_doctor" | "patient_ai" | "group";
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  lastDoctorResponseAt?: Date; // Время последнего ответа врача
  aiActive: boolean; // AI активен в этом чате
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
  // Для AI анализа (опционально, только для текстовых сообщений)
  plainText?: string;
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
  isAiResponse?: boolean; // Пометка что это ответ AI
  aiContext?: string; // Контекст для AI (не шифруется)
}

export interface PublicKeyRecord {
  userId: string;
  publicKey: string;
  fingerprint: string;
  createdAt: Date;
  revokedAt?: Date;
}

export interface AIResponseResult {
  shouldRespond: boolean;
  response?: string;
  reason: 'doctor_active' | 'ai_timeout' | 'patient_message' | 'ai_disabled';
}

// In-memory хранилище (в продакшене использовать PostgreSQL/Redis)
const chats = new Map<string, Chat>();
const messagesStore = new Map<string, StoredMessage[]>();
const publicKeys = new Map<string, PublicKeyRecord>();
const undeliveredMessages = new Map<string, StoredMessage[]>();

// AI сервис
const ollamaService = new OllamaService();

// Таймеры для проверки возврата AI
const aiReturnTimers = new Map<string, NodeJS.Timeout>();

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Проверка, должен ли AI отвечать в чате
 */
export function shouldAIRespond(chat: Chat): AIResponseResult {
  // AI не работает в чатах типа patient_ai (там он и так основной)
  if (chat.type === 'patient_ai') {
    return { shouldRespond: true, reason: 'patient_message' };
  }
  
  // Если AI отключен в чате
  if (!chat.aiActive) {
    return { shouldRespond: false, reason: 'ai_disabled' };
  }
  
  // Если врач недавно отвечал (менее 1.5 часа назад)
  if (chat.lastDoctorResponseAt) {
    const timeSinceDoctor = Date.now() - chat.lastDoctorResponseAt.getTime();
    if (timeSinceDoctor < AI_RETURN_TIMEOUT_MS) {
      return { shouldRespond: false, reason: 'doctor_active' };
    }
  }
  
  // AI должен ответить (врач не отвечал или прошло более 1.5 часа)
  return { shouldRespond: true, reason: 'ai_timeout' };
}

/**
 * Обработка сообщения пациента и генерация ответа AI
 */
export async function processPatientMessage(
  chat: Chat,
  patientMessage: string,
  patientId: string
): Promise<StoredMessage | null> {
  const aiCheck = shouldAIRespond(chat);
  
  if (!aiCheck.shouldRespond) {
    console.log(`AI не отвечает в чате ${chat.id}: ${aiCheck.reason}`);
    return null;
  }
  
  try {
    // Получаем контекст последних сообщений для AI
    const recentMessages = getChatMessages(chat.id, 10);
    const context = recentMessages.map(m => ({
      role: m.senderId === patientId ? 'user' : (m.isAiResponse ? 'assistant' : 'doctor'),
      content: m.aiContext || '[зашифрованное сообщение]'
    }));
    
    // Системный промпт для медицинского AI
    const systemPrompt = `Ты - AI-ассистент клиники Scoliologic, специализирующейся на лечении сколиоза и деформаций позвоночника.

Твоя роль:
- Отвечать на вопросы пациентов пока врач недоступен
- Давать общую информацию о лечении сколиоза, корсетотерапии, упражнениях
- Напоминать о важности соблюдения режима ношения корсета
- При серьёзных жалобах рекомендовать обратиться к врачу

Ограничения:
- НЕ ставь диагнозы
- НЕ назначай лечение
- НЕ отменяй назначения врача
- При острой боли или ухудшении состояния - рекомендуй срочно связаться с врачом

Врач: ${chat.metadata?.doctorName || 'Ваш лечащий врач'}
Специализация: ${chat.metadata?.specialty || 'Ортопед-вертебролог'}

Отвечай кратко, по существу, на русском языке. В конце сообщения добавь пометку что это автоматический ответ AI-ассистента.`;

    // Генерируем ответ через Ollama
    const aiResponse = await ollamaService.chat(patientMessage, systemPrompt, context);
    
    if (!aiResponse) {
      return null;
    }
    
    // Создаём сообщение от AI
    const aiMessage: StoredMessage = {
      id: generateId(),
      chatId: chat.id,
      senderId: AI_ASSISTANT_ID,
      senderPublicKey: '', // AI не использует E2EE
      ciphertext: '', // Ответ AI не шифруется
      iv: '',
      salt: '',
      messageType: 'text',
      timestamp: new Date(),
      status: 'sent',
      isAiResponse: true,
      aiContext: aiResponse // Сохраняем текст для контекста
    };
    
    // Сохраняем сообщение
    const chatMessages = messagesStore.get(chat.id) || [];
    chatMessages.push(aiMessage);
    messagesStore.set(chat.id, chatMessages);
    
    // Обновляем чат
    chat.lastMessageAt = aiMessage.timestamp;
    chat.updatedAt = aiMessage.timestamp;
    
    // Добавляем в очередь для пациента
    const queue = undeliveredMessages.get(patientId) || [];
    queue.push(aiMessage);
    undeliveredMessages.set(patientId, queue);
    
    console.log(`AI ответил в чате ${chat.id}`);
    
    return aiMessage;
    
  } catch (error) {
    console.error('Ошибка генерации ответа AI:', error);
    return null;
  }
}

/**
 * Запуск таймера возврата AI в чат
 */
function startAIReturnTimer(chatId: string): void {
  // Очищаем предыдущий таймер
  const existingTimer = aiReturnTimers.get(chatId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  // Устанавливаем новый таймер на 1.5 часа
  const timer = setTimeout(() => {
    const chat = chats.get(chatId);
    if (chat && !chat.aiActive) {
      chat.aiActive = true;
      console.log(`AI вернулся в чат ${chatId} после таймаута 1.5 часа`);
    }
    aiReturnTimers.delete(chatId);
  }, AI_RETURN_TIMEOUT_MS);
  
  aiReturnTimers.set(chatId, timer);
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
    userId: userId,
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
  const existingChats = Array.from(chats.values());
  for (const chat of existingChats) {
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
    aiActive: true, // AI активен по умолчанию
    metadata: {
      doctorId,
      doctorName,
      specialty,
    },
  };
  
  chats.set(chat.id, chat);
  messagesStore.set(chat.id, []);
  
  return chat;
}

/**
 * Создание чата с AI-ассистентом (для прямого общения с AI)
 */
export function createAIChat(
  patientId: string,
  aiModel: string = "llama3.2"
): Chat {
  // Проверяем существующий чат
  const existingChats = Array.from(chats.values());
  for (const chat of existingChats) {
    if (
      chat.type === "patient_ai" &&
      chat.participantIds.includes(patientId)
    ) {
      return chat;
    }
  }
  
  const chat: Chat = {
    id: generateId(),
    participantIds: [patientId, AI_ASSISTANT_ID],
    type: "patient_ai",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiActive: true,
    metadata: {
      aiModel,
    },
  };
  
  chats.set(chat.id, chat);
  messagesStore.set(chat.id, []);
  
  return chat;
}

/**
 * Получение чатов пользователя
 */
export function getUserChats(userId: string): Chat[] {
  const userChats: Chat[] = [];
  
  const allChats = Array.from(chats.values());
  for (const chat of allChats) {
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
 * Сохранение зашифрованного сообщения с обработкой AI
 */
export async function storeMessage(
  payload: EncryptedMessagePayload,
  isDoctor: boolean = false
): Promise<{ message: StoredMessage; aiResponse?: StoredMessage }> {
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
    aiContext: payload.plainText, // Сохраняем текст для AI контекста
  };
  
  // Сохраняем сообщение
  const chatMessages = messagesStore.get(payload.chatId) || [];
  chatMessages.push(message);
  messagesStore.set(payload.chatId, chatMessages);
  
  // Обновляем время последнего сообщения в чате
  const chat = chats.get(payload.chatId);
  if (chat) {
    chat.lastMessageAt = message.timestamp;
    chat.updatedAt = message.timestamp;
    
    // Если это сообщение от врача
    if (isDoctor) {
      chat.lastDoctorResponseAt = message.timestamp;
      chat.aiActive = false; // Деактивируем AI когда врач отвечает
      startAIReturnTimer(chat.id); // Запускаем таймер возврата AI
      console.log(`Врач ответил в чате ${chat.id}, AI деактивирован`);
    }
    
    // Добавляем в очередь недоставленных для других участников
    for (const participantId of chat.participantIds) {
      if (participantId !== payload.senderId && participantId !== AI_ASSISTANT_ID) {
        const queue = undeliveredMessages.get(participantId) || [];
        queue.push(message);
        undeliveredMessages.set(participantId, queue);
      }
    }
    
    // Если это сообщение от пациента и есть текст - обрабатываем AI
    let aiResponse: StoredMessage | null = null;
    if (!isDoctor && payload.plainText && chat.type !== 'patient_ai') {
      aiResponse = await processPatientMessage(chat, payload.plainText, payload.senderId);
    } else if (!isDoctor && payload.plainText && chat.type === 'patient_ai') {
      // Прямой чат с AI
      aiResponse = await processPatientMessage(chat, payload.plainText, payload.senderId);
    }
    
    return { message, aiResponse: aiResponse || undefined };
  }
  
  return { message };
}

/**
 * Получение сообщений чата
 */
export function getChatMessages(
  chatId: string,
  limit: number = 50,
  before?: string
): StoredMessage[] {
  const chatMessages = messagesStore.get(chatId) || [];
  
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
  const allMessages = Array.from(messagesStore.entries());
  for (const [, chatMessages] of allMessages) {
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
  const chatMessages = messagesStore.get(chatId) || [];
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
 * Включение/выключение AI в чате
 */
export function toggleAI(chatId: string, enabled: boolean): boolean {
  const chat = chats.get(chatId);
  if (chat) {
    chat.aiActive = enabled;
    if (!enabled) {
      // Очищаем таймер возврата
      const timer = aiReturnTimers.get(chatId);
      if (timer) {
        clearTimeout(timer);
        aiReturnTimers.delete(chatId);
      }
    }
    return true;
  }
  return false;
}

/**
 * Получение статуса AI в чате
 */
export function getAIStatus(chatId: string): {
  active: boolean;
  lastDoctorResponse?: Date;
  willReturnAt?: Date;
} {
  const chat = chats.get(chatId);
  if (!chat) {
    return { active: false };
  }
  
  const result: {
    active: boolean;
    lastDoctorResponse?: Date;
    willReturnAt?: Date;
  } = {
    active: chat.aiActive,
    lastDoctorResponse: chat.lastDoctorResponseAt,
  };
  
  // Если AI неактивен и есть время последнего ответа врача
  if (!chat.aiActive && chat.lastDoctorResponseAt) {
    result.willReturnAt = new Date(chat.lastDoctorResponseAt.getTime() + AI_RETURN_TIMEOUT_MS);
  }
  
  return result;
}

/**
 * Удаление сообщения (только для отправителя, в течение 24 часов)
 */
export function deleteMessage(
  messageId: string,
  userId: string
): boolean {
  const allMessages = Array.from(messagesStore.entries());
  for (const [, chatMessages] of allMessages) {
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
  aiActiveChats: number;
} {
  let totalMessages = 0;
  let aiActiveChats = 0;
  
  const allMessages = Array.from(messagesStore.values());
  for (const chatMessages of allMessages) {
    totalMessages += chatMessages.length;
  }
  
  const allChats = Array.from(chats.values());
  for (const chat of allChats) {
    if (chat.aiActive) {
      aiActiveChats++;
    }
  }
  
  return {
    totalChats: chats.size,
    totalMessages,
    activeUsers: publicKeys.size,
    aiActiveChats,
  };
}
