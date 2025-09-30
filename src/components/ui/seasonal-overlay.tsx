import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SeasonalOverlayProps {
  children: React.ReactNode;
  className?: string;
}

// Utility function to determine current season
const getCurrentSeason = (): 'spring' | 'summer' | 'fall' | 'winter' => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
};

// Snowflake component for winter
const Snowflake: React.FC<{ delay: number; duration: number; left: number }> = ({ delay, duration, left }) => (
  <div
    className="absolute text-white/60 text-xs pointer-events-none animate-snowfall"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    ❄
  </div>
);

// Leaf component for fall
const Leaf: React.FC<{ delay: number; duration: number; left: number; rotation: number }> = ({ delay, duration, left, rotation }) => (
  <div
    className="absolute text-orange-500/70 text-sm pointer-events-none animate-leaf-fall"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      transform: `rotate(${rotation}deg)`,
    }}
  >
    🍂
  </div>
);

// Flower component for spring
const Flower: React.FC<{ delay: number; duration: number; left: number }> = ({ delay, duration, left }) => (
  <div
    className="absolute text-pink-400/60 text-sm pointer-events-none animate-flower-grow"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    🌸
  </div>
);

// Sun component for summer
const Sun: React.FC<{ delay: number; duration: number; left: number }> = ({ delay, duration, left }) => (
  <div
    className="absolute text-yellow-400/70 text-lg pointer-events-none animate-sun-glow"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    ☀️
  </div>
);

export const SeasonalOverlay: React.FC<SeasonalOverlayProps> = ({ children, className }) => {
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'fall' | 'winter'>('winter');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const season = getCurrentSeason();
    setCurrentSeason(season);
    setIsVisible(true);

    // Update season every hour to catch season changes
    const interval = setInterval(() => {
      const newSeason = getCurrentSeason();
      if (newSeason !== season) {
        setCurrentSeason(newSeason);
      }
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  const generateElements = () => {
    const elements = [];
    const count = 8; // Number of seasonal elements

    for (let i = 0; i < count; i++) {
      const delay = Math.random() * 5;
      const duration = 8 + Math.random() * 4; // 8-12 seconds
      const left = Math.random() * 100;

      switch (currentSeason) {
        case 'winter':
          elements.push(
            <Snowflake key={i} delay={delay} duration={duration} left={left} />
          );
          break;
        case 'fall':
          const rotation = Math.random() * 360;
          elements.push(
            <Leaf key={i} delay={delay} duration={duration} left={left} rotation={rotation} />
          );
          break;
        case 'spring':
          elements.push(
            <Flower key={i} delay={delay} duration={duration} left={left} />
          );
          break;
        case 'summer':
          elements.push(
            <Sun key={i} delay={delay} duration={duration} left={left} />
          );
          break;
      }
    }

    return elements;
  };

  const getSeasonalClasses = () => {
    switch (currentSeason) {
      case 'winter':
        return 'bg-gradient-to-br from-blue-50/20 to-blue-100/10 border-blue-200/20';
      case 'spring':
        return 'bg-gradient-to-br from-green-50/20 to-pink-50/10 border-green-200/20';
      case 'summer':
        return 'bg-gradient-to-br from-yellow-50/20 to-orange-50/10 border-yellow-200/20';
      case 'fall':
        return 'bg-gradient-to-br from-orange-50/20 to-red-50/10 border-orange-200/20';
      default:
        return '';
    }
  };

  if (!isVisible) return <>{children}</>;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Seasonal background overlay */}
      <div className={cn(
        'absolute inset-0 pointer-events-none transition-all duration-1000',
        getSeasonalClasses()
      )} />
      
      {/* Seasonal elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {generateElements()}
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Card-specific seasonal overlay with edge effects
export const SeasonalCardOverlay: React.FC<SeasonalOverlayProps> = ({ children, className }) => {
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'fall' | 'winter'>('winter');

  useEffect(() => {
    const season = getCurrentSeason();
    setCurrentSeason(season);
  }, []);

  const getCardSeasonalClasses = () => {
    switch (currentSeason) {
      case 'winter':
        return 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-blue-100/5 before:rounded-lg before:pointer-events-none';
      case 'spring':
        return 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-green-50/5 before:to-pink-50/5 before:rounded-lg before:pointer-events-none';
      case 'summer':
        return 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-yellow-50/5 before:to-orange-50/5 before:rounded-lg before:pointer-events-none';
      case 'fall':
        return 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-50/5 before:to-red-50/5 before:rounded-lg before:pointer-events-none';
      default:
        return '';
    }
  };

  const getEdgeEffects = () => {
    switch (currentSeason) {
      case 'winter':
        return (
          <>
            {/* Snow on edges */}
            <div className="absolute -top-1 left-2 text-white/40 text-xs">❄</div>
            <div className="absolute -top-1 right-4 text-white/30 text-xs">❄</div>
            <div className="absolute -bottom-1 left-6 text-white/35 text-xs">❄</div>
            <div className="absolute -bottom-1 right-2 text-white/40 text-xs">❄</div>
          </>
        );
      case 'fall':
        return (
          <>
            {/* Leaves on edges */}
            <div className="absolute -top-1 left-3 text-orange-500/50 text-sm">🍂</div>
            <div className="absolute -top-1 right-5 text-orange-600/40 text-sm">🍁</div>
            <div className="absolute -bottom-1 left-7 text-orange-500/45 text-sm">🍂</div>
            <div className="absolute -bottom-1 right-3 text-orange-600/50 text-sm">🍁</div>
          </>
        );
      case 'spring':
        return (
          <>
            {/* Flowers on edges */}
            <div className="absolute -top-1 left-4 text-pink-400/50 text-sm">🌸</div>
            <div className="absolute -top-1 right-6 text-pink-300/40 text-sm">🌺</div>
            <div className="absolute -bottom-1 left-8 text-pink-400/45 text-sm">🌸</div>
            <div className="absolute -bottom-1 right-4 text-pink-300/50 text-sm">🌺</div>
          </>
        );
      case 'summer':
        return (
          <>
            {/* Sun rays on edges */}
            <div className="absolute -top-1 left-5 text-yellow-400/50 text-sm">☀️</div>
            <div className="absolute -top-1 right-7 text-yellow-300/40 text-sm">🌞</div>
            <div className="absolute -bottom-1 left-9 text-yellow-400/45 text-sm">☀️</div>
            <div className="absolute -bottom-1 right-5 text-yellow-300/50 text-sm">🌞</div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn('relative', getCardSeasonalClasses(), className)}>
      {/* Edge effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {getEdgeEffects()}
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
