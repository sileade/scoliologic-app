/**
 * Лист ожидания с уведомлениями
 * Система управления очередью на запись при отсутствии свободных слотов
 */

import { Router, Request, Response } from 'express';
import { BranchCode, AppointmentType } from '../booking/rules';

// =============================================================================
// Типы и интерфейсы
// =============================================================================

export type WaitlistStatus = 'active' | 'notified' | 'booked' | 'expired' | 'cancelled';
export type NotificationChannel = 'push' | 'sms' | 'whatsapp' | 'telegram' | 'email';

export interface WaitlistEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  branchCode: BranchCode;
  appointmentType: AppointmentType;
  doctorId?: string;
  preferredDates: Date[];           // Предпочтительные даты
  preferredTimeStart?: string;      // Предпочтительное время начала (HH:mm)
  preferredTimeEnd?: string;        // Предпочтительное время окончания (HH:mm)
  status: WaitlistStatus;
  priority: number;                 // Приоритет (1 - высший)
  notificationChannels: NotificationChannel[];
  createdAt: Date;
  notifiedAt?: Date;
  notificationExpiresAt?: Date;
  bookedAt?: Date;
  bookingId?: string;
  notes?: string;
}

export interface WaitlistNotification {
  id: string;
  waitlistEntryId: string;
  slotDate: Date;
  slotTime: string;
  doctorId?: string;
  doctorName?: string;
  channel: NotificationChannel;
  sentAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
  accepted?: boolean;
}

export interface AvailableSlot {
  date: Date;
  time: string;
  doctorId?: string;
  doctorName?: string;
  cabinetId?: string;
  duration: number;
}

export interface WaitlistConfig {
  notificationValidityMinutes: number;  // Срок действия уведомления
  maxNotificationsPerSlot: number;      // Макс. уведомлений на один слот
  priorityBoostDays: number;            // Через сколько дней повышается приоритет
  autoExpireDays: number;               // Через сколько дней запись в листе истекает
}

// =============================================================================
// Конфигурация
// =============================================================================

export const WAITLIST_CONFIG: WaitlistConfig = {
  notificationValidityMinutes: 15,  // 15 минут на ответ
  maxNotificationsPerSlot: 3,       // Уведомляем до 3 человек на слот
  priorityBoostDays: 7,             // Через неделю приоритет повышается
  autoExpireDays: 30,               // Через месяц запись истекает
};

// =============================================================================
// Сервис листа ожидания
// =============================================================================

export class WaitlistService {
  private entries: Map<string, WaitlistEntry> = new Map();
  private notifications: Map<string, WaitlistNotification> = new Map();
  private config: WaitlistConfig;

  // Callback для отправки уведомлений
  private sendNotificationCallback?: (
    entry: WaitlistEntry,
    slot: AvailableSlot,
    channel: NotificationChannel
  ) => Promise<boolean>;

  constructor(config?: Partial<WaitlistConfig>) {
    this.config = { ...WAITLIST_CONFIG, ...config };
  }

  /**
   * Установка callback для отправки уведомлений
   */
  setNotificationCallback(
    callback: (entry: WaitlistEntry, slot: AvailableSlot, channel: NotificationChannel) => Promise<boolean>
  ): void {
    this.sendNotificationCallback = callback;
  }

  /**
   * Добавление в лист ожидания
   */
  addToWaitlist(data: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    branchCode: BranchCode;
    appointmentType: AppointmentType;
    doctorId?: string;
    preferredDates: Date[];
    preferredTimeStart?: string;
    preferredTimeEnd?: string;
    notificationChannels: NotificationChannel[];
    notes?: string;
  }): WaitlistEntry {
    const id = `WL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Определяем приоритет (новые записи имеют низший приоритет)
    const existingCount = this.getEntriesForBranchAndType(
      data.branchCode,
      data.appointmentType
    ).length;

    const entry: WaitlistEntry = {
      id,
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      branchCode: data.branchCode,
      appointmentType: data.appointmentType,
      doctorId: data.doctorId,
      preferredDates: data.preferredDates,
      preferredTimeStart: data.preferredTimeStart,
      preferredTimeEnd: data.preferredTimeEnd,
      status: 'active',
      priority: existingCount + 1,
      notificationChannels: data.notificationChannels,
      createdAt: new Date(),
      notes: data.notes,
    };

    this.entries.set(id, entry);
    console.log('[Waitlist] Added entry:', id);

    return entry;
  }

  /**
   * Получение записей для филиала и типа приёма
   */
  getEntriesForBranchAndType(
    branchCode: BranchCode,
    appointmentType: AppointmentType,
    doctorId?: string
  ): WaitlistEntry[] {
    const result: WaitlistEntry[] = [];

    for (const entry of Array.from(this.entries.values())) {
      if (
        entry.status === 'active' &&
        entry.branchCode === branchCode &&
        entry.appointmentType === appointmentType &&
        (!doctorId || !entry.doctorId || entry.doctorId === doctorId)
      ) {
        result.push(entry);
      }
    }

    // Сортируем по приоритету
    return result.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Уведомление о появлении свободного слота
   */
  async notifyAvailableSlot(slot: AvailableSlot, branchCode: BranchCode, appointmentType: AppointmentType): Promise<number> {
    const entries = this.getEntriesForBranchAndType(branchCode, appointmentType, slot.doctorId);
    
    if (entries.length === 0) {
      return 0;
    }

    // Фильтруем по предпочтениям
    const matchingEntries = entries.filter(entry => {
      // Проверяем дату
      const slotDateStr = slot.date.toISOString().split('T')[0];
      const preferredDatesStr = entry.preferredDates.map(d => d.toISOString().split('T')[0]);
      
      if (preferredDatesStr.length > 0 && !preferredDatesStr.includes(slotDateStr)) {
        return false;
      }

      // Проверяем время
      if (entry.preferredTimeStart && slot.time < entry.preferredTimeStart) {
        return false;
      }
      if (entry.preferredTimeEnd && slot.time > entry.preferredTimeEnd) {
        return false;
      }

      return true;
    });

    // Уведомляем первых N человек
    const toNotify = matchingEntries.slice(0, this.config.maxNotificationsPerSlot);
    let notifiedCount = 0;

    for (const entry of toNotify) {
      const success = await this.sendNotification(entry, slot);
      if (success) {
        notifiedCount++;
      }
    }

    return notifiedCount;
  }

  /**
   * Отправка уведомления
   */
  private async sendNotification(entry: WaitlistEntry, slot: AvailableSlot): Promise<boolean> {
    const notificationId = `WN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.config.notificationValidityMinutes);

    // Пробуем отправить по всем каналам
    let sent = false;

    for (const channel of entry.notificationChannels) {
      try {
        if (this.sendNotificationCallback) {
          const success = await this.sendNotificationCallback(entry, slot, channel);
          if (success) {
            sent = true;
            break;
          }
        } else {
          // Mock отправка
          console.log(`[Waitlist] Mock notification to ${entry.patientPhone} via ${channel}`);
          sent = true;
          break;
        }
      } catch (error) {
        console.error(`[Waitlist] Failed to send via ${channel}:`, error);
      }
    }

    if (sent) {
      const notification: WaitlistNotification = {
        id: notificationId,
        waitlistEntryId: entry.id,
        slotDate: slot.date,
        slotTime: slot.time,
        doctorId: slot.doctorId,
        doctorName: slot.doctorName,
        channel: entry.notificationChannels[0],
        sentAt: new Date(),
        expiresAt,
      };

      this.notifications.set(notificationId, notification);

      // Обновляем статус записи
      entry.status = 'notified';
      entry.notifiedAt = new Date();
      entry.notificationExpiresAt = expiresAt;
      this.entries.set(entry.id, entry);

      console.log('[Waitlist] Notification sent:', notificationId);
    }

    return sent;
  }

  /**
   * Подтверждение записи из листа ожидания
   */
  confirmBooking(entryId: string, bookingId: string): boolean {
    const entry = this.entries.get(entryId);
    
    if (!entry || entry.status !== 'notified') {
      return false;
    }

    // Проверяем, не истекло ли уведомление
    if (entry.notificationExpiresAt && entry.notificationExpiresAt < new Date()) {
      entry.status = 'active'; // Возвращаем в активные
      entry.notifiedAt = undefined;
      entry.notificationExpiresAt = undefined;
      this.entries.set(entryId, entry);
      return false;
    }

    entry.status = 'booked';
    entry.bookedAt = new Date();
    entry.bookingId = bookingId;
    this.entries.set(entryId, entry);

    console.log('[Waitlist] Booking confirmed:', entryId, bookingId);
    return true;
  }

  /**
   * Отклонение предложенного слота
   */
  declineSlot(entryId: string): boolean {
    const entry = this.entries.get(entryId);
    
    if (!entry || entry.status !== 'notified') {
      return false;
    }

    // Понижаем приоритет (пациент отказался)
    entry.priority = Math.max(1, entry.priority + 2);
    entry.status = 'active';
    entry.notifiedAt = undefined;
    entry.notificationExpiresAt = undefined;
    this.entries.set(entryId, entry);

    console.log('[Waitlist] Slot declined:', entryId);
    return true;
  }

  /**
   * Отмена записи в листе ожидания
   */
  cancelEntry(entryId: string): boolean {
    const entry = this.entries.get(entryId);
    
    if (!entry) {
      return false;
    }

    entry.status = 'cancelled';
    this.entries.set(entryId, entry);

    console.log('[Waitlist] Entry cancelled:', entryId);
    return true;
  }

  /**
   * Получение записи по ID
   */
  getEntry(entryId: string): WaitlistEntry | null {
    return this.entries.get(entryId) || null;
  }

  /**
   * Получение записей пациента
   */
  getPatientEntries(patientId: string): WaitlistEntry[] {
    const result: WaitlistEntry[] = [];

    for (const entry of Array.from(this.entries.values())) {
      if (entry.patientId === patientId) {
        result.push(entry);
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Обновление приоритетов (вызывать периодически)
   */
  updatePriorities(): void {
    const now = new Date();
    const boostThreshold = new Date();
    boostThreshold.setDate(boostThreshold.getDate() - this.config.priorityBoostDays);

    for (const entry of Array.from(this.entries.values())) {
      if (entry.status !== 'active') continue;

      // Повышаем приоритет для давних записей
      if (entry.createdAt < boostThreshold) {
        entry.priority = Math.max(1, entry.priority - 1);
      }

      // Истекаем старые записи
      const expireThreshold = new Date();
      expireThreshold.setDate(expireThreshold.getDate() - this.config.autoExpireDays);
      
      if (entry.createdAt < expireThreshold) {
        entry.status = 'expired';
      }

      this.entries.set(entry.id, entry);
    }
  }

  /**
   * Обработка истёкших уведомлений
   */
  processExpiredNotifications(): number {
    const now = new Date();
    let count = 0;

    for (const entry of Array.from(this.entries.values())) {
      if (
        entry.status === 'notified' &&
        entry.notificationExpiresAt &&
        entry.notificationExpiresAt < now
      ) {
        // Возвращаем в активные с понижением приоритета
        entry.status = 'active';
        entry.priority = Math.max(1, entry.priority + 1);
        entry.notifiedAt = undefined;
        entry.notificationExpiresAt = undefined;
        this.entries.set(entry.id, entry);
        count++;
      }
    }

    return count;
  }

  /**
   * Получение статистики листа ожидания
   */
  getStatistics(branchCode?: BranchCode): {
    total: number;
    active: number;
    notified: number;
    booked: number;
    expired: number;
    byType: Record<string, number>;
  } {
    const stats = {
      total: 0,
      active: 0,
      notified: 0,
      booked: 0,
      expired: 0,
      byType: {} as Record<string, number>,
    };

    for (const entry of Array.from(this.entries.values())) {
      if (branchCode && entry.branchCode !== branchCode) continue;

      stats.total++;
      
      switch (entry.status) {
        case 'active': stats.active++; break;
        case 'notified': stats.notified++; break;
        case 'booked': stats.booked++; break;
        case 'expired': stats.expired++; break;
      }

      stats.byType[entry.appointmentType] = (stats.byType[entry.appointmentType] || 0) + 1;
    }

    return stats;
  }
}

// =============================================================================
// Express роутер
// =============================================================================

const router = Router();
const waitlistService = new WaitlistService();

/**
 * POST /api/waitlist/add
 * Добавление в лист ожидания
 */
router.post('/add', (req: Request, res: Response) => {
  try {
    const entry = waitlistService.addToWaitlist({
      patientId: req.body.patientId,
      patientName: req.body.patientName,
      patientPhone: req.body.patientPhone,
      branchCode: req.body.branchCode,
      appointmentType: req.body.appointmentType,
      doctorId: req.body.doctorId,
      preferredDates: (req.body.preferredDates || []).map((d: string) => new Date(d)),
      preferredTimeStart: req.body.preferredTimeStart,
      preferredTimeEnd: req.body.preferredTimeEnd,
      notificationChannels: req.body.notificationChannels || ['push', 'sms'],
      notes: req.body.notes,
    });

    res.json({
      success: true,
      entry,
      message: 'Вы добавлены в лист ожидания. Мы уведомим вас при появлении свободного времени.',
    });
  } catch (error) {
    console.error('[Waitlist] Add error:', error);
    res.status(500).json({ error: 'Ошибка добавления в лист ожидания' });
  }
});

/**
 * GET /api/waitlist/:id
 * Получение записи по ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const entry = waitlistService.getEntry(req.params.id);
  
  if (!entry) {
    return res.status(404).json({ error: 'Запись не найдена' });
  }

  res.json({ entry });
});

/**
 * GET /api/waitlist/patient/:patientId
 * Получение записей пациента
 */
router.get('/patient/:patientId', (req: Request, res: Response) => {
  const entries = waitlistService.getPatientEntries(req.params.patientId);
  res.json({ entries });
});

/**
 * POST /api/waitlist/:id/confirm
 * Подтверждение записи
 */
router.post('/:id/confirm', (req: Request, res: Response) => {
  const success = waitlistService.confirmBooking(req.params.id, req.body.bookingId);
  
  if (!success) {
    return res.status(400).json({ error: 'Не удалось подтвердить запись' });
  }

  res.json({ success: true });
});

/**
 * POST /api/waitlist/:id/decline
 * Отклонение предложенного слота
 */
router.post('/:id/decline', (req: Request, res: Response) => {
  const success = waitlistService.declineSlot(req.params.id);
  
  if (!success) {
    return res.status(400).json({ error: 'Не удалось отклонить слот' });
  }

  res.json({ success: true });
});

/**
 * DELETE /api/waitlist/:id
 * Отмена записи в листе ожидания
 */
router.delete('/:id', (req: Request, res: Response) => {
  const success = waitlistService.cancelEntry(req.params.id);
  
  if (!success) {
    return res.status(400).json({ error: 'Не удалось отменить запись' });
  }

  res.json({ success: true });
});

/**
 * POST /api/waitlist/notify-slot
 * Уведомление о появлении свободного слота (для внутреннего использования)
 */
router.post('/notify-slot', async (req: Request, res: Response) => {
  const { slot, branchCode, appointmentType } = req.body;

  const notifiedCount = await waitlistService.notifyAvailableSlot(
    {
      date: new Date(slot.date),
      time: slot.time,
      doctorId: slot.doctorId,
      doctorName: slot.doctorName,
      cabinetId: slot.cabinetId,
      duration: slot.duration,
    },
    branchCode,
    appointmentType
  );

  res.json({
    success: true,
    notifiedCount,
  });
});

/**
 * GET /api/waitlist/statistics
 * Получение статистики листа ожидания
 */
router.get('/statistics', (req: Request, res: Response) => {
  const branchCode = req.query.branchCode as BranchCode | undefined;
  const stats = waitlistService.getStatistics(branchCode);
  res.json({ statistics: stats });
});

export default router;
export { waitlistService };
