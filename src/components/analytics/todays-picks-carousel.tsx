import React, { useState, useEffect, useRef } from 'react';
import { PredictionCard } from './prediction-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodaysPicksCarouselProps {
  predictions: any[];
  isSubscribed: boolean;
  onClose: () => void;
  sport: string;
}

export const TodaysPicksCarousel = ({ 
  predictions, 
  isSubscribed, 
  onClose, 
  sport 
}: TodaysPicksCarouselProps) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  // Auto-scroll every 10 seconds
  useEffect(() => {
    if (isPlaying && predictions.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % predictions.length;
          setIsTransitioning(true);
          
          // Clear transition state after animation completes
          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
          }
          transitionTimeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
          }, 500); // Match animation duration
          
          return nextIndex;
        });
      }, 10000); // 10 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [isPlaying, predictions.length]);

  const goToPrevious = () => {
    if (isTransitioning) return;
    
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex === 0 ? predictions.length - 1 : prevIndex - 1;
      setIsTransitioning(true);
      
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
      
      return newIndex;
    });
  };

  const goToNext = () => {
    if (isTransitioning) return;
    
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % predictions.length;
      setIsTransitioning(true);
      
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
      
      return newIndex;
    });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    
    setCurrentIndex(index);
    setIsTransitioning(true);
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Top Picks Available</h3>
        <p className="text-sm text-muted-foreground">Check back later for today's best predictions</p>
      </div>
    );
  }

  const currentPrediction = predictions[currentIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Today's Top Picks - {sport.toUpperCase()}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Top {predictions.length} highest confidence predictions for {sport.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-gradient-accent">
            {predictions.length} PICKS
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Main Card Display */}
        <div className="relative overflow-hidden rounded-lg">
          <div 
            className={cn(
              "transition-all duration-500 ease-in-out transform",
              isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
            )}
          >
            <div className="w-full max-w-sm mx-auto relative">
              <PredictionCard
                key={currentPrediction.id || currentIndex}
                {...currentPrediction}
                isSubscribed={isSubscribed}
              />
              
              {/* Subscription overlay for free users */}
              <SubscriptionOverlay
                isVisible={!isSubscribed}
                icon={<Play className="w-8 h-8 text-primary" />}
                title="Premium Content"
                description="Subscribe to view today's top picks"
                buttonText="Upgrade to Pro"
                onUpgrade={handleUpgrade}
              />
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            disabled={isTransitioning || predictions.length <= 1}
            className="h-10 w-10 rounded-full p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Play/Pause Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            className="h-10 w-10 rounded-full p-0"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Next Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={isTransitioning || predictions.length <= 1}
            className="h-10 w-10 rounded-full p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {predictions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} of {predictions.length}
          </span>
        </div>
      </div>

    </div>
  );
};
