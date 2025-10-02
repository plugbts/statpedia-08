// Utility to convert EV percentages to user-friendly text values

export interface EVTextResult {
  text: 'Bad' | 'Good' | 'Great';
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Convert EV percentage to user-friendly text value
 * @param evPercentage - The EV percentage (e.g., 5.2 for 5.2%)
 * @returns Object with text, color, and styling information
 */
export function convertEVToText(evPercentage: number): EVTextResult {
  // Define thresholds for EV categories
  if (evPercentage >= 8) {
    return {
      text: 'Great',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-600/20',
      borderColor: 'border-emerald-500/30'
    };
  } else if (evPercentage >= 3) {
    return {
      text: 'Good', 
      color: 'text-blue-400',
      bgColor: 'bg-blue-600/20',
      borderColor: 'border-blue-500/30'
    };
  } else {
    return {
      text: 'Bad',
      color: 'text-red-400', 
      bgColor: 'bg-red-600/20',
      borderColor: 'border-red-500/30'
    };
  }
}

/**
 * Get EV text for display without styling
 * @param evPercentage - The EV percentage
 * @returns Simple text string
 */
export function getEVText(evPercentage: number): 'Bad' | 'Good' | 'Great' {
  return convertEVToText(evPercentage).text;
}

/**
 * Get EV color class for styling
 * @param evPercentage - The EV percentage
 * @returns Tailwind color class
 */
export function getEVColor(evPercentage: number): string {
  return convertEVToText(evPercentage).color;
}

/**
 * Get EV background color for badges
 * @param evPercentage - The EV percentage
 * @returns Tailwind background color class
 */
export function getEVBgColor(evPercentage: number): string {
  return convertEVToText(evPercentage).bgColor;
}

/**
 * Get EV border color for badges
 * @param evPercentage - The EV percentage
 * @returns Tailwind border color class
 */
export function getEVBorderColor(evPercentage: number): string {
  return convertEVToText(evPercentage).borderColor;
}

/**
 * Get complete badge classes for EV display
 * @param evPercentage - The EV percentage
 * @returns Object with all styling classes
 */
export function getEVBadgeClasses(evPercentage: number): {
  text: string;
  bg: string;
  border: string;
  combined: string;
} {
  const result = convertEVToText(evPercentage);
  return {
    text: result.color,
    bg: result.bgColor,
    border: result.borderColor,
    combined: `${result.color} ${result.bgColor} ${result.borderColor}`
  };
}
