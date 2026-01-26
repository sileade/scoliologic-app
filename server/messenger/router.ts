/**
 * tRPC роутер для защищённого мессенджера с интегрированным AI-ассистентом
 * 
 * БЕЗОПАСНОСТЬ:
 * - AI работает ТОЛЬКО в специальных чатах типа "patient_ai"
 * - В чатах с врачами используется E2EE, сервер НЕ имеет доступа к содержимому
 * - Разделены API для зашифрованных сообщений и AI-чатов
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  registerPublicKey,
  getPublicKey,
  createPatientDoctorChat,
  createAIChat,
  getUserChats,
  storeEncryptedMessage,
  storeAIMessage,
  getChatMessages,
  getUndeliveredMessages,
  markAsDelivered,
  markAsRead,
  getChat,
  deleteMessage,
  getMessengerStats,
  toggleAI,
  getAIStatus,
} from "./service";

export const messengerRouter = router({
  // Регистрация публичного ключа пользователя
  registerKey: protectedProcedure
    .input(z.object({
      publicKey: z.string(),
      fingerprint: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id.toString();
      return registerPublicKey(userId, input.publicKey, input.fingerprint);
    }),

  // Получение публичного ключа пользователя
  getKey: protectedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      return getPublicKey(input.userId);
    }),

  // Создание чата с врачом
  createDoctorChat: protectedProcedure
    .input(z.object({
      doctorId: z.string(),
      doctorName: z.string(),
      specialty: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patientId = ctx.user.id.toString();
      return createPatientDoctorChat(
        patientId,
        input.doctorId,
        input.doctorName,
        input.specialty
      );
    }),

  // Создание чата с AI (прямой чат)
  createAIChat: protectedProcedure
    .input(z.object({
      model: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const patientId = ctx.user.id.toString();
      return createAIChat(patientId, input?.model);
    }),

  // Получение списка чатов пользователя
  getChats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id.toString();
    return getUserChats(userId);
  }),

  // Получение информации о чате
  getChat: protectedProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      return getChat(input.chatId);
    }),

  /**
   * Отправка зашифрованного сообщения (для чатов с врачами)
   * 
   * ВАЖНО: plainText НЕ передается на сервер для обеспечения E2EE
   * Сервер хранит только зашифрованные данные
   */
  sendMessage: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      ciphertext: z.string(),
      iv: z.string(),
      salt: z.string(),
      senderPublicKey: z.string(),
      messageType: z.enum(["text", "image", "file", "voice"]).default("text"),
      replyToId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.user.id.toString();
      const isDoctor = (ctx.user as any).role === 'doctor';
      
      const result = await storeEncryptedMessage({
        chatId: input.chatId,
        senderId,
        senderPublicKey: input.senderPublicKey,
        ciphertext: input.ciphertext,
        iv: input.iv,
        salt: input.salt,
        messageType: input.messageType,
        replyToId: input.replyToId,
      }, isDoctor);
      
      return {
        message: result.message,
        aiResponse: null,
        aiResponded: false,
      };
    }),

  /**
   * Отправка сообщения в AI-чат (без шифрования)
   * 
   * Используется ТОЛЬКО для прямого общения с AI-ассистентом
   * Пользователь осведомлен, что сообщения не шифруются
   */
  sendAIMessage: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      message: z.string().min(1).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.user.id.toString();
      
      const result = await storeAIMessage({
        chatId: input.chatId,
        senderId,
        message: input.message,
        messageType: "text",
      });
      
      return {
        message: result.message,
        aiResponse: result.aiResponse || null,
        aiResponded: !!result.aiResponse,
      };
    }),

  // Получение сообщений чата
  getMessages: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      before: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getChatMessages(input.chatId, input.limit, input.before);
    }),

  // Получение недоставленных сообщений
  getUndelivered: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id.toString();
    return getUndeliveredMessages(userId);
  }),

  // Отметка сообщений как доставленных
  markDelivered: protectedProcedure
    .input(z.object({
      messageIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id.toString();
      markAsDelivered(userId, input.messageIds);
      return { success: true };
    }),

  // Отметка сообщений как прочитанных
  markRead: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      lastReadMessageId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id.toString();
      markAsRead(input.chatId, userId, input.lastReadMessageId);
      return { success: true };
    }),

  // Удаление сообщения
  deleteMessage: protectedProcedure
    .input(z.object({
      messageId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id.toString();
      const success = deleteMessage(input.messageId, userId);
      return { success };
    }),

  // Включение/выключение AI в чате
  toggleAI: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const success = toggleAI(input.chatId, input.enabled);
      return { success };
    }),

  // Получение статуса AI в чате
  getAIStatus: protectedProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {
      return getAIStatus(input.chatId);
    }),

  // Статистика мессенджера (для отладки)
  stats: protectedProcedure.query(async () => {
    return getMessengerStats();
  }),

  // Получение списка врачей для чата
  getDoctors: protectedProcedure.query(async () => {
    // Возвращаем список врачей клиники
    return [
      {
        id: "doctor-1",
        name: "Иванов Иван Иванович",
        specialty: "Ортопед-вертебролог",
        avatar: null,
        online: true,
      },
      {
        id: "doctor-2",
        name: "Петрова Мария Сергеевна",
        specialty: "Врач ЛФК",
        avatar: null,
        online: false,
      },
      {
        id: "doctor-3",
        name: "Сидоров Алексей Петрович",
        specialty: "Ортопед-техник",
        avatar: null,
        online: true,
      },
    ];
  }),
});
