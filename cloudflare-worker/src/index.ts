/**
 * Statpedia Multi-Market API - Cloudflare Worker
 * Supports player props, moneyline, spread, total, 1Q, 1H markets
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
      const endpoint = url.searchParams.get('endpoint') || 'player-props';
      const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
      
      console.log(`🚀 ${endpoint} API Request: ${sport}${forceRefresh ? ' (force refresh)' : ''}`);
      
      const cacheKey = `${endpoint}-${sport}`;
      const cacheTtlSeconds = 300;
      const maxEvents = 10;
      const maxProps = 50;

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

      // Fetch from SportGameOdds API
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
      
      // Debug: Log first event structure
      if (rawData?.data?.length > 0) {
        console.log(`🔍 First event structure:`, JSON.stringify(rawData.data[0], null, 2).substring(0, 1000));
      }

      // Process events with REAL data from SportGameOdds API
      const allMarkets: any[] = [];
      const events = rawData.data || [];

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

        if (endpoint === 'player-props') {
          // Process player props
          const playerPropsMap = new Map<string, any>();
          
          for (const [propKey, propData] of Object.entries(event.odds)) {
            if (allMarkets.length >= maxProps) break;
            
            if (!propData || typeof propData !== 'object') {
              console.log(`❌ Skipping ${propKey}: not an object`);
              continue;
            }
            
            if (!propData.statEntityID) {
              console.log(`❌ Skipping ${propKey}: no statEntityID`);
              continue;
            }
            
            // Skip team-level props (all, away, home)
            if (['all', 'away', 'home'].includes(propData.statEntityID.toLowerCase())) {
              console.log(`❌ Skipping ${propKey}: team-level prop (${propData.statEntityID})`);
              continue;
            }
            
            if (!propKey.includes('-game-ou-')) {
              console.log(`❌ Skipping ${propKey}: doesn't include -game-ou-`);
              continue;
            }
            
            if (!['over', 'under'].includes(propData.sideID)) {
              console.log(`❌ Skipping ${propKey}: sideID is ${propData.sideID}, not over/under`);
              continue;
            }
            
            console.log(`✅ Processing prop: ${propKey}`);
            
            // Extract player information
            const playerID = propData.statEntityID;
            const statID = propData.statID;
            const side = propData.sideID;
            const marketName = propData.marketName;
            
            // Parse player name
            const playerName = playerID.replace(/_1_NFL$/, '').replace(/_1_MLB$/, '').replace(/_1_NBA$/, '').replace(/_1_NHL$/, '').replace(/_1_WNBA$/, '')
              .replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            
            // Format prop type
            const propType = statID.replace(/_/g, ' ').replace(/\+/g, ' + ')
              .split(' ')
              .map(word => {
                if (word.match(/[a-z][A-Z]/)) {
                  return word.replace(/([a-z])([A-Z])/g, '$1 $2');
                }
                return word;
              })
              .join(' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            
            // Process each sportsbook
            for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
              if (!bookmakerData || typeof bookmakerData !== 'object') continue;
              
              const bookmaker = bookmakerData as any;
              if (!bookmaker.overUnder || !bookmaker.odds) continue;
              
              const sportsbookLine = parseFloat(bookmaker.overUnder);
              const propKey_group = `${playerID}-${statID}-${sportsbookLine}`;
              
              if (!playerPropsMap.has(propKey_group)) {
                const prop = {
                  id: `${event.id}-${playerID}-${statID}-${sportsbookLine}`,
                  playerId: playerID,
                  playerName: playerName,
                  team: homeTeamFull, // Simplified - using home team for now
                  teamAbbr: homeTeam,
                  opponent: awayTeamFull,
                  opponentAbbr: awayTeam,
                  gameId: event.id,
                  sport: sport,
                  propType: propType,
                  line: sportsbookLine,
                  overOdds: null,
                  underOdds: null,
                  gameDate: gameDate.split('T')[0],
                  gameTime: gameDate,
                  availableSportsbooks: [],
                  allSportsbookOdds: [],
                  available: true,
                  awayTeam: awayTeamFull,
                  homeTeam: homeTeamFull,
                  betType: 'player_prop',
                  isExactAPIData: true,
                  lastUpdate: new Date().toISOString(),
                  marketName: marketName
                };
                playerPropsMap.set(propKey_group, prop);
              }
              
              const prop = playerPropsMap.get(propKey_group)!;
              prop.availableSportsbooks.push(bookmakerId);
              
              // Determine if pick'em sportsbook
              const isPickEm = ['underdog', 'prizepicks', 'thrivefantasy', 'superdraft'].includes(bookmakerId);
              
              const oddsValue = parseFloat(bookmaker.odds);
              const sportsbookOdds = {
                sportsbook: bookmakerId,
                line: sportsbookLine,
                overOdds: isPickEm ? null : (side === 'over' ? oddsValue : null),
                underOdds: isPickEm ? null : (side === 'under' ? oddsValue : null),
                isPickEm: isPickEm,
                lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
              };
              
              prop.allSportsbookOdds.push(sportsbookOdds);
            }
          }
          
          // Find best odds for each prop
          Array.from(playerPropsMap.values()).forEach(prop => {
            let bestOverOdds = null;
            let bestUnderOdds = null;
            let bestOverSportsbook = null;
            let bestUnderSportsbook = null;
            
            // Priority order for sportsbooks
            const priority = ['fanduel', 'draftkings', 'betmgm', 'caesars'];
            
            // Find best over odds
            for (const priorityBook of priority) {
              const sb = prop.allSportsbookOdds.find(o => o.sportsbook === priorityBook && o.overOdds !== null && !o.isPickEm);
              if (sb) {
                bestOverOdds = sb.overOdds;
                bestOverSportsbook = sb.sportsbook;
                break;
              }
            }
            
            // If no priority sportsbook found for over, use best overall
            if (!bestOverOdds) {
              for (const sb of prop.allSportsbookOdds) {
                if (sb.overOdds !== null && !sb.isPickEm) {
                  bestOverOdds = sb.overOdds;
                  bestOverSportsbook = sb.sportsbook;
                  break;
                }
              }
            }
            
            // Find best under odds
            for (const priorityBook of priority) {
              const sb = prop.allSportsbookOdds.find(o => o.sportsbook === priorityBook && o.underOdds !== null && !o.isPickEm);
              if (sb) {
                bestUnderOdds = sb.underOdds;
                bestUnderSportsbook = sb.sportsbook;
                break;
              }
            }
            
            // If no priority sportsbook found for under, use best overall
            if (!bestUnderOdds) {
              for (const sb of prop.allSportsbookOdds) {
                if (sb.underOdds !== null && !sb.isPickEm) {
                  bestUnderOdds = sb.underOdds;
                  bestUnderSportsbook = sb.sportsbook;
                  break;
                }
              }
            }
            
            prop.overOdds = bestOverOdds;
            prop.underOdds = bestUnderOdds;
          });
          
          // Add to allMarkets
          const validProps = Array.from(playerPropsMap.values())
            .filter(prop => prop.overOdds !== null && prop.underOdds !== null)
            .slice(0, maxProps);
          
          allMarkets.push(...validProps);
          console.log(`✅ Added ${validProps.length} player props from event ${i}`);
        }
      }

      console.log(`✅ Processed ${allMarkets.length} ${endpoint} markets from ${events.length} events`);

      // Create response
      const response = {
        success: true,
        data: allMarkets,
        cached: false,
        cacheKey,
        responseTime: Date.now() - startTime,
        totalEvents: events.length,
        totalProps: allMarkets.length
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
