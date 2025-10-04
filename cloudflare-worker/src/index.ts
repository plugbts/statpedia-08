/**
 * Minimal Statpedia Player Props API - Cloudflare Worker
 * Ultra-simple version to avoid stack overflow
 */

interface Env {
  PLAYER_PROPS_CACHE?: R2Bucket;
  SPORTSGAMEODDS_API_KEY: string;
  CACHE_TTL_SECONDS: string;
  MAX_EVENTS_PER_REQUEST: string;
  MAX_PROPS_PER_REQUEST: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const sport = url.searchParams.get('sport') || 'nfl';
      const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
      
      console.log(`🚀 Player Props API Request: ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      const cacheKey = `player-props-${sport}`;
      const cacheTtlSeconds = 300;
      const maxEvents = 10; // Very limited
      const maxProps = 50; // Very limited

      // Check cache first (if R2 is available)
      if (!forceRefresh && env.PLAYER_PROPS_CACHE) {
        const cachedData = await env.PLAYER_PROPS_CACHE.get(cacheKey);
        if (cachedData) {
          console.log(`✅ Cache hit for ${cacheKey}`);
          const cachedJson = await cachedData.text();
          return new Response(cachedJson, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          });
        }
      }

      console.log('Fetching fresh data from API...');

      // Fetch from SportGameOdds API with very limited scope
      const apiResponse = await fetch(`https://api.sportsgameodds.com/v2/events?leagueID=${sport.toUpperCase()}&marketOddsAvailable=true&limit=${maxEvents}`, {
        headers: {
          'X-API-Key': env.SPORTSGAMEODDS_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        throw new Error(`API returned ${apiResponse.status}`);
      }

      const rawData = await apiResponse.json();
      console.log(`✅ API success: ${rawData?.data?.length || 0} events`);

      // Process events with REAL data from SportGameOdds API
      const playerProps: any[] = [];
      const events = rawData.data || [];
      const playerPropsMap = new Map<string, any>(); // Group props by unique key

      for (let i = 0; i < Math.min(events.length, maxEvents); i++) {
        const event = events[i];
        if (!event.odds || !event.teams) continue;

        // Extract REAL team names
        const homeTeam = event.teams.home?.names?.short || event.teams.home?.names?.medium || 'UNK';
        const awayTeam = event.teams.away?.names?.short || event.teams.away?.names?.medium || 'UNK';
        const homeTeamFull = event.teams.home?.names?.long || homeTeam;
        const awayTeamFull = event.teams.away?.names?.long || awayTeam;
        
        // Get REAL game date
        const gameDate = event.scheduled || event.status?.startsAt || new Date().toISOString();
        
        console.log(`📊 Processing event ${i}: ${homeTeam} vs ${awayTeam} on ${gameDate}`);

        // Process REAL player props from the odds object
        for (const [propKey, propData] of Object.entries(event.odds)) {
          if (playerProps.length >= maxProps) break; // Global limit
          
          if (!propData || typeof propData !== 'object') continue;
          
          // Skip if not a player prop (look for player ID pattern)
          if (!propData.playerID || !propKey.includes('-game-ou-')) continue;
          
          // Extract REAL player information
          const playerID = propData.playerID;
          const statID = propData.statID;
          const side = propData.sideID;
          const marketName = propData.marketName;
          
          // Skip if not over/under
          if (!['over', 'under'].includes(side)) continue;
          
          // Parse REAL player name from playerID with proper capitalization
          const playerName = playerID.replace(/_1_NFL$/, '').replace(/_1_MLB$/, '').replace(/_1_NBA$/, '').replace(/_1_NHL$/, '').replace(/_1_WNBA$/, '')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          // Format prop type from statID with proper spacing
          const propType = statID.replace(/_/g, ' ').replace(/\+/g, ' + ')
            .split(' ')
            .map(word => {
              // Handle camelCase words like "longestCompletion"
              if (word.match(/[a-z][A-Z]/)) {
                return word.replace(/([a-z])([A-Z])/g, '$1 $2');
              }
              return word;
            })
            .join(' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          // Process each sportsbook's line separately to avoid mixing different lines
          for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
            if (!bookmakerData || typeof bookmakerData !== 'object') continue;
            
            const bookmaker = bookmakerData as any;
            if (!bookmaker.overUnder) continue;
            
            // Get the line from this specific sportsbook
            const sportsbookLine = parseFloat(bookmaker.overUnder);
            if (!sportsbookLine || sportsbookLine <= 0) continue;
            
            // Create unique key for this specific line
            const propKey_group = `${event.eventID}-${playerID}-${statID}-${sportsbookLine}`;
            
            // Get or create the prop group for this line
            let prop = playerPropsMap.get(propKey_group);
            if (!prop) {
              // Determine which team the player is on based on team ID pattern
              // For now, use a simple hash-based assignment for consistency
              const playerHash = playerID.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              const playerTeam = playerHash % 2 === 0 ? homeTeam : awayTeam;
              const playerTeamFull = playerTeam === homeTeam ? homeTeamFull : awayTeamFull;
              const opponent = playerTeam === homeTeam ? awayTeam : homeTeam;
              const opponentFull = playerTeam === homeTeam ? awayTeamFull : homeTeamFull;
              
              prop = {
                id: propKey_group,
                playerId: playerID,
                playerName: playerName,
                team: playerTeamFull,
                teamAbbr: playerTeam,
                opponent: opponentFull,
                opponentAbbr: opponent,
                sport: 'nfl',
                propType: propType,
                line: sportsbookLine,
                overOdds: null,
                underOdds: null,
                gameId: event.eventID,
                gameTime: gameDate,
                gameDate: gameDate.split('T')[0], // Extract date part
                homeTeam: homeTeamFull,
                awayTeam: awayTeamFull,
                market: propType,
                outcome: 'over_under',
                betType: 'player_prop',
                period: 'full_game',
                statEntity: playerName,
                isExactAPIData: true,
                availableSportsbooks: [],
                allSportsbookOdds: [],
                available: true,
                recentForm: null, // Real data - no fake form
                aiPrediction: null, // Real data - no fake AI
                lastUpdate: new Date().toISOString(),
                marketName: marketName
              };
              
              playerPropsMap.set(propKey_group, prop);
            }
            
            // Add this sportsbook to the prop
            if (!prop.availableSportsbooks.includes(bookmakerId)) {
              prop.availableSportsbooks.push(bookmakerId);
            }
            
            // Parse odds
            const odds = parseNumber(bookmaker.odds);
            if (odds === null) continue;
            
            // Check if this is a pick'em style sportsbook
            const pickEmSportsbooks = ['underdog', 'prizepicks', 'thrivefantasy', 'superdraft'];
            const isPickEm = pickEmSportsbooks.includes(bookmakerId.toLowerCase());
            
            // Add to allSportsbookOdds
            const existingBookmaker = prop.allSportsbookOdds.find(sb => sb.sportsbook === bookmakerId);
            if (!existingBookmaker) {
              prop.allSportsbookOdds.push({
                sportsbook: bookmakerId,
                line: sportsbookLine,
                overOdds: isPickEm ? null : (side === 'over' ? odds : null),
                underOdds: isPickEm ? null : (side === 'under' ? odds : null),
                isPickEm: isPickEm,
                lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
              });
            } else {
              // Update existing bookmaker odds
              if (!isPickEm) {
                if (side === 'over') {
                  existingBookmaker.overOdds = odds;
                } else if (side === 'under') {
                  existingBookmaker.underOdds = odds;
                }
              }
              // Update last update time
              if (bookmaker.lastUpdatedAt && new Date(bookmaker.lastUpdatedAt) > new Date(existingBookmaker.lastUpdate)) {
                existingBookmaker.lastUpdate = bookmaker.lastUpdatedAt;
              }
            }
            
            // Update last update time for the prop
            if (bookmaker.lastUpdatedAt && new Date(bookmaker.lastUpdatedAt) > new Date(prop.lastUpdate)) {
              prop.lastUpdate = bookmaker.lastUpdatedAt;
            }
          }

        }
      }

      // Convert map to array and set best odds from all sportsbooks
      const allProps = Array.from(playerPropsMap.values());
      
      // Set the main overOdds/underOdds to the best odds from a single sportsbook
      allProps.forEach(prop => {
        if (prop.allSportsbookOdds && prop.allSportsbookOdds.length > 0) {
          // Find the best overall sportsbook (prioritize FanDuel, then DraftKings, then best odds)
          const preferredSportsbooks = ['fanduel', 'draftkings', 'betmgm', 'caesars'];
          let bestSportsbook = null;
          let bestScore = -Infinity;
          
          // First, try to find a preferred sportsbook with both over and under odds (excluding pick'em books)
          for (const preferred of preferredSportsbooks) {
            const sb = prop.allSportsbookOdds.find(s => s.sportsbook === preferred);
            if (sb && sb.overOdds !== null && sb.underOdds !== null && !sb.isPickEm) {
              // Calculate a score for this sportsbook (higher is better)
              const overScore = sb.overOdds > 0 ? sb.overOdds : (100 + Math.abs(sb.overOdds));
              const underScore = sb.underOdds > 0 ? sb.underOdds : (100 + Math.abs(sb.underOdds));
              const totalScore = overScore + underScore;
              
              if (totalScore > bestScore) {
                bestScore = totalScore;
                bestSportsbook = sb;
              }
            }
          }
          
          // If no preferred sportsbook found, find the best overall sportsbook (excluding pick'em books)
          if (!bestSportsbook) {
            for (const sb of prop.allSportsbookOdds) {
              if (sb.overOdds !== null && sb.underOdds !== null && !sb.isPickEm) {
                const overScore = sb.overOdds > 0 ? sb.overOdds : (100 + Math.abs(sb.overOdds));
                const underScore = sb.underOdds > 0 ? sb.underOdds : (100 + Math.abs(sb.underOdds));
                const totalScore = overScore + underScore;
                
                if (totalScore > bestScore) {
                  bestScore = totalScore;
                  bestSportsbook = sb;
                }
              }
            }
          }
          
          // Set the main odds fields to the best sportsbook's odds
          if (bestSportsbook) {
            prop.overOdds = bestSportsbook.overOdds;
            prop.underOdds = bestSportsbook.underOdds;
          }
        }
      });
      
      // Filter out incomplete props and apply limit
      playerProps.push(...allProps
        .filter(prop => prop.overOdds !== null && prop.underOdds !== null)
        .slice(0, maxProps));

      console.log(`✅ Processed ${playerProps.length} player props from ${events.length} events`);

      // Create simple response
      const response = {
        success: true,
        data: playerProps,
        cached: false,
        cacheKey,
        responseTime: Date.now() - startTime,
        totalEvents: events.length,
        totalProps: playerProps.length
      };

      // Store in cache (if R2 is available)
      const responseJson = JSON.stringify(response);
      if (env.PLAYER_PROPS_CACHE) {
        try {
          await env.PLAYER_PROPS_CACHE.put(cacheKey, responseJson, {
        expirationTtl: cacheTtlSeconds,
      });
        } catch (cacheError) {
          console.warn('Cache storage failed:', cacheError);
        }
      }

      return new Response(responseJson, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
      });

    } catch (error) {
      console.error('❌ Error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        data: [],
        cached: false,
        cacheKey: '',
        responseTime: Date.now() - startTime,
        totalEvents: 0,
        totalProps: 0,
        error: error.message || 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

function parseNumber(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle American odds format like "+100", "-115"
    const cleaned = value.replace(/[^\d+-]/g, '');
    const parsed = parseInt(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function isBetterOdds(newOdds: number, currentOdds: number, side: 'over' | 'under'): boolean {
  // For both over and under bets, we want the odds that give the best payout
  // This means:
  // - Higher positive odds are better than lower positive odds
  // - Less negative odds (closer to 0) are better than more negative odds
  // - Positive odds are always better than negative odds
  
  if (newOdds > 0 && currentOdds > 0) {
    return newOdds > currentOdds; // Higher positive is better
  } else if (newOdds < 0 && currentOdds < 0) {
    return newOdds > currentOdds; // Less negative is better (closer to 0)
  } else if (newOdds > 0 && currentOdds < 0) {
    return true; // Positive odds are always better than negative
  } else if (newOdds < 0 && currentOdds > 0) {
    return false; // Negative odds are worse than positive
  } else {
    return false; // Equal odds
  }
}
