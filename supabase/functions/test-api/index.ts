import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SPORTSGAMEODDS_API_KEY = 'f05c244cbea5222d806f91c412350940';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Test the exact API call
    const response = await fetch('https://api.sportsgameodds.com/v2/events?sportID=FOOTBALL&season=2025&week=6&oddsAvailable=true&markets=playerProps&limit=10', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'x-api-key': SPORTSGAMEODDS_API_KEY
      }
    });

    const data = await response.json();
    
    // Count player props
    let totalPlayerProps = 0;
    if (data.success && data.data) {
      for (const event of data.data) {
        for (const [oddId, oddData] of Object.entries(event.odds || {})) {
          if (isPlayerProp(oddData, oddId)) {
            totalPlayerProps++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'API test completed',
        data: {
          apiSuccess: data.success,
          eventsCount: data.data?.length || 0,
          totalPlayerProps,
          firstEventOdds: data.data?.[0] ? Object.keys(data.data[0].odds || {}).length : 0
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      },
    )

  } catch (error) {
    console.error('API test error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'API test failed',
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      },
    )
  }
})

function isPlayerProp(odd: any, oddId: string): boolean {
  if (!odd || !oddId) return false
  
  const oddIdParts = oddId.split('-')
  if (oddIdParts.length < 5) return false
  
  const [statID, playerID, periodID, betTypeID, sideID] = oddIdParts
  
  // Check if the second part looks like a player ID (FIRSTNAME_LASTNAME_NUMBER_LEAGUE)
  const isPlayerID = /^[A-Z_]+_[A-Z_]+_\d+_[A-Z]+$/.test(playerID)
  
  // Check if it's an over/under bet
  const isOverUnder = betTypeID === 'ou' || betTypeID === 'over_under'
  
  // Check if the statID is one we can normalize (or is a common player prop)
  const normalizedStatID = statID.toLowerCase()
  const isPlayerStat = normalizedStatID.includes('passing') ||
                      normalizedStatID.includes('rushing') ||
                      normalizedStatID.includes('receiving') ||
                      normalizedStatID.includes('touchdown') ||
                      normalizedStatID.includes('yards') ||
                      normalizedStatID.includes('receptions') ||
                      normalizedStatID.includes('field') ||
                      normalizedStatID.includes('kicking') ||
                      normalizedStatID.includes('points') ||
                      normalizedStatID.includes('extra')
  
  return isPlayerID && isOverUnder && isPlayerStat
}
