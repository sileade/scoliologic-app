import React, { forwardRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { VariantProps } from 'class-variance-authority';

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
};

interface NativeButtonProps extends ButtonProps {
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
}

/**
 * Button component with native haptic feedback support
 * Falls back to regular button on web
 */
export const NativeButton = forwardRef<HTMLButtonElement, NativeButtonProps>(
  ({ hapticType = 'light', onClick, children, ...props }, ref) => {
    const { hapticFeedback, isNative } = useNativePlatform();

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isNative) {
        await hapticFeedback(hapticType);
      }
      onClick?.(e);
    };

    return (
      <Button ref={ref} onClick={handleClick} {...props}>
        {children}
      </Button>
    );
  }
);

NativeButton.displayName = 'NativeButton';
