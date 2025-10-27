import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SeasonalCardBackgroundProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
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

// Generate CSS-based seasonal animations for cards
const generateSeasonalCardCSS = (
  season: 'spring' | 'summer' | 'fall' | 'winter', 
  theme: 'light' | 'dark',
  intensity: 'subtle' | 'medium' | 'strong'
) => {
  const isDark = theme === 'dark';
  const intensityMultiplier = intensity === 'subtle' ? 0.3 : intensity === 'medium' ? 0.6 : 1.0;
  
  switch (season) {
    case 'winter':
      return {
        background: isDark 
          ? `linear-gradient(135deg, rgba(30, 58, 138, ${0.1 * intensityMultiplier}) 0%, rgba(30, 64, 175, ${0.15 * intensityMultiplier}) 50%, rgba(59, 130, 246, ${0.1 * intensityMultiplier}) 100%)`
          : `linear-gradient(135deg, rgba(219, 234, 254, ${0.2 * intensityMultiplier}) 0%, rgba(191, 219, 254, ${0.3 * intensityMultiplier}) 50%, rgba(147, 197, 253, ${0.2 * intensityMultiplier}) 100%)`,
        particles: Array.from({ length: Math.floor(8 * intensityMultiplier) }, (_, i) => ({
          id: i,
          emoji: '❄',
          delay: Math.random() * 3,
          duration: 6 + Math.random() * 3,
          left: Math.random() * 100,
          size: 0.6 + Math.random() * 0.3,
          opacity: (isDark ? 0.4 : 0.3) * intensityMultiplier
        }))
      };
    
    case 'fall':
      return {
        background: isDark 
          ? `linear-gradient(135deg, rgba(124, 45, 18, ${0.1 * intensityMultiplier}) 0%, rgba(234, 88, 12, ${0.15 * intensityMultiplier}) 50%, rgba(249, 115, 22, ${0.1 * intensityMultiplier}) 100%)`
          : `linear-gradient(135deg, rgba(254, 215, 170, ${0.2 * intensityMultiplier}) 0%, rgba(253, 186, 116, ${0.3 * intensityMultiplier}) 50%, rgba(251, 146, 60, ${0.2 * intensityMultiplier}) 100%)`,
        particles: Array.from({ length: Math.floor(6 * intensityMultiplier) }, (_, i) => ({
          id: i,
          emoji: Math.random() > 0.5 ? '🍂' : '🍁',
          delay: Math.random() * 3,
          duration: 5 + Math.random() * 2,
          left: Math.random() * 100,
          size: 0.7 + Math.random() * 0.2,
          opacity: (isDark ? 0.3 : 0.2) * intensityMultiplier,
          rotation: Math.random() * 360
        }))
      };
    
    case 'spring':
      return {
        background: isDark 
          ? `linear-gradient(135deg, rgba(22, 101, 52, ${0.1 * intensityMultiplier}) 0%, rgba(22, 163, 74, ${0.15 * intensityMultiplier}) 50%, rgba(34, 197, 94, ${0.1 * intensityMultiplier}) 100%)`
          : `linear-gradient(135deg, rgba(220, 252, 231, ${0.2 * intensityMultiplier}) 0%, rgba(187, 247, 208, ${0.3 * intensityMultiplier}) 50%, rgba(134, 239, 172, ${0.2 * intensityMultiplier}) 100%)`,
        particles: Array.from({ length: Math.floor(5 * intensityMultiplier) }, (_, i) => ({
          id: i,
          emoji: Math.random() > 0.5 ? '🌸' : '🌺',
          delay: Math.random() * 3,
          duration: 6 + Math.random() * 2,
          left: Math.random() * 100,
          size: 0.6 + Math.random() * 0.3,
          opacity: (isDark ? 0.3 : 0.2) * intensityMultiplier
        }))
      };
    
    case 'summer':
      return {
        background: isDark 
          ? `linear-gradient(135deg, rgba(202, 138, 4, ${0.1 * intensityMultiplier}) 0%, rgba(234, 179, 8, ${0.15 * intensityMultiplier}) 50%, rgba(250, 204, 21, ${0.1 * intensityMultiplier}) 100%)`
          : `linear-gradient(135deg, rgba(254, 243, 199, ${0.2 * intensityMultiplier}) 0%, rgba(253, 230, 138, ${0.3 * intensityMultiplier}) 50%, rgba(252, 211, 77, ${0.2 * intensityMultiplier}) 100%)`,
        particles: Array.from({ length: Math.floor(4 * intensityMultiplier) }, (_, i) => ({
          id: i,
          emoji: Math.random() > 0.5 ? '☀️' : '🌞',
          delay: Math.random() * 3,
          duration: 8 + Math.random() * 3,
          left: Math.random() * 100,
          size: 0.8 + Math.random() * 0.2,
          opacity: (isDark ? 0.4 : 0.3) * intensityMultiplier
        }))
      };
  }
};

// Particle component for seasonal effects
const SeasonalCardParticle: React.FC<{
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
        'absolute pointer-events-none text-white/60',
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

export const SeasonalCardBackground: React.FC<SeasonalCardBackgroundProps> = ({ 
  children, 
  className,
  intensity = 'subtle'
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

  const seasonalData = generateSeasonalCardCSS(currentSeason, currentTheme, intensity);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Seasonal background */}
      <div 
        className="absolute inset-0 transition-all duration-1000 opacity-60"
        style={{
          background: seasonalData.background,
        }}
      />
      
      {/* Seasonal particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {seasonalData.particles.map((particle) => (
          <SeasonalCardParticle
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
