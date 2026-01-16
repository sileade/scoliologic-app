import React from 'react';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { cn } from '@/lib/utils';

interface SafeAreaViewProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  mode?: 'padding' | 'margin';
}

/**
 * SafeAreaView component that handles safe area insets for native platforms
 * On web, it uses CSS env() variables for PWA support
 */
export function SafeAreaView({ 
  children, 
  className,
  edges = ['top', 'bottom'],
  mode = 'padding'
}: SafeAreaViewProps) {
  const { isNative, safeAreaInsets } = useNativePlatform();

  const style: React.CSSProperties = {};

  if (isNative) {
    // Use calculated safe area insets for native
    if (edges.includes('top')) {
      style[mode === 'padding' ? 'paddingTop' : 'marginTop'] = safeAreaInsets.top;
    }
    if (edges.includes('bottom')) {
      style[mode === 'padding' ? 'paddingBottom' : 'marginBottom'] = safeAreaInsets.bottom;
    }
    if (edges.includes('left')) {
      style[mode === 'padding' ? 'paddingLeft' : 'marginLeft'] = safeAreaInsets.left;
    }
    if (edges.includes('right')) {
      style[mode === 'padding' ? 'paddingRight' : 'marginRight'] = safeAreaInsets.right;
    }
  }

  return (
    <div 
      className={cn(
        // CSS env() fallback for web/PWA
        !isNative && edges.includes('top') && (mode === 'padding' ? 'pt-safe' : 'mt-safe'),
        !isNative && edges.includes('bottom') && (mode === 'padding' ? 'pb-safe' : 'mb-safe'),
        !isNative && edges.includes('left') && (mode === 'padding' ? 'pl-safe' : 'ml-safe'),
        !isNative && edges.includes('right') && (mode === 'padding' ? 'pr-safe' : 'mr-safe'),
        className
      )}
      style={isNative ? style : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Hook to get safe area inset values
 */
export function useSafeAreaInsets() {
  const { safeAreaInsets, isNative } = useNativePlatform();
  
  if (isNative) {
    return safeAreaInsets;
  }

  // Return CSS env() based values for web
  return {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  };
}
