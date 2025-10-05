/**
 * Odds utilities for converting between different odds formats
 * Supports American, decimal, and implied probability inputs
 */

// Convert decimal odds (e.g., 1.91) to American (-110 style)
export function decimalToAmerican(decimal: number): number {
  if (!decimal || decimal <= 1) return 0;
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)        // e.g., 2.50 -> +150
    : Math.round(-100 / (decimal - 1));      // e.g., 1.74 -> -135
}

// Convert implied probability (0..1) to American odds
export function probToAmerican(prob: number): number {
  if (!prob || prob <= 0 || prob >= 1) return 0;
  const dec = 1 / prob;
  return decimalToAmerican(dec);
}

// Normalize any odds input to American format
export function toAmericanOdds(input: number | string): number {
  if (input == null) return 0;
  const val = typeof input === "string" ? parseFloat(input) : input;

  // If value looks like an American price already (e.g., -115 or +120), return it
  if (Number.isFinite(val) && Math.abs(val) >= 100) return Math.round(val);

  // If value looks like decimal (1.01–10), convert
  if (val > 1 && val < 10) return decimalToAmerican(val);

  // If value looks like probability (0.01–0.99), convert
  if (val > 0 && val < 1) return probToAmerican(val);

  // Fallback
  return Math.round(val);
}

// Choose best price for the bettor from a list of American odds:
// Best is the highest payout: prefer highest positive; among negatives, prefer closest to zero.
export function pickBestAmerican(prices: number[]): number {
  const american = prices.map(toAmericanOdds).filter(n => Number.isFinite(n) && n !== 0);
  if (american.length === 0) return 0;

  const positives = american.filter(n => n > 0);
  if (positives.length > 0) {
    return Math.max(...positives);  // e.g., +120 beats +105
  }
  // No positive: pick the least negative (closest to 0), e.g., -105 beats -130
  return positives.length === 0 ? Math.max(...american) : Math.max(...positives);
}

// Format American odds for display
export function formatAmericanOdds(odds: number): string {
  // Handle pickem props (odds very close to 0)
  if (Math.abs(odds) < 5) {
    return 'PK'; // Pickem
  }
  
  // Round to nearest .5 or .0 interval
  const rounded = Math.round(odds * 2) / 2;
  
  // Format as American odds
  if (rounded > 0) {
    return `+${Math.round(rounded)}`;
  } else {
    return `${Math.round(rounded)}`;
  }
}

// Convert American odds to implied probability
export function americanToImpliedProb(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

// Convert American odds to decimal odds
export function americanToDecimal(odds: number): number {
  if (odds > 0) {
    return (odds / 100) + 1;
  } else {
    return (100 / Math.abs(odds)) + 1;
  }
}
