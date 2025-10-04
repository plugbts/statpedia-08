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
      const apiResponse = await fetch(`https://api.sportsgameodds.com/v2/events?leagueID=${sport.toUpperCase()}&oddsAvailable=true&limit=${maxEvents}`, {
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

        if (endpoint === 'player-props' || endpoint === '1q-player-props') {
          // Process player props (including 1Q player props)
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
            
            // Skip team-level props (all, away, home) for player props
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
                  marketType: 'player-prop',
                  period: endpoint === '1q-player-props' ? '1st_quarter' : 'full_game',
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
        } else {
          // Process other market types (moneyline, spread, total, 1Q, 1H)
          const marketsMap = new Map<string, any>();
          
          // Determine period and market type based on endpoint
          let period = 'full_game';
          let marketType = endpoint;
          
          if (endpoint.includes('1q')) {
            period = '1st_quarter';
            marketType = endpoint.replace('1q-', '');
          } else if (endpoint.includes('1h')) {
            period = '1st_half';
            marketType = endpoint.replace('1h-', '');
          }
          
          for (const [propKey, propData] of Object.entries(event.odds)) {
            if (allMarkets.length >= maxProps) break;
            if (!propData || typeof propData !== 'object') continue;
            
            // Skip individual player props (those with statEntityID that aren't team-level)
            if (propData.statEntityID && !['all', 'away', 'home'].includes(propData.statEntityID.toLowerCase())) {
              continue; // Skip individual player props
            }
            
            // Process team-level props as game markets
            const isTeamLevel = propData.statEntityID && ['all', 'away', 'home'].includes(propData.statEntityID.toLowerCase());
            const isGameLevel = !propData.statEntityID || isTeamLevel;
            
            // Process moneyline markets (including team-level moneyline)
            if (marketType === 'moneyline' && (propKey.includes('moneyline') || propKey.includes('-ml-'))) {
              const marketKey = `${event.id}-moneyline-${period}`;
              if (!marketsMap.has(marketKey)) {
                marketsMap.set(marketKey, {
                  id: marketKey,
                  gameId: event.id,
                  sport: sport,
                  marketType: 'moneyline',
                  period: period,
                  homeTeam: homeTeam,
                  homeTeamFull: homeTeamFull,
                  homeTeamAbbr: homeTeam,
                  awayTeam: awayTeam,
                  awayTeamFull: awayTeamFull,
                  awayTeamAbbr: awayTeam,
                  gameDate: gameDate.split('T')[0],
                  gameTime: gameDate,
                  homeOdds: null,
                  awayOdds: null,
                  drawOdds: null,
                  allSportsbookOdds: [],
                  available: true,
                  lastUpdate: new Date().toISOString(),
                  marketName: `${homeTeam} vs ${awayTeam} Moneyline`
                });
              }
              
              const market = marketsMap.get(marketKey)!;
              for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
                if (!bookmakerData || typeof bookmakerData !== 'object') continue;
                const bookmaker = bookmakerData as any;
                if (!bookmaker.odds) continue;
                
                const odds = parseFloat(bookmaker.odds);
                const side = propData.sideID;
                
                if (side === 'home') market.homeOdds = odds;
                else if (side === 'away') market.awayOdds = odds;
                else if (side === 'draw') market.drawOdds = odds;
                
                market.allSportsbookOdds.push({
                  sportsbook: bookmakerId,
                  odds: odds,
                  side: side,
                  lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
                });
              }
            }
            
            // Process spread markets (including team-level spread)
            if (marketType === 'spread' && (propKey.includes('spread') || propKey.includes('-sp-'))) {
              const marketKey = `${event.id}-spread-${period}`;
              if (!marketsMap.has(marketKey)) {
                marketsMap.set(marketKey, {
                  id: marketKey,
                  gameId: event.id,
                  sport: sport,
                  marketType: 'spread',
                  period: period,
                  homeTeam: homeTeam,
                  homeTeamFull: homeTeamFull,
                  homeTeamAbbr: homeTeam,
                  awayTeam: awayTeam,
                  awayTeamFull: awayTeamFull,
                  awayTeamAbbr: awayTeam,
                  gameDate: gameDate.split('T')[0],
                  gameTime: gameDate,
                  homeOdds: null,
                  awayOdds: null,
                  spread: null,
                  allSportsbookOdds: [],
                  available: true,
                  lastUpdate: new Date().toISOString(),
                  marketName: `${homeTeam} vs ${awayTeam} Spread`
                });
              }
              
              const market = marketsMap.get(marketKey)!;
              for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
                if (!bookmakerData || typeof bookmakerData !== 'object') continue;
                const bookmaker = bookmakerData as any;
                if (!bookmaker.spread || !bookmaker.odds) continue;
                
                const odds = parseFloat(bookmaker.odds);
                const spread = parseFloat(bookmaker.spread);
                const side = propData.sideID;
                
                market.spread = spread;
                if (side === 'home') market.homeOdds = odds;
                else if (side === 'away') market.awayOdds = odds;
                
                market.allSportsbookOdds.push({
                  sportsbook: bookmakerId,
                  odds: odds,
                  spread: spread,
                  side: side,
                  lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
                });
              }
            }
            
            // Process total markets (including team-level props like "points")
            if (marketType === 'total' && (propKey.includes('total') || (isTeamLevel && (propKey.includes('points') || propKey.includes('total'))))) {
              const marketKey = `${event.id}-total-${period}`;
              if (!marketsMap.has(marketKey)) {
                marketsMap.set(marketKey, {
                  id: marketKey,
                  gameId: event.id,
                  sport: sport,
                  marketType: 'total',
                  period: period,
                  homeTeam: homeTeam,
                  homeTeamFull: homeTeamFull,
                  homeTeamAbbr: homeTeam,
                  awayTeam: awayTeam,
                  awayTeamFull: awayTeamFull,
                  awayTeamAbbr: awayTeam,
                  gameDate: gameDate.split('T')[0],
                  gameTime: gameDate,
                  overOdds: null,
                  underOdds: null,
                  total: null,
                  allSportsbookOdds: [],
                  available: true,
                  lastUpdate: new Date().toISOString(),
                  marketName: `${homeTeam} vs ${awayTeam} Total`
                });
              }
              
              const market = marketsMap.get(marketKey)!;
              for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
                if (!bookmakerData || typeof bookmakerData !== 'object') continue;
                const bookmaker = bookmakerData as any;
                if (!bookmaker.overUnder || !bookmaker.odds) continue;
                
                const odds = parseFloat(bookmaker.odds);
                const total = parseFloat(bookmaker.overUnder);
                const side = propData.sideID;
                
                market.total = total;
                if (side === 'over') market.overOdds = odds;
                else if (side === 'under') market.underOdds = odds;
                
                market.allSportsbookOdds.push({
                  sportsbook: bookmakerId,
                  odds: odds,
                  total: total,
                  side: side,
                  lastUpdate: bookmaker.lastUpdatedAt || new Date().toISOString()
                });
              }
            }
          }
          
          // Add valid markets to allMarkets
          const validMarkets = Array.from(marketsMap.values())
            .filter(market => {
              if (market.marketType === 'moneyline') {
                return market.homeOdds !== null && market.awayOdds !== null;
              } else if (market.marketType === 'spread') {
                return market.homeOdds !== null && market.awayOdds !== null && market.spread !== null;
              } else if (market.marketType === 'total') {
                return market.overOdds !== null && market.underOdds !== null && market.total !== null;
              }
              return false;
            })
            .slice(0, maxProps);
          
          allMarkets.push(...validMarkets);
          console.log(`✅ Added ${validMarkets.length} ${marketType} markets from event ${i}`);
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
