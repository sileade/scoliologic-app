/**
 * Lazy loading для страниц приложения
 * Уменьшает начальный размер бандла за счет code splitting
 */
import React, { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Компонент загрузки для Suspense
 */
function PageLoader(): React.ReactElement {
  return React.createElement('div', { className: 'mobile-page bg-gray-50' },
    React.createElement('div', { className: 'flex flex-col items-center justify-center min-h-[60vh]' },
      React.createElement(Loader2, { size: 32, className: 'text-teal-500 animate-spin mb-4' }),
      React.createElement('p', { className: 'text-muted-foreground text-sm' }, 'Загрузка...')
    )
  );
}

/**
 * HOC для оборачивания lazy-компонентов в Suspense
 */
function withSuspense<P extends object>(
  LazyComponent: ComponentType<P>,
  fallback: React.ReactNode = React.createElement(PageLoader)
): React.FC<P> {
  return function SuspenseWrapper(props: P): React.ReactElement {
    return React.createElement(Suspense, { fallback },
      React.createElement(LazyComponent, props)
    );
  };
}

// Lazy-loaded pages
export const Dashboard = withSuspense(lazy(() => import('./Dashboard')));
export const Messages = withSuspense(lazy(() => import('./Messages')));
export const Documents = withSuspense(lazy(() => import('./Documents')));
export const Devices = withSuspense(lazy(() => import('./Devices')));
export const Rehabilitation = withSuspense(lazy(() => import('./Rehabilitation')));
export const Profile = withSuspense(lazy(() => import('./Profile')));
export const Auth = withSuspense(lazy(() => import('./Auth')));

// Re-export PageLoader for custom usage
export { PageLoader };
