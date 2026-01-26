/**
 * Система контроля рентгена
 * Управление направлениями, записью и контролем рентгенограмм
 */

import { Router, Request, Response } from 'express';
import { BranchCode, BRANCH_RULES, BOOKING_LIMITS } from '../booking/rules';

// =============================================================================
// Типы и интерфейсы
// =============================================================================

export type XrayReferralStatus = 'active' | 'used' | 'expired' | 'cancelled';
export type XrayType = 'spine_full' | 'spine_lateral' | 'spine_ap' | 'pelvis' | 'other';

export interface XrayReferral {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  branchCode: BranchCode;
  xrayType: XrayType;
  diagnosis: string;
  clinicalQuestion: string;    // Клинический вопрос
  status: XrayReferralStatus;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  bookingId?: string;
  notes?: string;
  // Данные для печати
  referralNumber: string;
  hasStamp: boolean;
  hasSignature: boolean;
}

export interface XrayBooking {
  id: string;
  referralId: string;
  patientId: string;
  branchCode: BranchCode;
  scheduledDate: Date;
  scheduledTime: string;
  cabinetId?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  createdAt: Date;
  completedAt?: Date;
  resultId?: string;
}

export interface XrayResult {
  id: string;
  bookingId: string;
  patientId: string;
  xrayType: XrayType;
  performedAt: Date;
  radiologistId?: string;
  radiologistName?: string;
  findings?: string;
  conclusion?: string;
  cobbAngle?: number;          // Угол Кобба для сколиоза
  rotationDegree?: number;     // Степень ротации
  risserSign?: number;         // Тест Риссера (0-5)
  imageUrls: string[];
  dicomStudyId?: string;
  notes?: string;
}

export interface XrayReminder {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  lastXrayDate: Date;
  nextXrayDate: Date;
  reminderSentAt?: Date;
  status: 'pending' | 'sent' | 'booked' | 'dismissed';
}

// =============================================================================
// Конфигурация рентгена по филиалам
// =============================================================================

export interface XrayBranchConfig {
  branchCode: BranchCode;
  hasOwnXray: boolean;           // Есть свой рентген-кабинет
  requiresReferral: boolean;     // Требуется направление
  referralValidDays: number;     // Срок действия направления
  workingHours: {
    start: string;
    end: string;
  };
  slotDuration: number;          // Длительность слота в минутах
  maxSlotsPerDay: number;
  partnerClinics?: string[];     // Партнёрские клиники для рентгена
}

export const XRAY_CONFIG: Record<BranchCode, XrayBranchConfig> = {
  MSK: {
    branchCode: 'MSK',
    hasOwnXray: true,
    requiresReferral: true,
    referralValidDays: 30,
    workingHours: { start: '09:00', end: '18:00' },
    slotDuration: 15,
    maxSlotsPerDay: 20,
  },
  SPB: {
    branchCode: 'SPB',
    hasOwnXray: true,
    requiresReferral: true,
    referralValidDays: 30,
    workingHours: { start: '09:00', end: '18:00' },
    slotDuration: 15,
    maxSlotsPerDay: 20,
  },
  NSK: {
    branchCode: 'NSK',
    hasOwnXray: false,
    requiresReferral: false,
    referralValidDays: 30,
    workingHours: { start: '09:00', end: '17:00' },
    slotDuration: 15,
    maxSlotsPerDay: 0,
    partnerClinics: ['Клиника А', 'Клиника Б'],
  },
  EKB: {
    branchCode: 'EKB',
    hasOwnXray: false,
    requiresReferral: false,
    referralValidDays: 30,
    workingHours: { start: '09:00', end: '17:00' },
    slotDuration: 15,
    maxSlotsPerDay: 0,
    partnerClinics: ['Клиника В'],
  },
  UFA: {
    branchCode: 'UFA',
    hasOwnXray: false,
    requiresReferral: false,
    referralValidDays: 30,
    workingHours: { start: '09:00', end: '17:00' },
    slotDuration: 15,
    maxSlotsPerDay: 0,
    partnerClinics: ['Клиника Г'],
  },
};

// =============================================================================
// Сервис контроля рентгена
// =============================================================================

export class XrayService {
  private referrals: Map<string, XrayReferral> = new Map();
  private bookings: Map<string, XrayBooking> = new Map();
  private results: Map<string, XrayResult> = new Map();
  private reminders: Map<string, XrayReminder> = new Map();
  private referralCounter = 1000;

  /**
   * Создание направления на рентген
   */
  createReferral(data: {
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    branchCode: BranchCode;
    xrayType: XrayType;
    diagnosis: string;
    clinicalQuestion: string;
    notes?: string;
  }): XrayReferral {
    const config = XRAY_CONFIG[data.branchCode];
    const id = `XR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.referralValidDays);

    const referral: XrayReferral = {
      id,
      patientId: data.patientId,
      patientName: data.patientName,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      branchCode: data.branchCode,
      xrayType: data.xrayType,
      diagnosis: data.diagnosis,
      clinicalQuestion: data.clinicalQuestion,
      status: 'active',
      createdAt: new Date(),
      expiresAt,
      notes: data.notes,
      referralNumber: `РН-${++this.referralCounter}`,
      hasStamp: true,
      hasSignature: true,
    };

    this.referrals.set(id, referral);
    console.log('[Xray] Referral created:', id);

    return referral;
  }

  /**
   * Проверка валидности направления
   */
  validateReferral(referralId: string): {
    valid: boolean;
    error?: string;
    referral?: XrayReferral;
  } {
    const referral = this.referrals.get(referralId);

    if (!referral) {
      return { valid: false, error: 'Направление не найдено' };
    }

    if (referral.status !== 'active') {
      return { valid: false, error: `Направление ${referral.status === 'used' ? 'уже использовано' : 'недействительно'}` };
    }

    if (referral.expiresAt < new Date()) {
      referral.status = 'expired';
      this.referrals.set(referralId, referral);
      return { valid: false, error: 'Срок действия направления истёк' };
    }

    if (!referral.hasStamp || !referral.hasSignature) {
      return { valid: false, error: 'Направление должно иметь подпись врача и печать' };
    }

    return { valid: true, referral };
  }

  /**
   * Запись на рентген
   */
  bookXray(data: {
    referralId: string;
    patientId: string;
    branchCode: BranchCode;
    scheduledDate: Date;
    scheduledTime: string;
    cabinetId?: string;
  }): { success: boolean; booking?: XrayBooking; error?: string } {
    const config = XRAY_CONFIG[data.branchCode];

    // Проверяем, есть ли рентген в филиале
    if (!config.hasOwnXray) {
      return {
        success: false,
        error: `В филиале нет рентген-кабинета. Партнёрские клиники: ${config.partnerClinics?.join(', ')}`,
      };
    }

    // Проверяем направление
    if (config.requiresReferral) {
      const validation = this.validateReferral(data.referralId);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    // Проверяем время
    if (data.scheduledTime < config.workingHours.start || data.scheduledTime > config.workingHours.end) {
      return {
        success: false,
        error: `Рентген работает с ${config.workingHours.start} до ${config.workingHours.end}`,
      };
    }

    // Проверяем количество записей на день
    const dateStr = data.scheduledDate.toISOString().split('T')[0];
    const dayBookings = Array.from(this.bookings.values()).filter(
      b => b.branchCode === data.branchCode &&
           b.scheduledDate.toISOString().split('T')[0] === dateStr &&
           b.status === 'scheduled'
    );

    if (dayBookings.length >= config.maxSlotsPerDay) {
      return { success: false, error: 'Все слоты на этот день заняты' };
    }

    // Создаём запись
    const id = `XB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const booking: XrayBooking = {
      id,
      referralId: data.referralId,
      patientId: data.patientId,
      branchCode: data.branchCode,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      cabinetId: data.cabinetId,
      status: 'scheduled',
      createdAt: new Date(),
    };

    this.bookings.set(id, booking);

    // Помечаем направление как использованное
    const referral = this.referrals.get(data.referralId);
    if (referral) {
      referral.status = 'used';
      referral.usedAt = new Date();
      referral.bookingId = id;
      this.referrals.set(data.referralId, referral);
    }

    console.log('[Xray] Booking created:', id);
    return { success: true, booking };
  }

  /**
   * Получение доступных слотов для записи
   */
  getAvailableSlots(branchCode: BranchCode, date: Date): string[] {
    const config = XRAY_CONFIG[branchCode];

    if (!config.hasOwnXray) {
      return [];
    }

    const dateStr = date.toISOString().split('T')[0];
    const bookedTimes = Array.from(this.bookings.values())
      .filter(
        b => b.branchCode === branchCode &&
             b.scheduledDate.toISOString().split('T')[0] === dateStr &&
             b.status === 'scheduled'
      )
      .map(b => b.scheduledTime);

    const slots: string[] = [];
    let currentTime = config.workingHours.start;

    while (currentTime < config.workingHours.end) {
      if (!bookedTimes.includes(currentTime)) {
        slots.push(currentTime);
      }

      // Добавляем длительность слота
      const [hours, minutes] = currentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + config.slotDuration;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }

    return slots;
  }

  /**
   * Сохранение результата рентгена
   */
  saveResult(data: {
    bookingId: string;
    patientId: string;
    xrayType: XrayType;
    radiologistId?: string;
    radiologistName?: string;
    findings?: string;
    conclusion?: string;
    cobbAngle?: number;
    rotationDegree?: number;
    risserSign?: number;
    imageUrls: string[];
    dicomStudyId?: string;
    notes?: string;
  }): XrayResult {
    const id = `XRS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result: XrayResult = {
      id,
      bookingId: data.bookingId,
      patientId: data.patientId,
      xrayType: data.xrayType,
      performedAt: new Date(),
      radiologistId: data.radiologistId,
      radiologistName: data.radiologistName,
      findings: data.findings,
      conclusion: data.conclusion,
      cobbAngle: data.cobbAngle,
      rotationDegree: data.rotationDegree,
      risserSign: data.risserSign,
      imageUrls: data.imageUrls,
      dicomStudyId: data.dicomStudyId,
      notes: data.notes,
    };

    this.results.set(id, result);

    // Обновляем статус записи
    const booking = this.bookings.get(data.bookingId);
    if (booking) {
      booking.status = 'completed';
      booking.completedAt = new Date();
      booking.resultId = id;
      this.bookings.set(data.bookingId, booking);
    }

    console.log('[Xray] Result saved:', id);
    return result;
  }

  /**
   * Получение истории рентгенов пациента
   */
  getPatientHistory(patientId: string): XrayResult[] {
    const results: XrayResult[] = [];

    for (const result of Array.from(this.results.values())) {
      if (result.patientId === patientId) {
        results.push(result);
      }
    }

    return results.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  /**
   * Создание напоминания о контрольном рентгене
   */
  createReminder(data: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    lastXrayDate: Date;
    intervalMonths: number;
  }): XrayReminder {
    const id = `XRM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const nextXrayDate = new Date(data.lastXrayDate);
    nextXrayDate.setMonth(nextXrayDate.getMonth() + data.intervalMonths);

    const reminder: XrayReminder = {
      id,
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      lastXrayDate: data.lastXrayDate,
      nextXrayDate,
      status: 'pending',
    };

    this.reminders.set(id, reminder);
    console.log('[Xray] Reminder created:', id);

    return reminder;
  }

  /**
   * Получение напоминаний для отправки
   */
  getPendingReminders(): XrayReminder[] {
    const now = new Date();
    const reminderThreshold = new Date();
    reminderThreshold.setDate(reminderThreshold.getDate() + 7); // За неделю до

    const pending: XrayReminder[] = [];

    for (const reminder of Array.from(this.reminders.values())) {
      if (
        reminder.status === 'pending' &&
        reminder.nextXrayDate <= reminderThreshold &&
        reminder.nextXrayDate >= now
      ) {
        pending.push(reminder);
      }
    }

    return pending;
  }

  /**
   * Анализ динамики угла Кобба
   */
  analyzeCobbAngleProgress(patientId: string): {
    history: { date: Date; angle: number }[];
    trend: 'improving' | 'stable' | 'worsening' | 'unknown';
    recommendation?: string;
  } {
    const results = this.getPatientHistory(patientId)
      .filter(r => r.cobbAngle !== undefined)
      .map(r => ({ date: r.performedAt, angle: r.cobbAngle! }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (results.length < 2) {
      return { history: results, trend: 'unknown' };
    }

    // Анализируем тренд
    const firstAngle = results[0].angle;
    const lastAngle = results[results.length - 1].angle;
    const difference = lastAngle - firstAngle;

    let trend: 'improving' | 'stable' | 'worsening';
    let recommendation: string | undefined;

    if (difference < -5) {
      trend = 'improving';
      recommendation = 'Положительная динамика. Продолжайте лечение.';
    } else if (difference > 5) {
      trend = 'worsening';
      recommendation = 'Отрицательная динамика. Рекомендуется консультация врача для коррекции лечения.';
    } else {
      trend = 'stable';
      recommendation = 'Стабильное состояние. Продолжайте наблюдение.';
    }

    return { history: results, trend, recommendation };
  }

  /**
   * Получение направления по ID
   */
  getReferral(referralId: string): XrayReferral | null {
    return this.referrals.get(referralId) || null;
  }

  /**
   * Получение направлений пациента
   */
  getPatientReferrals(patientId: string): XrayReferral[] {
    const result: XrayReferral[] = [];

    for (const referral of Array.from(this.referrals.values())) {
      if (referral.patientId === patientId) {
        result.push(referral);
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Получение конфигурации рентгена для филиала
   */
  getBranchConfig(branchCode: BranchCode): XrayBranchConfig {
    return XRAY_CONFIG[branchCode];
  }
}

// =============================================================================
// Express роутер
// =============================================================================

const router = Router();
const xrayService = new XrayService();

/**
 * GET /api/xray/config/:branchCode
 * Получение конфигурации рентгена для филиала
 */
router.get('/config/:branchCode', (req: Request, res: Response) => {
  const branchCode = req.params.branchCode.toUpperCase() as BranchCode;
  const config = xrayService.getBranchConfig(branchCode);
  
  if (!config) {
    return res.status(404).json({ error: 'Филиал не найден' });
  }

  res.json({ config });
});

/**
 * POST /api/xray/referral
 * Создание направления на рентген
 */
router.post('/referral', (req: Request, res: Response) => {
  try {
    const referral = xrayService.createReferral({
      patientId: req.body.patientId,
      patientName: req.body.patientName,
      doctorId: req.body.doctorId,
      doctorName: req.body.doctorName,
      branchCode: req.body.branchCode,
      xrayType: req.body.xrayType,
      diagnosis: req.body.diagnosis,
      clinicalQuestion: req.body.clinicalQuestion,
      notes: req.body.notes,
    });

    res.json({
      success: true,
      referral,
      message: `Направление ${referral.referralNumber} создано. Действительно до ${referral.expiresAt.toLocaleDateString('ru-RU')}.`,
    });
  } catch (error) {
    console.error('[Xray] Create referral error:', error);
    res.status(500).json({ error: 'Ошибка создания направления' });
  }
});

/**
 * GET /api/xray/referral/:id
 * Получение направления
 */
router.get('/referral/:id', (req: Request, res: Response) => {
  const referral = xrayService.getReferral(req.params.id);
  
  if (!referral) {
    return res.status(404).json({ error: 'Направление не найдено' });
  }

  res.json({ referral });
});

/**
 * GET /api/xray/referral/:id/validate
 * Проверка валидности направления
 */
router.get('/referral/:id/validate', (req: Request, res: Response) => {
  const validation = xrayService.validateReferral(req.params.id);
  res.json(validation);
});

/**
 * GET /api/xray/patient/:patientId/referrals
 * Получение направлений пациента
 */
router.get('/patient/:patientId/referrals', (req: Request, res: Response) => {
  const referrals = xrayService.getPatientReferrals(req.params.patientId);
  res.json({ referrals });
});

/**
 * GET /api/xray/slots/:branchCode/:date
 * Получение доступных слотов
 */
router.get('/slots/:branchCode/:date', (req: Request, res: Response) => {
  const branchCode = req.params.branchCode.toUpperCase() as BranchCode;
  const date = new Date(req.params.date);
  
  const slots = xrayService.getAvailableSlots(branchCode, date);
  res.json({ slots });
});

/**
 * POST /api/xray/book
 * Запись на рентген
 */
router.post('/book', (req: Request, res: Response) => {
  const result = xrayService.bookXray({
    referralId: req.body.referralId,
    patientId: req.body.patientId,
    branchCode: req.body.branchCode,
    scheduledDate: new Date(req.body.scheduledDate),
    scheduledTime: req.body.scheduledTime,
    cabinetId: req.body.cabinetId,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    success: true,
    booking: result.booking,
  });
});

/**
 * POST /api/xray/result
 * Сохранение результата рентгена
 */
router.post('/result', (req: Request, res: Response) => {
  try {
    const result = xrayService.saveResult({
      bookingId: req.body.bookingId,
      patientId: req.body.patientId,
      xrayType: req.body.xrayType,
      radiologistId: req.body.radiologistId,
      radiologistName: req.body.radiologistName,
      findings: req.body.findings,
      conclusion: req.body.conclusion,
      cobbAngle: req.body.cobbAngle,
      rotationDegree: req.body.rotationDegree,
      risserSign: req.body.risserSign,
      imageUrls: req.body.imageUrls || [],
      dicomStudyId: req.body.dicomStudyId,
      notes: req.body.notes,
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('[Xray] Save result error:', error);
    res.status(500).json({ error: 'Ошибка сохранения результата' });
  }
});

/**
 * GET /api/xray/patient/:patientId/history
 * Получение истории рентгенов пациента
 */
router.get('/patient/:patientId/history', (req: Request, res: Response) => {
  const history = xrayService.getPatientHistory(req.params.patientId);
  res.json({ history });
});

/**
 * GET /api/xray/patient/:patientId/cobb-analysis
 * Анализ динамики угла Кобба
 */
router.get('/patient/:patientId/cobb-analysis', (req: Request, res: Response) => {
  const analysis = xrayService.analyzeCobbAngleProgress(req.params.patientId);
  res.json(analysis);
});

/**
 * POST /api/xray/reminder
 * Создание напоминания о контрольном рентгене
 */
router.post('/reminder', (req: Request, res: Response) => {
  try {
    const reminder = xrayService.createReminder({
      patientId: req.body.patientId,
      patientName: req.body.patientName,
      patientPhone: req.body.patientPhone,
      lastXrayDate: new Date(req.body.lastXrayDate),
      intervalMonths: req.body.intervalMonths || 6,
    });

    res.json({ success: true, reminder });
  } catch (error) {
    console.error('[Xray] Create reminder error:', error);
    res.status(500).json({ error: 'Ошибка создания напоминания' });
  }
});

/**
 * GET /api/xray/reminders/pending
 * Получение напоминаний для отправки
 */
router.get('/reminders/pending', (req: Request, res: Response) => {
  const reminders = xrayService.getPendingReminders();
  res.json({ reminders });
});

export default router;
export { xrayService };
