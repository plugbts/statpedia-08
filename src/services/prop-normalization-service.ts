import { logAPI, logWarning, logError } from '@/utils/console-logger';

// Canonical prop_type normalization mappings
export const CANONICAL_PROP_TYPES = {
  // NFL / NCAA Football
  'Passing Yards': 'Passing Yards',
  'Passing Completions': 'Passing Completions', 
  'Passing Touchdowns': 'Passing TDs',
  'Rushing Yards': 'Rushing Yards',
  'Rushing Attempts': 'Rushing Attempts',
  'Rushing Touchdowns': 'Rushing TDs',
  'Receiving Yards': 'Receiving Yards',
  'Receptions': 'Receptions',
  'Receiving Touchdowns': 'Receiving TDs',
  'Interceptions Thrown': 'Interceptions',

  // NBA / NCAAB
  'Points': 'Points',
  'Assists': 'Assists',
  'Rebounds': 'Rebounds',
  '3-Point Field Goals': '3PM',
  'Steals': 'Steals',
  'Blocks': 'Blocks',
  'Turnovers': 'Turnovers',
  'PRA (Points+Rebounds+Assists)': 'PRA',
  'Double Double': 'Double Double',
  'Triple Double': 'Triple Double',

  // MLB
  'Hits': 'Hits',
  'Runs': 'Runs',
  'RBIs': 'RBIs',
  'Home Runs': 'Home Runs',
  'Total Bases': 'Total Bases',
  'Stolen Bases': 'Stolen Bases',
  'Pitcher Strikeouts': 'Pitcher Ks',
  'Pitcher Outs': 'Pitcher Outs',
  'Earned Runs Allowed': 'ER Allowed',

  // NHL
  'Goals': 'Goals',
  'Assists': 'Assists',
  'Points': 'Points',
  'Shots on Goal': 'Shots',
  'Power Play Points': 'PPP',
  'Saves (Goalie)': 'Saves',

  // Soccer
  'Goalscorer (Anytime)': 'Goals',
  'Assists': 'Assists',
  'Shots': 'Shots',
  'Shots on Target': 'Shots on Target',
  'Passes': 'Passes',
  'Tackles': 'Tackles'
} as const;

// SportsGameOdds statID to canonical prop type mapping
export const STAT_ID_TO_CANONICAL = {
  // NFL/NCAAF
  'passing_yards': 'Passing Yards',
  'passing_completions': 'Passing Completions',
  'passing_touchdowns': 'Passing TDs',
  'passing_interceptions': 'Interceptions',
  'passing_attempts': 'Passing Attempts',
  'rushing_yards': 'Rushing Yards',
  'rushing_attempts': 'Rushing Attempts',
  'rushing_touchdowns': 'Rushing TDs',
  'receiving_yards': 'Receiving Yards',
  'receptions': 'Receptions',
  'receiving_touchdowns': 'Receiving TDs',
  
  // NBA/NCAAB
  'points': 'Points',
  'assists': 'Assists',
  'rebounds': 'Rebounds',
  'three_pointers_made': '3PM',
  'steals': 'Steals',
  'blocks': 'Blocks',
  'turnovers': 'Turnovers',
  'pra': 'PRA',
  'double_double': 'Double Double',
  'triple_double': 'Triple Double',
  
  // MLB
  'hits': 'Hits',
  'runs': 'Runs',
  'rbis': 'RBIs',
  'home_runs': 'Home Runs',
  'total_bases': 'Total Bases',
  'stolen_bases': 'Stolen Bases',
  'strikeouts': 'Pitcher Ks',
  'outs': 'Pitcher Outs',
  'earned_runs': 'ER Allowed',
  
  // NHL
  'goals': 'Goals',
  'assists': 'Assists',
  'points': 'Points',
  'shots_on_goal': 'Shots',
  'power_play_points': 'PPP',
  'saves': 'Saves',
  
  // Soccer
  'goals': 'Goals',
  'assists': 'Assists',
  'shots': 'Shots',
  'shots_on_target': 'Shots on Target',
  'passes': 'Passes',
  'tackles': 'Tackles'
} as const;

// Market name patterns for normalization
export const MARKET_NAME_PATTERNS = {
  // NFL/NCAAF patterns
  /passing\s+yards/i: 'Passing Yards',
  /passing\s+completions/i: 'Passing Completions',
  /passing\s+touchdowns?/i: 'Passing TDs',
  /passing\s+interceptions?/i: 'Interceptions',
  /passing\s+attempts/i: 'Passing Attempts',
  /rushing\s+yards/i: 'Rushing Yards',
  /rushing\s+attempts/i: 'Rushing Attempts',
  /rushing\s+touchdowns?/i: 'Rushing TDs',
  /receiving\s+yards/i: 'Receiving Yards',
  /receptions?/i: 'Receptions',
  /receiving\s+touchdowns?/i: 'Receiving TDs',
  
  // NBA/NCAAB patterns
  /points?/i: 'Points',
  /assists?/i: 'Assists',
  /rebounds?/i: 'Rebounds',
  /3[-\s]?point(er)?s?\s+(made|field\s+goals?)/i: '3PM',
  /steals?/i: 'Steals',
  /blocks?/i: 'Blocks',
  /turnovers?/i: 'Turnovers',
  /pra\s*\(.*\)/i: 'PRA',
  /double\s+double/i: 'Double Double',
  /triple\s+double/i: 'Triple Double',
  
  // MLB patterns
  /hits?/i: 'Hits',
  /runs?/i: 'Runs',
  /rbis?/i: 'RBIs',
  /home\s+runs?/i: 'Home Runs',
  /total\s+bases/i: 'Total Bases',
  /stolen\s+bases?/i: 'Stolen Bases',
  /pitcher\s+strikeouts?/i: 'Pitcher Ks',
  /pitcher\s+outs?/i: 'Pitcher Outs',
  /earned\s+runs?\s+allowed/i: 'ER Allowed',
  
  // NHL patterns
  /goals?/i: 'Goals',
  /assists?/i: 'Assists',
  /points?/i: 'Points',
  /shots?\s+on\s+goal/i: 'Shots',
  /power\s+play\s+points?/i: 'PPP',
  /saves?/i: 'Saves',
  
  // Soccer patterns
  /goalscorer/i: 'Goals',
  /assists?/i: 'Assists',
  /shots?/i: 'Shots',
  /shots?\s+on\s+target/i: 'Shots on Target',
  /passes?/i: 'Passes',
  /tackles?/i: 'Tackles'
} as const;

class PropNormalizationService {
  private unmappedMarkets: Set<string> = new Set();
  private unmappedStatIDs: Set<string> = new Set();

  /**
   * Normalize a prop type from various sources (statID, marketName, etc.)
   */
  normalizePropType(input: string, source: 'statID' | 'marketName' = 'marketName'): string {
    if (!input || typeof input !== 'string') {
      logWarning('PropNormalizationService', `Invalid input for prop type normalization: ${input}`);
      return 'Unknown';
    }

    const normalizedInput = input.trim();

    // Try statID mapping first if source is statID
    if (source === 'statID' && STAT_ID_TO_CANONICAL[normalizedInput.toLowerCase()]) {
      return STAT_ID_TO_CANONICAL[normalizedInput.toLowerCase()];
    }

    // Try direct canonical mapping
    if (CANONICAL_PROP_TYPES[normalizedInput]) {
      return CANONICAL_PROP_TYPES[normalizedInput];
    }

    // Try pattern matching for market names
    if (source === 'marketName') {
      for (const [pattern, canonicalType] of Object.entries(MARKET_NAME_PATTERNS)) {
        if (pattern.test(normalizedInput)) {
          return canonicalType;
        }
      }
    }

    // Try case-insensitive statID mapping
    const lowerInput = normalizedInput.toLowerCase();
    if (STAT_ID_TO_CANONICAL[lowerInput]) {
      return STAT_ID_TO_CANONICAL[lowerInput];
    }

    // Log unmapped markets for debugging
    if (source === 'marketName') {
      this.unmappedMarkets.add(normalizedInput);
      logWarning('PropNormalizationService', `Unmapped market name: "${normalizedInput}"`);
    } else {
      this.unmappedStatIDs.add(normalizedInput);
      logWarning('PropNormalizationService', `Unmapped statID: "${normalizedInput}"`);
    }

    // Return a normalized version of the input as fallback
    return this.fallbackNormalization(normalizedInput);
  }

  /**
   * Extract player name from playerID format
   */
  extractPlayerName(playerID: string): string {
    if (!playerID || typeof playerID !== 'string') {
      return 'Unknown Player';
    }

    try {
      // PlayerID format: "FIRSTNAME_LASTNAME_NUMBER_LEAGUE"
      // Example: "NICHOLAS_VATTIATO_1_NCAAF"
      const parts = playerID.split('_');
      if (parts.length < 4) {
        logWarning('PropNormalizationService', `Invalid playerID format: ${playerID}`);
        return 'Unknown Player';
      }
      
      const firstName = parts[0];
      const lastName = parts[1];
      
      // Convert to proper case
      const properFirstName = firstName.charAt(0) + firstName.slice(1).toLowerCase();
      const properLastName = lastName.charAt(0) + lastName.slice(1).toLowerCase();
      
      return `${properFirstName} ${properLastName}`;
    } catch (error) {
      logError('PropNormalizationService', `Failed to extract player name from ${playerID}:`, error);
      return 'Unknown Player';
    }
  }

  /**
   * Extract team from playerID or team data
   */
  extractTeam(playerID: string, homeTeam?: string, awayTeam?: string): string {
    if (!playerID || typeof playerID !== 'string') {
      return homeTeam || awayTeam || 'Unknown';
    }

    try {
      // Try to extract team from playerID if it contains team info
      const parts = playerID.split('_');
      if (parts.length >= 4) {
        const league = parts[parts.length - 1];
        // For now, randomly assign to home/away until we have better team mapping
        return Math.random() > 0.5 ? (homeTeam || 'HOME') : (awayTeam || 'AWAY');
      }
      
      return homeTeam || awayTeam || 'Unknown';
    } catch (error) {
      logError('PropNormalizationService', `Failed to extract team from ${playerID}:`, error);
      return homeTeam || awayTeam || 'Unknown';
    }
  }

  /**
   * Parse odds from various formats
   */
  parseOdds(odds: any): number | null {
    if (odds === null || odds === undefined) {
      return null;
    }

    if (typeof odds === 'number') {
      return odds;
    }

    if (typeof odds === 'string') {
      // Handle string odds like "+100", "-110", etc.
      const cleanOdds = odds.replace(/[^-+0-9]/g, '');
      const parsed = parseInt(cleanOdds);
      return isNaN(parsed) ? null : parsed;
    }

    logWarning('PropNormalizationService', `Unknown odds format: ${odds}`);
    return null;
  }

  /**
   * Create conflict key for upsert operations
   */
  createConflictKey(playerID: string, propType: string, line: number, sportsbook: string, gameId: string): string {
    return `${playerID}-${propType}-${line}-${sportsbook}-${gameId}`;
  }

  /**
   * Get unmapped markets for debugging
   */
  getUnmappedMarkets(): string[] {
    return Array.from(this.unmappedMarkets);
  }

  /**
   * Get unmapped statIDs for debugging
   */
  getUnmappedStatIDs(): string[] {
    return Array.from(this.unmappedStatIDs);
  }

  /**
   * Clear unmapped data
   */
  clearUnmappedData(): void {
    this.unmappedMarkets.clear();
    this.unmappedStatIDs.clear();
  }

  /**
   * Fallback normalization for unmapped inputs
   */
  private fallbackNormalization(input: string): string {
    // Convert to title case and clean up
    return input
      .toLowerCase()
      .split(/[_\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Validate normalized prop type
   */
  isValidPropType(propType: string): boolean {
    return Object.values(CANONICAL_PROP_TYPES).includes(propType as any);
  }

  /**
   * Get all canonical prop types
   */
  getAllCanonicalTypes(): string[] {
    return Array.from(new Set(Object.values(CANONICAL_PROP_TYPES)));
  }

  /**
   * Get canonical prop types by sport
   */
  getCanonicalTypesBySport(sport: string): string[] {
    const sportLower = sport.toLowerCase();
    
    if (sportLower.includes('football') || sportLower.includes('nfl') || sportLower.includes('ncaa')) {
      return [
        'Passing Yards', 'Passing Completions', 'Passing TDs', 'Rushing Yards',
        'Rushing Attempts', 'Rushing TDs', 'Receiving Yards', 'Receptions',
        'Receiving TDs', 'Interceptions'
      ];
    }
    
    if (sportLower.includes('basketball') || sportLower.includes('nba') || sportLower.includes('ncaab')) {
      return [
        'Points', 'Assists', 'Rebounds', '3PM', 'Steals', 'Blocks',
        'Turnovers', 'PRA', 'Double Double', 'Triple Double'
      ];
    }
    
    if (sportLower.includes('baseball') || sportLower.includes('mlb')) {
      return [
        'Hits', 'Runs', 'RBIs', 'Home Runs', 'Total Bases', 'Stolen Bases',
        'Pitcher Ks', 'Pitcher Outs', 'ER Allowed'
      ];
    }
    
    if (sportLower.includes('hockey') || sportLower.includes('nhl')) {
      return [
        'Goals', 'Assists', 'Points', 'Shots', 'PPP', 'Saves'
      ];
    }
    
    if (sportLower.includes('soccer') || sportLower.includes('football')) {
      return [
        'Goals', 'Assists', 'Shots', 'Shots on Target', 'Passes', 'Tackles'
      ];
    }
    
    return [];
  }
}

// Export singleton instance
export const propNormalizationService = new PropNormalizationService();
