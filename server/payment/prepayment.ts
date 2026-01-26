/**
 * Система предоплат для записи на приём
 * Управление предоплатами для ЛФК, онлайн консультаций и других услуг
 */

import { Router, Request, Response } from 'express';

// =============================================================================
// Типы и интерфейсы
// =============================================================================

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'expired' | 'cancelled';
export type PaymentMethod = 'card' | 'sbp' | 'yookassa' | 'manual';

export interface PrepaymentConfig {
  serviceType: string;
  amount: number;
  currency: string;
  validityHours: number;      // Срок действия предоплаты в часах
  refundableHours: number;    // За сколько часов до приёма можно вернуть
  description: string;
}

export interface Prepayment {
  id: string;
  patientId: string;
  bookingId?: string;
  serviceType: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentId?: string;         // ID платежа в платёжной системе
  createdAt: Date;
  paidAt?: Date;
  expiresAt: Date;
  refundedAt?: Date;
  refundReason?: string;
}

export interface PaymentRequest {
  patientId: string;
  serviceType: string;
  bookingId?: string;
  returnUrl: string;
}

export interface PaymentResult {
  success: boolean;
  prepaymentId?: string;
  paymentUrl?: string;
  error?: string;
}

// =============================================================================
// Конфигурация предоплат по услугам
// =============================================================================

export const PREPAYMENT_CONFIG: Record<string, PrepaymentConfig> = {
  lfc: {
    serviceType: 'lfc',
    amount: 2000,
    currency: 'RUB',
    validityHours: 48,
    refundableHours: 24,
    description: 'Предоплата за занятие ЛФК',
  },
  lfc_online: {
    serviceType: 'lfc_online',
    amount: 1500,
    currency: 'RUB',
    validityHours: 48,
    refundableHours: 24,
    description: 'Предоплата за онлайн занятие ЛФК',
  },
  online_consult: {
    serviceType: 'online_consult',
    amount: 3000,
    currency: 'RUB',
    validityHours: 72,
    refundableHours: 48,
    description: 'Предоплата за онлайн консультацию ортопеда',
  },
  seas: {
    serviceType: 'seas',
    amount: 2500,
    currency: 'RUB',
    validityHours: 48,
    refundableHours: 24,
    description: 'Предоплата за занятие SEAS',
  },
  psychologist: {
    serviceType: 'psychologist',
    amount: 2000,
    currency: 'RUB',
    validityHours: 48,
    refundableHours: 24,
    description: 'Предоплата за консультацию психолога',
  },
};

// =============================================================================
// Сервис предоплат
// =============================================================================

export class PrepaymentService {
  private prepayments: Map<string, Prepayment> = new Map();
  private yookassaShopId?: string;
  private yookassaSecretKey?: string;

  constructor(config?: { yookassaShopId?: string; yookassaSecretKey?: string }) {
    this.yookassaShopId = config?.yookassaShopId || process.env.YOOKASSA_SHOP_ID;
    this.yookassaSecretKey = config?.yookassaSecretKey || process.env.YOOKASSA_SECRET_KEY;
  }

  /**
   * Проверка, требуется ли предоплата для услуги
   */
  requiresPrepayment(serviceType: string, branchCode?: string): boolean {
    // ЛФК в СПБ и МСК требует предоплаты
    if ((serviceType === 'lfc' || serviceType === 'lfc_online') && 
        (branchCode === 'SPB' || branchCode === 'MSK')) {
      return true;
    }

    // Онлайн консультация всегда требует предоплаты
    if (serviceType === 'online_consult') {
      return true;
    }

    return false;
  }

  /**
   * Получение конфигурации предоплаты
   */
  getConfig(serviceType: string): PrepaymentConfig | null {
    return PREPAYMENT_CONFIG[serviceType] || null;
  }

  /**
   * Создание предоплаты
   */
  async createPrepayment(request: PaymentRequest): Promise<PaymentResult> {
    const config = this.getConfig(request.serviceType);
    
    if (!config) {
      return {
        success: false,
        error: 'Неизвестный тип услуги',
      };
    }

    const prepaymentId = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.validityHours);

    const prepayment: Prepayment = {
      id: prepaymentId,
      patientId: request.patientId,
      bookingId: request.bookingId,
      serviceType: request.serviceType,
      amount: config.amount,
      currency: config.currency,
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
    };

    // Создаём платёж в YooKassa
    try {
      const paymentUrl = await this.createYooKassaPayment(prepayment, request.returnUrl);
      
      this.prepayments.set(prepaymentId, prepayment);

      return {
        success: true,
        prepaymentId,
        paymentUrl,
      };
    } catch (error) {
      console.error('[Prepayment] Failed to create payment:', error);
      return {
        success: false,
        error: 'Ошибка создания платежа',
      };
    }
  }

  /**
   * Создание платежа в YooKassa
   */
  private async createYooKassaPayment(prepayment: Prepayment, returnUrl: string): Promise<string> {
    if (!this.yookassaShopId || !this.yookassaSecretKey) {
      // Возвращаем mock URL для тестирования
      console.warn('[Prepayment] YooKassa not configured, using mock');
      return `https://payment.mock/pay/${prepayment.id}`;
    }

    const config = this.getConfig(prepayment.serviceType);
    
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': prepayment.id,
        'Authorization': `Basic ${Buffer.from(`${this.yookassaShopId}:${this.yookassaSecretKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: {
          value: prepayment.amount.toFixed(2),
          currency: prepayment.currency,
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: returnUrl,
        },
        description: config?.description || 'Предоплата',
        metadata: {
          prepayment_id: prepayment.id,
          patient_id: prepayment.patientId,
          service_type: prepayment.serviceType,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YooKassa error: ${error}`);
    }

    const data = await response.json();
    
    // Сохраняем ID платежа
    prepayment.paymentId = data.id;
    prepayment.paymentMethod = 'yookassa';

    return data.confirmation.confirmation_url;
  }

  /**
   * Обработка уведомления от YooKassa
   */
  async handleYooKassaWebhook(event: string, data: any): Promise<void> {
    const prepaymentId = data.object?.metadata?.prepayment_id;
    
    if (!prepaymentId) {
      console.warn('[Prepayment] Webhook without prepayment_id');
      return;
    }

    const prepayment = this.prepayments.get(prepaymentId);
    
    if (!prepayment) {
      console.warn('[Prepayment] Prepayment not found:', prepaymentId);
      return;
    }

    switch (event) {
      case 'payment.succeeded':
        prepayment.status = 'paid';
        prepayment.paidAt = new Date();
        console.log('[Prepayment] Payment succeeded:', prepaymentId);
        break;

      case 'payment.canceled':
        prepayment.status = 'cancelled';
        console.log('[Prepayment] Payment cancelled:', prepaymentId);
        break;

      case 'refund.succeeded':
        prepayment.status = 'refunded';
        prepayment.refundedAt = new Date();
        console.log('[Prepayment] Refund succeeded:', prepaymentId);
        break;
    }

    this.prepayments.set(prepaymentId, prepayment);
  }

  /**
   * Проверка статуса предоплаты
   */
  getPrepayment(prepaymentId: string): Prepayment | null {
    return this.prepayments.get(prepaymentId) || null;
  }

  /**
   * Проверка, оплачена ли запись
   */
  isBookingPaid(bookingId: string): boolean {
    for (const prepayment of Array.from(this.prepayments.values())) {
      if (prepayment.bookingId === bookingId && prepayment.status === 'paid') {
        return true;
      }
    }
    return false;
  }

  /**
   * Получение предоплат пациента
   */
  getPatientPrepayments(patientId: string): Prepayment[] {
    const result: Prepayment[] = [];
    
    for (const prepayment of Array.from(this.prepayments.values())) {
      if (prepayment.patientId === patientId) {
        result.push(prepayment);
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Возврат предоплаты
   */
  async refundPrepayment(prepaymentId: string, reason: string): Promise<boolean> {
    const prepayment = this.prepayments.get(prepaymentId);
    
    if (!prepayment) {
      return false;
    }

    if (prepayment.status !== 'paid') {
      return false;
    }

    // Проверяем, можно ли вернуть
    const config = this.getConfig(prepayment.serviceType);
    if (config && prepayment.bookingId) {
      // TODO: Проверить время до приёма
    }

    // Создаём возврат в YooKassa
    if (prepayment.paymentId && this.yookassaShopId && this.yookassaSecretKey) {
      try {
        const response = await fetch('https://api.yookassa.ru/v3/refunds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotence-Key': `refund-${prepaymentId}`,
            'Authorization': `Basic ${Buffer.from(`${this.yookassaShopId}:${this.yookassaSecretKey}`).toString('base64')}`,
          },
          body: JSON.stringify({
            payment_id: prepayment.paymentId,
            amount: {
              value: prepayment.amount.toFixed(2),
              currency: prepayment.currency,
            },
            description: reason,
          }),
        });

        if (!response.ok) {
          console.error('[Prepayment] Refund failed:', await response.text());
          return false;
        }
      } catch (error) {
        console.error('[Prepayment] Refund error:', error);
        return false;
      }
    }

    prepayment.status = 'refunded';
    prepayment.refundedAt = new Date();
    prepayment.refundReason = reason;
    this.prepayments.set(prepaymentId, prepayment);

    return true;
  }

  /**
   * Очистка просроченных предоплат
   */
  cleanupExpired(): number {
    let count = 0;
    const now = new Date();

    for (const [id, prepayment] of Array.from(this.prepayments.entries())) {
      if (prepayment.status === 'pending' && prepayment.expiresAt < now) {
        prepayment.status = 'expired';
        this.prepayments.set(id, prepayment);
        count++;
      }
    }

    return count;
  }
}

// =============================================================================
// Express роутер
// =============================================================================

const router = Router();
const prepaymentService = new PrepaymentService();

/**
 * GET /api/payment/config/:serviceType
 * Получение конфигурации предоплаты для услуги
 */
router.get('/config/:serviceType', (req: Request, res: Response) => {
  const config = prepaymentService.getConfig(req.params.serviceType);
  
  if (!config) {
    return res.status(404).json({ error: 'Конфигурация не найдена' });
  }

  res.json({ config });
});

/**
 * GET /api/payment/required
 * Проверка, требуется ли предоплата
 */
router.get('/required', (req: Request, res: Response) => {
  const { serviceType, branchCode } = req.query;
  
  const required = prepaymentService.requiresPrepayment(
    serviceType as string,
    branchCode as string
  );

  const config = required ? prepaymentService.getConfig(serviceType as string) : null;

  res.json({
    required,
    config,
  });
});

/**
 * POST /api/payment/create
 * Создание предоплаты
 */
router.post('/create', async (req: Request, res: Response) => {
  const result = await prepaymentService.createPrepayment({
    patientId: req.body.patientId,
    serviceType: req.body.serviceType,
    bookingId: req.body.bookingId,
    returnUrl: req.body.returnUrl,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

/**
 * GET /api/payment/:id
 * Получение статуса предоплаты
 */
router.get('/:id', (req: Request, res: Response) => {
  const prepayment = prepaymentService.getPrepayment(req.params.id);
  
  if (!prepayment) {
    return res.status(404).json({ error: 'Предоплата не найдена' });
  }

  res.json({ prepayment });
});

/**
 * GET /api/payment/patient/:patientId
 * Получение предоплат пациента
 */
router.get('/patient/:patientId', (req: Request, res: Response) => {
  const prepayments = prepaymentService.getPatientPrepayments(req.params.patientId);
  res.json({ prepayments });
});

/**
 * POST /api/payment/:id/refund
 * Возврат предоплаты
 */
router.post('/:id/refund', async (req: Request, res: Response) => {
  const success = await prepaymentService.refundPrepayment(
    req.params.id,
    req.body.reason || 'Отмена записи'
  );

  if (!success) {
    return res.status(400).json({ error: 'Не удалось выполнить возврат' });
  }

  res.json({ success: true });
});

/**
 * POST /api/payment/webhook/yookassa
 * Вебхук от YooKassa
 */
router.post('/webhook/yookassa', async (req: Request, res: Response) => {
  const { event, object } = req.body;
  
  await prepaymentService.handleYooKassaWebhook(event, { object });
  
  res.status(200).json({ status: 'ok' });
});

export default router;
export { prepaymentService };
