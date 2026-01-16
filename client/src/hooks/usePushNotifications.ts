import { useState, useEffect, useCallback } from 'react';
import { 
  initializeFirebase, 
  isFirebaseConfigured,
  requestNotificationPermission, 
  onForegroundMessage,
  registerDeviceToken 
} from '@/lib/firebase';
import { toast } from 'sonner';

interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  token: string | null;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
}

export function usePushNotifications(userId?: string): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        isFirebaseConfigured();
      
      setIsSupported(supported);

      // Check if already enabled
      if (supported && Notification.permission === 'granted') {
        const savedToken = localStorage.getItem('fcm_token');
        if (savedToken) {
          setToken(savedToken);
          setIsEnabled(true);
        }
      }
    };

    checkSupport();
  }, []);

  // Initialize Firebase and listen for foreground messages
  useEffect(() => {
    if (!isSupported) return;

    initializeFirebase();

    const unsubscribe = onForegroundMessage((payload: NotificationPayload) => {
      // Show toast notification for foreground messages
      const title = payload.notification?.title || 'Уведомление';
      const body = payload.notification?.body || '';

      toast(title, {
        description: body,
        duration: 5000,
        action: payload.data?.url ? {
          label: 'Открыть',
          onClick: () => {
            window.location.href = payload.data!.url;
          },
        } : undefined,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [isSupported]);

  // Enable push notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push-уведомления не поддерживаются в этом браузере');
      return false;
    }

    setIsLoading(true);

    try {
      const fcmToken = await requestNotificationPermission();

      if (!fcmToken) {
        toast.error('Не удалось получить разрешение на уведомления');
        setIsLoading(false);
        return false;
      }

      // Save token locally
      localStorage.setItem('fcm_token', fcmToken);
      setToken(fcmToken);
      setIsEnabled(true);

      // Register token with server if userId is provided
      if (userId) {
        await registerDeviceToken(fcmToken, userId);
      }

      toast.success('Push-уведомления включены');
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Ошибка при включении уведомлений');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, userId]);

  // Disable push notifications
  const disableNotifications = useCallback(() => {
    localStorage.removeItem('fcm_token');
    setToken(null);
    setIsEnabled(false);
    toast.info('Push-уведомления отключены');
  }, []);

  return {
    isSupported,
    isEnabled,
    isLoading,
    token,
    enableNotifications,
    disableNotifications,
  };
}
