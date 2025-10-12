// oddsNormalizer.ts - Proper sportsbook odds and line formatting

/**
 * Format line to always have .5 for sportsbook consistency
 * Sportsbooks publish 4.5, 63.5, etc. to avoid pushes
 */
export function formatLine(line: number | string | null | undefined): number | null {
  if (line === null || line === undefined || line === '') {
    return null;
  }
  
  const num = Number(line);
  if (isNaN(num)) {
    return null;
  }
  
  // If sportsbook gave an integer, bump to .5 to match market convention
  // This prevents pushes and follows standard sportsbook practice
  if (Number.isInteger(num)) {
    return num + 0.5;
  }
  
  // Keep existing .5 lines as-is
  return num;
}

/**
 * Normalize odds to American format integers
 * Odds should be -110, +115, etc.
 */
export function normalizeOdds(odds: any): number | null {
  if (odds === null || odds === undefined || odds === '') {
    return null;
  }
  
  const n = Number(odds);
  if (isNaN(n)) {
    return null;
  }
  
  // Filter out invalid odds
  if (n === 0) {
    return null;
  }
  
  // Round to nearest integer for American odds format
  return Math.round(n);
}

/**
 * Validate that odds are in reasonable range for American format
 */
export function validateOdds(odds: number | null): boolean {
  if (odds === null) return false;
  
  // American odds typically range from -1000 to +1000
  return odds >= -1000 && odds <= 1000;
}

/**
 * Debug logging for prop ingestion
 */
export function logPropIngestion(prop: {
  player: string;
  market: string;
  line: any;
  over: any;
  under: any;
  source: string;
}) {
  console.log("🎯 Ingesting prop:", {
    player: prop.player,
    market: prop.market,
    rawLine: prop.line,
    formattedLine: formatLine(prop.line),
    rawOver: prop.over,
    normalizedOver: normalizeOdds(prop.over),
    rawUnder: prop.under,
    normalizedUnder: normalizeOdds(prop.under),
    source: prop.source
  });
}

/**
 * Complete prop normalization with validation
 */
export function normalizePropData(rawProp: {
  line: any;
  overOdds: any;
  underOdds: any;
  playerName: string;
  marketName: string;
  source: string;
}) {
  // Log the raw data for debugging
  logPropIngestion({
    player: rawProp.playerName,
    market: rawProp.marketName,
    line: rawProp.line,
    over: rawProp.overOdds,
    under: rawProp.underOdds,
    source: rawProp.source
  });

  // Normalize the data
  const normalizedLine = formatLine(rawProp.line);
  const normalizedOverOdds = normalizeOdds(rawProp.overOdds);
  const normalizedUnderOdds = normalizeOdds(rawProp.underOdds);

  // Validate the normalized data
  const isValidOverOdds = validateOdds(normalizedOverOdds);
  const isValidUnderOdds = validateOdds(normalizedUnderOdds);

  return {
    line: normalizedLine,
    over_odds: isValidOverOdds ? normalizedOverOdds : null,
    under_odds: isValidUnderOdds ? normalizedUnderOdds : null,
    isValid: normalizedLine !== null && (isValidOverOdds || isValidUnderOdds)
  };
}
