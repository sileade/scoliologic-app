# Мобильные приложения Сколиолоджик

Приложение доступно на трёх платформах:
- **Web** (PWA) - работает в любом браузере
- **Android** - нативное приложение для Android 5.0+
- **iOS** - нативное приложение для iPhone и iPad (iOS 13+)

## Архитектура

Проект использует **Capacitor** для создания нативных приложений из единой кодовой базы React.

```
scoliologic-app/
├── client/                 # React приложение (общий код)
├── android/               # Android проект (Capacitor)
├── ios/                   # iOS проект (Capacitor)
└── capacitor.config.ts    # Конфигурация Capacitor
```

## Требования для разработки

### Android
- Android Studio Arctic Fox или новее
- Android SDK 21+ (Android 5.0 Lollipop)
- Java 11+

### iOS
- macOS с Xcode 13+
- CocoaPods
- Apple Developer Account (для публикации)

## Команды сборки

```bash
# Сборка веб-версии
npm run build

# Синхронизация с мобильными проектами
npm run cap:sync

# Сборка для Android
npm run build:android

# Сборка для iOS
npm run build:ios

# Сборка для всех платформ
npm run build:mobile

# Открыть проект в Android Studio
npm run cap:android

# Открыть проект в Xcode
npm run cap:ios
```

## Нативные функции

### Реализованные плагины

| Плагин | Описание | Использование |
|--------|----------|---------------|
| `@capacitor/app` | Управление жизненным циклом | Back button, deep links |
| `@capacitor/haptics` | Тактильная обратная связь | Вибрация при нажатии |
| `@capacitor/keyboard` | Управление клавиатурой | Автоматическое скрытие |
| `@capacitor/splash-screen` | Экран загрузки | Брендированный splash |
| `@capacitor/status-bar` | Статус-бар | Цвет и стиль |
| `@capacitor/push-notifications` | Push-уведомления | Напоминания |
| `@capacitor/local-notifications` | Локальные уведомления | Офлайн-напоминания |

### Использование в коде

```tsx
import { useNativePlatform } from '@/hooks/useNativePlatform';

function MyComponent() {
  const { 
    isNative, 
    isIOS, 
    isAndroid, 
    hapticFeedback 
  } = useNativePlatform();

  const handleClick = async () => {
    await hapticFeedback('light');
    // ... остальная логика
  };

  return (
    <button onClick={handleClick}>
      {isNative ? 'Нативное приложение' : 'Веб-версия'}
    </button>
  );
}
```

## Safe Area

Для корректного отображения на устройствах с вырезами (notch) используйте:

```tsx
import { SafeAreaView } from '@/components/SafeAreaView';

function Screen() {
  return (
    <SafeAreaView edges={['top', 'bottom']}>
      <Content />
    </SafeAreaView>
  );
}
```

Или CSS классы:
```css
.pt-safe { padding-top: env(safe-area-inset-top); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
```

## Сборка релизных версий

### Android APK/AAB

1. Откройте проект в Android Studio:
   ```bash
   npm run cap:android
   ```

2. В Android Studio: Build → Generate Signed Bundle/APK

3. Выберите тип сборки:
   - **APK** - для прямой установки
   - **AAB** - для Google Play Store

### iOS IPA

1. Откройте проект в Xcode:
   ```bash
   npm run cap:ios
   ```

2. В Xcode: Product → Archive

3. Распространение:
   - **App Store Connect** - для публикации
   - **Ad Hoc** - для тестирования
   - **Enterprise** - для корпоративного распространения

## Конфигурация

### capacitor.config.ts

```typescript
const config: CapacitorConfig = {
  appId: 'ru.scoliologic.app',
  appName: 'Сколиолоджик',
  webDir: 'dist/public',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3B82F6',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#3B82F6',
    },
  },
};
```

## Deep Links

Приложение поддерживает deep links:

```
scoliologic://messages
scoliologic://rehabilitation
scoliologic://devices
```

### Android (AndroidManifest.xml)
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="scoliologic" />
</intent-filter>
```

### iOS (Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>scoliologic</string>
        </array>
    </dict>
</array>
```

## Push-уведомления

### Настройка Firebase (Android)

1. Создайте проект в Firebase Console
2. Скачайте `google-services.json`
3. Поместите в `android/app/`

### Настройка APNs (iOS)

1. Создайте APNs ключ в Apple Developer Portal
2. Загрузите в Firebase Console
3. Настройте Capabilities в Xcode

## Тестирование

### Android
```bash
# Запуск на эмуляторе
npx cap run android

# Запуск на устройстве
npx cap run android --target=<device-id>
```

### iOS
```bash
# Запуск на симуляторе
npx cap run ios

# Запуск на устройстве
npx cap run ios --target=<device-id>
```

## Отладка

### Chrome DevTools (Android)
1. Включите USB-отладку на устройстве
2. Откройте `chrome://inspect` в Chrome
3. Выберите приложение

### Safari Web Inspector (iOS)
1. Включите Web Inspector в настройках Safari на устройстве
2. Подключите устройство к Mac
3. В Safari: Develop → [Device Name] → [App]

## Известные ограничения

1. **iOS**: Требуется macOS для сборки
2. **Push-уведомления**: Требуется настройка Firebase/APNs
3. **Биометрия**: Требуется дополнительный плагин

## Обновление

При обновлении зависимостей:

```bash
# Обновить Capacitor
pnpm update @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# Синхронизировать проекты
npm run cap:sync
```

## Публикация

### Google Play Store
1. Создайте аккаунт разработчика ($25 единоразово)
2. Создайте приложение в Google Play Console
3. Загрузите AAB файл
4. Заполните информацию о приложении
5. Отправьте на проверку

### Apple App Store
1. Создайте аккаунт разработчика ($99/год)
2. Создайте приложение в App Store Connect
3. Загрузите через Xcode/Transporter
4. Заполните информацию о приложении
5. Отправьте на проверку

## Поддержка

При возникновении проблем:
1. Проверьте логи в Android Studio/Xcode
2. Используйте `npx cap doctor` для диагностики
3. Обратитесь к [документации Capacitor](https://capacitorjs.com/docs)
