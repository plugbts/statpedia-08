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

      // Process events with minimal data
      const playerProps: any[] = [];
      const events = rawData.data || [];

      for (let i = 0; i < Math.min(events.length, maxEvents); i++) {
        const event = events[i];
        if (!event.odds) continue;

        // Extract team names
        const homeTeam = event.teams?.home?.names?.short || 'UNK';
        const awayTeam = event.teams?.away?.names?.short || 'UNK';
        
        console.log(`📊 Processing event ${i}: ${homeTeam} vs ${awayTeam}`);

        // Process only first few props to avoid stack overflow
        let propCount = 0;
        for (const [propKey, propData] of Object.entries(event.odds)) {
          if (propCount >= 5) break; // Limit per event
          if (playerProps.length >= maxProps) break; // Global limit
          
          if (!propData || typeof propData !== 'object') continue;
          
          // Skip if not a player prop
          if (!propKey.includes('_1_NFL') || !propKey.includes('-game-ou-')) continue;
          
          // Extract basic info
          const parts = propKey.split('-');
          if (parts.length < 4) continue;
          
          const playerName = parts.slice(0, -3).join(' ').replace(/_/g, ' ').replace(/\d+/g, '').trim();
          const propType = parts[0].replace(/_/g, ' ');
          const side = parts[parts.length - 1];
          
          if (!playerName || (side !== 'over' && side !== 'under')) continue;
          
          // Get basic data
          const line = parseNumber(propData.fairOverUnder || propData.bookOverUnder || '0');
          const odds = parseNumber(propData.fairOdds || propData.bookOdds || '0');
          
          if (!line || !odds) continue;
          
          // Create simple prop object
          const prop = {
            id: `${event.eventID}-${playerName}-${propType}-${line}-${side}`,
            playerName,
            propType: propType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            line,
            overOdds: side === 'over' ? odds : 0,
            underOdds: side === 'under' ? odds : 0,
            sportsbooks: ['DraftKings'],
            gameDate: event.scheduled || new Date().toISOString(),
            teamAbbr: homeTeam,
            opponentAbbr: awayTeam,
            confidence: 0.5,
            expectedValue: 0,
            recentForm: 'N/A',
            aiPrediction: null
          };
          
          playerProps.push(prop);
          propCount++;
        }
      }

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
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
