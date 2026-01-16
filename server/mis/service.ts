/**
 * Сервис для работы с МИС (Медицинская информационная система)
 * 
 * Обеспечивает получение данных о пациентах, изделиях,
 * приёмах и документах из МИС клиники.
 */

import {
  misConfig,
  MISDevice,
  MISPatient,
  MISAppointment,
  MISDocument,
  MISResponse,
  DeviceType,
  DeviceStatus,
} from "./config";

// Простой in-memory кэш (в продакшене использовать Redis)
const cache = new Map<string, { data: any; expiresAt: number }>();

/**
 * Получение данных из кэша
 */
function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

/**
 * Сохранение данных в кэш
 */
function setCache(key: string, data: any, ttl?: number): void {
  if (!misConfig.enableCache) return;
  cache.set(key, {
    data,
    expiresAt: Date.now() + (ttl || misConfig.cacheTTL) * 1000,
  });
}

/**
 * Выполнение запроса к МИС API
 */
async function fetchMIS<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<MISResponse<T>> {
  const url = `${misConfig.baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  
  // Добавляем авторизацию
  if (misConfig.apiKey) {
    headers["X-API-Key"] = misConfig.apiKey;
  } else if (misConfig.username && misConfig.password) {
    const credentials = Buffer.from(
      `${misConfig.username}:${misConfig.password}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), misConfig.timeout);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: errorData.message || response.statusText,
        },
      };
    }
    
    const data = await response.json();
    
    // Адаптируем ответ в зависимости от типа API
    if (misConfig.apiType === "fhir") {
      return {
        success: true,
        data: adaptFHIRResponse<T>(data),
        meta: {
          total: data.total,
        },
      };
    }
    
    return {
      success: true,
      data: data.data || data,
      meta: data.meta,
    };
  } catch (error: any) {
    console.error("MIS API error:", error);
    return {
      success: false,
      error: {
        code: error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
        message: error.message || "Failed to connect to MIS",
      },
    };
  }
}

/**
 * Адаптация ответа FHIR в наш формат
 */
function adaptFHIRResponse<T>(fhirData: any): T {
  // Если это Bundle, извлекаем ресурсы
  if (fhirData.resourceType === "Bundle") {
    return (fhirData.entry?.map((e: any) => e.resource) || []) as T;
  }
  return fhirData as T;
}

/**
 * Получение списка изделий пациента
 */
export async function getPatientDevices(
  patientId: string,
  options?: {
    type?: DeviceType;
    status?: DeviceStatus;
    includeArchived?: boolean;
  }
): Promise<MISResponse<MISDevice[]>> {
  const cacheKey = `devices:${patientId}:${JSON.stringify(options)}`;
  const cached = getFromCache<MISDevice[]>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }
  
  let endpoint = `/patients/${patientId}/devices`;
  const params = new URLSearchParams();
  
  if (options?.type) params.append("type", options.type);
  if (options?.status) params.append("status", options.status);
  if (!options?.includeArchived) params.append("excludeArchived", "true");
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  const result = await fetchMIS<MISDevice[]>(endpoint);
  
  if (result.success && result.data) {
    setCache(cacheKey, result.data);
  }
  
  return result;
}

/**
 * Получение информации об изделии
 */
export async function getDevice(deviceId: string): Promise<MISResponse<MISDevice>> {
  const cacheKey = `device:${deviceId}`;
  const cached = getFromCache<MISDevice>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }
  
  const result = await fetchMIS<MISDevice>(`/devices/${deviceId}`);
  
  if (result.success && result.data) {
    setCache(cacheKey, result.data);
  }
  
  return result;
}

/**
 * Получение информации о пациенте из МИС
 */
export async function getPatient(
  patientId: string
): Promise<MISResponse<MISPatient>> {
  const cacheKey = `patient:${patientId}`;
  const cached = getFromCache<MISPatient>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }
  
  const result = await fetchMIS<MISPatient>(`/patients/${patientId}`);
  
  if (result.success && result.data) {
    setCache(cacheKey, result.data, 600); // 10 минут для данных пациента
  }
  
  return result;
}

/**
 * Поиск пациента по СНИЛС или ФИО
 */
export async function findPatient(
  query: { snils?: string; lastName?: string; firstName?: string; birthDate?: string }
): Promise<MISResponse<MISPatient[]>> {
  const params = new URLSearchParams();
  if (query.snils) params.append("snils", query.snils);
  if (query.lastName) params.append("lastName", query.lastName);
  if (query.firstName) params.append("firstName", query.firstName);
  if (query.birthDate) params.append("birthDate", query.birthDate);
  
  return fetchMIS<MISPatient[]>(`/patients/search?${params.toString()}`);
}

/**
 * Получение приёмов пациента
 */
export async function getPatientAppointments(
  patientId: string,
  options?: {
    from?: string;
    to?: string;
    status?: MISAppointment["status"];
  }
): Promise<MISResponse<MISAppointment[]>> {
  const cacheKey = `appointments:${patientId}:${JSON.stringify(options)}`;
  const cached = getFromCache<MISAppointment[]>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }
  
  let endpoint = `/patients/${patientId}/appointments`;
  const params = new URLSearchParams();
  
  if (options?.from) params.append("from", options.from);
  if (options?.to) params.append("to", options.to);
  if (options?.status) params.append("status", options.status);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  const result = await fetchMIS<MISAppointment[]>(endpoint);
  
  if (result.success && result.data) {
    setCache(cacheKey, result.data, 60); // 1 минута для приёмов
  }
  
  return result;
}

/**
 * Получение документов пациента
 */
export async function getPatientDocuments(
  patientId: string,
  options?: {
    type?: MISDocument["type"];
  }
): Promise<MISResponse<MISDocument[]>> {
  const cacheKey = `documents:${patientId}:${JSON.stringify(options)}`;
  const cached = getFromCache<MISDocument[]>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }
  
  let endpoint = `/patients/${patientId}/documents`;
  if (options?.type) {
    endpoint += `?type=${options.type}`;
  }
  
  const result = await fetchMIS<MISDocument[]>(endpoint);
  
  if (result.success && result.data) {
    setCache(cacheKey, result.data);
  }
  
  return result;
}

/**
 * Получение URL для скачивания документа
 */
export async function getDocumentDownloadUrl(
  documentId: string
): Promise<MISResponse<{ url: string; expiresAt: string }>> {
  return fetchMIS(`/documents/${documentId}/download`);
}

/**
 * Синхронизация данных пациента из МИС в локальную БД
 */
export async function syncPatientData(
  patientId: string,
  localPatientId: number
): Promise<{ success: boolean; syncedItems: string[] }> {
  const syncedItems: string[] = [];
  
  try {
    // Синхронизируем изделия
    const devicesResult = await getPatientDevices(patientId);
    if (devicesResult.success && devicesResult.data) {
      // Здесь должна быть логика сохранения в локальную БД
      syncedItems.push(`devices: ${devicesResult.data.length}`);
    }
    
    // Синхронизируем приёмы
    const appointmentsResult = await getPatientAppointments(patientId);
    if (appointmentsResult.success && appointmentsResult.data) {
      syncedItems.push(`appointments: ${appointmentsResult.data.length}`);
    }
    
    // Синхронизируем документы
    const documentsResult = await getPatientDocuments(patientId);
    if (documentsResult.success && documentsResult.data) {
      syncedItems.push(`documents: ${documentsResult.data.length}`);
    }
    
    return { success: true, syncedItems };
  } catch (error) {
    console.error("Sync error:", error);
    return { success: false, syncedItems };
  }
}

/**
 * Очистка кэша
 */
export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Проверка доступности МИС
 */
export async function checkMISHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const response = await fetch(`${misConfig.baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    
    return {
      available: response.ok,
      latency: Date.now() - start,
    };
  } catch (error: any) {
    return {
      available: false,
      error: error.message,
    };
  }
}
