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
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export const SportIcon = ({ sport, className, size = 'md' }: SportIconProps) => {
  const logoSrc = sportLogos[sport] || nbaLogo;
  
  return (
    <div className={cn(
      'flex items-center justify-center rounded-lg bg-muted/10 border border-border/20 transition-all duration-200 hover:bg-muted/20 hover:scale-105 p-1',
      sizeClasses[size],
      className
    )}>
      <img 
        src={logoSrc} 
        alt={`${sport} logo`}
        className="w-full h-full object-contain"
      />
    </div>
  );
};