import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SeasonalVideoBackgroundProps {
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

// Utility function to determine current theme
const getCurrentTheme = (): 'light' | 'dark' => {
  const html = document.documentElement;
  return html.classList.contains('light') ? 'light' : 'dark';
};

// Generate CSS-based seasonal animations
const generateSeasonalCSS = (season: 'spring' | 'summer' | 'fall' | 'winter', theme: 'light' | 'dark') => {
  const isDark = theme === 'dark';
  
  switch (season) {
    case 'winter':
      return {
        background: isDark 
          ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)'
          : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
        particles: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          emoji: '❄',
          delay: Math.random() * 5,
          duration: 8 + Math.random() * 4,
          left: Math.random() * 100,
          size: 0.8 + Math.random() * 0.4,
          opacity: isDark ? 0.8 : 0.6
        }))
      };
    
    case 'fall':
      return {
        background: isDark 
          ? 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #f97316 100%)'
          : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)',
        particles: Array.from({ length: 15 }, (_, i) => ({
          id: i,
          emoji: Math.random() > 0.5 ? '🍂' : '🍁',
          delay: Math.random() * 5,
          duration: 6 + Math.random() * 3,
          left: Math.random() * 100,
          size: 0.9 + Math.random() * 0.3,
          opacity: isDark ? 0.7 : 0.5,
          rotation: Math.random() * 360
        }))
      };
    
    case 'spring':
      return {
        background: isDark 
          ? 'linear-gradient(135deg, #166534 0%, #16a34a 50%, #22c55e 100%)'
          : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)',
        particles: Array.from({ length: 12 }, (_, i) => ({
          id: i,
          emoji: Math.random() > 0.5 ? '🌸' : '🌺',
          delay: Math.random() * 5,
          duration: 7 + Math.random() * 3,
          left: Math.random() * 100,
          size: 0.8 + Math.random() * 0.4,
          opacity: isDark ? 0.6 : 0.4
        }))
      };
    
    case 'summer':
      return {
        background: isDark 
          ? 'linear-gradient(135deg, #ca8a04 0%, #eab308 50%, #facc15 100%)'
          : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
        particles: Array.from({ length: 8 }, (_, i) => ({
          id: i,
          emoji: Math.random() > 0.5 ? '☀️' : '🌞',
          delay: Math.random() * 5,
          duration: 10 + Math.random() * 5,
          left: Math.random() * 100,
          size: 1.2 + Math.random() * 0.3,
          opacity: isDark ? 0.8 : 0.6
        }))
      };
  }
};

// Particle component for seasonal effects
const SeasonalParticle: React.FC<{
  emoji: string;
  delay: number;
  duration: number;
  left: number;
  size: number;
  opacity: number;
  rotation?: number;
  season: 'spring' | 'summer' | 'fall' | 'winter';
}> = ({ emoji, delay, duration, left, size, opacity, rotation = 0, season }) => {
  const getAnimationClass = () => {
    switch (season) {
      case 'winter':
        return 'animate-snowfall';
      case 'fall':
        return 'animate-leaf-fall';
      case 'spring':
        return 'animate-flower-grow';
      case 'summer':
        return 'animate-sun-glow';
      default:
        return 'animate-snowfall';
    }
  };

  return (
    <div
      className={cn(
        'absolute pointer-events-none text-white/80',
        getAnimationClass()
      )}
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        fontSize: `${size}rem`,
        opacity,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {emoji}
    </div>
  );
};

export const SeasonalVideoBackground: React.FC<SeasonalVideoBackgroundProps> = ({ 
  children, 
  className 
}) => {
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'fall' | 'winter'>('winter');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const season = getCurrentSeason();
    const theme = getCurrentTheme();
    setCurrentSeason(season);
    setCurrentTheme(theme);
    setIsVisible(true);

    // Update season every hour to catch season changes
    const seasonInterval = setInterval(() => {
      const newSeason = getCurrentSeason();
      if (newSeason !== season) {
        setCurrentSeason(newSeason);
      }
    }, 3600000); // 1 hour

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const newTheme = getCurrentTheme();
      if (newTheme !== theme) {
        setCurrentTheme(newTheme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      clearInterval(seasonInterval);
      observer.disconnect();
    };
  }, []);

  if (!isVisible) return <>{children}</>;

  const seasonalData = generateSeasonalCSS(currentSeason, currentTheme);

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-gradient-card border border-border/50 min-h-[400px]', className)}>
      {/* Seasonal background */}
      <div 
        className="absolute inset-0 transition-all duration-1000 opacity-90"
        style={{
          background: seasonalData.background,
        }}
      />
      
      {/* Darker overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/70" />
      
      {/* Seasonal particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {seasonalData.particles.map((particle) => (
          <SeasonalParticle
            key={particle.id}
            emoji={particle.emoji}
            delay={particle.delay}
            duration={particle.duration}
            left={particle.left}
            size={particle.size}
            opacity={particle.opacity}
            rotation={particle.rotation}
            season={currentSeason}
          />
        ))}
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
