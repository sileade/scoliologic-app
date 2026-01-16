/**
 * Переиспользуемый компонент состояния ошибки
 */
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ErrorType = 'generic' | 'network' | 'server' | 'notFound';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

const errorConfig: Record<ErrorType, { icon: LucideIcon; title: string; description: string }> = {
  generic: {
    icon: AlertTriangle,
    title: 'Произошла ошибка',
    description: 'Не удалось загрузить данные. Попробуйте позже.',
  },
  network: {
    icon: WifiOff,
    title: 'Нет подключения',
    description: 'Проверьте интернет-соединение и попробуйте снова.',
  },
  server: {
    icon: ServerCrash,
    title: 'Ошибка сервера',
    description: 'Сервер временно недоступен. Попробуйте позже.',
  },
  notFound: {
    icon: AlertTriangle,
    title: 'Не найдено',
    description: 'Запрашиваемые данные не найдены.',
  },
};

export function ErrorState({ 
  type = 'generic',
  title,
  description,
  onRetry,
  retryLabel = 'Повторить',
  className 
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "bg-red-50 rounded-2xl p-6 text-center",
      className
    )}>
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <Icon size={28} className="text-red-500" />
      </div>
      <h3 className="font-semibold text-red-800 mb-1">
        {title || config.title}
      </h3>
      <p className="text-sm text-red-600 mb-4">
        {description || config.description}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
        >
          <RefreshCw size={16} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Компактная версия для виджетов
 */
export function ErrorStateCompact({ 
  message = 'Ошибка загрузки',
  onRetry,
  className 
}: { 
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn(
      "bg-orange-50 rounded-xl p-4 border border-orange-200",
      className
    )}>
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-orange-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-800">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-orange-600 underline mt-1"
            >
              Повторить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
