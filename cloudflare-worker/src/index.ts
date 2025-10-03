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
            
            if (!propData || typeof propData !== 'object') continue;
            if (!propData.playerID || !propKey.includes('-game-ou-')) continue;
            if (!['over', 'under'].includes(propData.sideID)) continue;
            
            // Extract player information
            const playerID = propData.playerID;
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
              if (!bookmaker.overUnder) continue;
              
              const sportsbookLine = bookmaker.overUnder.points;
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
              
              const sportsbookOdds = {
                sportsbook: bookmakerId,
                line: sportsbookLine,
                overOdds: isPickEm ? null : bookmaker.overUnder.over,
                underOdds: isPickEm ? null : bookmaker.overUnder.under,
                isPickEm: isPickEm,
                lastUpdate: new Date().toISOString()
              };
              
              prop.allSportsbookOdds.push(sportsbookOdds);
            }
          }
          
          // Find best odds for each prop
          Array.from(playerPropsMap.values()).forEach(prop => {
            let bestSportsbook = null;
            let bestScore = -1;
            
            // Priority order for sportsbooks
            const priority = ['fanduel', 'draftkings', 'betmgm', 'caesars'];
            
            // Try priority sportsbooks first
            for (const priorityBook of priority) {
              const sb = prop.allSportsbookOdds.find(o => o.sportsbook === priorityBook);
              if (sb && sb.overOdds !== null && sb.underOdds !== null && !sb.isPickEm) {
                const overScore = sb.overOdds > 0 ? sb.overOdds : (100 + Math.abs(sb.overOdds));
                const underScore = sb.underOdds > 0 ? sb.underOdds : (100 + Math.abs(sb.underOdds));
                const totalScore = overScore + underScore;
                
                if (totalScore > bestScore) {
                  bestScore = totalScore;
                  bestSportsbook = sb;
                }
              }
            }
            
            // If no priority sportsbook found, use best overall (excluding pick'em)
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
            
            if (bestSportsbook) {
              prop.overOdds = bestSportsbook.overOdds;
              prop.underOdds = bestSportsbook.underOdds;
            }
          });
          
          // Add to allMarkets
          allMarkets.push(...Array.from(playerPropsMap.values())
            .filter(prop => prop.overOdds !== null && prop.underOdds !== null)
            .slice(0, maxProps));
            
        } else {
          // Process game-level markets (moneyline, spread, total, 1Q, 1H)
          const marketsMap = new Map<string, any>();
          
          // Determine period based on endpoint
          let period = 'full_game';
          let marketType = 'moneyline';
          
          if (endpoint.includes('1q')) {
            period = '1st_quarter';
            marketType = endpoint.replace('1q-', '');
          } else if (endpoint.includes('1h')) {
            period = '1st_half';
            marketType = endpoint.replace('1h-', '');
          } else {
            marketType = endpoint;
          }
          
          for (const [propKey, propData] of Object.entries(event.odds)) {
            if (allMarkets.length >= maxProps) break;
            if (!propData || typeof propData !== 'object') continue;
            if (propData.playerID) continue; // Skip player props
            
            // Process moneyline markets
            if (marketType === 'moneyline' && propKey.includes('moneyline')) {
              for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
                if (!bookmakerData || typeof bookmakerData !== 'object') continue;
                
                const bookmaker = bookmakerData as any;
                if (!bookmaker.moneyline) continue;
                
                const marketId = `${event.id}-moneyline-${period}-${bookmakerId}`;
                
                if (!marketsMap.has(marketId)) {
                  const market = {
                    id: marketId,
                    gameId: event.id,
                    sport: sport,
                    marketType: 'moneyline',
                    period: period,
                    homeTeam: homeTeam,
                    homeTeamFull: homeTeamFull,
                    awayTeam: awayTeam,
                    awayTeamFull: awayTeamFull,
                    homeTeamAbbr: homeTeam,
                    awayTeamAbbr: awayTeam,
                    gameDate: gameDate,
                    gameTime: gameDate,
                    homeOdds: null,
                    awayOdds: null,
                    drawOdds: null,
                    allSportsbookOdds: []
                  };
                  marketsMap.set(marketId, market);
                }
                
                const market = marketsMap.get(marketId)!;
                
                const sportsbookOdds = {
                  sportsbook: bookmakerId,
                  homeOdds: bookmaker.moneyline.home,
                  awayOdds: bookmaker.moneyline.away,
                  drawOdds: bookmaker.moneyline.draw || null,
                  lastUpdate: new Date().toISOString()
                };
                
                market.allSportsbookOdds.push(sportsbookOdds);
                
                if (market.homeOdds === null && bookmaker.moneyline.home !== null) {
                  market.homeOdds = bookmaker.moneyline.home;
                  market.awayOdds = bookmaker.moneyline.away;
                  market.drawOdds = bookmaker.moneyline.draw || null;
                }
              }
            }
            
            // Process spread markets
            if (marketType === 'spread' && propKey.includes('spread')) {
              for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
                if (!bookmakerData || typeof bookmakerData !== 'object') continue;
                
                const bookmaker = bookmakerData as any;
                if (!bookmaker.spread) continue;
                
                const marketId = `${event.id}-spread-${period}-${bookmaker.spread.points}-${bookmakerId}`;
                
                if (!marketsMap.has(marketId)) {
                  const market = {
                    id: marketId,
                    gameId: event.id,
                    sport: sport,
                    marketType: 'spread',
                    period: period,
                    homeTeam: homeTeam,
                    homeTeamFull: homeTeamFull,
                    awayTeam: awayTeam,
                    awayTeamFull: awayTeamFull,
                    homeTeamAbbr: homeTeam,
                    awayTeamAbbr: awayTeam,
                    gameDate: gameDate,
                    gameTime: gameDate,
                    spread: bookmaker.spread.points,
                    homeOdds: null,
                    awayOdds: null,
                    allSportsbookOdds: []
                  };
                  marketsMap.set(marketId, market);
                }
                
                const market = marketsMap.get(marketId)!;
                
                const sportsbookOdds = {
                  sportsbook: bookmakerId,
                  spread: bookmaker.spread.points,
                  homeOdds: bookmaker.spread.home,
                  awayOdds: bookmaker.spread.away,
                  lastUpdate: new Date().toISOString()
                };
                
                market.allSportsbookOdds.push(sportsbookOdds);
                
                if (market.homeOdds === null && bookmaker.spread.home !== null) {
                  market.homeOdds = bookmaker.spread.home;
                  market.awayOdds = bookmaker.spread.away;
                }
              }
            }
            
            // Process total (over/under) markets
            if (marketType === 'total' && propKey.includes('total')) {
              for (const [bookmakerId, bookmakerData] of Object.entries(propData.byBookmaker || {})) {
                if (!bookmakerData || typeof bookmakerData !== 'object') continue;
                
                const bookmaker = bookmakerData as any;
                if (!bookmaker.total) continue;
                
                const marketId = `${event.id}-total-${period}-${bookmaker.total.points}-${bookmakerId}`;
                
                if (!marketsMap.has(marketId)) {
                  const market = {
                    id: marketId,
                    gameId: event.id,
                    sport: sport,
                    marketType: 'total',
                    period: period,
                    homeTeam: homeTeam,
                    homeTeamFull: homeTeamFull,
                    awayTeam: awayTeam,
                    awayTeamFull: awayTeamFull,
                    homeTeamAbbr: homeTeam,
                    awayTeamAbbr: awayTeam,
                    gameDate: gameDate,
                    gameTime: gameDate,
                    total: bookmaker.total.points,
                    overOdds: null,
                    underOdds: null,
                    allSportsbookOdds: []
                  };
                  marketsMap.set(marketId, market);
                }
                
                const market = marketsMap.get(marketId)!;
                
                const sportsbookOdds = {
                  sportsbook: bookmakerId,
                  total: bookmaker.total.points,
                  overOdds: bookmaker.total.over,
                  underOdds: bookmaker.total.under,
                  lastUpdate: new Date().toISOString()
                };
                
                market.allSportsbookOdds.push(sportsbookOdds);
                
                if (market.overOdds === null && bookmaker.total.over !== null) {
                  market.overOdds = bookmaker.total.over;
                  market.underOdds = bookmaker.total.under;
                }
              }
            }
          }
          
          // Add to allMarkets
          allMarkets.push(...Array.from(marketsMap.values())
            .filter(market => {
              if (market.marketType === 'moneyline') {
                return market.homeOdds !== null && market.awayOdds !== null;
              } else if (market.marketType === 'spread') {
                return market.homeOdds !== null && market.awayOdds !== null;
              } else if (market.marketType === 'total') {
                return market.overOdds !== null && market.underOdds !== null;
              }
              return false;
            })
            .slice(0, maxProps));
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