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
}

export const SubscriptionOverlay = ({
  isVisible,
  icon,
  title = "Premium Content",
  description = "Subscribe to view this content",
  buttonText = "Upgrade to Premium",
  className
}: SubscriptionOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 bg-gradient-to-br from-background/90 to-background/70 rounded-lg flex items-center justify-center z-20",
      className
    )}>
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon || (
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button className="bg-gradient-primary">
          {buttonText}
        </Button>
      </div>
    </div>
  );
};
