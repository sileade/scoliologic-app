/**
 * Error Boundary компонент для перехвата ошибок в React-компонентах
 * Поддерживает разные уровни ошибок: critical, page, widget
 */
import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home, RefreshCw } from "lucide-react";
import { Component, ReactNode, ErrorInfo } from "react";
import { errorLogger } from "@/lib/errorLogger";

type ErrorLevel = 'critical' | 'page' | 'widget';

interface Props {
  children: ReactNode;
  level?: ErrorLevel;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error locally with component stack
    errorLogger.error(error.message, error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      level: this.props.level || 'widget',
    });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Check if it's an auth error
      const isAuthError = this.state.error?.message?.includes('UNAUTHORIZED') || 
                          this.state.error?.message?.includes('401') ||
                          this.state.error?.message?.includes('auth');
      
      const { level = 'widget' } = this.props;

      // Widget-level error (compact)
      if (level === 'widget') {
        return (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  Ошибка загрузки компонента
                </p>
                <button
                  onClick={this.handleRetry}
                  className="text-sm text-orange-600 underline mt-1"
                >
                  Повторить
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Page-level error
      if (level === 'page') {
        return (
          <div className="mobile-page bg-gray-50">
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
              <div className="w-16 h-16 mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle size={32} className="text-orange-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {isAuthError ? 'Требуется авторизация' : 'Ошибка загрузки'}
              </h2>
              <p className="text-muted-foreground text-center mb-6 max-w-xs">
                {isAuthError 
                  ? 'Войдите в систему для продолжения'
                  : 'Не удалось загрузить содержимое страницы'}
              </p>
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg font-medium"
              >
                <RefreshCw size={18} />
                Попробовать снова
              </button>
            </div>
          </div>
        );
      }

      // Critical error - full page (default for backward compatibility)
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-md p-8 text-center bg-white rounded-2xl shadow-lg">
            <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-500" />
            </div>

            <h2 className="text-xl font-semibold mb-2">
              {isAuthError ? 'Требуется авторизация' : 'Критическая ошибка'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isAuthError 
                ? 'Пожалуйста, войдите в систему для продолжения' 
                : 'Произошла непредвиденная ошибка. Перезагрузите страницу.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
              <details className="w-full mb-6 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  Подробности ошибки
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-40">
                  {this.state.error.stack}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-gray-100 text-gray-700",
                  "hover:bg-gray-200 transition-colors"
                )}
              >
                <RotateCcw size={16} />
                Повторить
              </button>
              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-teal-500 text-white",
                  "hover:bg-teal-600 transition-colors"
                )}
              >
                <Home size={16} />
                На главную
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * HOC для оборачивания компонентов в ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<Props, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
