/**
 * Переиспользуемый компонент состояния загрузки
 */
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const sizeConfig = {
  sm: { icon: 20, text: 'text-xs' },
  md: { icon: 32, text: 'text-sm' },
  lg: { icon: 48, text: 'text-base' },
};

export function LoadingState({ 
  message = 'Загрузка...', 
  size = 'md',
  className,
  fullScreen = false 
}: LoadingStateProps) {
  const config = sizeConfig[size];

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center",
      fullScreen ? "min-h-screen" : "py-12",
      className
    )}>
      <Loader2 
        size={config.icon} 
        className="text-teal-500 animate-spin mb-4" 
      />
      {message && (
        <p className={cn("text-muted-foreground", config.text)}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Скелетон для карточек
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-4 shadow-sm animate-pulse",
      className
    )}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Скелетон для списков
 */
export function ListSkeleton({ 
  count = 3, 
  className 
}: { 
  count?: number; 
  className?: string 
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
