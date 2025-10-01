import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';

interface FeatureTooltipProps {
  onDismiss: () => void;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show tooltip after a short delay for better UX
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className="fixed top-20 left-4 z-[60] animate-slide-down">
      <Card className="bg-gradient-card border-2 border-primary shadow-glow max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-1">
                💡 Pro Tip!
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Click the <span className="font-semibold text-foreground">Statpedia logo</span> to access exclusive features like Strikeout Center, Most Likely, Analytics, and more!
              </p>
              <Button
                onClick={handleDismiss}
                size="sm"
                className="bg-gradient-primary hover:shadow-glow"
              >
                Got it!
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
