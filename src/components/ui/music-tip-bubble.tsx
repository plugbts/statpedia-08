import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Volume2, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MusicTipBubbleProps {
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // Duration in milliseconds
}

export const MusicTipBubble: React.FC<MusicTipBubbleProps> = ({ 
  isVisible, 
  onClose, 
  duration = 10000 // 10 seconds default
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none">
      <div
        className={cn(
          "relative transform transition-all duration-300 ease-out",
          isAnimating 
            ? "translate-y-0 opacity-100 scale-100" 
            : "translate-y-2 opacity-0 scale-95"
        )}
      >
        {/* 3D Bubble Container */}
        <div className="relative">
          {/* Shadow/Depth Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent rounded-2xl blur-sm transform translate-y-1 scale-105" />
          
          {/* Main Bubble */}
          <div className="relative bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-md border border-primary/30 rounded-2xl p-4 shadow-2xl">
            {/* 3D Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
            
            {/* Content */}
            <div className="relative flex items-center gap-3">
              {/* Music Icon */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium leading-tight">
                  <span className="block">Ambient music playing</span>
                  <span className="text-white/80 text-xs">
                    Click pause to stop anytime
                  </span>
                </p>
              </div>
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-white/20 text-white/80 hover:text-white transition-colors pointer-events-auto"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Animated Pulse Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-transparent animate-pulse opacity-50" />
          </div>
          
          {/* Floating Particles Effect */}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
          <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Speech Bubble Tail */}
        <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary/90 transform rotate-45" />
      </div>
    </div>
  );
};
