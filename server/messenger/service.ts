/**
 * Сервис защищённого мессенджера с интегрированным AI-ассистентом
 * 
 * Логика AI-ассистента:
 * 1. AI работает ТОЛЬКО в специальных чатах типа "patient_ai"
 * 2. В чатах с врачами AI НЕ имеет доступа к содержимому сообщений (E2EE)
 * 3. AI может отвечать только на неконфиденциальные общие вопросы
 * 
 * БЕЗОПАСНОСТЬ:
 * - Сервер НЕ имеет доступа к содержимому зашифрованных сообщений
 * - plainText НИКОГДА не передается на сервер для чатов с врачами
 * - AI работает только с явным согласием пользователя в отдельном чате
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

/**
 * Payload для зашифрованных сообщений
 * ВАЖНО: plainText удален из интерфейса для обеспечения E2EE
 */
export interface EncryptedMessagePayload {
  chatId: string;
  senderId: string;
  senderPublicKey: string;
  ciphertext: string;
  iv: string;
  salt: string;
  messageType: "text" | "image" | "file" | "voice";
  replyToId?: string;
  // УДАЛЕНО: plainText - нарушает E2EE безопасность
}

/**
 * Payload для сообщений в AI-чате (без шифрования)
 * Используется ТОЛЬКО для прямого общения с AI-ассистентом
 */
export interface AIMessagePayload {
  chatId: string;
  senderId: string;
  message: string;
  messageType: "text";
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
  aiContext?: string; // Контекст для AI (только в AI-чатах)
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
  reason: 'doctor_active' | 'ai_timeout' | 'patient_message' | 'ai_disabled' | 'not_ai_chat';
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
 * AI отвечает ТОЛЬКО в чатах типа patient_ai
 */
export function shouldAIRespond(chat: Chat): AIResponseResult {
  // AI работает ТОЛЬКО в специальных AI-чатах
  if (chat.type !== 'patient_ai') {
    return { shouldRespond: false, reason: 'not_ai_chat' };
  }
  
  // Если AI отключен в чате
  if (!chat.aiActive) {
    return { shouldRespond: false, reason: 'ai_disabled' };
  }
  
  return { shouldRespond: true, reason: 'patient_message' };
}

/**
 * Обработка сообщения пациента в AI-чате и генерация ответа
 * ВАЖНО: Работает ТОЛЬКО для чатов типа patient_ai
 */
export async function processAIChatMessage(
  chat: Chat,
  patientMessage: string,
  patientId: string
): Promise<StoredMessage | null> {
  // Проверяем что это AI-чат
  if (chat.type !== 'patient_ai') {
    console.warn(`[Security] Attempt to process AI message in non-AI chat: ${chat.id}`);
    return null;
  }
  
  const aiCheck = shouldAIRespond(chat);
  
  if (!aiCheck.shouldRespond) {
    console.log(`AI не отвечает в чате ${chat.id}: ${aiCheck.reason}`);
    return null;
  }
  
  try {
    // Получаем контекст последних сообщений для AI (только из AI-чата)
    const recentMessages = getChatMessages(chat.id, 10);
    const context = recentMessages.map(m => ({
      role: m.senderId === patientId ? 'user' : 'assistant',
      content: m.aiContext || '[сообщение]'
    }));
    
    // Системный промпт для медицинского AI
    const systemPrompt = `Ты - AI-ассистент клиники Scoliologic, специализирующейся на лечении сколиоза и деформаций позвоночника.

Твоя роль:
- Отвечать на ОБЩИЕ вопросы о сколиозе и корсетотерапии
- Давать общую информацию о лечении сколиоза, упражнениях
- Напоминать о важности соблюдения режима ношения корсета
- При серьёзных жалобах рекомендовать обратиться к врачу

СТРОГИЕ ОГРАНИЧЕНИЯ:
- НЕ ставь диагнозы
- НЕ назначай лечение
- НЕ отменяй назначения врача
- НЕ обсуждай конкретные медицинские данные пациента
- При острой боли или ухудшении состояния - рекомендуй срочно связаться с врачом

Это отдельный чат с AI-ассистентом. Для связи с врачом пациенту нужно использовать защищённый чат с врачом.

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
      ciphertext: '', // Ответ AI не шифруется (это AI-чат)
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
    
    console.log(`AI ответил в AI-чате ${chat.id}`);
    
    return aiMessage;
    
  } catch (error) {
    console.error('Ошибка генерации ответа AI:', error);
    return null;
  }
}

/**
 * Запуск таймера возврата AI в чат (для информирования пользователя)
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
    if (chat) {
      // Просто обновляем статус, AI не получает доступ к сообщениям
      console.log(`Таймаут 1.5 часа в чате ${chatId}`);
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
    aiActive: false, // AI НЕ активен в чатах с врачами (E2EE)
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
 * Сохранение зашифрованного сообщения (для чатов с врачами)
 * ВАЖНО: Сервер НЕ имеет доступа к содержимому сообщений
 */
export async function storeEncryptedMessage(
  payload: EncryptedMessagePayload,
  isDoctor: boolean = false
): Promise<{ message: StoredMessage }> {
  const chat = chats.get(payload.chatId);
  
  // Проверяем что это НЕ AI-чат
  if (chat?.type === 'patient_ai') {
    throw new Error('Use storeAIMessage for AI chats');
  }
  
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
    // НЕ сохраняем aiContext - сервер не имеет доступа к содержимому
  };
  
  // Сохраняем сообщение
  const chatMessages = messagesStore.get(payload.chatId) || [];
  chatMessages.push(message);
  messagesStore.set(payload.chatId, chatMessages);
  
  // Обновляем время последнего сообщения в чате
  if (chat) {
    chat.lastMessageAt = message.timestamp;
    chat.updatedAt = message.timestamp;
    
    // Если это сообщение от врача
    if (isDoctor) {
      chat.lastDoctorResponseAt = message.timestamp;
      startAIReturnTimer(chat.id);
      console.log(`Врач ответил в чате ${chat.id}`);
    }
    
    // Добавляем в очередь недоставленных для других участников
    for (const participantId of chat.participantIds) {
      if (participantId !== payload.senderId && participantId !== AI_ASSISTANT_ID) {
        const queue = undeliveredMessages.get(participantId) || [];
        queue.push(message);
        undeliveredMessages.set(participantId, queue);
      }
    }
  }
  
  return { message };
}

/**
 * Сохранение сообщения в AI-чате (без шифрования)
 */
export async function storeAIMessage(
  payload: AIMessagePayload
): Promise<{ message: StoredMessage; aiResponse?: StoredMessage }> {
  const chat = chats.get(payload.chatId);
  
  // Проверяем что это AI-чат
  if (!chat || chat.type !== 'patient_ai') {
    throw new Error('AI messages are only allowed in AI chats');
  }
  
  const message: StoredMessage = {
    id: generateId(),
    chatId: payload.chatId,
    senderId: payload.senderId,
    senderPublicKey: '',
    ciphertext: '',
    iv: '',
    salt: '',
    messageType: payload.messageType,
    timestamp: new Date(),
    status: "sent",
    aiContext: payload.message, // Сохраняем текст для AI контекста
  };
  
  // Сохраняем сообщение
  const chatMessages = messagesStore.get(payload.chatId) || [];
  chatMessages.push(message);
  messagesStore.set(payload.chatId, chatMessages);
  
  // Обновляем чат
  chat.lastMessageAt = message.timestamp;
  chat.updatedAt = message.timestamp;
  
  // Генерируем ответ AI
  const aiResponse = await processAIChatMessage(chat, payload.message, payload.senderId);
  
  return { message, aiResponse: aiResponse || undefined };
}

/**
 * Сохранение сообщения (обратная совместимость)
 * @deprecated Use storeEncryptedMessage or storeAIMessage instead
 */
export async function storeMessage(
  payload: EncryptedMessagePayload,
  isDoctor: boolean = false
): Promise<{ message: StoredMessage; aiResponse?: StoredMessage }> {
  const chat = chats.get(payload.chatId);
  
  if (chat?.type === 'patient_ai') {
    // Для AI-чатов используем новый метод
    // Но так как plainText удален, это вызовет ошибку - что правильно
    throw new Error('Use storeAIMessage for AI chats with AIMessagePayload');
  }
  
  const result = await storeEncryptedMessage(payload, isDoctor);
  return { message: result.message };
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
 * ВАЖНО: Работает только для AI-чатов
 */
export function toggleAI(chatId: string, enabled: boolean): boolean {
  const chat = chats.get(chatId);
  if (chat && chat.type === 'patient_ai') {
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
  isAIChat: boolean;
} {
  const chat = chats.get(chatId);
  if (!chat) {
    return { active: false, isAIChat: false };
  }
  
  return {
    active: chat.aiActive,
    lastDoctorResponse: chat.lastDoctorResponseAt,
    isAIChat: chat.type === 'patient_ai',
  };
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
  aiChats: number;
  doctorChats: number;
} {
  let totalMessages = 0;
  let aiChats = 0;
  let doctorChats = 0;
  
  const allMessages = Array.from(messagesStore.values());
  for (const chatMessages of allMessages) {
    totalMessages += chatMessages.length;
  }
  
  const allChats = Array.from(chats.values());
  for (const chat of allChats) {
    if (chat.type === 'patient_ai') {
      aiChats++;
    } else if (chat.type === 'patient_doctor') {
      doctorChats++;
    }
  }
  
  return {
    totalChats: chats.size,
    totalMessages,
    activeUsers: publicKeys.size,
    aiChats,
    doctorChats,
  };
}
