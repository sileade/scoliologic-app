/**
 * Push Notifications Router
 * API для регистрации устройств и отправки Push-уведомлений
 */

import { Router, Request, Response } from 'express';
// Firebase Admin SDK - опционально, требует настройки
// import admin from 'firebase-admin';
const admin: any = null; // Placeholder - настроить Firebase Admin SDK для production
import webpush from 'web-push';

const router = Router();

// Хранилище токенов устройств (в production использовать Redis/PostgreSQL)
interface DeviceToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  userId?: string;
  deviceId: string;
  createdAt: Date;
  lastUsed: Date;
}

interface WebPushSubscription {
  subscription: PushSubscriptionJSON;
  userId?: string;
  deviceId: string;
  createdAt: Date;
}

const deviceTokens: Map<string, DeviceToken> = new Map();
const webPushSubscriptions: Map<string, WebPushSubscription> = new Map();

// Настройка Web Push VAPID ключей
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@scoliologic.ru';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Регистрация устройства для Push-уведомлений (FCM/APNs)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { token, platform, deviceId, userId } = req.body;

    if (!token || !platform || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deviceToken: DeviceToken = {
      token,
      platform,
      deviceId,
      userId,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    deviceTokens.set(deviceId, deviceToken);

    console.log(`[Push] Device registered: ${deviceId} (${platform})`);

    res.json({ success: true, deviceId });
  } catch (error) {
    console.error('[Push] Registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * Регистрация Web Push подписки
 */
router.post('/register-web', async (req: Request, res: Response) => {
  try {
    const { subscription, deviceId, userId } = req.body;

    if (!subscription || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const webSubscription: WebPushSubscription = {
      subscription,
      deviceId,
      userId,
      createdAt: new Date(),
    };

    webPushSubscriptions.set(deviceId, webSubscription);

    console.log(`[Push] Web subscription registered: ${deviceId}`);

    res.json({ success: true, deviceId });
  } catch (error) {
    console.error('[Push] Web registration error:', error);
    res.status(500).json({ error: 'Failed to register web subscription' });
  }
});

/**
 * Отписка устройства
 */
router.post('/unregister', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Missing deviceId' });
    }

    deviceTokens.delete(deviceId);
    webPushSubscriptions.delete(deviceId);

    console.log(`[Push] Device unregistered: ${deviceId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Push] Unregistration error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

/**
 * Отправка Push-уведомления пользователю
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, title, body, data, imageUrl } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results = await sendPushToUser(userId, { title, body, data, imageUrl });

    res.json({ success: true, results });
  } catch (error) {
    console.error('[Push] Send error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Отправка Push-уведомления на конкретное устройство
 */
router.post('/send-device', async (req: Request, res: Response) => {
  try {
    const { deviceId, title, body, data, imageUrl } = req.body;

    if (!deviceId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendPushToDevice(deviceId, { title, body, data, imageUrl });

    res.json({ success: true, result });
  } catch (error) {
    console.error('[Push] Send to device error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Broadcast уведомление всем устройствам
 */
router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { title, body, data, imageUrl } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Missing title' });
    }

    const results = await broadcastPush({ title, body, data, imageUrl });

    res.json({ success: true, results });
  } catch (error) {
    console.error('[Push] Broadcast error:', error);
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

interface PushPayload {
  title: string;
  body?: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Отправка Push-уведомления пользователю (на все его устройства)
 */
async function sendPushToUser(userId: string, payload: PushPayload): Promise<any[]> {
  const results: any[] = [];

  // Находим все устройства пользователя
  for (const [deviceId, token] of Array.from(deviceTokens.entries())) {
    if (token.userId === userId) {
      const result = await sendPushToDevice(deviceId, payload);
      results.push({ deviceId, ...result });
    }
  }

  for (const [deviceId, sub] of Array.from(webPushSubscriptions.entries())) {
    if (sub.userId === userId) {
      const result = await sendWebPush(deviceId, payload);
      results.push({ deviceId, ...result });
    }
  }

  return results;
}

/**
 * Отправка Push-уведомления на устройство
 */
async function sendPushToDevice(deviceId: string, payload: PushPayload): Promise<any> {
  const token = deviceTokens.get(deviceId);
  
  if (!token) {
    // Пробуем Web Push
    return sendWebPush(deviceId, payload);
  }

  try {
    // Используем Firebase Admin SDK для FCM
    if (!admin.apps.length) {
      console.log('[Push] Firebase Admin not initialized');
      return { success: false, error: 'Firebase not configured' };
    }

    const message: any = {
      token: token.token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    
    // Обновляем время последнего использования
    token.lastUsed = new Date();
    deviceTokens.set(deviceId, token);

    return { success: true, messageId: response };
  } catch (error: any) {
    console.error(`[Push] Failed to send to ${deviceId}:`, error);

    // Удаляем невалидный токен
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      deviceTokens.delete(deviceId);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Отправка Web Push уведомления
 */
async function sendWebPush(deviceId: string, payload: PushPayload): Promise<any> {
  const subscription = webPushSubscriptions.get(deviceId);
  
  if (!subscription) {
    return { success: false, error: 'Subscription not found' };
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, error: 'VAPID keys not configured' };
  }

  try {
    await webpush.sendNotification(
      subscription.subscription as webpush.PushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: payload.data,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
      })
    );

    return { success: true };
  } catch (error: any) {
    console.error(`[Push] Web push failed for ${deviceId}:`, error);

    // Удаляем невалидную подписку
    if (error.statusCode === 410 || error.statusCode === 404) {
      webPushSubscriptions.delete(deviceId);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Broadcast уведомление всем устройствам
 */
async function broadcastPush(payload: PushPayload): Promise<any[]> {
  const results: any[] = [];

  for (const deviceId of Array.from(deviceTokens.keys())) {
    const result = await sendPushToDevice(deviceId, payload);
    results.push({ deviceId, ...result });
  }

  for (const deviceId of Array.from(webPushSubscriptions.keys())) {
    const result = await sendWebPush(deviceId, payload);
    results.push({ deviceId, ...result });
  }

  return results;
}

export default router;
