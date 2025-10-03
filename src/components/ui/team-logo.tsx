import React from 'react';
import { cn } from '@/lib/utils';

interface TeamLogoProps {
  teamAbbr: string;
  sport: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const TeamLogo: React.FC<TeamLogoProps> = ({
  teamAbbr,
  sport,
  className = '',
  size = 'md'
}) => {
  // Generate team logo URL based on sport and team abbreviation
  const getTeamLogoUrl = () => {
    const cleanTeamAbbr = teamAbbr?.toUpperCase() || 'TM';
    
    // ESPN team logos
    const sportMap: Record<string, string> = {
      'nfl': 'nfl',
      'nba': 'nba',
      'mlb': 'mlb',
      'nhl': 'nhl',
      'wnba': 'wnba',
      'college-football': 'college-football',
      'college-basketball': 'mens-college-basketball'
    };
    
    const espnSport = sportMap[sport] || 'nfl';
    
    return `https://a.espncdn.com/i/teamlogos/${espnSport}/500/${cleanTeamAbbr}.png`;
  };

  const [imageError, setImageError] = React.useState(false);
  const logoUrl = getTeamLogoUrl();

  const handleImageError = () => {
    setImageError(true);
  };

  const getTeamInitials = () => {
    return teamAbbr?.toUpperCase() || 'TM';
  };

  if (imageError) {
    return (
      <div className={cn(
        'flex items-center justify-center rounded-full bg-muted border border-border/30 font-bold text-xs',
        sizeClasses[size],
        className
      )}>
        {getTeamInitials()}
      </div>
    );
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <img
        src={logoUrl}
        alt={`${teamAbbr} logo`}
        className="w-full h-full object-contain rounded-full"
        onError={handleImageError}
      />
    </div>
  );
};
