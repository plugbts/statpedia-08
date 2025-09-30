import React from 'react';
import { cn } from '@/lib/utils';
import nbaSilhouette from '@/assets/logos/nba-silhouette.png';
import nflLogo from '@/assets/logos/nfl-logo.svg';
import mlbBatter from '@/assets/logos/mlb-batter.png';
import nhlLogo from '@/assets/logos/nhl-logo.png';
import wnbaOrange from '@/assets/logos/wnba-orange.png';
import ncaaLogo from '@/assets/logos/ncaa-logo.png';

const sportLogos = {
  basketball: nbaSilhouette,
  football: nflLogo,
  hockey: nhlLogo,
  baseball: mlbBatter,
  nba: nbaSilhouette,
  nfl: nflLogo,
  nhl: nhlLogo,
  mlb: mlbBatter,
  wnba: wnbaOrange,
  'college-basketball': ncaaLogo,
  'college-football': ncaaLogo,
} as const;

interface SportIconProps {
  sport: keyof typeof sportLogos;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

export const SportIcon = ({ sport, className, size = 'md' }: SportIconProps) => {
  const logoSrc = sportLogos[sport] || nbaSilhouette;
  
  return (
    <div className={cn(
      'flex items-center justify-center rounded-lg bg-background/5 backdrop-blur-sm border border-border/5 transition-all duration-200 hover:bg-background/10 hover:scale-105 p-1.5',
      sizeClasses[size],
      className
    )}>
      <img 
        src={logoSrc} 
        alt={`${sport} logo`}
        className="w-full h-full object-contain opacity-75 hover:opacity-95 transition-opacity duration-200"
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
      />
    </div>
  );
};