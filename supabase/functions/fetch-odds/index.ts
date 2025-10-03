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
    const apiKey = Deno.env.get('ODDS_API_KEY');
    if (!apiKey) {
      throw new Error('ODDS_API_KEY not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'sports';
    const sport = url.searchParams.get('sport') || '';
    const regions = 'us';
    const markets = 'h2h,spreads,totals';
    
    // Date filtering - get games within next 7 days
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dateFrom = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const dateTo = weekFromNow.toISOString().replace(/\.\d{3}Z$/, 'Z');

    console.log(`Fetching from The Odds API - Endpoint: ${endpoint}, Sport: ${sport}, Date Range: ${dateFrom} to ${dateTo}`);

    let oddsApiUrl = '';
    
    if (endpoint === 'sports') {
      // Get list of in-season sports
      oddsApiUrl = `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`;
    } else if (endpoint === 'odds' && sport) {
      // Get odds for specific sport with date filtering
      oddsApiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${apiKey}&regions=${regions}&markets=${markets}&dateFormat=iso&commenceTimeFrom=${dateFrom}&commenceTimeTo=${dateTo}`;
    } else if (endpoint === 'events' && sport) {
      // Get events for specific sport with date filtering
      oddsApiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${apiKey}&dateFormat=iso&commenceTimeFrom=${dateFrom}&commenceTimeTo=${dateTo}`;
    } else if (endpoint === 'player-props' && sport) {
      // Get player props for specific sport (event)
      const eventId = url.searchParams.get('eventId');
      if (eventId) {
        oddsApiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/events/${eventId}/odds?apiKey=${apiKey}&regions=${regions}&markets=player_points,player_rebounds,player_assists,player_threes,player_pass_tds,player_pass_yds,player_rush_yds,player_receptions`;
      } else {
        throw new Error('eventId required for player-props endpoint');
      }
    } else {
      throw new Error('Invalid endpoint or missing sport parameter');
    }

    console.log(`Calling: ${oddsApiUrl.replace(apiKey, 'REDACTED')}`);

    const response = await fetch(oddsApiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Odds API Error: ${response.status} - ${errorText}`);
      throw new Error(`Odds API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Log remaining requests from headers
    const remainingRequests = response.headers.get('x-requests-remaining');
    const usedRequests = response.headers.get('x-requests-used');
    console.log(`API Requests - Used: ${usedRequests}, Remaining: ${remainingRequests}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        meta: {
          remainingRequests,
          usedRequests
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-odds function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
