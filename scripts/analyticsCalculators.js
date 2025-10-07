/**
 * Analytics Calculators Module
 * Provides functions for calculating hit rates, streaks, and other analytics
 */

/**
 * Calculate hit rate for a given dataset
 * @param {Array} data - Array of {value, line, date} objects
 * @param {string} direction - 'over' or 'under'
 * @param {number} gamesLimit - Optional limit for number of games to consider
 * @returns {Object} - {hits, total, hitRate}
 */
export function calculateHitRate(data, direction = 'over', gamesLimit = null) {
  if (!data || data.length === 0) {
    return { hits: 0, total: 0, hitRate: 0.0 };
  }

  // Apply games limit if specified
  const limitedData = gamesLimit ? data.slice(0, gamesLimit) : data;
  
  if (limitedData.length === 0) {
    return { hits: 0, total: 0, hitRate: 0.0 };
  }

  let hits = 0;
  let total = 0;

  for (const game of limitedData) {
    if (game.value === null || game.value === undefined || game.line === null || game.line === undefined) {
      continue;
    }

    total++;
    
    const isHit = direction === 'over' 
      ? game.value > game.line 
      : game.value < game.line;
    
    if (isHit) {
      hits++;
    }
  }

  const hitRate = total > 0 ? (hits / total) : 0.0;

  return {
    hits,
    total,
    hitRate: Math.round(hitRate * 10000) / 100, // Round to 2 decimal places
    percentage: Math.round(hitRate * 100) // Percentage for display
  };
}

/**
 * Calculate streak information for a given dataset
 * @param {Array} data - Array of {value, line, date} objects
 * @param {string} direction - 'over' or 'under'
 * @returns {Object} - {currentStreak, longestStreak, streakDirection}
 */
export function calculateStreak(data, direction = 'over') {
  if (!data || data.length === 0) {
    return { currentStreak: 0, longestStreak: 0, streakDirection: 'mixed' };
  }

  // Sort data by date descending (most recent first)
  const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let currentStreak = 0;
  let longestStreak = 0;
  let streakDirection = 'mixed';
  let tempStreak = 0;
  let prevHit = null;

  for (const game of sortedData) {
    if (game.value === null || game.value === undefined || game.line === null || game.line === undefined) {
      continue;
    }

    const isHit = direction === 'over' 
      ? game.value > game.line 
      : game.value < game.line;

    // If this is the first game or same hit type as previous
    if (prevHit === null || prevHit === isHit) {
      if (isHit) {
        tempStreak++;
        // Set streak direction on first hit
        if (prevHit === null) {
          streakDirection = direction + '_hit';
        }
      } else {
        tempStreak = 0;
        streakDirection = 'mixed';
      }
    } else {
      // Different hit type, reset streak
      if (isHit) {
        tempStreak = 1;
        streakDirection = direction + '_hit';
      } else {
        tempStreak = 0;
        streakDirection = 'mixed';
      }
    }

    // Update longest streak
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    // Set current streak (from most recent games)
    if (prevHit === null) {
      currentStreak = tempStreak;
    }

    prevHit = isHit;
  }

  return {
    currentStreak,
    longestStreak,
    streakDirection
  };
}

/**
 * Calculate average value for a given dataset
 * @param {Array} data - Array of {value} objects
 * @param {number} gamesLimit - Optional limit for number of games to consider
 * @returns {number} - Average value
 */
export function calculateAverage(data, gamesLimit = null) {
  if (!data || data.length === 0) {
    return 0.0;
  }

  const limitedData = gamesLimit ? data.slice(0, gamesLimit) : data;
  const validValues = limitedData.filter(game => 
    game.value !== null && game.value !== undefined
  );

  if (validValues.length === 0) {
    return 0.0;
  }

  const sum = validValues.reduce((acc, game) => acc + game.value, 0);
  return Math.round((sum / validValues.length) * 100) / 100;
}

/**
 * Calculate standard deviation for a given dataset
 * @param {Array} data - Array of {value} objects
 * @param {number} gamesLimit - Optional limit for number of games to consider
 * @returns {number} - Standard deviation
 */
export function calculateStandardDeviation(data, gamesLimit = null) {
  if (!data || data.length === 0) {
    return 0.0;
  }

  const limitedData = gamesLimit ? data.slice(0, gamesLimit) : data;
  const validValues = limitedData.filter(game => 
    game.value !== null && game.value !== undefined
  );

  if (validValues.length < 2) {
    return 0.0;
  }

  const average = calculateAverage(validValues);
  const variance = validValues.reduce((acc, game) => 
    acc + Math.pow(game.value - average, 2), 0
  ) / (validValues.length - 1);

  return Math.round(Math.sqrt(variance) * 100) / 100;
}

/**
 * Calculate consistency score (inverse of standard deviation)
 * @param {Array} data - Array of {value} objects
 * @param {number} gamesLimit - Optional limit for number of games to consider
 * @returns {number} - Consistency score (0-100)
 */
export function calculateConsistency(data, gamesLimit = null) {
  const stdDev = calculateStandardDeviation(data, gamesLimit);
  const average = calculateAverage(data, gamesLimit);
  
  if (average === 0) {
    return 0;
  }

  // Coefficient of variation (CV) = stdDev / average
  const cv = stdDev / average;
  
  // Convert to consistency score (lower CV = higher consistency)
  const consistency = Math.max(0, 100 - (cv * 100));
  return Math.round(consistency * 100) / 100;
}

/**
 * Calculate edge (difference between hit rate and implied probability)
 * @param {number} hitRate - Actual hit rate (0-1)
 * @param {number} odds - American odds (e.g., -110)
 * @returns {number} - Edge percentage
 */
export function calculateEdge(hitRate, odds) {
  if (!odds || odds === 0) {
    return 0;
  }

  // Convert American odds to implied probability
  let impliedProb;
  if (odds > 0) {
    impliedProb = 100 / (odds + 100);
  } else {
    impliedProb = Math.abs(odds) / (Math.abs(odds) + 100);
  }

  // Edge = actual probability - implied probability
  const edge = (hitRate / 100) - impliedProb;
  return Math.round(edge * 10000) / 100; // Return as percentage
}

/**
 * Calculate Kelly Criterion for optimal bet sizing
 * @param {number} hitRate - Actual hit rate (0-100)
 * @param {number} odds - American odds (e.g., -110)
 * @returns {number} - Kelly percentage (0-1)
 */
export function calculateKellyCriterion(hitRate, odds) {
  if (!odds || odds === 0) {
    return 0;
  }

  const actualProb = hitRate / 100;
  
  // Convert American odds to decimal odds
  let decimalOdds;
  if (odds > 0) {
    decimalOdds = (odds / 100) + 1;
  } else {
    decimalOdds = (100 / Math.abs(odds)) + 1;
  }

  // Kelly Criterion: f = (bp - q) / b
  // where b = decimal odds - 1, p = probability of winning, q = 1 - p
  const b = decimalOdds - 1;
  const p = actualProb;
  const q = 1 - p;
  
  const kelly = (b * p - q) / b;
  
  // Return as percentage, clamped between 0 and 1
  return Math.max(0, Math.min(1, kelly)) * 100;
}

/**
 * Calculate trend analysis (recent performance vs overall)
 * @param {Array} data - Array of {value, line, date} objects
 * @param {string} direction - 'over' or 'under'
 * @param {number} recentGames - Number of recent games to analyze
 * @returns {Object} - {trend, trendStrength, recentHitRate, overallHitRate}
 */
export function calculateTrend(data, direction = 'over', recentGames = 5) {
  if (!data || data.length === 0) {
    return { trend: 'neutral', trendStrength: 0, recentHitRate: 0, overallHitRate: 0 };
  }

  const overallHitRate = calculateHitRate(data, direction);
  const recentHitRate = calculateHitRate(data, direction, recentGames);
  
  const trendDifference = recentHitRate.hitRate - overallHitRate.hitRate;
  
  let trend = 'neutral';
  let trendStrength = 0;
  
  if (Math.abs(trendDifference) < 5) {
    trend = 'neutral';
    trendStrength = 0;
  } else if (trendDifference > 0) {
    trend = 'improving';
    trendStrength = Math.min(100, Math.abs(trendDifference) * 10);
  } else {
    trend = 'declining';
    trendStrength = Math.min(100, Math.abs(trendDifference) * 10);
  }

  return {
    trend,
    trendStrength: Math.round(trendStrength),
    recentHitRate: recentHitRate.hitRate,
    overallHitRate: overallHitRate.hitRate,
    trendDifference: Math.round(trendDifference * 100) / 100
  };
}
