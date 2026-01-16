# План настройки Push-уведомлений (Android & iOS)

**Автор:** Manus AI
**Дата:** 16 января 2026 г.

## Обзор

Этот документ предоставляет пошаговое руководство по настройке и интеграции Push-уведомлений для Android и iOS в приложении "Сколиолоджик" с использованием **Firebase Cloud Messaging (FCM)** и **Apple Push Notification service (APNs)**.

### Архитектура

1.  **Клиент (Capacitor)**: Запрашивает разрешение, получает токен устройства и отправляет его на бэкенд.
2.  **Firebase (FCM)**: Центральный сервис для отправки уведомлений на Android.
3.  **Apple (APNs)**: Нативный сервис для отправки уведомлений на iOS.
4.  **FCM-APNs Bridge**: Firebase автоматически отправляет уведомления в APNs для iOS-устройств.
5.  **Бэкенд (Node.js)**: Хранит токены устройств и инициирует отправку уведомлений через Firebase Admin SDK.

---

## Часть 1: Настройка проекта Firebase

Это общий шаг для обеих платформ.

1.  **Создайте проект Firebase**
    *   Перейдите в [Firebase Console](https://console.firebase.google.com/).
    *   Нажмите **"Добавить проект"**.
    *   Введите имя проекта, например, `Scoliologic App`.
    *   Примите условия и создайте проект. Отключите Google Analytics, если он не нужен для этой цели.

2.  **Найдите настройки проекта**
    *   В левом меню перейдите в **Project Settings** (значок шестерёнки).
    *   Здесь вы найдете **Project ID**, **Web API Key** и другие важные данные.

---

## Часть 2: Настройка Android

1.  **Добавьте Android-приложение в Firebase**
    *   В настройках проекта Firebase, в разделе **"Ваши приложения"**, нажмите на иконку Android.
    *   **Имя пакета Android**: `ru.scoliologic.app` (это значение из `capacitor.config.ts`).
    *   **Псевдоним приложения**: `Сколиолоджик`.
    *   Пропустите поле для SHA-1, оно не требуется для базовой настройки FCM.
    *   Нажмите **"Зарегистрировать приложение"**.

2.  **Загрузите `google-services.json`**
    *   На следующем шаге Firebase предложит скачать файл `google-services.json`.
    *   Скачайте его и поместите в директорию `android/app/` вашего проекта.

3.  **Проверка конфигурации Gradle**
    Capacitor обычно автоматически настраивает Gradle, но стоит проверить:
    *   **`android/build.gradle`**: Убедитесь, что плагин Google Services добавлен.
        ```groovy
        buildscript {
            dependencies {
                // ...
                classpath 'com.google.gms:google-services:4.4.1' // Убедитесь, что версия актуальна
            }
        }
        ```
    *   **`android/app/build.gradle`**: Проверьте применение плагина.
        ```groovy
        apply plugin: 'com.google.gms.google-services'
        ```

4.  **Настройка `AndroidManifest.xml`**
    *   Capacitor добавляет необходимые разрешения, но вы можете добавить метаданные для кастомизации иконки и цвета уведомлений.
    *   Откройте `android/app/src/main/AndroidManifest.xml` и добавьте в тег `<application>`:
        ```xml
        <!-- Иконка по умолчанию для Push-уведомлений -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher_round" />
        <!-- Цвет иконки -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/accent" />
        <!-- Канал уведомлений (для Android 8.0+) -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="@string/default_notification_channel_id"/>
        ```

5.  **Создайте канал уведомлений**
    *   В файле `android/app/src/main/res/values/strings.xml` добавьте:
        ```xml
        <string name="default_notification_channel_id" translatable="false">scoliologic_channel</string>
        <string name="default_notification_channel_name" translatable="false">Уведомления Сколиолоджик</string>
        ```

---

## Часть 3: Настройка iOS

1.  **Добавьте iOS-приложение в Firebase**
    *   В настройках проекта Firebase, в разделе **"Ваши приложения"**, нажмите на иконку iOS.
    *   **Bundle ID**: `ru.scoliologic.app` (из `capacitor.config.ts`).
    *   **App nickname**: `Сколиолоджик`.
    *   Нажмите **"Зарегистрировать приложение"**.

2.  **Загрузите `GoogleService-Info.plist`**
    *   Скачайте файл `GoogleService-Info.plist`.
    *   Откройте iOS-проект в Xcode (`npm run cap:ios`).
    *   Перетащите `GoogleService-Info.plist` в папку `App/App` в Xcode. Убедитесь, что стоит галочка **"Copy items if needed"**.

3.  **Создайте ключ APNs**
    *   Перейдите в [Apple Developer Console](https://developer.apple.com/account/resources/authkeys/list).
    *   Нажмите **"+"** для создания нового ключа.
    *   **Имя ключа**: `Scoliologic APNs Key`.
    *   Включите сервис **Apple Push Notifications service (APNs)**.
    *   Создайте и **скачайте `.p8` файл**. **Сохраните его, повторно скачать его будет невозможно!**
    *   Скопируйте **Key ID** и **Team ID**.

4.  **Загрузите ключ APNs в Firebase**
    *   В Firebase Console перейдите в **Project Settings → Cloud Messaging**.
    *   В разделе **"Конфигурации приложений Apple"**, загрузите ваш `.p8` ключ.
    *   Введите **Key ID** и **Team ID**.

5.  **Настройте Capabilities в Xcode**
    *   В Xcode выберите ваш проект, затем таргет `App`.
    *   Перейдите во вкладку **"Signing & Capabilities"**.
    *   Нажмите **"+ Capability"** и добавьте:
        1.  **Push Notifications**
        2.  **Background Modes**
    *   В `Background Modes` включите **Remote notifications**.

---

## Часть 4: Код приложения (Capacitor)

1.  **Установите плагин** (уже должен быть установлен):
    ```bash
    pnpm add @capacitor/push-notifications @capacitor/local-notifications
    ```

2.  **Реализуйте логику в приложении**
    Создайте хук или сервис для управления Push-уведомлениями.

    `client/src/hooks/usePushNotifications.ts`:
    ```typescript
    import { useState, useEffect } from 'react';
    import { Capacitor } from '@capacitor/core';
    import { PushNotifications } from '@capacitor/push-notifications';
    import { api } from '@/lib/api'; // Ваш tRPC-клиент

    export function usePushNotifications() {
      const [isRegistered, setIsRegistered] = useState(false);

      const register = async () => {
        if (Capacitor.getPlatform() === 'web') return;

        // 1. Проверка разрешений
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          throw new Error('User denied permissions!');
        }

        // 2. Регистрация в FCM/APNs
        await PushNotifications.register();
        setIsRegistered(true);
      };

      useEffect(() => {
        if (!isRegistered) return;

        // 3. Получение токена
        const regListener = PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          // 4. Отправка токена на бэкенд
          try {
            await api.user.savePushToken.mutate({ token: token.value });
            console.log('Push token saved to backend.');
          } catch (error) {
            console.error('Error saving push token:', error);
          }
        });

        // Ошибка регистрации
        const regErrorListener = PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration:', error);
        });

        // Уведомление получено, когда приложение открыто
        const foregroundListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          // Здесь можно показать локальное уведомление или обновить UI
        });

        // Пользователь нажал на уведомление
        const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed', notification.actionId, notification.inputValue);
          // Например, перенаправить на нужный экран
          // window.location.href = notification.notification.data.url;
        });

        return () => {
          regListener.then(l => l.remove());
          regErrorListener.then(l => l.remove());
          foregroundListener.then(l => l.remove());
          actionListener.then(l => l.remove());
        };
      }, [isRegistered]);

      return { register };
    }
    ```

3.  **Вызовите регистрацию**
    Вызовите `register()` после успешной авторизации пользователя.

---

## Часть 5: Бэкенд (Отправка уведомлений)

1.  **Установите Firebase Admin SDK**:
    ```bash
    pnpm add firebase-admin
    ```

2.  **Инициализируйте SDK**
    *   В Firebase Console: **Project Settings → Service accounts**.
    *   Нажмите **"Generate new private key"** и скачайте JSON-файл с ключами.
    *   Сохраните его в безопасном месте на сервере и используйте переменную окружения для пути к нему.

    `server/lib/firebase.ts`:
    ```typescript
    import * as admin from 'firebase-admin';

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_PATH!),
      });
    }

    export const fcm = admin.messaging();
    ```

3.  **Создайте эндпоинт для отправки**
    Пример функции для отправки уведомления пользователю.

    ```typescript
    import { fcm } from './firebase';

    async function sendPushNotification(userToken: string, title: string, body: string) {
      const message = {
        token: userToken,
        notification: {
          title,
          body,
        },
        data: {
          url: '/messages', // Дополнительные данные для deep link
        },
        apns: { // Конфигурация для iOS
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
        android: { // Конфигурация для Android
          notification: {
            channel_id: 'scoliologic_channel',
          },
        },
      };

      try {
        const response = await fcm.send(message);
        console.log('Successfully sent message:', response);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
    ```

---

## Часть 6: Тестирование

1.  **Запустите приложение на реальном устройстве** (эмуляторы/симуляторы могут не поддерживать Push).
2.  **Получите токен** и убедитесь, что он сохранился на бэкенде.
3.  **Используйте Firebase Console для тестовой отправки**:
    *   Перейдите в **Engage → Messaging**.
    *   Создайте новую кампанию.
    *   Введите заголовок и текст.
    *   Справа нажмите **"Send test message"**.
    *   Введите токен вашего устройства и отправьте.
4.  **Проверьте получение уведомления** как в открытом, так и в закрытом состоянии приложения.

## Возможные проблемы

*   **iOS**: Уведомления не приходят на симуляторе. Используйте реальное устройство.
*   **Android**: Устройство в режиме Doze (энергосбережение) может задерживать уведомления.
*   **Неверные ключи**: Убедитесь, что `google-services.json`, `GoogleService-Info.plist` и ключ APNs соответствуют вашему проекту.
*   **Bundle ID / Package Name**: Должны точно совпадать в Capacitor, Firebase и Apple Developer Console.
