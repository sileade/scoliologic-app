/**
 * Push Notifications Service
 * Поддержка Firebase Cloud Messaging (FCM) и Apple Push Notification service (APNs)
 * через Capacitor для нативных приложений и Web Push API для браузера
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface PushNotificationConfig {
  /** Callback при получении токена */
  onTokenReceived?: (token: string) => void;
  /** Callback при получении уведомления (приложение на переднем плане) */
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  /** Callback при нажатии на уведомление */
  onNotificationAction?: (action: ActionPerformed) => void;
  /** Callback при ошибке */
  onError?: (error: Error) => void;
}

class PushNotificationService {
  private isInitialized = false;
  private token: string | null = null;
  private config: PushNotificationConfig = {};

  /**
   * Инициализация Push-уведомлений
   */
  async initialize(config: PushNotificationConfig = {}): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    this.config = config;

    // Проверяем платформу
    if (Capacitor.isNativePlatform()) {
      return this.initializeNative();
    } else {
      return this.initializeWeb();
    }
  }

  /**
   * Инициализация для нативных платформ (iOS/Android)
   */
  private async initializeNative(): Promise<boolean> {
    try {
      // Запрашиваем разрешения
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          console.log('[PushNotifications] Permission denied');
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        console.log('[PushNotifications] Permission not granted');
        return false;
      }

      // Регистрируем обработчики событий
      await PushNotifications.addListener('registration', (token: Token) => {
        console.log('[PushNotifications] Token received:', token.value);
        this.token = token.value;
        this.config.onTokenReceived?.(token.value);
        this.sendTokenToServer(token.value);
      });

      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[PushNotifications] Registration error:', error);
        this.config.onError?.(new Error(error.error || 'Registration failed'));
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[PushNotifications] Notification received:', notification);
        this.config.onNotificationReceived?.(notification);
        
        // Показываем локальное уведомление если приложение на переднем плане
        this.showLocalNotification(notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[PushNotifications] Action performed:', action);
        this.config.onNotificationAction?.(action);
        this.handleNotificationAction(action);
      });

      // Регистрируемся для получения push-уведомлений
      await PushNotifications.register();

      // Инициализируем локальные уведомления
      await LocalNotifications.requestPermissions();

      this.isInitialized = true;
      console.log('[PushNotifications] Native initialization complete');
      return true;
    } catch (error) {
      console.error('[PushNotifications] Native initialization failed:', error);
      this.config.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Инициализация для веб-браузера (Web Push API)
   */
  private async initializeWeb(): Promise<boolean> {
    try {
      // Проверяем поддержку
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[PushNotifications] Web Push not supported');
        return false;
      }

      // Запрашиваем разрешение
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[PushNotifications] Web notification permission denied');
        return false;
      }

      // Регистрируем Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PushNotifications] Service Worker registered');

      // Подписываемся на push-уведомления
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });

      // Отправляем подписку на сервер
      const subscriptionJson = subscription.toJSON();
      this.token = JSON.stringify(subscriptionJson);
      this.config.onTokenReceived?.(this.token);
      await this.sendWebPushSubscriptionToServer(subscriptionJson);

      this.isInitialized = true;
      console.log('[PushNotifications] Web initialization complete');
      return true;
    } catch (error) {
      console.error('[PushNotifications] Web initialization failed:', error);
      this.config.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Показать локальное уведомление
   */
  private async showLocalNotification(notification: PushNotificationSchema): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Для веба используем Notification API
      if (Notification.permission === 'granted') {
        new Notification(notification.title || 'Scoliologic', {
          body: notification.body || '',
          icon: '/icon-192.png',
          data: notification.data,
        });
      }
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: notification.title || 'Scoliologic',
            body: notification.body || '',
            extra: notification.data,
          },
        ],
      });
    } catch (error) {
      console.error('[PushNotifications] Failed to show local notification:', error);
    }
  }

  /**
   * Обработка действия по уведомлению
   */
  private handleNotificationAction(action: ActionPerformed): void {
    const data = action.notification.data;
    
    if (data?.type === 'message') {
      // Переход к сообщению
      window.location.href = `/messages/${data.chatId}`;
    } else if (data?.type === 'appointment') {
      // Переход к записи
      window.location.href = `/appointments/${data.appointmentId}`;
    } else if (data?.type === 'device') {
      // Переход к устройству
      window.location.href = `/devices/${data.deviceId}`;
    }
  }

  /**
   * Отправка токена на сервер
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();
      
      await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform,
          deviceId: await this.getDeviceId(),
        }),
      });
      
      console.log('[PushNotifications] Token sent to server');
    } catch (error) {
      console.error('[PushNotifications] Failed to send token to server:', error);
    }
  }

  /**
   * Отправка Web Push подписки на сервер
   */
  private async sendWebPushSubscriptionToServer(subscription: PushSubscriptionJSON): Promise<void> {
    try {
      await fetch('/api/push/register-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          deviceId: await this.getDeviceId(),
        }),
      });
      
      console.log('[PushNotifications] Web subscription sent to server');
    } catch (error) {
      console.error('[PushNotifications] Failed to send web subscription to server:', error);
    }
  }

  /**
   * Получение ID устройства
   */
  private async getDeviceId(): Promise<string> {
    // Используем localStorage для хранения уникального ID устройства
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Конвертация VAPID ключа
   */
  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  }

  /**
   * Получение текущего токена
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Проверка инициализации
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Отписка от уведомлений
   */
  async unsubscribe(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (Capacitor.isNativePlatform()) {
        await PushNotifications.removeAllListeners();
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Уведомляем сервер об отписке
      await fetch('/api/push/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: await this.getDeviceId(),
        }),
      });

      this.isInitialized = false;
      this.token = null;
      console.log('[PushNotifications] Unsubscribed');
    } catch (error) {
      console.error('[PushNotifications] Failed to unsubscribe:', error);
    }
  }
}

// Singleton instance
export const pushNotifications = new PushNotificationService();

/**
 * React Hook для работы с Push-уведомлениями
 */
export function usePushNotifications() {
  return {
    initialize: pushNotifications.initialize.bind(pushNotifications),
    getToken: pushNotifications.getToken.bind(pushNotifications),
    isReady: pushNotifications.isReady.bind(pushNotifications),
    unsubscribe: pushNotifications.unsubscribe.bind(pushNotifications),
  };
}
