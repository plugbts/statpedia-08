// @ts-nocheck
import React from "react";

import logoFanduelMono from "@/assets/logos/mono/fanduel.svg";
import logoDraftkingsMono from "@/assets/logos/mono/draftkings.svg";
import logoBetmgmMono from "@/assets/logos/mono/betmgm.svg";
import logoCaesarsMono from "@/assets/logos/mono/caesars.svg";
import logoBet365Mono from "@/assets/logos/mono/bet365.svg";
import logoEspnbetMono from "@/assets/logos/mono/espnbet.svg";
import logoHardrockMono from "@/assets/logos/mono/hardrock.svg";
import logoSleeperMono from "@/assets/logos/mono/sleeper.svg";
import logoPrizepicksMono from "@/assets/logos/mono/prizepicks.svg";
import logoUnderdogMono from "@/assets/logos/mono/underdog.svg";
import logoPinnacleMono from "@/assets/logos/mono/pinnacle.svg";

const MONO: Record<string, string> = {
  fanduel: logoFanduelMono,
  draftkings: logoDraftkingsMono,
  betmgm: logoBetmgmMono,
  caesars: logoCaesarsMono,
  bet365: logoBet365Mono,
  espnbet: logoEspnbetMono,
  hardrock: logoHardrockMono,
  hardrockbet: logoHardrockMono,
  sleeper: logoSleeperMono,
  prizepicks: logoPrizepicksMono,
  underdog: logoUnderdogMono,
  pinnacle: logoPinnacleMono,
};

function normalizeBookKey(raw: string): string {
  const s = String(raw || "")
    .toLowerCase()
    .trim();
  const compact = s.replace(/[^a-z0-9]/g, "");
  const alias: Record<string, string> = {
    fanduel: "fanduel",
    fanduelsportsbook: "fanduel",
    draftkings: "draftkings",
    draftking: "draftkings",
    betmgm: "betmgm",
    mgm: "betmgm",
    caesars: "caesars",
    williamhill: "caesars",
    bet365: "bet365",
    espnbet: "espnbet",
    espn: "espnbet",
    hardrock: "hardrock",
    hardrockbet: "hardrock",
    sleeper: "sleeper",
    prizepicks: "prizepicks",
    underdog: "underdog",
    pinnacle: "pinnacle",
  };
  return alias[compact] || compact || "unknown";
}

const MonoIcon = ({ sportsbookKey }: { sportsbookKey: string }) => {
  const key = normalizeBookKey(sportsbookKey);
  const src = MONO[key];
  if (!src) return null;
  // bet365 is a wordmark (wide), so don't force it into a square.
  if (key === "bet365") {
    return <img src={src} alt={key} className="h-4 w-10 object-contain opacity-95" />;
  }
  return <img src={src} alt={key} className="h-4 w-4 opacity-95" />;
};

// Professional sportsbook icon components (PropFinder-style: white mono mark in a dark tile)
export const SportsbookIcons = {
  draftkings: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="draftkings" />
    </div>
  ),
  fanduel: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="fanduel" />
    </div>
  ),
  betmgm: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="betmgm" />
    </div>
  ),
  caesars: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="caesars" />
    </div>
  ),
  bet365: () => (
    <div className="w-10 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10 px-1">
      <MonoIcon sportsbookKey="bet365" />
    </div>
  ),
  espnbet: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="espnbet" />
    </div>
  ),
  hardrock: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="hardrock" />
    </div>
  ),
  sleeper: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="sleeper" />
    </div>
  ),
  prizepicks: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="prizepicks" />
    </div>
  ),
  underdog: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="underdog" />
    </div>
  ),
  pinnacle: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10">
      <MonoIcon sportsbookKey="pinnacle" />
    </div>
  ),
  // Generic fallback for unknown sportsbooks: show a star (better than PI/FA/CO text)
  generic: () => (
    <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/40 border border-white/10 text-white text-[10px] font-extrabold">
      ★
    </div>
  ),
};

// Map sportsbook keys to display names
export const SportsbookNames = {
  draftkings: "DraftKings",
  fanduel: "FanDuel",
  betmgm: "BetMGM",
  caesars: "Caesars",
  pointsbet: "PointsBet",
  barstool: "Barstool",
  betrivers: "BetRivers",
  unibet: "Unibet",
  wynnbet: "WynnBET",
  superbook: "SuperBook",
  hardrock: "Hard Rock",
  sleeper: "Sleeper",
  prizepicks: "PrizePicks",
  underdog: "Underdog",
  bet365: "bet365",
  espnbet: "ESPN BET",
  pinnacle: "Pinnacle",
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
  showTooltip = true,
}) => {
  // Handle undefined or null sportsbookKey
  if (!sportsbookKey || typeof sportsbookKey !== "string") {
    return null;
  }

  const IconComponent =
    SportsbookIcons[sportsbookKey as keyof typeof SportsbookIcons] ||
    (() => SportsbookIcons.generic(sportsbookKey));

  const displayName =
    SportsbookNames[sportsbookKey as keyof typeof SportsbookNames] ||
    (sportsbookKey.charAt(0)?.toUpperCase() || "") + sportsbookKey.slice(1);

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
  onClick,
}) => {
  // Handle undefined or null sportsbooks array
  if (!sportsbooks || !Array.isArray(sportsbooks)) {
    return null;
  }

  // Remove duplicates and sort by popularity (most popular sportsbooks first)
  const uniqueBooks = [...new Set(sportsbooks.filter((book) => book && typeof book === "string"))];
  const popularityOrder = [
    "draftkings",
    "fanduel",
    "betmgm",
    "caesars",
    "pointsbet",
    "espnbet",
    "bet365",
    "barstool",
    "betrivers",
    "unibet",
    "wynnbet",
    "superbook",
    "bovada",
    "hardrockbet",
    "underdog",
    "prizepicks",
  ];

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
      className={`flex items-center space-x-1 ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} ${className}`}
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
