/**
 * Интеграция с Битрикс24 - Открытые линии
 * Синхронизация переписки с пациентами в CRM
 */

import { Router, Request, Response } from 'express';

// =============================================================================
// Типы и интерфейсы
// =============================================================================

export interface BitrixConfig {
  webhookUrl: string;        // URL вебхука Битрикс24
  openLineId: string;        // ID открытой линии
  userId: string;            // ID пользователя-оператора
  connectorId: string;       // ID коннектора
}

export interface BitrixMessage {
  messageId: string;
  chatId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  text: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  attachments?: BitrixAttachment[];
}

export interface BitrixAttachment {
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  name: string;
  size?: number;
}

export interface BitrixContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  patientId?: string;
}

export interface BitrixChat {
  chatId: string;
  lineId: string;
  userId: string;
  userName: string;
  status: 'active' | 'closed' | 'waiting';
  operatorId?: string;
  createdAt: Date;
  lastMessageAt: Date;
}

// =============================================================================
// Битрикс24 API клиент
// =============================================================================

export class BitrixClient {
  private config: BitrixConfig;
  private baseUrl: string;

  constructor(config: BitrixConfig) {
    this.config = config;
    this.baseUrl = config.webhookUrl;
  }

  /**
   * Выполнение запроса к API Битрикс24
   */
  private async request(method: string, params: Record<string, any> = {}): Promise<any> {
    const url = `${this.baseUrl}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Bitrix API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Bitrix error: ${data.error_description || data.error}`);
      }

      return data.result;
    } catch (error) {
      console.error('[Bitrix] API request failed:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Открытые линии
  // ===========================================================================

  /**
   * Регистрация коннектора для открытой линии
   */
  async registerConnector(connectorId: string, name: string): Promise<any> {
    return this.request('imconnector.register', {
      ID: connectorId,
      NAME: name,
      ICON: {
        DATA_IMAGE: '', // Base64 иконки
      },
    });
  }

  /**
   * Активация коннектора на открытой линии
   */
  async activateConnector(lineId: string, connectorId: string): Promise<any> {
    return this.request('imconnector.activate', {
      CONNECTOR: connectorId,
      LINE: lineId,
      ACTIVE: 1,
    });
  }

  /**
   * Отправка сообщения в открытую линию (от пациента)
   */
  async sendMessageToLine(message: {
    lineId: string;
    chatId: string;
    userId: string;
    userName: string;
    userPhone?: string;
    text: string;
    attachments?: BitrixAttachment[];
  }): Promise<any> {
    const params: Record<string, any> = {
      CONNECTOR: this.config.connectorId,
      LINE: message.lineId,
      MESSAGES: [
        {
          user: {
            id: message.userId,
            name: message.userName,
            phone: message.userPhone,
          },
          chat: {
            id: message.chatId,
          },
          message: {
            id: `msg_${Date.now()}`,
            date: new Date().toISOString(),
            text: message.text,
          },
        },
      ],
    };

    // Добавляем вложения если есть
    if (message.attachments && message.attachments.length > 0) {
      params.MESSAGES[0].message.files = message.attachments.map(att => ({
        name: att.name,
        link: att.url,
        type: att.type,
      }));
    }

    return this.request('imconnector.send.messages', params);
  }

  /**
   * Отправка статуса доставки/прочтения
   */
  async sendMessageStatus(chatId: string, messageIds: string[], status: 'delivered' | 'read'): Promise<any> {
    return this.request('imconnector.send.status.delivery', {
      CONNECTOR: this.config.connectorId,
      LINE: this.config.openLineId,
      MESSAGES: messageIds.map(id => ({
        im: id,
        date: new Date().toISOString(),
        chat: { id: chatId },
      })),
    });
  }

  /**
   * Обновление данных пользователя
   */
  async updateUser(userId: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    avatar?: string;
  }): Promise<any> {
    return this.request('imconnector.update.user', {
      CONNECTOR: this.config.connectorId,
      LINE: this.config.openLineId,
      USER: {
        id: userId,
        ...data,
      },
    });
  }

  // ===========================================================================
  // CRM интеграция
  // ===========================================================================

  /**
   * Поиск контакта в CRM по телефону
   */
  async findContactByPhone(phone: string): Promise<BitrixContact | null> {
    const result = await this.request('crm.contact.list', {
      filter: { PHONE: phone },
      select: ['ID', 'NAME', 'LAST_NAME', 'PHONE', 'EMAIL', 'UF_PATIENT_ID'],
    });

    if (result && result.length > 0) {
      const contact = result[0];
      return {
        id: contact.ID,
        name: `${contact.NAME} ${contact.LAST_NAME}`.trim(),
        phone: contact.PHONE?.[0]?.VALUE,
        email: contact.EMAIL?.[0]?.VALUE,
        patientId: contact.UF_PATIENT_ID,
      };
    }

    return null;
  }

  /**
   * Создание контакта в CRM
   */
  async createContact(data: {
    name: string;
    phone?: string;
    email?: string;
    patientId?: string;
  }): Promise<string> {
    const nameParts = data.name.split(' ');
    
    const result = await this.request('crm.contact.add', {
      fields: {
        NAME: nameParts[0] || data.name,
        LAST_NAME: nameParts.slice(1).join(' ') || '',
        PHONE: data.phone ? [{ VALUE: data.phone, VALUE_TYPE: 'MOBILE' }] : undefined,
        EMAIL: data.email ? [{ VALUE: data.email, VALUE_TYPE: 'WORK' }] : undefined,
        UF_PATIENT_ID: data.patientId,
        SOURCE_ID: 'SELF', // Источник - приложение
      },
    });

    return result;
  }

  /**
   * Привязка чата к контакту/сделке
   */
  async linkChatToEntity(chatId: string, entityType: 'CONTACT' | 'DEAL', entityId: string): Promise<any> {
    return this.request('imopenlines.crm.chat.bind', {
      CHAT_ID: chatId,
      ENTITY_TYPE: entityType,
      ENTITY_ID: entityId,
    });
  }

  /**
   * Создание активности (звонок, письмо) в CRM
   */
  async createActivity(data: {
    contactId: string;
    type: 'CALL' | 'EMAIL' | 'MEETING';
    subject: string;
    description: string;
    direction: 'incoming' | 'outgoing';
  }): Promise<string> {
    return this.request('crm.activity.add', {
      fields: {
        OWNER_TYPE_ID: 3, // Contact
        OWNER_ID: data.contactId,
        TYPE_ID: data.type === 'CALL' ? 2 : data.type === 'EMAIL' ? 4 : 1,
        SUBJECT: data.subject,
        DESCRIPTION: data.description,
        DIRECTION: data.direction === 'incoming' ? 1 : 2,
        COMPLETED: 'Y',
        RESPONSIBLE_ID: this.config.userId,
      },
    });
  }

  // ===========================================================================
  // Вебхуки
  // ===========================================================================

  /**
   * Обработка входящего вебхука от Битрикс24
   */
  handleWebhook(event: string, data: any): BitrixMessage | null {
    switch (event) {
      case 'ONIMCONNECTORMESSAGEADD':
        // Новое сообщение от оператора
        return {
          messageId: data.MESSAGES?.[0]?.im || '',
          chatId: data.MESSAGES?.[0]?.chat?.id || '',
          userId: data.MESSAGES?.[0]?.user?.id || '',
          userName: data.MESSAGES?.[0]?.user?.name || '',
          text: data.MESSAGES?.[0]?.message?.text || '',
          timestamp: new Date(data.MESSAGES?.[0]?.message?.date || Date.now()),
          direction: 'outgoing',
        };

      case 'ONIMCONNECTORMESSAGEDELETE':
        // Удаление сообщения
        console.log('[Bitrix] Message deleted:', data);
        return null;

      case 'ONIMCONNECTORSTATUSDELETE':
        // Закрытие чата
        console.log('[Bitrix] Chat closed:', data);
        return null;

      default:
        console.log('[Bitrix] Unknown event:', event, data);
        return null;
    }
  }
}

// =============================================================================
// Сервис синхронизации сообщений
// =============================================================================

export class BitrixMessageSync {
  private client: BitrixClient;
  private messageQueue: BitrixMessage[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(client: BitrixClient) {
    this.client = client;
  }

  /**
   * Запуск синхронизации
   */
  start(intervalMs: number = 5000): void {
    if (this.syncInterval) {
      this.stop();
    }

    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);

    console.log('[Bitrix] Message sync started');
  }

  /**
   * Остановка синхронизации
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('[Bitrix] Message sync stopped');
  }

  /**
   * Добавление сообщения в очередь синхронизации
   */
  queueMessage(message: BitrixMessage): void {
    this.messageQueue.push(message);
  }

  /**
   * Обработка очереди сообщений
   */
  private async processQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        if (message.direction === 'incoming') {
          await this.client.sendMessageToLine({
            lineId: '', // Будет заполнено из конфига
            chatId: message.chatId,
            userId: message.userId,
            userName: message.userName,
            text: message.text,
            attachments: message.attachments,
          });
        }
      } catch (error) {
        console.error('[Bitrix] Failed to sync message:', error);
        // Возвращаем сообщение в очередь для повторной попытки
        this.messageQueue.push(message);
      }
    }
  }
}

// =============================================================================
// Express роутер для вебхуков
// =============================================================================

const router = Router();

// Хранилище клиентов (в production использовать Redis)
const bitrixClients: Map<string, BitrixClient> = new Map();

/**
 * POST /api/bitrix/webhook
 * Обработка входящих вебхуков от Битрикс24
 */
router.post('/webhook', (req: Request, res: Response) => {
  const { event, data, auth } = req.body;

  console.log('[Bitrix] Webhook received:', event);

  // Получаем клиента по домену
  const client = bitrixClients.get(auth?.domain);
  
  if (!client) {
    console.warn('[Bitrix] Unknown domain:', auth?.domain);
    return res.status(200).json({ status: 'ok' });
  }

  // Обрабатываем событие
  const message = client.handleWebhook(event, data);

  if (message) {
    // TODO: Передать сообщение в систему мессенджера приложения
    console.log('[Bitrix] Processed message:', message);
  }

  res.status(200).json({ status: 'ok' });
});

/**
 * POST /api/bitrix/connect
 * Подключение к Битрикс24
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const config: BitrixConfig = {
      webhookUrl: req.body.webhookUrl,
      openLineId: req.body.openLineId,
      userId: req.body.userId,
      connectorId: req.body.connectorId || 'scoliologic_app',
    };

    const client = new BitrixClient(config);

    // Регистрируем коннектор
    await client.registerConnector(config.connectorId, 'Scoliologic App');

    // Активируем на открытой линии
    await client.activateConnector(config.openLineId, config.connectorId);

    // Сохраняем клиента
    const domain = new URL(config.webhookUrl).hostname;
    bitrixClients.set(domain, client);

    res.json({
      success: true,
      message: 'Подключение к Битрикс24 успешно настроено',
    });
  } catch (error) {
    console.error('[Bitrix] Connection error:', error);
    res.status(500).json({
      error: 'Ошибка подключения к Битрикс24',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/bitrix/send
 * Отправка сообщения в Битрикс24
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { domain, chatId, userId, userName, userPhone, text, attachments } = req.body;

    const client = bitrixClients.get(domain);
    
    if (!client) {
      return res.status(404).json({ error: 'Битрикс24 не подключен' });
    }

    await client.sendMessageToLine({
      lineId: '', // Из конфига клиента
      chatId,
      userId,
      userName,
      userPhone,
      text,
      attachments,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Bitrix] Send error:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

/**
 * GET /api/bitrix/contact/:phone
 * Поиск контакта по телефону
 */
router.get('/contact/:phone', async (req: Request, res: Response) => {
  try {
    const { domain } = req.query;
    const phone = req.params.phone;

    const client = bitrixClients.get(domain as string);
    
    if (!client) {
      return res.status(404).json({ error: 'Битрикс24 не подключен' });
    }

    const contact = await client.findContactByPhone(phone);
    res.json({ contact });
  } catch (error) {
    console.error('[Bitrix] Contact search error:', error);
    res.status(500).json({ error: 'Ошибка поиска контакта' });
  }
});

export default router;
