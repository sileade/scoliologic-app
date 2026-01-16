import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode, ErrorInfo } from "react";
import { errorLogger } from "@/lib/errorLogger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error locally with component stack
    errorLogger.error(error.message, error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  render() {
    if (this.state.hasError) {
      // Check if it's an auth error
      const isAuthError = this.state.error?.message?.includes('UNAUTHORIZED') || 
                          this.state.error?.message?.includes('401') ||
                          this.state.error?.message?.includes('auth');
      
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-md p-8 text-center">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl font-semibold mb-2">
              {isAuthError ? 'Требуется авторизация' : 'Произошла ошибка'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isAuthError 
                ? 'Пожалуйста, войдите в систему для продолжения' 
                : 'Попробуйте перезагрузить страницу'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6 text-left">
                <pre className="text-xs text-muted-foreground whitespace-break-spaces">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-full",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer transition-opacity"
              )}
            >
              <RotateCcw size={16} />
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
