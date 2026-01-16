/**
 * tRPC роутер для интеграции с МИС
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getPatientDevices,
  getPatientAppointments,
  getPatientDocuments,
  getPatient,
  checkMISHealth,
} from "./service";
import { DeviceType, DeviceStatus } from "./config";

export const misRouter = router({
  // Проверка доступности МИС
  health: protectedProcedure.query(async () => {
    return checkMISHealth();
  }),

  // Получение информации о пациенте из МИС
  getPatient: protectedProcedure
    .input(z.object({
      patientId: z.string().optional(),
      snils: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Используем ID пациента из контекста если не указан
      const patientId = input.patientId || ctx.user.openId?.replace("esia:", "") || "";
      return getPatient(patientId);
    }),

  // Получение списка изделий (корсеты, ортезы, протезы)
  getDevices: protectedProcedure
    .input(z.object({
      type: z.nativeEnum(DeviceType).optional(),
      status: z.nativeEnum(DeviceStatus).optional(),
      includeArchived: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const patientId = ctx.user.openId?.replace("esia:", "") || ctx.user.id.toString();
      return getPatientDevices(patientId, input);
    }),

  // Получение детальной информации об изделии
  getDevice: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const patientId = ctx.user.openId?.replace("esia:", "") || ctx.user.id.toString();
      const result = await getPatientDevices(patientId);
      
      if (!result.success || !result.data) {
        return { success: false, error: { code: "NOT_FOUND", message: "Изделие не найдено" } };
      }
      
      const device = result.data.find(d => d.id === input.deviceId);
      if (!device) {
        return { success: false, error: { code: "NOT_FOUND", message: "Изделие не найдено" } };
      }
      
      return { success: true, data: device };
    }),

  // Получение приёмов из МИС
  getAppointments: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const patientId = ctx.user.openId?.replace("esia:", "") || ctx.user.id.toString();
      return getPatientAppointments(patientId, input);
    }),

  // Получение документов из МИС
  getDocuments: protectedProcedure
    .input(z.object({
      type: z.enum(["medical_record", "prescription", "certificate", "contract", "ipr", "sfr", "xray", "other"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const patientId = ctx.user.openId?.replace("esia:", "") || ctx.user.id.toString();
      return getPatientDocuments(patientId, input);
    }),

  // Синхронизация данных пациента с МИС
  sync: protectedProcedure.mutation(async ({ ctx }) => {
    const patientId = ctx.user.openId?.replace("esia:", "") || ctx.user.id.toString();
    
    // Получаем все данные параллельно
    const [patientInfo, devices, appointments, documents] = await Promise.all([
      getPatient(patientId),
      getPatientDevices(patientId),
      getPatientAppointments(patientId),
      getPatientDocuments(patientId),
    ]);
    
    return {
      success: true,
      syncedAt: new Date().toISOString(),
      data: {
        patient: patientInfo.success ? patientInfo.data : null,
        devicesCount: devices.success ? devices.data?.length || 0 : 0,
        appointmentsCount: appointments.success ? appointments.data?.length || 0 : 0,
        documentsCount: documents.success ? documents.data?.length || 0 : 0,
      },
    };
  }),
});
