import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('SPORTSGAMEODDS_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTSGAMEODDS_API_KEY not configured');
    }

    // Parse request body for JSON data
    let endpoint = 'games';
    let sport = 'nfl';
    
    if (req.method === 'POST' && req.body) {
      try {
        const body = await req.json();
        endpoint = body.endpoint || 'games';
        sport = body.sport || 'nfl';
      } catch (e) {
        console.warn('Failed to parse JSON body, using defaults');
      }
    } else {
      // Fallback to URL search params for GET requests
      const url = new URL(req.url);
      endpoint = url.searchParams.get('endpoint') || 'games';
      sport = url.searchParams.get('sport') || 'nfl';
    }
    
    console.log(`🎯 SportsGameOdds API request: ${endpoint} for ${sport}`);

    let sportsgameoddsUrl = '';
    
    // Use the unified /v2/events endpoint for all data with sport filtering
    const sportId = mapSportToId(sport);
    sportsgameoddsUrl = `https://api.sportsgameodds.com/v2/events?sportID=${sportId}`;

    console.log(`📡 Calling SportsGameOdds API: ${sportsgameoddsUrl} (sport: ${sport} -> ${sportId})`);

    const response = await fetch(sportsgameoddsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SportsGameOdds API error: ${response.status} - ${errorText}`);
      throw new Error(`SportsGameOdds API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ SportsGameOdds API success: ${endpoint} for ${sport}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        endpoint: endpoint,
        sport: sport,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ SportsGameOdds API Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Map sport names to SportsGameOdds sport IDs
function mapSportToId(sport: string): string {
  const sportMap: { [key: string]: string } = {
    'nfl': 'FOOTBALL',
    'nba': 'BASKETBALL',
    'nhl': 'HOCKEY',
    'mlb': 'BASEBALL',
    'college-football': 'FOOTBALL', // CFB maps to FOOTBALL
    'college-basketball': 'BASKETBALL', // CBB maps to BASKETBALL
    'wnba': 'BASKETBALL', // WNBA maps to BASKETBALL
    // Legacy mappings
    'football': 'FOOTBALL',
    'basketball': 'BASKETBALL',
    'baseball': 'BASEBALL',
    'hockey': 'HOCKEY'
  };
  return sportMap[sport.toLowerCase()] || 'FOOTBALL'; // Default to NFL
}
