import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';

export type Platform = 'web' | 'ios' | 'android';

interface NativePlatformState {
  platform: Platform;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

interface NativePlatformActions {
  hapticFeedback: (type?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => Promise<void>;
  setStatusBarStyle: (style: 'light' | 'dark') => Promise<void>;
  hideStatusBar: () => Promise<void>;
  showStatusBar: () => Promise<void>;
  hideSplashScreen: () => Promise<void>;
  exitApp: () => Promise<void>;
}

export function useNativePlatform(): NativePlatformState & NativePlatformActions {
  const [state, setState] = useState<NativePlatformState>(() => {
    const platform = Capacitor.getPlatform() as Platform;
    return {
      platform,
      isNative: Capacitor.isNativePlatform(),
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isWeb: platform === 'web',
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
      keyboardHeight: 0,
      isKeyboardVisible: false,
    };
  });

  // Initialize safe area insets
  useEffect(() => {
    if (state.isNative) {
      // Get safe area insets from CSS env variables
      const computeSafeAreaInsets = () => {
        const style = getComputedStyle(document.documentElement);
        setState(prev => ({
          ...prev,
          safeAreaInsets: {
            top: parseInt(style.getPropertyValue('--sat') || '0', 10) || 
                 parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0', 10),
            bottom: parseInt(style.getPropertyValue('--sab') || '0', 10) ||
                    parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
            left: parseInt(style.getPropertyValue('--sal') || '0', 10),
            right: parseInt(style.getPropertyValue('--sar') || '0', 10),
          },
        }));
      };

      computeSafeAreaInsets();
      window.addEventListener('resize', computeSafeAreaInsets);
      return () => window.removeEventListener('resize', computeSafeAreaInsets);
    }
  }, [state.isNative]);

  // Keyboard listeners for native platforms
  useEffect(() => {
    if (state.isNative) {
      const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
        setState(prev => ({
          ...prev,
          keyboardHeight: info.keyboardHeight,
          isKeyboardVisible: true,
        }));
      });

      const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        setState(prev => ({
          ...prev,
          keyboardHeight: 0,
          isKeyboardVisible: false,
        }));
      });

      return () => {
        showListener.then(l => l.remove());
        hideListener.then(l => l.remove());
      };
    }
  }, [state.isNative]);

  // Back button handler for Android
  useEffect(() => {
    if (state.isAndroid) {
      const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });

      return () => {
        backButtonListener.then(l => l.remove());
      };
    }
  }, [state.isAndroid]);

  // Hide splash screen on mount
  useEffect(() => {
    if (state.isNative) {
      SplashScreen.hide();
    }
  }, [state.isNative]);

  // Actions
  const hapticFeedback = useCallback(async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (!state.isNative) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
      }
    } catch (e) {
      console.warn('Haptics not available:', e);
    }
  }, [state.isNative]);

  const setStatusBarStyle = useCallback(async (style: 'light' | 'dark') => {
    if (!state.isNative) return;

    try {
      await StatusBar.setStyle({
        style: style === 'light' ? Style.Light : Style.Dark,
      });
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  }, [state.isNative]);

  const hideStatusBar = useCallback(async () => {
    if (!state.isNative) return;

    try {
      await StatusBar.hide();
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  }, [state.isNative]);

  const showStatusBar = useCallback(async () => {
    if (!state.isNative) return;

    try {
      await StatusBar.show();
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  }, [state.isNative]);

  const hideSplashScreen = useCallback(async () => {
    if (!state.isNative) return;

    try {
      await SplashScreen.hide();
    } catch (e) {
      console.warn('SplashScreen not available:', e);
    }
  }, [state.isNative]);

  const exitApp = useCallback(async () => {
    if (!state.isNative) return;

    try {
      await App.exitApp();
    } catch (e) {
      console.warn('App exit not available:', e);
    }
  }, [state.isNative]);

  return {
    ...state,
    hapticFeedback,
    setStatusBarStyle,
    hideStatusBar,
    showStatusBar,
    hideSplashScreen,
    exitApp,
  };
}

// Utility hook for haptic feedback on button press
export function useHapticButton(type: 'light' | 'medium' | 'heavy' = 'light') {
  const { hapticFeedback, isNative } = useNativePlatform();

  const onClick = useCallback(async (callback?: () => void) => {
    if (isNative) {
      await hapticFeedback(type);
    }
    callback?.();
  }, [hapticFeedback, isNative, type]);

  return onClick;
}
