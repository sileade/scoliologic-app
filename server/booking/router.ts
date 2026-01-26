/**
 * API роутер для записи на приём
 * Обрабатывает запросы на запись с учётом бизнес-правил
 */

import { Router, Request, Response } from 'express';
import {
  BookingValidator,
  BookingRequest,
  ValidationResult,
  BranchCode,
  AppointmentType,
  BRANCH_RULES,
  BOOKING_LIMITS,
  getAllBranches,
  getBranchRules,
  getDoctorRestrictions,
} from './rules';

const router = Router();

// =============================================================================
// Типы
// =============================================================================

interface DailyStats {
  primaryCount: number;
  correctionCount: number;
  oneDayCount: number;
}

interface ExistingBooking {
  type: AppointmentType;
  date: Date;
  branchCode: BranchCode;
}

// In-memory хранилище (заменить на БД в production)
const bookings: Map<string, ExistingBooking[]> = new Map();
const dailyStatsCache: Map<string, DailyStats> = new Map();

// =============================================================================
// Эндпоинты
// =============================================================================

/**
 * GET /api/booking/branches
 * Получение списка филиалов с правилами
 */
router.get('/branches', (req: Request, res: Response) => {
  const branches = getAllBranches().map(branch => ({
    code: branch.branchCode,
    name: branch.branchName,
    hasXrayBooking: branch.hasXrayBooking,
    lfcPrepayment: branch.lfcPrepayment,
    onlineLfcAvailable: branch.onlineLfcAvailable,
    correctionCutoffTime: branch.correctionCutoffTime,
    maxOneDayPerDay: branch.maxOneDayPerDay,
  }));

  res.json({ branches });
});

/**
 * GET /api/booking/branch/:code/rules
 * Получение правил конкретного филиала
 */
router.get('/branch/:code/rules', (req: Request, res: Response) => {
  const branchCode = req.params.code.toUpperCase() as BranchCode;
  
  if (!BRANCH_RULES[branchCode]) {
    return res.status(404).json({ error: 'Филиал не найден' });
  }

  const rules = getBranchRules(branchCode);
  res.json({ rules });
});

/**
 * GET /api/booking/doctor/:id/restrictions
 * Получение ограничений врача
 */
router.get('/doctor/:id/restrictions', (req: Request, res: Response) => {
  const doctorId = req.params.id;
  const restrictions = getDoctorRestrictions(doctorId);

  if (!restrictions) {
    return res.json({ restrictions: null, message: 'Ограничений не найдено' });
  }

  res.json({ restrictions });
});

/**
 * POST /api/booking/validate
 * Валидация запроса на запись
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const bookingRequest: BookingRequest = {
      patientId: req.body.patientId,
      branchCode: req.body.branchCode,
      appointmentType: req.body.appointmentType,
      doctorId: req.body.doctorId,
      cabinetId: req.body.cabinetId,
      requestedDate: new Date(req.body.requestedDate),
      requestedTime: req.body.requestedTime,
      diagnosis: req.body.diagnosis,
      hasXrayReferral: req.body.hasXrayReferral,
      xrayReferralDate: req.body.xrayReferralDate ? new Date(req.body.xrayReferralDate) : undefined,
      hasCorsetOrder: req.body.hasCorsetOrder,
      previousLfcCourse: req.body.previousLfcCourse,
      isPatientOfDoctor: req.body.isPatientOfDoctor,
      citoPatient: req.body.citoPatient,
    };

    // Получаем существующие записи пациента
    const existingBookings = bookings.get(bookingRequest.patientId) || [];

    // Получаем статистику на день
    const dateKey = `${bookingRequest.branchCode}-${bookingRequest.requestedDate.toISOString().split('T')[0]}`;
    const dailyStats = dailyStatsCache.get(dateKey) || {
      primaryCount: 0,
      correctionCount: 0,
      oneDayCount: 0,
    };

    // Валидация
    const validator = new BookingValidator(bookingRequest.branchCode, bookingRequest.doctorId);
    const result = await validator.validate(bookingRequest, existingBookings, dailyStats);

    res.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      suggestions: result.suggestions,
      requiresPrepayment: result.requiresPrepayment,
      suggestLfc: result.suggestLfc,
      deliveryDate: result.deliveryDate,
      deliveryTime: result.deliveryTime,
      appointmentDuration: validator.getAppointmentDuration(bookingRequest.appointmentType),
    });
  } catch (error) {
    console.error('[Booking] Validation error:', error);
    res.status(500).json({ error: 'Ошибка валидации' });
  }
});

/**
 * POST /api/booking/create
 * Создание записи на приём
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const bookingRequest: BookingRequest = {
      patientId: req.body.patientId,
      branchCode: req.body.branchCode,
      appointmentType: req.body.appointmentType,
      doctorId: req.body.doctorId,
      cabinetId: req.body.cabinetId,
      requestedDate: new Date(req.body.requestedDate),
      requestedTime: req.body.requestedTime,
      diagnosis: req.body.diagnosis,
      hasXrayReferral: req.body.hasXrayReferral,
      xrayReferralDate: req.body.xrayReferralDate ? new Date(req.body.xrayReferralDate) : undefined,
      hasCorsetOrder: req.body.hasCorsetOrder,
      previousLfcCourse: req.body.previousLfcCourse,
      isPatientOfDoctor: req.body.isPatientOfDoctor,
      citoPatient: req.body.citoPatient,
    };

    // Валидация перед созданием
    const existingBookings = bookings.get(bookingRequest.patientId) || [];
    const dateKey = `${bookingRequest.branchCode}-${bookingRequest.requestedDate.toISOString().split('T')[0]}`;
    const dailyStats = dailyStatsCache.get(dateKey) || {
      primaryCount: 0,
      correctionCount: 0,
      oneDayCount: 0,
    };

    const validator = new BookingValidator(bookingRequest.branchCode, bookingRequest.doctorId);
    const validation = await validator.validate(bookingRequest, existingBookings, dailyStats);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Запись невозможна',
        errors: validation.errors,
      });
    }

    // Проверка предоплаты
    if (validation.requiresPrepayment && !req.body.prepaymentConfirmed) {
      return res.status(402).json({
        error: 'Требуется предоплата',
        requiresPrepayment: true,
        message: 'Для записи необходимо произвести предоплату',
      });
    }

    // Создание записи
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Сохраняем запись
    const newBooking: ExistingBooking = {
      type: bookingRequest.appointmentType,
      date: bookingRequest.requestedDate,
      branchCode: bookingRequest.branchCode,
    };

    const patientBookings = bookings.get(bookingRequest.patientId) || [];
    patientBookings.push(newBooking);
    bookings.set(bookingRequest.patientId, patientBookings);

    // Обновляем статистику дня
    const updatedStats = { ...dailyStats };
    if (bookingRequest.appointmentType === 'primary') updatedStats.primaryCount++;
    if (bookingRequest.appointmentType === 'correction') updatedStats.correctionCount++;
    if (bookingRequest.appointmentType === 'one_day') updatedStats.oneDayCount++;
    dailyStatsCache.set(dateKey, updatedStats);

    res.json({
      success: true,
      bookingId,
      message: 'Запись успешно создана',
      warnings: validation.warnings,
      suggestions: validation.suggestions,
      deliveryDate: validation.deliveryDate,
      deliveryTime: validation.deliveryTime,
    });
  } catch (error) {
    console.error('[Booking] Create error:', error);
    res.status(500).json({ error: 'Ошибка создания записи' });
  }
});

/**
 * GET /api/booking/patient/:id/bookings
 * Получение записей пациента
 */
router.get('/patient/:id/bookings', (req: Request, res: Response) => {
  const patientId = req.params.id;
  const patientBookings = bookings.get(patientId) || [];

  res.json({
    bookings: patientBookings.map((b, index) => ({
      id: `${patientId}-${index}`,
      type: b.type,
      date: b.date,
      branchCode: b.branchCode,
    })),
    limits: {
      maxActivePerService: BOOKING_LIMITS.maxActiveBookingsPerService,
      maxLfc: BOOKING_LIMITS.maxLfcBookings,
    },
  });
});

/**
 * DELETE /api/booking/:id
 * Отмена записи
 */
router.delete('/:id', (req: Request, res: Response) => {
  const bookingId = req.params.id;
  
  // TODO: Реализовать отмену записи
  res.json({
    success: true,
    message: 'Запись отменена',
  });
});

/**
 * GET /api/booking/limits
 * Получение лимитов записи
 */
router.get('/limits', (req: Request, res: Response) => {
  res.json({
    limits: BOOKING_LIMITS,
  });
});

export default router;
