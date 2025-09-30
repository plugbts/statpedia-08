import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubscriptionOverlayProps {
  isVisible: boolean;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  buttonText?: string;
  className?: string;
  size?: 'default' | 'compact' | 'small';
}

export const SubscriptionOverlay = ({
  isVisible,
  icon,
  title = "Premium Content",
  description = "Subscribe to view this content",
  buttonText = "Upgrade to Premium",
  className,
  size = 'default'
}: SubscriptionOverlayProps) => {
  if (!isVisible) return null;

  const sizeClasses = {
    default: {
      iconContainer: "w-16 h-16 mb-4",
      icon: "w-8 h-8",
      title: "text-lg font-semibold mb-2",
      description: "text-sm mb-4",
      button: "bg-gradient-primary"
    },
    compact: {
      iconContainer: "w-12 h-12 mb-3",
      icon: "w-6 h-6",
      title: "text-base font-semibold mb-1",
      description: "text-xs mb-3",
      button: "bg-gradient-primary text-sm px-3 py-1.5 h-8"
    },
    small: {
      iconContainer: "w-10 h-10 mb-2",
      icon: "w-5 h-5",
      title: "text-sm font-semibold mb-1",
      description: "text-xs mb-2",
      button: "bg-gradient-primary text-xs px-2 py-1 h-6"
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={cn(
      "absolute inset-0 bg-gradient-to-br from-background/90 to-background/70 rounded-lg flex items-center justify-center z-20",
      size === 'small' && "p-4",
      className
    )}>
      <div className="text-center">
        <div className={cn("bg-primary/20 rounded-full flex items-center justify-center mx-auto", currentSize.iconContainer)}>
          {icon || (
            <svg className={cn("text-primary", currentSize.icon)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>
        <h3 className={cn("text-foreground", currentSize.title)}>{title}</h3>
        <p className={cn("text-muted-foreground", currentSize.description)}>{description}</p>
        <Button className={currentSize.button}>
          {buttonText}
        </Button>
      </div>
    </div>
  );
};
