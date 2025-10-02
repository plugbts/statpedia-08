import React from 'react';

// Sportsbook icon components using SVG or text fallbacks
export const SportsbookIcons = {
  draftkings: () => (
    <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
      DK
    </div>
  ),
  fanduel: () => (
    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
      FD
    </div>
  ),
  betmgm: () => (
    <div className="w-6 h-6 bg-yellow-600 rounded flex items-center justify-center text-white text-xs font-bold">
      MGM
    </div>
  ),
  caesars: () => (
    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
      CZR
    </div>
  ),
  pointsbet: () => (
    <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">
      PB
    </div>
  ),
  barstool: () => (
    <div className="w-6 h-6 bg-pink-600 rounded flex items-center justify-center text-white text-xs font-bold">
      BS
    </div>
  ),
  betrivers: () => (
    <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">
      BR
    </div>
  ),
  unibet: () => (
    <div className="w-6 h-6 bg-orange-600 rounded flex items-center justify-center text-white text-xs font-bold">
      UB
    </div>
  ),
  wynnbet: () => (
    <div className="w-6 h-6 bg-amber-600 rounded flex items-center justify-center text-white text-xs font-bold">
      WB
    </div>
  ),
  superbook: () => (
    <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-white text-xs font-bold">
      SB
    </div>
  ),
  // Generic fallback for unknown sportsbooks
  generic: (name: string) => (
    <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-white text-xs font-bold">
      {name.substring(0, 2).toUpperCase()}
    </div>
  )
};

// Map sportsbook keys to display names
export const SportsbookNames = {
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  betmgm: 'BetMGM',
  caesars: 'Caesars',
  pointsbet: 'PointsBet',
  barstool: 'Barstool',
  betrivers: 'BetRivers',
  unibet: 'Unibet',
  wynnbet: 'WynnBET',
  superbook: 'SuperBook'
};

// Component to render sportsbook icon
interface SportsbookIconProps {
  sportsbookKey: string;
  className?: string;
  showTooltip?: boolean;
}

export const SportsbookIcon: React.FC<SportsbookIconProps> = ({ 
  sportsbookKey, 
  className = "", 
  showTooltip = true 
}) => {
  const IconComponent = SportsbookIcons[sportsbookKey as keyof typeof SportsbookIcons] || 
                       (() => SportsbookIcons.generic(sportsbookKey));
  
  const displayName = SportsbookNames[sportsbookKey as keyof typeof SportsbookNames] || 
                     sportsbookKey.charAt(0).toUpperCase() + sportsbookKey.slice(1);

  return (
    <div className={`inline-flex ${className}`} title={showTooltip ? displayName : undefined}>
      <IconComponent />
    </div>
  );
};

// Component to render multiple sportsbook icons
interface SportsbookIconsListProps {
  sportsbooks: string[];
  maxVisible?: number;
  className?: string;
}

export const SportsbookIconsList: React.FC<SportsbookIconsListProps> = ({ 
  sportsbooks, 
  maxVisible = 4, 
  className = "" 
}) => {
  const visibleBooks = sportsbooks.slice(0, maxVisible);
  const remainingCount = sportsbooks.length - maxVisible;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {visibleBooks.map((book, index) => (
        <SportsbookIcon key={book} sportsbookKey={book} />
      ))}
      {remainingCount > 0 && (
        <div className="w-6 h-6 bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
