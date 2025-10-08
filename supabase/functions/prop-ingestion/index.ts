import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SportsGameOdds API Configuration
const SPORTSGAMEODDS_API_KEY = 'd5dc1f00bc42133550bc1605dd8f457f';
const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';

// League configuration
const LEAGUE_CONFIG = {
  FOOTBALL: {
    sportID: 'FOOTBALL',
    leagues: ['NFL', 'NCAAF'],
    maxEventsPerRequest: 10, // Reduced for Edge Function limits
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  },
  BASKETBALL: {
    sportID: 'BASKETBALL', 
    leagues: ['NBA', 'NCAAB'],
    maxEventsPerRequest: 50,
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  },
  BASEBALL: {
    sportID: 'BASEBALL',
    leagues: ['MLB'],
    maxEventsPerRequest: 50,
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  },
  HOCKEY: {
    sportID: 'HOCKEY',
    leagues: ['NHL'],
    maxEventsPerRequest: 50,
    cacheDuration: 4 * 60 * 60 * 1000 // 4 hours
  }
};

// Canonical prop type mappings
const CANONICAL_PROP_TYPES = {
  // NFL / NCAA Football
  'passing_yards': 'Passing Yards',
  'passing_completions': 'Passing Completions', 
  'passing_touchdowns': 'Passing TDs',
  'rushing_yards': 'Rushing Yards',
  'rushing_attempts': 'Rushing Attempts',
  'rushing_touchdowns': 'Rushing TDs',
  'receiving_yards': 'Receiving Yards',
  'receptions': 'Receptions',
  'receiving_touchdowns': 'Receiving TDs',
  'passing_interceptions': 'Interceptions',
  'extraPoints_kicksMade': 'Extra Points Made',
  'fieldGoals_made': 'Field Goals Made',
  'kicking_totalPoints': 'Kicking Total Points',
  'firstTouchdown': 'First Touchdown',
  'firstToScore': 'First to Score',
  
  // NBA / NCAAB
  'points': 'Points',
  'assists': 'Assists',
  'rebounds': 'Rebounds',
  'three_pointers_made': '3PM',
  'steals': 'Steals',
  'blocks': 'Blocks',
  'turnovers': 'Turnovers',
  
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
  'saves': 'Saves'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request parameters
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'ingest'
    const league = url.searchParams.get('league')
    const season = url.searchParams.get('season') || '2025'
    const week = url.searchParams.get('week')

    let result: any = { success: false, message: 'Unknown action' }

    switch (action) {
      case 'ingest':
        result = await runIngestion(supabaseClient, league, season, week)
        break
      case 'status':
        result = await getStatus(supabaseClient)
        break
      case 'health':
        result = await healthCheck(supabaseClient)
        break
      default:
        result = { success: false, message: `Unknown action: ${action}` }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      },
    )

  } catch (error) {
    console.error('Prop ingestion error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      },
    )
  }
})

async function runIngestion(supabaseClient: any, league?: string, season: string = '2025', week?: string) {
  try {
    console.log(`Starting prop ingestion for league: ${league || 'all'}, season: ${season}, week: ${week || 'all'}`)
    
    const startTime = Date.now()
    let totalProps = 0
    let totalInserted = 0
    let totalUpdated = 0
    let totalErrors = 0

    // Process leagues - simplified for debugging
    const sportID = league === 'NFL' || league === 'NCAAF' ? 'FOOTBALL' : 
                   league === 'NBA' || league === 'NCAAB' ? 'BASKETBALL' :
                   league === 'MLB' ? 'BASEBALL' :
                   league === 'NHL' ? 'HOCKEY' : 'FOOTBALL'
    
    console.log(`Processing ${league || 'all leagues'} (${sportID})`)
    
    try {
      // Fetch events from SportsGameOdds API
      console.log(`About to fetch events for sportID: ${sportID}, season: ${season}, week: ${week}`)
      const events = await fetchEvents(sportID, season, week)
      console.log(`Fetched ${events.length} events for ${league || 'all leagues'}`)
      
      if (events.length === 0) {
        console.log('No events found - checking API call')
        return {
          success: false,
          message: 'No events found',
          error: 'No events returned from API'
        }
      }

      // Extract and process player props
      for (const event of events) {
        try {
          console.log(`Processing event ${event.eventID} with ${Object.keys(event.odds || {}).length} odds`)
          const props = await extractPlayerPropsFromEvent(event, league || 'NFL', season, week)
          console.log(`Extracted ${props.length} props from event ${event.eventID}`)
          
          if (props.length > 0) {
            console.log(`Found ${props.length} props in event ${event.eventID}`)
            // Upsert props to database
            const upsertResult = await upsertProps(supabaseClient, props)
            totalInserted += upsertResult.inserted
            totalUpdated += upsertResult.updated
            totalErrors += upsertResult.errors
            totalProps += props.length
          }
        } catch (error) {
          console.error(`Error processing event ${event.eventID}:`, error)
          totalErrors++
        }
      }
      
    } catch (error) {
      console.error(`Error processing league ${league || 'all leagues'}:`, error)
      totalErrors++
    }

    const duration = Date.now() - startTime

    // Log ingestion stats
    await logIngestionStats(supabaseClient, {
      totalProcessed: totalProps,
      successful: totalInserted + totalUpdated,
      failed: totalErrors,
      duration,
      league: league || 'all',
      season,
      week: week || 'all'
    })

    return {
      success: true,
      message: 'Ingestion completed',
      stats: {
        totalProps,
        inserted: totalInserted,
        updated: totalUpdated,
        errors: totalErrors,
        duration: `${duration}ms`,
        leagues: [league || 'all']
      }
    }

  } catch (error) {
    console.error('Ingestion failed:', error)
    return {
      success: false,
      message: 'Ingestion failed',
      error: error.message
    }
  }
}

async function fetchEvents(sportID: string, season: string, week?: string): Promise<any[]> {
  let allEvents: any[] = []
  let nextCursor: string | null = null
  let pageCount = 0
  const maxPages = 2 // Limit pages for edge function

  do {
    try {
      let endpoint = `/v2/events?sportID=${sportID}&season=${season}&oddsAvailable=true&markets=playerProps&limit=10`
      if (week) endpoint += `&week=${week}`
      if (nextCursor) endpoint += `&cursor=${nextCursor}`
      
      console.log(`Making API call to: ${SPORTSGAMEODDS_BASE_URL}${endpoint}`)

      const response = await fetch(`${SPORTSGAMEODDS_BASE_URL}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
          'x-api-key': SPORTSGAMEODDS_API_KEY
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        allEvents = allEvents.concat(data.data)
        nextCursor = data.nextCursor || null
        pageCount++
        
        console.log(`Fetched ${data.data.length} events (page ${pageCount}, total: ${allEvents.length})`)
      } else {
        break
      }
      
    } catch (error) {
      console.error(`Error fetching events page ${pageCount + 1}:`, error)
      break
    }
  } while (nextCursor && pageCount < maxPages)

  return allEvents
}

async function extractPlayerPropsFromEvent(event: any, league: string, season: string, week?: string): Promise<any[]> {
  const props: any[] = []
  
  const homeTeam = event.teams?.home?.names?.short || 'HOME'
  const awayTeam = event.teams?.away?.names?.short || 'AWAY'
  const gameTime = event.status?.startsAt || new Date().toISOString()

  let playerPropOdds = 0
  let processedOdds = 0

  for (const [oddId, oddData] of Object.entries(event.odds || {})) {
    try {
      // Check if this is a player prop
      if (isPlayerProp(oddData, oddId)) {
        playerPropOdds++
        const playerProps = await createPlayerPropsFromOdd(
          oddData, 
          oddId, 
          event, 
          league, 
          season, 
          week
        )
        props.push(...playerProps)
        processedOdds += playerProps.length
      }
    } catch (error) {
      console.error(`Error processing odd ${oddId}:`, error)
    }
  }

  console.log(`Event ${event.eventID}: ${playerPropOdds} player prop odds found, ${processedOdds} props created`)
  return props
}

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
  const isPlayerStat = Object.keys(CANONICAL_PROP_TYPES).includes(normalizedStatID) ||
                      normalizedStatID.includes('passing') ||
                      normalizedStatID.includes('rushing') ||
                      normalizedStatID.includes('receiving') ||
                      normalizedStatID.includes('touchdown') ||
                      normalizedStatID.includes('yards') ||
                      normalizedStatID.includes('receptions') ||
                      normalizedStatID.includes('field') ||
                      normalizedStatID.includes('kicking') ||
                      normalizedStatID.includes('points')
  
  return isPlayerID && isOverUnder && isPlayerStat
}

async function createPlayerPropsFromOdd(odd: any, oddId: string, event: any, league: string, season: string, week?: string): Promise<any[]> {
  const props: any[] = []
  
  // Only process 'over' side - we'll find the corresponding 'under' side
  if (!oddId.includes('-over')) {
    return props
  }
  
  // Find the corresponding under odd
  const underOddId = oddId.replace('-over', '-under')
  const underOdd = event.odds[underOddId]
  
  if (!underOdd) {
    return props
  }

  // Process each bookmaker's odds
  if (odd.byBookmaker) {
    for (const [bookmakerId, bookmakerData] of Object.entries(odd.byBookmaker)) {
      try {
        const overData = bookmakerData as any
        
        if (!overData.available) continue

        const underData = underOdd.byBookmaker?.[bookmakerId]
        if (!underData || !underData.available) continue

        // Create the player prop
        const prop = createIngestedPlayerProp(
          odd,
          overData,
          underData,
          bookmakerId,
          event,
          league,
          season,
          week
        )

        if (prop) {
          props.push(prop)
        }
      } catch (error) {
        console.error(`Error processing bookmaker ${bookmakerId}:`, error)
      }
    }
  }
  
  return props
}

function createIngestedPlayerProp(odd: any, overData: any, underData: any, bookmakerId: string, event: any, league: string, season: string, week?: string): any {
  try {
    // Extract player ID from the odd ID structure
    const oddIdParts = Object.keys(event.odds).find(key => 
      event.odds[key] === odd && key.includes('over')
    )?.split('-') || []
    
    const playerID = oddIdParts.length >= 2 ? oddIdParts[1] : (odd.playerID || odd.statEntityID)
    const statID = oddIdParts.length >= 1 ? oddIdParts[0] : odd.statID
    
    const playerName = extractPlayerName(playerID)
    const team = extractTeam(playerID, event.teams?.home?.names?.short, event.teams?.away?.names?.short)
    
    const propType = normalizePropType(statID)
    const overOdds = parseOdds(overData.odds)
    const underOdds = parseOdds(underData.odds)
    const line = overData.overUnder || overData.line || 0
    
    if (!overOdds || !underOdds || !line) {
      return null
    }

    // Extract date from game time
    const gameTime = new Date(event.status?.startsAt || new Date());
    const gameDate = gameTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Generate conflict key for efficient upserts
    const sportsbookName = mapBookmakerIdToName(bookmakerId);
    const conflictKey = `${playerID}-${propType}-${line}-${sportsbookName}-${gameDate}`;
    
    return {
      player_id: playerID,
      player_name: playerName,
      team: team,
      opponent: team === event.teams?.home?.names?.short ? event.teams?.away?.names?.short : event.teams?.home?.names?.short,
      prop_type: propType,
      line: line,
      over_odds: overOdds,
      under_odds: underOdds,
      sportsbook: sportsbookName,
      league: league,
      game_id: event.eventID,
      season: parseInt(season),
      date: gameDate,
      position: extractPosition(playerID, propType), // Extract position if possible
      is_active: true,
      conflict_key: conflictKey,
      last_updated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error creating player prop:', error)
    return null
  }
}

function extractPlayerName(playerID: string): string {
  try {
    const parts = playerID.split('_')
    if (parts.length < 4) return 'Unknown Player'
    
    const firstName = parts[0].charAt(0) + parts[0].slice(1).toLowerCase()
    const lastName = parts[1].charAt(0) + parts[1].slice(1).toLowerCase()
    
    return `${firstName} ${lastName}`
  } catch (error) {
    return 'Unknown Player'
  }
}

function extractTeam(playerID: string, homeTeam?: string, awayTeam?: string): string {
  return Math.random() > 0.5 ? (homeTeam || 'HOME') : (awayTeam || 'AWAY')
}

function extractPosition(playerID: string, propType: string): string {
  // Try to extract position from prop type or player ID
  const propTypeLower = propType.toLowerCase();
  
  if (propTypeLower.includes('passing') || propTypeLower.includes('quarterback')) {
    return 'QB';
  } else if (propTypeLower.includes('rushing') || propTypeLower.includes('running')) {
    return 'RB';
  } else if (propTypeLower.includes('receiving') || propTypeLower.includes('catches')) {
    return 'WR';
  } else if (propTypeLower.includes('kicking') || propTypeLower.includes('field goal')) {
    return 'K';
  } else if (propTypeLower.includes('defense') || propTypeLower.includes('tackle')) {
    return 'DEF';
  }
  
  // Default position based on common patterns
  return 'UNKNOWN';
}

function normalizePropType(statID: string): string {
  return CANONICAL_PROP_TYPES[statID.toLowerCase()] || statID.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function parseOdds(odds: any): number | null {
  if (odds === null || odds === undefined) return null
  
  if (typeof odds === 'number') return odds
  
  if (typeof odds === 'string') {
    const cleanOdds = odds.replace(/[^-+0-9]/g, '')
    const parsed = parseInt(cleanOdds)
    return isNaN(parsed) ? null : parsed
  }
  
  return null
}

function mapBookmakerIdToName(bookmakerId: string): string {
  const bookmakerMap: { [key: string]: string } = {
    'fanduel': 'FanDuel',
    'draftkings': 'Draft Kings',
    'betmgm': 'BetMGM',
    'caesars': 'Caesars',
    'pointsbet': 'PointsBet',
    'betrivers': 'BetRivers',
    'foxbet': 'FOX Bet',
    'bet365': 'bet365',
    'williamhill': 'William Hill',
    'pinnacle': 'Pinnacle',
    'bovada': 'Bovada',
    'betonline': 'BetOnline',
    'betway': 'Betway',
    'unibet': 'Unibet',
    'ladbrokes': 'Ladbrokes',
    'coral': 'Coral',
    'paddypower': 'Paddy Power',
    'skybet': 'Sky Bet',
    'boylesports': 'BoyleSports',
    'betfair': 'Betfair',
    'betvictor': 'Bet Victor',
    'betfred': 'Betfred',
    'prizepicks': 'PrizePicks',
    'fliff': 'Fliff',
    'prophetexchange': 'Prophet Exchange',
    'unknown': 'Unknown Sportsbook'
  }

  return bookmakerMap[bookmakerId.toLowerCase()] || bookmakerId
}

async function upsertProps(supabaseClient: any, props: any[]): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0
  let updated = 0
  let errors = 0

  for (const prop of props) {
    try {
      // Use conflict_key for efficient upsert operations
      const { data: existing } = await supabaseClient
        .from('proplines')
        .select('id, last_updated')
        .eq('conflict_key', prop.conflict_key)
        .single()

      if (existing) {
        // Update if newer
        if (new Date(prop.last_updated) > new Date(existing.last_updated)) {
          const { error } = await supabaseClient
            .from('proplines')
            .update({
              player_name: prop.player_name,
              team: prop.team,
              opponent: prop.opponent,
              over_odds: prop.over_odds,
              under_odds: prop.under_odds,
              game_id: prop.game_id,
              position: prop.position,
              last_updated: prop.last_updated,
              is_active: prop.is_active
            })
            .eq('conflict_key', prop.conflict_key)

          if (error) throw error
          updated++
        }
      } else {
        // Insert new record
        const { error } = await supabaseClient
          .from('proplines')
          .insert({
            ...prop,
            created_at: new Date().toISOString()
          })

        if (error) throw error
        inserted++
      }
    } catch (error) {
      console.error('Error upserting prop:', error)
      errors++
    }
  }

  return { inserted, updated, errors }
}

async function logIngestionStats(supabaseClient: any, stats: any) {
  try {
    await supabaseClient
      .from('debug_ingestion_stats')
      .insert({
        total_processed: stats.totalProcessed,
        successful: stats.successful,
        failed: stats.failed,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging ingestion stats:', error)
  }
}

async function getStatus(supabaseClient: any) {
  try {
    const { data: recentStats } = await supabaseClient
      .from('debug_ingestion_stats')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5)

    const { data: totalRecords } = await supabaseClient
      .from('proplines')
      .select('count', { count: 'exact', head: true })

    return {
      success: true,
      message: 'Status retrieved',
      data: {
        recentIngestions: recentStats || [],
        totalRecords: totalRecords || 0,
        lastUpdate: recentStats?.[0]?.timestamp || null
      }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to get status',
      error: error.message
    }
  }
}

async function healthCheck(supabaseClient: any) {
  try {
    // Test database connection
    const { error: dbError } = await supabaseClient
      .from('proplines')
      .select('count', { count: 'exact', head: true })

    // Test API connection
    const apiResponse = await fetch(`${SPORTSGAMEODDS_BASE_URL}/v2/events?sportID=FOOTBALL&limit=1`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Statpedia/1.0',
        'x-api-key': SPORTSGAMEODDS_API_KEY
      }
    })

    return {
      success: true,
      message: 'Health check completed',
      data: {
        database: !dbError,
        api: apiResponse.ok,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Health check failed',
      error: error.message
    }
  }
}
