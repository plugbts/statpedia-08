import React from 'react';
import { cn } from '@/lib/utils';
import nbaLogo from '@/assets/logos/nba-logo.svg';
import nflLogo from '@/assets/logos/nfl-logo.svg';
import mlbLogo from '@/assets/logos/mlb-logo.png';
import nhlLogo from '@/assets/logos/nhl-logo.png';
import wnbaLogo from '@/assets/logos/wnba-logo.png';
import ncaaLogo from '@/assets/logos/ncaa-logo.png';

const sportLogos = {
  basketball: nbaLogo,
  football: nflLogo,
  hockey: nhlLogo,
  baseball: mlbLogo,
  nba: nbaLogo,
  nfl: nflLogo,
  nhl: nhlLogo,
  mlb: mlbLogo,
  wnba: wnbaLogo,
  'college-basketball': ncaaLogo,
  'college-football': ncaaLogo,
} as const;

interface SportIconProps {
  sport: keyof typeof sportLogos;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export const SportIcon = ({ sport, className, size = 'md' }: SportIconProps) => {
  const logoSrc = sportLogos[sport] || nbaLogo;
  
  return (
    <div className={cn(
      'flex items-center justify-center rounded-lg bg-background/5 backdrop-blur-sm border border-border/10 transition-all duration-200 hover:bg-background/10 hover:scale-105 p-2',
      sizeClasses[size],
      className
    )}>
      <img 
        src={logoSrc} 
        alt={`${sport} logo`}
        className="w-full h-full object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      />
    </div>
  );
};