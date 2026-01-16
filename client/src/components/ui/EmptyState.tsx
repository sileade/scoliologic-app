/**
 * Переиспользуемый компонент пустого состояния
 */
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { FileQuestion } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  /** Компактный режим для встраивания в карточки */
  compact?: boolean;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className,
  compact = false
}: EmptyStateProps) {
  // Определяем, является ли icon компонентом Lucide или ReactNode
  const renderIcon = () => {
    if (!icon) {
      return <FileQuestion size={compact ? 24 : 32} className="text-gray-400" />;
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent size={compact ? 24 : 32} className="text-gray-400" />;
    }
    return icon as ReactNode;
  };

  if (compact) {
    return (
      <div className={cn(
        "bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100",
        className
      )}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            {renderIcon()}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600 transition-colors active:scale-95"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-2xl p-8 text-center shadow-sm",
      className
    )}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        {renderIcon()}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
