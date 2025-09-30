import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SeasonalIndicatorProps {
  className?: string;
  showText?: boolean;
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

const getSeasonInfo = (season: 'spring' | 'summer' | 'fall' | 'winter') => {
  switch (season) {
    case 'spring':
      return {
        emoji: '🌸',
        name: 'Spring',
        color: 'bg-pink-100 text-pink-800 border-pink-200',
        description: 'Fresh blooms and new beginnings'
      };
    case 'summer':
      return {
        emoji: '☀️',
        name: 'Summer',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Bright sunshine and warm days'
      };
    case 'fall':
      return {
        emoji: '🍂',
        name: 'Fall',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        description: 'Golden leaves and cozy vibes'
      };
    case 'winter':
      return {
        emoji: '❄️',
        name: 'Winter',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Snowflakes and winter magic'
      };
  }
};

export const SeasonalIndicator: React.FC<SeasonalIndicatorProps> = ({ 
  className, 
  showText = true 
}) => {
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'fall' | 'winter'>('winter');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const season = getCurrentSeason();
    setCurrentSeason(season);
    setIsVisible(true);

    // Update season every hour to catch season changes
    const interval = setInterval(() => {
      const newSeason = getCurrentSeason();
      if (newSeason !== season) {
        setCurrentSeason(newSeason);
      }
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const seasonInfo = getSeasonInfo(currentSeason);

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'transition-all duration-500 hover:scale-105 cursor-default',
        seasonInfo.color,
        className
      )}
      title={seasonInfo.description}
    >
      <span className="mr-1">{seasonInfo.emoji}</span>
      {showText && seasonInfo.name}
    </Badge>
  );
};
