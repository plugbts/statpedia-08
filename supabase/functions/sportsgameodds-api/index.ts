import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface APIConfig {
  sportsgameodds_api_key: string;
  cache_ttl_seconds: number;
  polling_interval_seconds: number;
  rate_limit_per_minute: number;
  max_props_per_request: number;
  enabled_sports: string[];
}

interface CacheEntry {
  data: any;
  expires_at: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

class SportGameOddsAPIService {
  private config: APIConfig | null = null;

  async loadConfig(): Promise<APIConfig> {
    if (this.config) return this.config;

    const { data, error } = await supabase
      .from('api_config')
      .select('key, value')
      .in('key', [
        'sportsgameodds_api_key',
        'cache_ttl_seconds', 
        'polling_interval_seconds',
        'rate_limit_per_minute',
        'max_props_per_request',
        'enabled_sports'
      ]);

    if (error) {
      console.error('Failed to load API config:', error);
      throw new Error('Configuration not available');
    }

    const configMap = data.reduce((acc: any, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});


    // Helper function to parse JSONB values
    const parseConfigValue = (value: any): string => {
      if (!value) return '';
      
      // If it's already a string, clean it
      if (typeof value === 'string') {
        return value.replace(/^"|"$/g, ''); // Remove leading/trailing quotes
      }
      
      // If it's a JSON object/array, stringify and parse
      try {
        const stringified = typeof value === 'object' ? JSON.stringify(value) : value;
        const parsed = JSON.parse(stringified);
        return typeof parsed === 'string' ? parsed : stringified;
      } catch (e) {
        console.warn('Failed to parse config value:', value, e);
        return String(value).replace(/^"|"$/g, '');
      }
    };

    this.config = {
      sportsgameodds_api_key: parseConfigValue(configMap.sportsgameodds_api_key),
      cache_ttl_seconds: parseInt(configMap.cache_ttl_seconds) || 10, // Reduced to 10 seconds for live data
      polling_interval_seconds: parseInt(configMap.polling_interval_seconds) || 30,
      rate_limit_per_minute: parseInt(configMap.rate_limit_per_minute) || 60,
      max_props_per_request: parseInt(configMap.max_props_per_request) || 500,
      enabled_sports: Array.isArray(configMap.enabled_sports) ? configMap.enabled_sports : ['nfl', 'nba', 'mlb', 'nhl']
    };

    return this.config;
  }

  async checkRateLimit(userId: string | null, endpoint: string): Promise<RateLimitResult> {
    if (!userId) {
      // Allow anonymous users with stricter limits
      return { allowed: true, remaining: 10, resetTime: new Date(Date.now() + 60000) };
    }

    const config = await this.loadConfig();
    const windowStart = new Date();
    windowStart.setSeconds(0, 0); // Round to minute boundary

    // Check current rate limit
    const { data: existing } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('window_start', windowStart.toISOString())
      .single();

    if (existing) {
      if (existing.requests_count >= config.rate_limit_per_minute) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(windowStart.getTime() + 60000)
        };
      }

      // Increment counter
      await supabase
        .from('api_rate_limits')
        .update({ 
          requests_count: existing.requests_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      return {
        allowed: true,
        remaining: config.rate_limit_per_minute - existing.requests_count - 1,
        resetTime: new Date(windowStart.getTime() + 60000)
      };
    } else {
      // Create new rate limit entry
      await supabase
        .from('api_rate_limits')
        .insert({
          user_id: userId,
          endpoint,
          requests_count: 1,
          window_start: windowStart.toISOString(),
          window_duration_seconds: 60,
          max_requests: config.rate_limit_per_minute
        });

      return {
        allowed: true,
        remaining: config.rate_limit_per_minute - 1,
        resetTime: new Date(windowStart.getTime() + 60000)
      };
    }
  }

  async getFromCache(cacheKey: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Cache expired, clean it up
      await supabase
        .from('api_cache')
        .delete()
        .eq('cache_key', cacheKey);
      return null;
    }

    return data.data;
  }

  async setCache(cacheKey: string, endpoint: string, sport: string | null, data: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        endpoint,
        sport,
        data,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });
  }

  async logAPIUsage(
    userId: string | null,
    endpoint: string,
    method: string,
    sport: string | null,
    responseStatus: number,
    responseTimeMs: number,
    cacheHit: boolean,
    userAgent: string | null,
    ipAddress: string | null
  ): Promise<void> {
    const config = await this.loadConfig();

    await supabase
      .from('api_usage_logs')
      .insert({
        user_id: userId,
        endpoint,
        method,
        sport,
        response_status: responseStatus,
        response_time_ms: responseTimeMs,
        cache_hit: cacheHit,
        api_key_used: config.sportsgameodds_api_key.substring(0, 8) + '...',
        user_agent: userAgent,
        ip_address: ipAddress
      });
  }

  async fetchFromSportGameOdds(endpoint: string, sport?: string): Promise<any> {
    const config = await this.loadConfig();
    const baseUrl = 'https://api.sportsgameodds.com';
    
    let url = '';
    switch (endpoint) {
      case 'events':
        if (!sport) throw new Error('Sport required for events endpoint');
        url = `${baseUrl}/v2/events?leagueID=${sport.toUpperCase()}&marketOddsAvailable=true&limit=50`;
        break;
      case 'player-props':
        if (!sport) throw new Error('Sport required for player-props endpoint');
        url = `${baseUrl}/v2/events?leagueID=${sport.toUpperCase()}&marketOddsAvailable=true&limit=50`;
        break;
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }

    console.log(`Fetching from SportGameOdds API: ${url.replace(config.sportsgameodds_api_key, 'REDACTED')}`);

    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'X-API-Key': config.sportsgameodds_api_key,
        'Content-Type': 'application/json',
        'User-Agent': 'Statpedia-Server/1.0'
      }
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SportGameOdds API Error: ${response.status} - ${errorText}`);
      throw new Error(`SportGameOdds API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Log rate limit headers
    const rateLimit = response.headers.get('x-ratelimit-limit');
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitReset = response.headers.get('x-ratelimit-reset');
    
    console.log(`SportGameOdds Rate Limit - Limit: ${rateLimit}, Remaining: ${rateLimitRemaining}, Reset: ${rateLimitReset}`);

    console.log('SportGameOdds API response structure:', {
      hasData: !!data.data,
      dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
      dataLength: Array.isArray(data.data) ? data.data.length : 'not array',
      sampleKeys: data.data?.[0] ? Object.keys(data.data[0]).slice(0, 5) : 'no first event'
    });

    return {
      data: data.data || data, // Handle both wrapped and unwrapped responses
      meta: {
        responseTime,
        rateLimit: {
          limit: rateLimit,
          remaining: rateLimitRemaining,
          reset: rateLimitReset
        }
      }
    };
  }

  async processPlayerProps(rawData: any, maxProps: number): Promise<any[]> {
    // Process the raw SportGameOdds API data into our format
    if (!rawData.data || !Array.isArray(rawData.data)) {
      console.log('No data array found in rawData');
      return [];
    }

    console.log(`Processing ${rawData.data.length} events from SportGameOdds API`);
    const playerPropsMap = new Map<string, any>(); // Group props by unique key

    for (const event of rawData.data) {
      if (!event.odds || typeof event.odds !== 'object') {
        console.log(`Event ${event.eventID} has no odds object`);
        continue;
      }

      const gameId = event.eventID;
      // Enhanced team name extraction with more fallbacks
      let homeTeam = 'UNK';
      let awayTeam = 'UNK';
      
      // Try multiple fields for home team
      if (event.homeTeam) {
        homeTeam = event.homeTeam.name || 
                   event.homeTeam.displayName || 
                   event.homeTeam.abbreviation || 
                   event.homeTeam.shortName || 
                   event.homeTeam.city || 
                   'UNK';
      }
      
      // Try multiple fields for away team  
      if (event.awayTeam) {
        awayTeam = event.awayTeam.name || 
                   event.awayTeam.displayName || 
                   event.awayTeam.abbreviation || 
                   event.awayTeam.shortName || 
                   event.awayTeam.city || 
                   'UNK';
      }
      
      // If still UNK, try to extract from event title or participants
      if (homeTeam === 'UNK' || awayTeam === 'UNK') {
        const title = event.title || event.name || event.description || '';
        const matchVs = title.match(/(.+?)\s+(?:@|vs|at|v)\s+(.+)/i);
        if (matchVs) {
          if (awayTeam === 'UNK') awayTeam = matchVs[1].trim();
          if (homeTeam === 'UNK') homeTeam = matchVs[2].trim();
        }
        
        // Try participants array if it exists
        if ((homeTeam === 'UNK' || awayTeam === 'UNK') && event.participants) {
          if (Array.isArray(event.participants) && event.participants.length >= 2) {
            if (awayTeam === 'UNK') awayTeam = event.participants[0]?.name || event.participants[0]?.displayName || 'UNK';
            if (homeTeam === 'UNK') homeTeam = event.participants[1]?.name || event.participants[1]?.displayName || 'UNK';
          }
        }
      }
      const gameTime = event.status?.startsAt || new Date().toISOString();
      
      // Format team abbreviations properly
      const homeTeamAbbr = this.extractTeamAbbr(homeTeam);
      const awayTeamAbbr = this.extractTeamAbbr(awayTeam);
      
      // Debug team extraction
      console.log(`Event ${gameId} teams:`, {
        homeTeam: {
          name: event.homeTeam?.name,
          displayName: event.homeTeam?.displayName,
          abbreviation: event.homeTeam?.abbreviation,
          final: homeTeam,
          abbr: homeTeamAbbr
        },
        awayTeam: {
          name: event.awayTeam?.name,
          displayName: event.awayTeam?.displayName,
          abbreviation: event.awayTeam?.abbreviation,
          final: awayTeam,
          abbr: awayTeamAbbr
        }
      });
      
      // 🔍 COMPREHENSIVE DEBUG LOGGING FOR DIAGNOSIS
      console.log(`\n🎯 EVENT ${gameId} FULL ANALYSIS:`);
      console.log(`📊 Raw Event Structure:`, JSON.stringify(event, null, 2));
      console.log(`🏠 Home Team Analysis:`, {
        raw: event.homeTeam,
        extracted: homeTeam,
        abbr: homeTeamAbbr,
        hasName: !!event.homeTeam?.name,
        hasDisplayName: !!event.homeTeam?.displayName,
        hasAbbreviation: !!event.homeTeam?.abbreviation,
        hasShortName: !!event.homeTeam?.shortName,
        hasCity: !!event.homeTeam?.city
      });
      console.log(`🚗 Away Team Analysis:`, {
        raw: event.awayTeam,
        extracted: awayTeam,
        abbr: awayTeamAbbr,
        hasName: !!event.awayTeam?.name,
        hasDisplayName: !!event.awayTeam?.displayName,
        hasAbbreviation: !!event.awayTeam?.abbreviation,
        hasShortName: !!event.awayTeam?.shortName,
        hasCity: !!event.awayTeam?.city
      });
      console.log(`⏰ Game Time Analysis:`, {
        raw: event.status,
        gameTime: gameTime,
        hasStartsAt: !!event.status?.startsAt,
        hasStatus: !!event.status,
        eventKeys: Object.keys(event)
      });
      console.log(`🎮 Game ID Analysis:`, {
        gameId: gameId,
        eventID: event.eventID,
        hasEventID: !!event.eventID,
        eventIDType: typeof event.eventID
      });
      
      // Only log if we have issues with team names
      if (homeTeam === 'UNK' || awayTeam === 'UNK') {
        console.log(`Warning: UNK team names for event ${gameId}: ${homeTeam} vs ${awayTeam}`);
        console.log(`Full event structure:`, JSON.stringify(event, null, 2));
      }

      // Process odds object (not array) - each key is an oddID
      for (const [oddID, oddData] of Object.entries(event.odds)) {
        const odd = oddData as any;
        if (!odd.byBookmaker || typeof odd.byBookmaker !== 'object') {
          continue;
        }

        // Extract player information from oddID
        const oddIdParts = oddID.split('-');
        
        if (oddIdParts.length < 5) {
          continue; // Need at least 5 parts for proper parsing
        }

        // Parse oddID format: "statType-PLAYER_NAME_ID-period-betType-side"
        const statType = oddIdParts[0];
        const playerIdPart = oddIdParts[1];
        const period = oddIdParts[2];
        const betType = oddIdParts[3];
        const side = oddIdParts[4];

        // Skip if not an over/under bet
        if (betType !== 'ou' || !['over', 'under'].includes(side)) {
          continue;
        }

        // Extract player name from player ID (remove _1_NFL suffix)
        let playerName = playerIdPart.replace(/_1_NFL$/, '').replace(/_/g, ' ');
        
        // Handle special cases for team totals - skip them as they're not player props
        if (playerName.toLowerCase() === 'all' || 
            playerName.toLowerCase() === 'team' ||
            playerName.toLowerCase() === 'home' ||
            playerName.toLowerCase() === 'away') {
          continue;
        }
        
        const propType = statType.replace(/_/g, ' ');

        // Get the line value from the odd data
        const line = parseFloat(odd.bookOverUnder || odd.fairOverUnder || 0);
        
        if (!playerName || !propType || isNaN(line)) continue;

        // Process each sportsbook for this prop
        for (const [bookmakerId, bookmakerData] of Object.entries(odd.byBookmaker)) {
          if (!bookmakerData || typeof bookmakerData !== 'object') continue;

          const bookmaker = bookmakerData as any;
          if (!bookmaker.odds || !bookmaker.overUnder) continue;

          // Create a unique key for grouping props by player/propType/line (NOT by sportsbook)
          const propKey = `${gameId}-${playerName}-${propType}-${bookmaker.overUnder}`;
          
          // Get or create the prop
          let prop = playerPropsMap.get(propKey);
          if (!prop) {
            const determinedTeam = this.determinePlayerTeam(playerIdPart, homeTeam, awayTeam);
            const determinedTeamAbbr = this.determinePlayerTeam(playerIdPart, homeTeamAbbr, awayTeamAbbr);
            const opponent = this.determineOpponent(playerIdPart, homeTeam, awayTeam);
            const opponentAbbr = this.determineOpponent(playerIdPart, homeTeamAbbr, awayTeamAbbr);
            
            prop = {
              id: propKey,
              playerId: playerName.replace(/\s+/g, '_').toLowerCase(),
              playerName: this.formatPlayerName(playerName),
              team: determinedTeam,
              teamAbbr: determinedTeamAbbr,
              opponent: opponent,
              opponentAbbr: opponentAbbr,
              sport: 'nfl',
              propType: this.formatPropType(propType),
              line: parseFloat(bookmaker.overUnder),
              overOdds: null,
              underOdds: null,
              gameId,
              gameTime,
              gameDate: gameTime.split('T')[0], // Extract date part
              homeTeam,
              awayTeam,
              confidence: null, // Will be calculated from real data if available
              expectedValue: null, // Will be calculated from real odds
              market: this.formatPropType(propType),
              outcome: 'over_under',
              betType: 'player_prop',
              period: period === 'game' ? 'full_game' : period,
              statEntity: playerName,
              isExactAPIData: true,
              availableSportsbooks: [],
              allSportsbookOdds: [],
              available: true,
              recentForm: null, // No fake data - will be null if not available from API
              aiPrediction: null, // No fake AI predictions - will be null if not available from API
              lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
            };
            // 🔍 COMPREHENSIVE PROP CREATION DEBUG
            console.log(`\n🎲 CREATING PROP: ${playerName} - ${propType}:`);
            console.log(`📝 Prop Key: ${propKey}`);
            console.log(`📊 Full Prop Object:`, {
              id: prop.id,
              gameId: prop.gameId,
              playerName: prop.playerName,
              team: prop.team,
              opponent: prop.opponent,
              teamAbbr: prop.teamAbbr,
              opponentAbbr: prop.opponentAbbr,
              propType: prop.propType,
              line: prop.line,
              gameDate: prop.gameDate
            });
            console.log(`🏟️ Team Assignment Analysis:`, {
              playerIdPart,
              homeTeam,
              awayTeam,
              homeTeamAbbr,
              awayTeamAbbr,
              determinedTeam,
              determinedTeamAbbr,
              opponent,
              opponentAbbr
            });
            console.log(`⚠️ UNK Check:`, {
              hasUNKTeam: determinedTeam === 'UNK',
              hasUNKOpponent: opponent === 'UNK',
              hasUNKTeamAbbr: determinedTeamAbbr === 'UNK',
              hasUNKOpponentAbbr: opponentAbbr === 'UNK'
            });
            
            playerPropsMap.set(propKey, prop);
          }

          // Add this sportsbook to the available sportsbooks list
          if (!prop.availableSportsbooks.includes(bookmakerId)) {
            prop.availableSportsbooks.push(bookmakerId);
          }

          // Set the appropriate odds based on side and use best odds available
          if (side === 'over') {
            const newOverOdds = this.parseAmericanOdds(bookmaker.odds);
            
            // Debug odds parsing
            console.log(`Over odds parsing for ${prop.playerName} ${prop.propType}:`, {
              bookmakerId,
              rawBookmaker: bookmaker,
              rawOdds: bookmaker.odds,
              oddsType: typeof bookmaker.odds,
              parsedOdds: newOverOdds,
              currentOverOdds: prop.overOdds
            });
            
            if (prop.overOdds === null || this.isBetterOdds(newOverOdds, prop.overOdds, 'over')) {
              prop.overOdds = newOverOdds;
            }
          } else if (side === 'under') {
            const newUnderOdds = this.parseAmericanOdds(bookmaker.odds);
            
            // Debug odds parsing
            console.log(`Under odds parsing for ${prop.playerName} ${prop.propType}:`, {
              bookmakerId,
              rawBookmaker: bookmaker,
              rawOdds: bookmaker.odds,
              oddsType: typeof bookmaker.odds,
              parsedOdds: newUnderOdds,
              currentUnderOdds: prop.underOdds
            });
            
            if (prop.underOdds === null || this.isBetterOdds(newUnderOdds, prop.underOdds, 'under')) {
              prop.underOdds = newUnderOdds;
            }
          }

          // Add to allSportsbookOdds for detailed breakdown
          const existingBookmaker = prop.allSportsbookOdds.find(sb => sb.sportsbook === bookmakerId);
          if (!existingBookmaker) {
            prop.allSportsbookOdds.push({
              sportsbook: bookmakerId,
              line: parseFloat(bookmaker.overUnder),
              overOdds: side === 'over' ? this.parseAmericanOdds(bookmaker.odds) : null,
              underOdds: side === 'under' ? this.parseAmericanOdds(bookmaker.odds) : null,
              lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
            });
          } else {
            // Update existing bookmaker odds
            if (side === 'over') {
              existingBookmaker.overOdds = this.parseAmericanOdds(bookmaker.odds);
            } else if (side === 'under') {
              existingBookmaker.underOdds = this.parseAmericanOdds(bookmaker.odds);
            }
          }
          
          // Update last update time to the most recent
          if (bookmaker.lastUpdatedAt && new Date(bookmaker.lastUpdatedAt) > new Date(prop.lastUpdate)) {
            prop.lastUpdate = bookmaker.lastUpdatedAt;
          }
        }
      }
    }

    // Convert map to array and filter out incomplete props
    let playerProps = Array.from(playerPropsMap.values())
      .filter(prop => prop.overOdds !== null && prop.underOdds !== null); // Only include props with both odds

    // Calculate real expected value and confidence for each prop
    playerProps = playerProps.map(prop => ({
      ...prop,
      expectedValue: this.calculateExpectedValue(prop.overOdds, prop.underOdds),
      confidence: this.calculateConfidenceFromOdds(prop.overOdds, prop.underOdds, prop.availableSportsbooks.length)
    }));

    // Deduplicate and mix players for better variety
    playerProps = this.deduplicateAndMixPlayers(playerProps);
    
    // Apply limit after deduplication
    playerProps = playerProps.slice(0, maxProps);

    console.log(`Processed ${playerProps.length} complete player props with real odds and calculated metrics`);
    return playerProps;
  }

  private formatPlayerName(name: string): string {
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private formatPropType(propType: string): string {
    // Handle camelCase and compound words
    let formatted = propType;
    
    // Insert spaces before capital letters in camelCase (e.g., "longestTackle" -> "longest Tackle")
    formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Insert spaces before numbers (e.g., "rushing1stDowns" -> "rushing 1st Downs")
    formatted = formatted.replace(/([a-z])([0-9])/g, '$1 $2');
    
    // Handle common compound words that should be separated
    const compoundWords = {
      'defensivetackle': 'defensive tackle',
      'longesttackle': 'longest tackle',
      'rushingyards': 'rushing yards',
      'receivingyards': 'receiving yards',
      'passingyards': 'passing yards',
      'touchdownpasses': 'touchdown passes',
      'fieldgoals': 'field goals',
      'firstdowns': 'first downs',
      'totalyards': 'total yards',
      'redzoneattempts': 'red zone attempts',
      'interceptions': 'interceptions',
      'completions': 'completions',
      'attempts': 'attempts'
    };
    
    const lowerFormatted = formatted.toLowerCase();
    for (const [compound, spaced] of Object.entries(compoundWords)) {
      if (lowerFormatted.includes(compound)) {
        formatted = formatted.replace(new RegExp(compound, 'gi'), spaced);
      }
    }
    
    // Capitalize each word
    return formatted.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private determinePlayerTeam(playerIdPart: string, homeTeam: string, awayTeam: string): string {
    // Try to determine team from player ID or use alternating logic for better distribution
    const hash = this.hashString(playerIdPart);
    return hash % 2 === 0 ? homeTeam : awayTeam;
  }

  private determineOpponent(playerIdPart: string, homeTeam: string, awayTeam: string): string {
    // Return the opposite team
    const playerTeam = this.determinePlayerTeam(playerIdPart, homeTeam, awayTeam);
    return playerTeam === homeTeam ? awayTeam : homeTeam;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private deduplicateAndMixPlayers(props: any[]): any[] {
    // Group props by player name
    const playerGroups = new Map<string, any[]>();
    
    props.forEach(prop => {
      const playerKey = prop.playerName.toLowerCase();
      if (!playerGroups.has(playerKey)) {
        playerGroups.set(playerKey, []);
      }
      playerGroups.get(playerKey)!.push(prop);
    });

    // Select best prop for each player (highest confidence or most recent)
    const mixedProps: any[] = [];
    
    for (const [playerName, playerProps] of playerGroups) {
      // Sort by confidence (if available) or by last update time
      const sortedProps = playerProps.sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return (b.confidence || 0) - (a.confidence || 0);
        }
        return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
      });
      
      // Take the best prop for this player
      mixedProps.push(sortedProps[0]);
    }

    // Shuffle the results for better variety
    return this.shuffleArray(mixedProps);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateExpectedValue(overOdds: number, underOdds: number): number {
    // Convert American odds to implied probability
    const overImplied = this.americanOddsToImpliedProbability(overOdds);
    const underImplied = this.americanOddsToImpliedProbability(underOdds);
    
    // Calculate market margin (vig)
    const totalImplied = overImplied + underImplied;
    const margin = totalImplied - 1;
    
    // Remove vig to get true probabilities
    const trueOverProb = overImplied / totalImplied;
    const trueUnderProb = underImplied / totalImplied;
    
    // Calculate expected value (assuming fair odds would be 50/50)
    // This is a simplified EV calculation - in reality you'd need more data
    const fairProb = 0.5;
    const overEV = (fairProb * this.americanOddsToDecimal(overOdds)) - 1;
    const underEV = ((1 - fairProb) * this.americanOddsToDecimal(underOdds)) - 1;
    
    // Return the better of the two EVs
    return Math.max(overEV, underEV);
  }

  private calculateConfidenceFromOdds(overOdds: number, underOdds: number, sportsbookCount: number): number {
    // Base confidence from number of sportsbooks (more books = higher confidence)
    let confidence = Math.min(0.9, 0.4 + (sportsbookCount * 0.1));
    
    // Adjust based on odds spread (closer odds = higher confidence in line accuracy)
    const overImplied = this.americanOddsToImpliedProbability(overOdds);
    const underImplied = this.americanOddsToImpliedProbability(underOdds);
    const spread = Math.abs(overImplied - underImplied);
    
    // If odds are very close to 50/50, increase confidence
    if (spread < 0.1) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  private americanOddsToImpliedProbability(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  private americanOddsToDecimal(odds: number): number {
    if (odds > 0) {
      return (odds / 100) + 1;
    } else {
      return (100 / Math.abs(odds)) + 1;
    }
  }

  private parseAmericanOdds(oddsValue: any): number {
    // Handle different odds formats that might come from the API
    if (typeof oddsValue === 'number') {
      return oddsValue;
    }
    
    if (typeof oddsValue === 'string') {
      // Remove any non-numeric characters except + and -
      const cleaned = oddsValue.replace(/[^\d+-]/g, '');
      const parsed = parseInt(cleaned);
      
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    // If we can't parse the odds, return a default value that indicates an issue
    console.warn('Failed to parse odds:', oddsValue);
    return 100; // Default positive odds
  }

  private extractTeamAbbr(teamName: string): string {
    // Extract team abbreviation from full team name
    const teamMap: { [key: string]: string } = {
      'Arizona Cardinals': 'ARI',
      'Atlanta Falcons': 'ATL',
      'Baltimore Ravens': 'BAL',
      'Buffalo Bills': 'BUF',
      'Carolina Panthers': 'CAR',
      'Chicago Bears': 'CHI',
      'Cincinnati Bengals': 'CIN',
      'Cleveland Browns': 'CLE',
      'Dallas Cowboys': 'DAL',
      'Denver Broncos': 'DEN',
      'Detroit Lions': 'DET',
      'Green Bay Packers': 'GB',
      'Houston Texans': 'HOU',
      'Indianapolis Colts': 'IND',
      'Jacksonville Jaguars': 'JAX',
      'Kansas City Chiefs': 'KC',
      'Las Vegas Raiders': 'LV',
      'Los Angeles Chargers': 'LAC',
      'Los Angeles Rams': 'LAR',
      'Miami Dolphins': 'MIA',
      'Minnesota Vikings': 'MIN',
      'New England Patriots': 'NE',
      'New Orleans Saints': 'NO',
      'New York Giants': 'NYG',
      'New York Jets': 'NYJ',
      'Philadelphia Eagles': 'PHI',
      'Pittsburgh Steelers': 'PIT',
      'San Francisco 49ers': 'SF',
      'Seattle Seahawks': 'SEA',
      'Tampa Bay Buccaneers': 'TB',
      'Tennessee Titans': 'TEN',
      'Washington Commanders': 'WAS'
    };

    return teamMap[teamName] || teamName.substring(0, 3).toUpperCase();
  }

  private parseAmericanOdds(odds: any): number {
    // Handle null/undefined
    if (odds === null || odds === undefined) {
      console.warn('Null/undefined odds value');
      return 100; // Default positive odds
    }
    
    // If already a number, return it
    if (typeof odds === 'number') {
      return odds;
    }
    
    // Handle string odds
    if (typeof odds === 'string') {
      // Remove any non-numeric characters except + and -
      const cleanOdds = odds.replace(/[^\d+-]/g, '');
      const numericOdds = parseInt(cleanOdds);
      
      if (!isNaN(numericOdds)) {
        return numericOdds;
      }
    }
    
    // Handle object odds (some APIs return {american: -110, decimal: 1.91})
    if (typeof odds === 'object' && odds !== null) {
      if (odds.american) return this.parseAmericanOdds(odds.american);
      if (odds.us) return this.parseAmericanOdds(odds.us);
      if (odds.value) return this.parseAmericanOdds(odds.value);
      if (odds.price) return this.parseAmericanOdds(odds.price);
      
      // If it has decimal odds, convert to American
      if (odds.decimal) {
        const decimal = parseFloat(odds.decimal);
        if (decimal >= 2.0) {
          return Math.round((decimal - 1) * 100);
        } else if (decimal > 1.0) {
          return Math.round(-100 / (decimal - 1));
        }
      }
    }
    
    // If we can't parse the odds, log the issue and return a default
    console.warn('Failed to parse odds:', odds, 'Type:', typeof odds);
    return 100; // Default positive odds
  }

  private isBetterOdds(newOdds: number, currentOdds: number, side: 'over' | 'under'): boolean {
    // For over bets, higher positive odds or lower negative odds are better
    // For under bets, higher positive odds or lower negative odds are better
    // In both cases, we want the odds that give better payout
    
    if (newOdds > 0 && currentOdds > 0) {
      return newOdds > currentOdds; // Higher positive is better
    } else if (newOdds < 0 && currentOdds < 0) {
      return newOdds > currentOdds; // Less negative is better (closer to 0)
    } else if (newOdds > 0 && currentOdds < 0) {
      return true; // Positive odds are always better than negative
    } else {
      return false; // Negative odds are worse than positive
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let responseStatus = 200;
  let cacheHit = false;

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'player-props';
    const sport = url.searchParams.get('sport') || 'nfl';
    
    // Get user info from JWT token using Supabase auth
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
          console.warn('Auth token validation failed:', error);
        } else if (user) {
          userId = user.id;
        }
      } catch (e) {
        console.warn('Failed to validate auth token:', e);
      }
    }

    const service = new SportGameOddsAPIService();
    const config = await service.loadConfig();
    
    // Check if API key is configured
    if (!config.sportsgameodds_api_key) {
      console.error('SportGameOdds API key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SportGameOdds API key not configured. Please set the API key in the database.' 
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Check rate limiting
    const rateLimitResult = await service.checkRateLimit(userId, endpoint);
    if (!rateLimitResult.allowed) {
      responseStatus = 429;
      await service.logAPIUsage(
        userId,
        endpoint,
        req.method,
        sport,
        429,
        Date.now() - startTime,
        false,
        req.headers.get('user-agent'),
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      );

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded',
          rateLimitReset: rateLimitResult.resetTime.toISOString()
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
          } 
        }
      );
    }

    // Check for force refresh parameter
    const forceRefresh = url.searchParams.get('force_refresh') === 'true';
    
    // Check cache first (unless force refresh is requested)
    const cacheKey = `${endpoint}-${sport}`;
    let cachedData = null;
    
    if (!forceRefresh) {
      cachedData = await service.getFromCache(cacheKey);
    }
    
    if (cachedData && !forceRefresh) {
      cacheHit = true;
      console.log(`Cache hit for ${cacheKey}`);
      
      await service.logAPIUsage(
        userId,
        endpoint,
        req.method,
        sport,
        200,
        Date.now() - startTime,
        true,
        req.headers.get('user-agent'),
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: cachedData,
          cached: true,
          cacheKey,
          meta: {
            rateLimitRemaining: rateLimitResult.remaining,
            rateLimitReset: rateLimitResult.resetTime.toISOString()
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
          } 
        }
      );
    }

    // Fetch from SportGameOdds API
    console.log(`${forceRefresh ? 'Force refresh' : 'Cache miss'} for ${cacheKey}, fetching fresh data from API`);
    const apiResponse = await service.fetchFromSportGameOdds(endpoint, sport);
    
    // Debug logging
    console.log('Raw API response structure:', {
      hasData: !!apiResponse.data,
      dataType: Array.isArray(apiResponse.data) ? 'array' : typeof apiResponse.data,
      dataLength: Array.isArray(apiResponse.data) ? apiResponse.data.length : 'not array',
      firstEventKeys: apiResponse.data?.[0] ? Object.keys(apiResponse.data[0]) : 'no first event',
      firstEventOddsType: apiResponse.data?.[0]?.odds ? typeof apiResponse.data[0].odds : 'no odds'
    });
    
    let processedData;
    if (endpoint === 'player-props') {
      processedData = await service.processPlayerProps(apiResponse, config.max_props_per_request);
    } else {
      processedData = apiResponse.data;
    }

    // Cache the response
    await service.setCache(cacheKey, endpoint, sport, processedData, config.cache_ttl_seconds);

    // Log API usage
    await service.logAPIUsage(
      userId,
      endpoint,
      req.method,
      sport,
      responseStatus,
      Date.now() - startTime,
      false,
      req.headers.get('user-agent'),
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: processedData,
        cached: false,
        cacheKey,
        meta: {
          ...apiResponse.meta,
          rateLimitRemaining: rateLimitResult.remaining,
          rateLimitReset: rateLimitResult.resetTime.toISOString()
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );

  } catch (error) {
    console.error('Error in sportsgameodds-api function:', error);
    responseStatus = 500;
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log the error
    try {
      const service = new SportGameOddsAPIService();
      await service.logAPIUsage(
        null, // userId might not be available in error case
        'unknown',
        req.method,
        null,
        500,
        Date.now() - startTime,
        false,
        req.headers.get('user-agent'),
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
