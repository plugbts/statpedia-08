import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Circle, 
  Hexagon, 
  Square, 
  Triangle,
  Target,
  Trophy
} from 'lucide-react';

const sportIcons = {
  basketball: Circle,
  football: Hexagon,
  hockey: Square,
  baseball: Circle,
  nba: Circle,
  nfl: Hexagon,
  nhl: Square,
  mlb: Circle,
  wnba: Circle,
  'college-basketball': Circle,
  'college-football': Hexagon,
} as const;

interface SportIconProps {
  sport: keyof typeof sportIcons;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const SportIcon = ({ sport, className, size = 'md' }: SportIconProps) => {
  const IconComponent = sportIcons[sport] || Target;
  
  return (
    <div className={cn(
      'flex items-center justify-center rounded-lg bg-muted/20 border border-border/30 transition-all duration-200 hover:bg-muted/30 hover:scale-105',
      sizeClasses[size],
      className
    )}>
      <IconComponent className={cn(
        'text-foreground/80',
        size === 'sm' && 'w-3 h-3',
        size === 'md' && 'w-4 h-4', 
        size === 'lg' && 'w-5 h-5'
      )} />
    </div>
  );
};