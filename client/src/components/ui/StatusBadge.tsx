/**
 * Переиспользуемый компонент бейджа статуса
 */
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Clock, XCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StatusVariant = 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'pending' 
  | 'neutral';

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  icon?: LucideIcon | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-orange-100 text-orange-700 border-orange-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-teal-100 text-teal-700 border-teal-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
};

const defaultIcons: Record<StatusVariant, LucideIcon> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Clock,
  pending: Loader2,
  neutral: Clock,
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

const iconSizes = {
  sm: 10,
  md: 12,
  lg: 14,
};

export function StatusBadge({ 
  variant, 
  label, 
  icon,
  size = 'md',
  className 
}: StatusBadgeProps) {
  const Icon = icon === null ? null : (icon || defaultIcons[variant]);
  const iconSize = iconSizes[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {Icon && (
        <Icon 
          size={iconSize} 
          className={variant === 'pending' ? 'animate-spin' : undefined}
        />
      )}
      {label}
    </span>
  );
}

/**
 * Хелпер для создания конфигурации статусов
 */
export function createStatusConfig<T extends string>(
  config: Record<T, { variant: StatusVariant; label: string; icon?: LucideIcon | null }>
) {
  return config;
}
