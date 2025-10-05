/**
 * Odds conversion utilities
 */

/**
 * Convert decimal odds or probability to American odds format
 * @param val - Decimal odds (e.g., 2.5) or probability (e.g., 0.4)
 * @returns American odds string (e.g., "+150", "-200")
 */
export function toAmericanOdds(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') {
    return '—';
  }

  const num = typeof val === 'string' ? parseFloat(val) : val;
  
  if (isNaN(num)) {
    return '—';
  }

  // If the value is already in American odds format (e.g., -110, +150)
  if (num >= -1000 && num <= 1000 && num !== 0) {
    return num > 0 ? `+${num}` : `${num}`;
  }

  // If it's a probability (0-1), convert to decimal odds first
  let decimalOdds: number;
  if (num > 0 && num <= 1) {
    decimalOdds = 1 / num;
  } else {
    // Assume it's already decimal odds
    decimalOdds = num;
  }

  // Convert decimal odds to American odds
  if (decimalOdds >= 2) {
    // Positive American odds
    const americanOdds = Math.round((decimalOdds - 1) * 100);
    return `+${americanOdds}`;
  } else {
    // Negative American odds
    const americanOdds = Math.round(-100 / (decimalOdds - 1));
    return `${americanOdds}`;
  }
}

/**
 * Format odds for display with proper styling
 * @param val - Odds value
 * @returns Formatted odds string
 */
export function formatOdds(val: number | string | null | undefined): string {
  const americanOdds = toAmericanOdds(val);
  
  if (americanOdds === '—') {
    return americanOdds;
  }

  // Add color coding based on positive/negative
  const isPositive = americanOdds.startsWith('+');
  return americanOdds;
}

/**
 * Get odds color class for styling
 * @param val - Odds value
 * @returns CSS class name
 */
export function getOddsColorClass(val: number | string | null | undefined): string {
  const americanOdds = toAmericanOdds(val);
  
  if (americanOdds === '—') {
    return 'text-muted-foreground';
  }

  const isPositive = americanOdds.startsWith('+');
  return isPositive ? 'text-green-600' : 'text-red-600';
}
