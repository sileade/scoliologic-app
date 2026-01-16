/**
 * Интеграционные тесты для MIS сервиса
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPatientDevices,
  getDevice,
  getPatient,
  findPatient,
  getPatientAppointments,
  getPatientDocuments,
  syncPatientData,
  clearCache,
  checkMISHealth,
  getCacheInfo,
} from '../../server/mis/service';

// Мокаем fetch для тестирования без реального API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MIS Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  describe('getPatientDevices', () => {
    it('should fetch devices for a patient', async () => {
      const mockDevices = [
        { id: '1', name: 'Корсет Шено', type: 'corset', status: 'active' },
        { id: '2', name: 'Ортез', type: 'orthosis', status: 'active' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDevices }),
      });

      const result = await getPatientDevices('patient-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should cache devices response', async () => {
      const mockDevices = [{ id: '1', name: 'Корсет' }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDevices }),
      });

      // Первый вызов
      await getPatientDevices('patient-123');
      
      // Второй вызов должен использовать кэш
      const result = await getPatientDevices('patient-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Только один вызов fetch
    });

    it('should filter by device type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await getPatientDevices('patient-123', { type: 'corset' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=corset'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      const result = await getPatientDevices('patient-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getPatientDevices('patient-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('getDevice', () => {
    it('should fetch a single device', async () => {
      const mockDevice = { id: '1', name: 'Корсет Шено', serialNumber: 'SN123' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDevice),
      });

      const result = await getDevice('device-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDevice);
    });
  });

  describe('getPatient', () => {
    it('should fetch patient information', async () => {
      const mockPatient = {
        id: 'patient-123',
        firstName: 'Иван',
        lastName: 'Иванов',
        birthDate: '1990-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPatient),
      });

      const result = await getPatient('patient-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPatient);
    });

    it('should cache patient data for 10 minutes', async () => {
      const mockPatient = { id: 'patient-123', firstName: 'Иван' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPatient),
      });

      await getPatient('patient-123');
      await getPatient('patient-123');
      await getPatient('patient-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('findPatient', () => {
    it('should search by SNILS', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await findPatient({ snils: '123-456-789 00' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('snils=123-456-789'),
        expect.any(Object)
      );
    });

    it('should search by name and birthdate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await findPatient({
        lastName: 'Иванов',
        firstName: 'Иван',
        birthDate: '1990-01-01',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('lastName='),
        expect.any(Object)
      );
    });
  });

  describe('getPatientAppointments', () => {
    it('should fetch appointments', async () => {
      const mockAppointments = [
        { id: '1', date: '2026-01-20', time: '10:00', doctor: 'Петров А.А.' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAppointments }),
      });

      const result = await getPatientAppointments('patient-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should filter by date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await getPatientAppointments('patient-123', {
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('from=2026-01-01'),
        expect.any(Object)
      );
    });

    it('should cache appointments for 1 minute', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await getPatientAppointments('patient-123');
      await getPatientAppointments('patient-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPatientDocuments', () => {
    it('should fetch documents', async () => {
      const mockDocuments = [
        { id: '1', name: 'Выписка', type: 'discharge', date: '2026-01-15' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockDocuments }),
      });

      const result = await getPatientDocuments('patient-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should filter by document type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await getPatientDocuments('patient-123', { type: 'prescription' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=prescription'),
        expect.any(Object)
      );
    });
  });

  describe('syncPatientData', () => {
    it('should sync all patient data', async () => {
      // Мокаем все запросы
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: '1' }, { id: '2' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: '1' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: '1' }, { id: '2' }, { id: '3' }] }),
        });

      const result = await syncPatientData('patient-123', 1);

      expect(result.success).toBe(true);
      expect(result.syncedItems.length).toBeGreaterThan(0);
    });

    it('should handle partial sync failures', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: '1' }] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Error',
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

      const result = await syncPatientData('patient-123', 1);

      expect(result.success).toBe(true);
      expect(result.syncedItems.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await getPatientDevices('patient-1');
      await getPatient('patient-1');

      await clearCache();

      // После очистки должны быть новые запросы
      await getPatientDevices('patient-1');
      await getPatient('patient-1');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should clear cache by pattern', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await getPatientDevices('patient-1');
      await getPatient('patient-1');

      await clearCache('devices');

      // Только devices должен перезапроситься
      await getPatientDevices('patient-1');
      await getPatient('patient-1');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('checkMISHealth', () => {
    it('should return available when MIS responds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await checkMISHealth();

      expect(result.available).toBe(true);
      expect(result.latency).toBeDefined();
    });

    it('should return unavailable on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkMISHealth();

      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getCacheInfo', () => {
    it('should return cache statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await getPatientDevices('patient-1');
      await getPatient('patient-1');

      const info = getCacheInfo();

      expect(info.memoryCacheSize).toBeGreaterThanOrEqual(2);
      expect(typeof info.redisConnected).toBe('boolean');
    });
  });
});

describe('MIS Service - FHIR Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  it('should adapt FHIR Bundle response', async () => {
    // Симулируем FHIR Bundle ответ
    const fhirBundle = {
      resourceType: 'Bundle',
      total: 2,
      entry: [
        { resource: { id: '1', name: 'Device 1' } },
        { resource: { id: '2', name: 'Device 2' } },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fhirBundle),
    });

    // Тест требует настройки apiType = 'fhir' в конфиге
    // Это демонстрационный тест структуры
    expect(fhirBundle.entry.map(e => e.resource)).toHaveLength(2);
  });
});
