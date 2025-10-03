// Utility to convert EV percentages to user-friendly text values

export interface EVTextResult {
  text: 'A+' | 'A' | 'B' | 'C' | 'Below C';
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
  // Define thresholds for EV categories - updated to match new rating system
  if (evPercentage > 5) {
    return {
      text: 'A+',
      color: 'text-green-600',
      bgColor: 'bg-green-600/20',
      borderColor: 'border-green-500/30'
    };
  } else if (evPercentage > 2) {
    return {
      text: 'A', 
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    };
  } else if (evPercentage > -2) {
    return {
      text: 'B',
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
      borderColor: 'border-green-400/30'
    };
  } else if (evPercentage > -8) {
    return {
      text: 'C',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    };
  } else {
    return {
      text: 'Below C',
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30'
    };
  }
}

/**
 * Get EV text for display without styling
 * @param evPercentage - The EV percentage
 * @returns Simple text string
 */
export function getEVText(evPercentage: number): 'A+' | 'A' | 'B' | 'C' | 'Below C' {
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
