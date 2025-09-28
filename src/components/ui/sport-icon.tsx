import React from 'react';
import { cn } from '@/lib/utils';
import basketballIcon from '@/assets/icons/basketball.png';
import footballIcon from '@/assets/icons/football.png';
import hockeyIcon from '@/assets/icons/hockey.png';
import baseballIcon from '@/assets/icons/baseball.png';

const sportIcons = {
  basketball: basketballIcon,
  football: footballIcon,
  hockey: hockeyIcon,
  baseball: baseballIcon,
  nba: basketballIcon,
  nfl: footballIcon,
  nhl: hockeyIcon,
  mlb: baseballIcon,
  wnba: basketballIcon,
  'college-basketball': basketballIcon,
  'college-football': footballIcon,
} as const;

interface SportIconProps {
  sport: keyof typeof sportIcons;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const SportIcon = ({ sport, className, size = 'md' }: SportIconProps) => {
  const iconSrc = sportIcons[sport];
  
  if (!iconSrc) {
    return (
      <div className={cn(
        'bg-muted rounded-lg flex items-center justify-center',
        sizeClasses[size],
        className
      )}>
        <span className="text-xs font-mono text-muted-foreground">
          {sport.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={`${sport} icon`}
      className={cn(
        'rounded-lg transition-transform duration-200 hover:scale-105',
        sizeClasses[size],
        className
      )}
    />
  );
};