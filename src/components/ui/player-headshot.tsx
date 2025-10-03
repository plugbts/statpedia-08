import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { teamColorsService } from '@/services/team-colors-service';

interface PlayerHeadshotProps {
  playerName: string;
  sport: string;
  playerId?: string;
  teamAbbr?: string;
  className?: string;
}

export const PlayerHeadshot: React.FC<PlayerHeadshotProps> = memo(({
  playerName,
  sport,
  playerId,
  teamAbbr,
  className = ''
}) => {
  // Generate ESPN headshot URL based on sport and player ID
  // Try both PNG and JPEG formats
  const headshotUrls = useMemo(() => {
    if (!playerId) return [];
    
    const sportMap: Record<string, string> = {
      'nba': 'nba',
      'basketball': 'nba',
      'nfl': 'nfl',
      'football': 'nfl',
      'mlb': 'mlb',
      'baseball': 'mlb',
      'nhl': 'nhl',
      'hockey': 'nhl',
      'wnba': 'wnba',
      'college-basketball': 'mens-college-basketball',
      'college-football': 'college-football'
    };
    
    const espnSport = sportMap[sport] || 'nba';
    return [
      `https://a.espncdn.com/i/headshots/${espnSport}/players/full/${playerId}.png`,
      `https://a.espncdn.com/i/headshots/${espnSport}/players/full/${playerId}.jpg`,
      `https://a.espncdn.com/combiner/i?img=/i/headshots/${espnSport}/players/full/${playerId}.png`,
    ];
  }, [playerId, sport]);

  const getTeamAbbr = useCallback(() => {
    return teamAbbr ? teamAbbr.toUpperCase() : 'TM';
  }, [teamAbbr]);

  const getInitials = () => {
    return playerName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    // Try next URL format if available
    if (currentUrlIndex < headshotUrls.length - 1) {
      setCurrentUrlIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  }, [currentUrlIndex, headshotUrls.length]);

  return (
    <div className={`relative group ${className}`}>
      {/* 3D Container with perspective */}
      <div className="relative transform-gpu transition-all duration-300 ease-out group-hover:scale-105">
        {/* Glowing ring effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60 animate-pulse" />
        
        {/* Secondary glow layer */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 via-accent/40 to-success/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
        
        {/* Main avatar with 3D border effect */}
        <div className="relative">
          {/* Outer border ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-primary opacity-75 blur-sm" />
          
          {/* Inner shadow for depth */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]" />
          
          {/* Avatar */}
          <Avatar className="relative w-16 h-16 border-2 border-card shadow-3d transition-all duration-300 group-hover:shadow-3d-hover group-hover:border-primary/50">
            {headshotUrls.length > 0 && !imageError ? (
              <AvatarImage 
                src={headshotUrls[currentUrlIndex]} 
                alt={playerName}
                className="object-cover object-top"
                onError={handleImageError}
              />
            ) : null}
            <AvatarFallback className={`${teamColorsService.getTeamGradient(teamAbbr || '', sport)} text-white font-bold text-lg border-2 ${teamColorsService.getTeamBorder(teamAbbr || '', sport)} shadow-lg`}>
              {getTeamAbbr()}
            </AvatarFallback>
          </Avatar>

          {/* Top shine effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60 pointer-events-none" />
          
          {/* Bottom shadow for 3D depth */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/40 blur-md rounded-full transition-all duration-300 group-hover:w-14 group-hover:bg-black/60" />
        </div>

        {/* Animated ring pulse on hover */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/0 transition-all duration-300 group-hover:border-primary/50 group-hover:scale-110" />
      </div>
    </div>
  );
});
