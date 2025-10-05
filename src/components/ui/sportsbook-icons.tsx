// @ts-nocheck
import React from 'react';

// Professional sportsbook icon components with authentic colors and compact design
export const SportsbookIcons = {
  draftkings: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-green-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-green-400/30">
      DK
    </div>
  ),
  fanduel: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-blue-400/30">
      FD
    </div>
  ),
  betmgm: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-sm flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-yellow-400/30">
      MGM
    </div>
  ),
  caesars: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-purple-600 to-purple-800 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-purple-400/30">
      CZR
    </div>
  ),
  pointsbet: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-red-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-red-400/30">
      PB
    </div>
  ),
  barstool: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-pink-500 to-pink-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-pink-400/30">
      BS
    </div>
  ),
  betrivers: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-indigo-400/30">
      BR
    </div>
  ),
  unibet: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-orange-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-orange-400/30">
      UB
    </div>
  ),
  wynnbet: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-amber-400/30">
      WB
    </div>
  ),
  superbook: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-teal-500 to-teal-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-teal-400/30">
      SB
    </div>
  ),
  // Additional popular sportsbooks
  bet365: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-sm flex items-center justify-center text-black text-[9px] font-extrabold shadow-sm border border-yellow-300/30">
      365
    </div>
  ),
  bovada: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-red-600 to-red-800 rounded-sm flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-red-400/30">
      BOV
    </div>
  ),
  hardrockbet: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-pink-600 to-pink-800 rounded-sm flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-pink-400/30">
      HR
    </div>
  ),
  underdog: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-sm flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-emerald-400/30">
      UD
    </div>
  ),
  prizepicks: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-violet-500 to-violet-700 rounded-sm flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-violet-400/30">
      PP
    </div>
  ),
  espnbet: () => (
    <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-sm flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-blue-400/30">
      ESPN
    </div>
  ),
  // Generic fallback for unknown sportsbooks
  generic: (name: string) => (
    <div className="w-5 h-5 bg-gradient-to-br from-gray-500 to-gray-700 rounded-sm flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm border border-gray-400/30">
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
  // Handle undefined or null sportsbookKey
  if (!sportsbookKey || typeof sportsbookKey !== 'string') {
    return null;
  }
  
  const IconComponent = SportsbookIcons[sportsbookKey as keyof typeof SportsbookIcons] || 
                       (() => SportsbookIcons.generic(sportsbookKey));
  
  const displayName = SportsbookNames[sportsbookKey as keyof typeof SportsbookNames] || 
                     (sportsbookKey.charAt(0)?.toUpperCase() || '') + sportsbookKey.slice(1);

  return (
    <div className={`inline-flex ${className}`} title={showTooltip ? displayName : undefined}>
      <IconComponent />
    </div>
  );
};

// Component to render multiple sportsbook icons with professional styling
interface SportsbookIconsListProps {
  sportsbooks: string[];
  maxVisible?: number;
  className?: string;
  onClick?: (sportsbooks: string[]) => void;
}

export const SportsbookIconsList: React.FC<SportsbookIconsListProps> = ({ 
  sportsbooks, 
  maxVisible = 3, // Show only 3 most popular by default
  className = "",
  onClick
}) => {
  // Handle undefined or null sportsbooks array
  if (!sportsbooks || !Array.isArray(sportsbooks)) {
    return null;
  }
  
  // Remove duplicates and sort by popularity (most popular sportsbooks first)
  const uniqueBooks = [...new Set(sportsbooks.filter(book => book && typeof book === 'string'))];
  const popularityOrder = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet', 'espnbet', 'bet365', 'barstool', 'betrivers', 'unibet', 'wynnbet', 'superbook', 'bovada', 'hardrockbet', 'underdog', 'prizepicks'];
  
  const sortedBooks = uniqueBooks.sort((a, b) => {
    const aIndex = popularityOrder.indexOf(a.toLowerCase());
    const bIndex = popularityOrder.indexOf(b.toLowerCase());
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  const visibleBooks = sortedBooks.slice(0, maxVisible);
  const remainingCount = uniqueBooks.length - maxVisible;

  const handleClick = () => {
    if (onClick) {
      onClick(sportsbooks);
    }
  };

  return (
    <div 
      className={`flex items-center space-x-1 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={handleClick}
    >
      {visibleBooks.map((book, index) => (
        <SportsbookIcon key={`${book}-${index}`} sportsbookKey={book} />
      ))}
      {remainingCount > 0 && (
        <div className="w-5 h-5 bg-gradient-to-br from-slate-500 to-slate-700 rounded-sm flex items-center justify-center text-white text-[9px] font-extrabold shadow-sm border border-slate-400/30">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
