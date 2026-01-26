/**
 * Бизнес-правила для записи на приём
 * Система валидации и ограничений записи по филиалам и типам приёмов
 */

// =============================================================================
// Типы и интерфейсы
// =============================================================================

export type BranchCode = 'MSK' | 'SPB' | 'NSK' | 'EKB' | 'UFA';

export type AppointmentType = 
  | 'primary'           // Первичный приём
  | 'correction'        // Коррекция
  | 'one_day'           // Однодневка (изготовление корсета за 1 день)
  | 'four_day'          // Корсет за 4 дня
  | 'lfc'               // ЛФК
  | 'lfc_online'        // Онлайн ЛФК
  | 'online_consult'    // Онлайн консультация ортопеда
  | 'xray'              // Рентген
  | 'psychologist'      // Психолог
  | 'orthosis_delivery' // Выдача ортеза
  | 'seas';             // SEAS методика

export interface BookingRequest {
  patientId: string;
  branchCode: BranchCode;
  appointmentType: AppointmentType;
  doctorId?: string;
  cabinetId?: string;
  requestedDate: Date;
  requestedTime: string; // HH:mm
  diagnosis?: string;
  hasXrayReferral?: boolean;
  xrayReferralDate?: Date;
  hasCorsetOrder?: boolean;
  previousLfcCourse?: boolean;
  isPatientOfDoctor?: boolean; // Является ли пациентом данного врача
  citoPatient?: boolean; // Пациент из ЦИТО
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  requiresPrepayment: boolean;
  suggestLfc: boolean;
  deliveryDate?: Date;
  deliveryTime?: string;
}

export interface BranchRules {
  branchCode: BranchCode;
  branchName: string;
  primaryDuration: number; // минуты
  otherDuration: number;
  maxPrimaryPerDay: number;
  maxCorrectionsOnSaturday: number;
  correctionCutoffTime: string; // HH:mm
  maxOneDayPerDay: number;
  oneDaySameDayCutoff: string; // HH:mm - до этого времени выдача в тот же день
  hasXrayBooking: boolean;
  requiresXrayReferral: boolean;
  lfcPrepayment: boolean;
  onlineLfcAvailable: boolean;
  seasOnly: boolean;
}

export interface DoctorRestrictions {
  doctorId: string;
  doctorName: string;
  noCorrections: boolean;
  correctionsOnlyForOwnPatients: boolean;
  noOrthosis: boolean;
  orthosisOnlyForCitoPatients: boolean;
  noFreeConsultKmn: boolean; // Нельзя направления на бесплатную консультацию к к.м.н.
}

// =============================================================================
// Конфигурация правил по филиалам
// =============================================================================

export const BRANCH_RULES: Record<BranchCode, BranchRules> = {
  MSK: {
    branchCode: 'MSK',
    branchName: 'Москва',
    primaryDuration: 60,
    otherDuration: 30,
    maxPrimaryPerDay: 4,
    maxCorrectionsOnSaturday: 5,
    correctionCutoffTime: '16:00',
    maxOneDayPerDay: 1,
    oneDaySameDayCutoff: '11:00',
    hasXrayBooking: true,
    requiresXrayReferral: true,
    lfcPrepayment: true,
    onlineLfcAvailable: false,
    seasOnly: false,
  },
  SPB: {
    branchCode: 'SPB',
    branchName: 'Санкт-Петербург',
    primaryDuration: 60,
    otherDuration: 30,
    maxPrimaryPerDay: 4,
    maxCorrectionsOnSaturday: 5,
    correctionCutoffTime: '16:30',
    maxOneDayPerDay: 4,
    oneDaySameDayCutoff: '11:00',
    hasXrayBooking: true,
    requiresXrayReferral: true,
    lfcPrepayment: true,
    onlineLfcAvailable: true,
    seasOnly: true, // Онлайн ЛФК только SEAS
  },
  NSK: {
    branchCode: 'NSK',
    branchName: 'Новосибирск',
    primaryDuration: 60,
    otherDuration: 30,
    maxPrimaryPerDay: 4,
    maxCorrectionsOnSaturday: 5,
    correctionCutoffTime: '16:00',
    maxOneDayPerDay: 2,
    oneDaySameDayCutoff: '11:00',
    hasXrayBooking: false, // В НСК на рентген отдельно записи нет
    requiresXrayReferral: false,
    lfcPrepayment: false,
    onlineLfcAvailable: false,
    seasOnly: false,
  },
  EKB: {
    branchCode: 'EKB',
    branchName: 'Екатеринбург',
    primaryDuration: 60,
    otherDuration: 30,
    maxPrimaryPerDay: 4,
    maxCorrectionsOnSaturday: 5,
    correctionCutoffTime: '16:00',
    maxOneDayPerDay: 2,
    oneDaySameDayCutoff: '11:00',
    hasXrayBooking: false,
    requiresXrayReferral: false,
    lfcPrepayment: false,
    onlineLfcAvailable: false,
    seasOnly: false,
  },
  UFA: {
    branchCode: 'UFA',
    branchName: 'Уфа',
    primaryDuration: 60,
    otherDuration: 30,
    maxPrimaryPerDay: 4,
    maxCorrectionsOnSaturday: 5,
    correctionCutoffTime: '16:00',
    maxOneDayPerDay: 2,
    oneDaySameDayCutoff: '11:00',
    hasXrayBooking: false,
    requiresXrayReferral: false,
    lfcPrepayment: false,
    onlineLfcAvailable: false,
    seasOnly: false,
  },
};

// =============================================================================
// Ограничения врачей
// =============================================================================

export const DOCTOR_RESTRICTIONS: DoctorRestrictions[] = [
  {
    doctorId: 'tulyakova',
    doctorName: 'Тулякова',
    noCorrections: true,
    correctionsOnlyForOwnPatients: true,
    noOrthosis: false,
    orthosisOnlyForCitoPatients: false,
    noFreeConsultKmn: false,
  },
  {
    doctorId: 'makarova',
    doctorName: 'Макарова',
    noCorrections: false,
    correctionsOnlyForOwnPatients: false,
    noOrthosis: true,
    orthosisOnlyForCitoPatients: true,
    noFreeConsultKmn: false,
  },
];

// =============================================================================
// Лимиты записи
// =============================================================================

export const BOOKING_LIMITS = {
  maxActiveBookingsPerService: 1, // Не более 1 активной записи на одну услугу
  maxLfcBookings: 5,              // ЛФК не более 5 занятий
  xrayReferralValidDays: 30,      // Направление на рентген действительно 30 дней
  waitlistNotificationMinutes: 15, // Срок действия уведомления из листа ожидания
  waitlistNotificationMaxMinutes: 30,
};

// =============================================================================
// Класс валидации записи
// =============================================================================

export class BookingValidator {
  private branchRules: BranchRules;
  private doctorRestrictions?: DoctorRestrictions;

  constructor(branchCode: BranchCode, doctorId?: string) {
    this.branchRules = BRANCH_RULES[branchCode];
    if (doctorId) {
      this.doctorRestrictions = DOCTOR_RESTRICTIONS.find(d => d.doctorId === doctorId);
    }
  }

  /**
   * Полная валидация запроса на запись
   */
  async validate(
    request: BookingRequest,
    existingBookings: { type: AppointmentType; date: Date }[],
    dailyStats: { primaryCount: number; correctionCount: number; oneDayCount: number }
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      requiresPrepayment: false,
      suggestLfc: false,
    };

    // 1. Проверка лимитов активных записей
    this.validateActiveBookings(request, existingBookings, result);

    // 2. Проверка правил филиала
    this.validateBranchRules(request, dailyStats, result);

    // 3. Проверка ограничений врача
    this.validateDoctorRestrictions(request, result);

    // 4. Проверка специфичных правил по типу приёма
    this.validateAppointmentTypeRules(request, result);

    // 5. Проверка рентгена
    this.validateXrayRules(request, result);

    // 6. Проверка предоплаты
    this.checkPrepaymentRequirements(request, result);

    // 7. Предложение ЛФК для сколиоза
    this.checkLfcSuggestion(request, result);

    // 8. Расчёт даты выдачи корсета
    this.calculateDeliveryDate(request, result);

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Проверка лимитов активных записей
   */
  private validateActiveBookings(
    request: BookingRequest,
    existingBookings: { type: AppointmentType; date: Date }[],
    result: ValidationResult
  ): void {
    // ЛФК - особые правила
    if (request.appointmentType === 'lfc' || request.appointmentType === 'lfc_online') {
      const lfcCount = existingBookings.filter(
        b => b.type === 'lfc' || b.type === 'lfc_online'
      ).length;
      
      if (lfcCount >= BOOKING_LIMITS.maxLfcBookings) {
        result.errors.push(
          `Превышен лимит записей на ЛФК. Максимум ${BOOKING_LIMITS.maxLfcBookings} занятий.`
        );
      }
      return;
    }

    // Для остальных услуг - не более 1 активной записи
    const sameTypeBookings = existingBookings.filter(
      b => b.type === request.appointmentType && b.date > new Date()
    );

    if (sameTypeBookings.length >= BOOKING_LIMITS.maxActiveBookingsPerService) {
      result.errors.push(
        `У вас уже есть активная запись на данную услугу. ` +
        `Отмените существующую запись перед созданием новой.`
      );
    }

    // Проверка на записи в разных филиалах
    const otherBranchBookings = existingBookings.filter(
      b => b.type === request.appointmentType && b.date > new Date()
    );

    if (otherBranchBookings.length > 0) {
      result.warnings.push(
        `Обнаружены записи на эту же услугу в других филиалах. ` +
        `Пожалуйста, убедитесь, что вам нужны все записи.`
      );
    }
  }

  /**
   * Проверка правил филиала
   */
  private validateBranchRules(
    request: BookingRequest,
    dailyStats: { primaryCount: number; correctionCount: number; oneDayCount: number },
    result: ValidationResult
  ): void {
    const rules = this.branchRules;
    const requestTime = request.requestedTime;
    const requestDate = request.requestedDate;
    const isSaturday = requestDate.getDay() === 6;

    // Проверка лимита первичек
    if (request.appointmentType === 'primary') {
      if (dailyStats.primaryCount >= rules.maxPrimaryPerDay) {
        result.errors.push(
          `Превышен лимит первичных приёмов на этот день (максимум ${rules.maxPrimaryPerDay}).`
        );
      }
    }

    // Проверка коррекций
    if (request.appointmentType === 'correction') {
      // Время окончания коррекций
      if (requestTime > rules.correctionCutoffTime) {
        result.errors.push(
          `Коррекции в ${rules.branchName} возможны только до ${rules.correctionCutoffTime}.`
        );
      }

      // Лимит коррекций по субботам
      if (isSaturday && dailyStats.correctionCount >= rules.maxCorrectionsOnSaturday) {
        result.errors.push(
          `Превышен лимит коррекций на субботу (максимум ${rules.maxCorrectionsOnSaturday}).`
        );
      }
    }

    // Проверка однодневок
    if (request.appointmentType === 'one_day') {
      if (dailyStats.oneDayCount >= rules.maxOneDayPerDay) {
        result.errors.push(
          `Превышен лимит однодневок на этот день (максимум ${rules.maxOneDayPerDay}).`
        );
      }
    }
  }

  /**
   * Проверка ограничений врача
   */
  private validateDoctorRestrictions(
    request: BookingRequest,
    result: ValidationResult
  ): void {
    if (!this.doctorRestrictions) return;

    const restrictions = this.doctorRestrictions;

    // Коррекции
    if (request.appointmentType === 'correction') {
      if (restrictions.noCorrections && !request.isPatientOfDoctor) {
        result.errors.push(
          `К врачу ${restrictions.doctorName} нельзя записаться на коррекцию, ` +
          `если вы не являетесь его пациентом.`
        );
      }
    }

    // Ортезы
    if (request.appointmentType === 'orthosis_delivery') {
      if (restrictions.noOrthosis && !request.citoPatient) {
        result.errors.push(
          `К врачу ${restrictions.doctorName} нельзя записаться на ортезы, ` +
          `если вы не являетесь пациентом из ЦИТО.`
        );
      }
    }
  }

  /**
   * Проверка правил по типу приёма
   */
  private validateAppointmentTypeRules(
    request: BookingRequest,
    result: ValidationResult
  ): void {
    const rules = this.branchRules;

    // Онлайн ЛФК
    if (request.appointmentType === 'lfc_online') {
      if (!rules.onlineLfcAvailable) {
        result.errors.push(
          `Онлайн ЛФК недоступна в филиале ${rules.branchName}.`
        );
      }

      if (rules.seasOnly && request.appointmentType === 'lfc_online') {
        result.warnings.push(
          `Онлайн ЛФК в ${rules.branchName} доступна только по методике SEAS.`
        );
      }

      if (!request.previousLfcCourse) {
        result.errors.push(
          `Онлайн ЛФК доступна только для пациентов, ранее прошедших курс ЛФК.`
        );
      }
    }

    // Онлайн консультация - требует предоплаты
    if (request.appointmentType === 'online_consult') {
      result.requiresPrepayment = true;
      result.suggestions.push(
        `После оплаты необходимо предоставить фото ребёнка и рентгенограмму. ` +
        `Ссылка на ВКС будет отправлена за 15 минут до приёма.`
      );
    }

    // Психолог
    if (request.appointmentType === 'psychologist') {
      if (!request.hasCorsetOrder) {
        result.warnings.push(
          `Бесплатная консультация психолога доступна только при заказе корсета. ` +
          `Последующие консультации платные.`
        );
      }
    }
  }

  /**
   * Проверка правил рентгена
   */
  private validateXrayRules(
    request: BookingRequest,
    result: ValidationResult
  ): void {
    if (request.appointmentType !== 'xray') return;

    const rules = this.branchRules;

    // Проверка доступности записи на рентген
    if (!rules.hasXrayBooking) {
      result.errors.push(
        `В филиале ${rules.branchName} отдельная запись на рентген недоступна.`
      );
      return;
    }

    // Проверка направления
    if (rules.requiresXrayReferral) {
      if (!request.hasXrayReferral) {
        result.errors.push(
          `Для записи на рентген необходимо направление с подписью врача и печатью.`
        );
      } else if (request.xrayReferralDate) {
        const daysSinceReferral = Math.floor(
          (new Date().getTime() - request.xrayReferralDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceReferral > BOOKING_LIMITS.xrayReferralValidDays) {
          result.errors.push(
            `Направление на рентген просрочено. ` +
            `Направление действительно ${BOOKING_LIMITS.xrayReferralValidDays} дней.`
          );
        }
      }
    }
  }

  /**
   * Проверка требований предоплаты
   */
  private checkPrepaymentRequirements(
    request: BookingRequest,
    result: ValidationResult
  ): void {
    const rules = this.branchRules;

    // ЛФК в СПБ и МСК требует предоплаты
    if (
      (request.appointmentType === 'lfc' || request.appointmentType === 'lfc_online') &&
      rules.lfcPrepayment
    ) {
      result.requiresPrepayment = true;
      result.suggestions.push(
        `Запись на ЛФК в ${rules.branchName} требует предоплаты.`
      );
    }

    // Онлайн консультация всегда требует предоплаты
    if (request.appointmentType === 'online_consult') {
      result.requiresPrepayment = true;
    }
  }

  /**
   * Предложение ЛФК для сколиоза
   */
  private checkLfcSuggestion(
    request: BookingRequest,
    result: ValidationResult
  ): void {
    // Если первичка к травматологу-ортопеду с диагнозом сколиоз
    if (
      request.appointmentType === 'primary' &&
      request.diagnosis?.toLowerCase().includes('сколиоз')
    ) {
      result.suggestLfc = true;
      result.suggestions.push(
        `При диагнозе "сколиоз" рекомендован курс ЛФК из 4-5 занятий. ` +
        `Хотите записаться на курс ЛФК?`
      );
    }
  }

  /**
   * Расчёт даты выдачи корсета
   */
  private calculateDeliveryDate(
    request: BookingRequest,
    result: ValidationResult
  ): void {
    if (request.appointmentType !== 'one_day' && request.appointmentType !== 'four_day') {
      return;
    }

    const rules = this.branchRules;
    const requestDate = new Date(request.requestedDate);
    const requestTime = request.requestedTime;

    if (request.appointmentType === 'one_day') {
      // Однодневка
      if (requestTime <= rules.oneDaySameDayCutoff) {
        // Выдача в тот же день
        result.deliveryDate = requestDate;
        result.deliveryTime = 'Вторая половина дня';
      } else {
        // Выдача на следующий рабочий день
        result.deliveryDate = this.getNextWorkday(requestDate);
        result.deliveryTime = 'Первая половина дня';
      }
    } else if (request.appointmentType === 'four_day') {
      // Корсет за 4 дня - выдача на 4-й рабочий день
      let deliveryDate = requestDate;
      for (let i = 0; i < 4; i++) {
        deliveryDate = this.getNextWorkday(deliveryDate);
      }
      result.deliveryDate = deliveryDate;
      result.deliveryTime = 'Первая половина дня';
    }

    if (result.deliveryDate) {
      result.suggestions.push(
        `Выдача корсета: ${this.formatDate(result.deliveryDate)}, ${result.deliveryTime}`
      );
    }
  }

  /**
   * Получение следующего рабочего дня
   */
  private getNextWorkday(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Пропускаем выходные
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
  }

  /**
   * Форматирование даты
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  /**
   * Получение длительности приёма
   */
  getAppointmentDuration(type: AppointmentType): number {
    if (type === 'primary') {
      return this.branchRules.primaryDuration;
    }
    return this.branchRules.otherDuration;
  }
}

// =============================================================================
// Экспорт функций для использования в API
// =============================================================================

export function createValidator(branchCode: BranchCode, doctorId?: string): BookingValidator {
  return new BookingValidator(branchCode, doctorId);
}

export function getBranchRules(branchCode: BranchCode): BranchRules {
  return BRANCH_RULES[branchCode];
}

export function getDoctorRestrictions(doctorId: string): DoctorRestrictions | undefined {
  return DOCTOR_RESTRICTIONS.find(d => d.doctorId === doctorId);
}

export function getAllBranches(): BranchRules[] {
  return Object.values(BRANCH_RULES);
}
