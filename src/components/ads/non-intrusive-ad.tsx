import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  X, 
  ExternalLink, 
  Shield, 
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';
import { adSenseService, type AdConfig } from '@/services/adsense-service';

interface NonIntrusiveAdProps {
  config: AdConfig;
  location: string;
  className?: string;
  showLabel?: boolean;
  allowDismiss?: boolean;
  userSubscription?: string;
  onAdLoaded?: () => void;
  onAdError?: () => void;
}

export const NonIntrusiveAd: React.FC<NonIntrusiveAdProps> = ({
  config,
  location,
  className = '',
  showLabel = true,
  allowDismiss = true,
  userSubscription = 'free',
  onAdLoaded,
  onAdError
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAdBlocked, setIsAdBlocked] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadAd = async () => {
      try {
        // Check if AdSense is ready
        if (!adSenseService.isReady()) {
          await adSenseService.initialize();
        }

        // Check for ad blocker
        if (adSenseService.isAdBlocked()) {
          setIsAdBlocked(true);
          onAdError?.();
          return;
        }

        // Create ad element
        const adElement = adSenseService.createAdElement(config);
        if (!adElement || !adRef.current) return;

        // Append ad to container
        adRef.current.appendChild(adElement);

        // Push ad to AdSense
        adSenseService.pushAd(adElement);

        // Set loaded state
        setIsLoaded(true);
        onAdLoaded?.();

        // Handle ad load timeout
        setTimeout(() => {
          if (!isLoaded) {
            setLoadError(true);
            onAdError?.();
          }
        }, 5000);

      } catch (error) {
        console.error('Failed to load ad:', error);
        setLoadError(true);
        onAdError?.();
      }
    };

    loadAd();
  }, [config, onAdLoaded, onAdError, isLoaded]);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleAdClick = () => {
    // Track ad clicks for analytics
    console.log('Ad clicked:', config.id);
  };

  // Don't render if user has paid subscription
  if (userSubscription === 'pro' || userSubscription === 'premium') {
    return null;
  }

  // Don't render if dismissed or ad blocked
  if (isDismissed || isAdBlocked) {
    return null;
  }

  // Show loading state
  if (!isLoaded && !loadError) {
    return (
      <Card className={`border-dashed border-2 border-muted ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <div className="animate-pulse text-sm">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <Card className={`border-dashed border-2 border-muted ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <div className="text-center">
              <Shield className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm">Ad blocked</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Ad Label */}
      {showLabel && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-xs bg-white/90 text-black">
            <TrendingUp className="w-3 h-3 mr-1" />
            Ad
          </Badge>
        </div>
      )}

      {/* Dismiss Button */}
      {allowDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 z-10 h-6 w-6 p-0 bg-white/90 hover:bg-white"
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      {/* Ad Container */}
      <CardContent className="p-0">
        <div 
          ref={adRef}
          className="relative"
          onClick={handleAdClick}
        />
      </CardContent>

      {/* Ad Footer */}
      <div className="px-3 py-2 bg-muted/30 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <span>Sponsored</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Supports Statpedia</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
