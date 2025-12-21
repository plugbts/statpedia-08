/**
 * Odds conversion utilities
 */

/**
 * Convert decimal odds or probability to American odds format
 * @param val - Decimal odds (e.g., 2.5) or probability (e.g., 0.4)
 * @returns American odds string (e.g., "+150", "-200")
 */
export function toAmericanOdds(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") {
    return "—";
  }

  const raw = typeof val === "string" ? val.trim() : val;
  const num = typeof raw === "string" ? parseFloat(raw) : (raw as number);

  if (isNaN(num)) {
    return "—";
  }

  // 1) If the string already looks like American odds "+123" or "-110"
  if (typeof raw === "string" && /^[-+]\d+$/.test(raw)) {
    return raw.startsWith("+") ? raw : `${num >= 0 ? "+" : ""}${Math.trunc(num)}`;
  }

  // 2) If numeric american odds (absolute value >= 100)
  if (Math.abs(num) >= 100) {
    const rounded = Math.trunc(num);
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  }

  // 3) Probability 0-1 => convert to decimal odds first
  let decimalOdds: number | null = null;
  if (num > 0 && num < 1) {
    decimalOdds = 1 / num;
  }

  // 4) Decimal odds (> 1) => convert
  if (decimalOdds === null && num > 1) {
    decimalOdds = num;
  }

  if (decimalOdds === null) {
    return "—";
  }

  // Convert decimal odds to American odds (rounded to integer as sportsbooks do)
  if (decimalOdds >= 2) {
    const americanOdds = Math.round((decimalOdds - 1) * 100);
    return `+${americanOdds}`;
  } else {
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

  if (americanOdds === "—") {
    return americanOdds;
  }

  return americanOdds;
}

/**
 * Get odds color class for styling
 * @param val - Odds value
 * @returns CSS class name
 */
export function getOddsColorClass(val: number | string | null | undefined): string {
  const americanOdds = toAmericanOdds(val);

  if (americanOdds === "—") {
    return "text-muted-foreground";
  }

  // UX request: always render odds in green (PropFinder-style), regardless of +/- sign.
  return "text-green-600";
}
