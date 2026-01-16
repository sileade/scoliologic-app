/**
 * Конфигурация интеграции с МИС (Медицинская информационная система)
 * 
 * МИС клиники содержит данные о пациентах, назначениях, 
 * изделиях (протезы, ортезы, корсеты) и истории лечения.
 * 
 * Поддерживаемые протоколы:
 * - HL7 FHIR R4 (предпочтительный)
 * - REST API
 * - SOAP (legacy)
 */

import { env } from "../_core/env";

export interface MISConfig {
  // Базовый URL МИС API
  baseUrl: string;
  // Тип API (fhir, rest, soap)
  apiType: "fhir" | "rest" | "soap";
  // Ключ API или токен
  apiKey?: string;
  // Имя пользователя для basic auth
  username?: string;
  // Пароль для basic auth
  password?: string;
  // Таймаут запросов (мс)
  timeout: number;
  // Включить кэширование
  enableCache: boolean;
  // TTL кэша (секунды)
  cacheTTL: number;
}

export const misConfig: MISConfig = {
  baseUrl: env.MIS_API_URL || "http://mis.scoliologic.local/api/v1",
  apiType: (env.MIS_API_TYPE as MISConfig["apiType"]) || "fhir",
  apiKey: env.MIS_API_KEY,
  username: env.MIS_USERNAME,
  password: env.MIS_PASSWORD,
  timeout: parseInt(env.MIS_TIMEOUT || "30000"),
  enableCache: env.MIS_CACHE_ENABLED !== "false",
  cacheTTL: parseInt(env.MIS_CACHE_TTL || "300"),
};

// Типы изделий
export enum DeviceType {
  CORSET = "corset",           // Корсет
  ORTHOSIS = "orthosis",       // Ортез
  PROSTHESIS = "prosthesis",   // Протез
  INSOLE = "insole",           // Стелька
  BRACE = "brace",             // Бандаж
}

// Статусы изделия
export enum DeviceStatus {
  ORDERED = "ordered",         // Заказано
  MANUFACTURING = "manufacturing", // В производстве
  READY = "ready",             // Готово к выдаче
  ISSUED = "issued",           // Выдано
  IN_USE = "in_use",           // Используется
  SERVICE = "service",         // На обслуживании
  REPLACED = "replaced",       // Заменено
  ARCHIVED = "archived",       // В архиве
}

// Интерфейс изделия из МИС
export interface MISDevice {
  id: string;
  patientId: string;
  type: DeviceType;
  status: DeviceStatus;
  // Информация об изделии
  name: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  // Даты
  orderDate?: string;
  manufacturingDate?: string;
  issueDate?: string;
  warrantyEndDate?: string;
  nextServiceDate?: string;
  // Параметры
  parameters?: {
    size?: string;
    color?: string;
    material?: string;
    cobbAngle?: number;      // Угол Кобба (для корсетов)
    wearSchedule?: string;   // График ношения
    adjustments?: string[];  // История корректировок
  };
  // Документы
  documents?: {
    id: string;
    type: string;
    name: string;
    url: string;
  }[];
  // Врач
  prescribedBy?: {
    id: string;
    name: string;
    specialty: string;
  };
  // Примечания
  notes?: string;
}

// Интерфейс пациента из МИС
export interface MISPatient {
  id: string;
  externalId?: string;        // ID в ЕСИА или другой системе
  snils?: string;
  // ФИО
  lastName: string;
  firstName: string;
  middleName?: string;
  // Дата рождения
  birthDate: string;
  gender: "male" | "female";
  // Контакты
  phone?: string;
  email?: string;
  address?: string;
  // Медицинские данные
  diagnosis?: {
    code: string;             // МКБ-10
    name: string;
    date: string;
  }[];
  // Полис ОМС
  omsNumber?: string;
  omsCompany?: string;
  // ИПР/ИПРА
  iprNumber?: string;
  iprDate?: string;
  iprEndDate?: string;
}

// Интерфейс приёма/визита
export interface MISAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  // Время
  scheduledAt: string;
  duration: number;           // минуты
  // Статус
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  // Тип приёма
  type: "consultation" | "fitting" | "checkup" | "adjustment" | "issue";
  // Примечания
  notes?: string;
  // Результат
  result?: {
    diagnosis?: string;
    recommendations?: string;
    prescriptions?: string[];
    nextVisit?: string;
  };
}

// Интерфейс документа из МИС
export interface MISDocument {
  id: string;
  patientId: string;
  type: "medical_record" | "prescription" | "certificate" | "contract" | "ipr" | "sfr" | "xray" | "other";
  name: string;
  description?: string;
  // Файл
  mimeType: string;
  size: number;
  url: string;
  // Даты
  createdAt: string;
  validUntil?: string;
  // Автор
  createdBy?: {
    id: string;
    name: string;
  };
}

// Ответ API МИС
export interface MISResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}
