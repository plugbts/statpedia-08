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
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

export const SportIcon = ({ sport, className, size = 'md' }: SportIconProps) => {
  const logoSrc = sportLogos[sport] || nbaLogo;
  
  return (
    <div className={cn(
      'flex items-center justify-center rounded-md bg-transparent transition-all duration-300 hover:scale-110',
      sizeClasses[size],
      className
    )}>
      <img 
        src={logoSrc} 
        alt={`${sport} logo`}
        className="w-full h-full object-contain opacity-90 hover:opacity-100 transition-all duration-300"
        style={{ 
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))',
          imageRendering: 'crisp-edges'
        }}
      />
    </div>
  );
};