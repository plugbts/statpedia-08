import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// SportsGameOdds API Configuration
const SPORTSGAMEODDS_API_KEY = 'd5dc1f00bc42133550bc1605dd8f457f';
const SPORTSGAMEODDS_BASE_URL = 'https://api.sportsgameodds.com';

// League configuration
const LEAGUE_CONFIG = {
  FOOTBALL: {
    sportID: 'FOOTBALL',
    leagues: ['NFL', 'NCAAF'],
    maxEventsPerRequest: 25, // Increased to get more props
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
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
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

    // Process all leagues if no specific league provided
    const leaguesToProcess = league ? [league] : ['NFL', 'NCAAF', 'NBA', 'NCAAB', 'MLB', 'NHL']
    
    for (const currentLeague of leaguesToProcess) {
      const sportID = currentLeague === 'NFL' || currentLeague === 'NCAAF' ? 'FOOTBALL' : 
                     currentLeague === 'NBA' || currentLeague === 'NCAAB' ? 'BASKETBALL' :
                     currentLeague === 'MLB' ? 'BASEBALL' :
                     currentLeague === 'NHL' ? 'HOCKEY' : 'FOOTBALL'
      
      console.log(`Processing ${currentLeague} (${sportID})`)
      
      try {
        // Fetch events from SportsGameOdds API
        console.log(`About to fetch events for sportID: ${sportID}, season: ${season}, week: ${week}`)
        const events = await fetchEvents(sportID, season, week)
        console.log(`Fetched ${events.length} events for ${currentLeague}`)
        
        if (events.length === 0) {
          console.log(`No events found for ${currentLeague} - skipping`)
          continue
        }

        // Log details about the first few events
        console.log(`First event details for ${currentLeague}:`, {
          eventID: events[0]?.eventID,
          teams: events[0]?.teams,
          oddsCount: Object.keys(events[0]?.odds || {}).length,
          hasOdds: !!events[0]?.odds
        })

        // Extract and process player props
        for (const event of events) {
          try {
            console.log(`Processing event ${event.eventID} with ${Object.keys(event.odds || {}).length} odds`)
            const props = await extractPlayerPropsFromEvent(event, currentLeague, season, week)
            console.log(`Extracted ${props.length} props from event ${event.eventID}`)
            
            if (props.length > 0) {
              console.log(`Found ${props.length} props in event ${event.eventID}`)
              // Process all props
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
        console.error(`Error processing league ${currentLeague}:`, error)
        totalErrors++
      }
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
        leagues: league ? [league] : ['NFL', 'NCAAF', 'NBA', 'NCAAB', 'MLB', 'NHL']
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
  const maxPages = 5 // Increased to get more events

  do {
    try {
      let endpoint = `/v2/events?sportID=${sportID}&season=${season}&oddsAvailable=true&markets=playerProps&limit=25`
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
  let totalOdds = 0

  for (const [oddId, oddData] of Object.entries(event.odds || {})) {
    totalOdds++
    try {
      // Check if this is a player prop
      if (isPlayerProp(oddData, oddId)) {
        playerPropOdds++
        console.log(`Found player prop: ${oddId}`)
        const playerProps = await createPlayerPropsFromOddDebug(
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

  console.log(`Event ${event.eventID}: ${playerPropOdds} player prop odds found, ${processedOdds} props created out of ${totalOdds} total odds`)
  console.log(`✅ Processed ${props.length} props out of ${totalOdds} total odds for event ${event.eventID}`)
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
  
  // Only process 'over' side - we'll handle both over and under from the same odd
  const isOverSide = sideID === 'over'
  
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
  
  return isPlayerID && isOverUnder && isOverSide && isPlayerStat
}

// Debug harness function to log every rejection reason
async function createPlayerPropsFromOddDebug(odd: any, oddId: string, event: any, league: string, season: string, week?: string): Promise<any[]> {
  try {
    const props = await createPlayerPropsFromOdd(odd, oddId, event, league, season, week);

    if (!props || props.length === 0) {
      console.error("❌ Rejected odd (returned empty array):", {
        oddId,
        hasOdd: !!odd,
        hasEvent: !!event,
        league,
        season,
        week,
        odd: JSON.stringify(odd, null, 2)
      });
      return [];
    }

    // Check each prop for critical fields
    const validProps = [];
    for (const prop of props) {
      if (!prop) {
        console.error("❌ Null prop in array:", { oddId, props });
        continue;
      }

      const { player_id, date, prop_type } = prop;
      if (!player_id || !date || !prop_type) {
        console.error("❌ Missing critical field in prop:", {
          player_id,
          date,
          prop_type,
          oddId,
          prop: JSON.stringify(prop, null, 2)
        });
        continue;
      }

      // Optional fields can be null, but log if they are
      if (prop.line == null) {
        console.warn("⚠️ Null line value for:", { oddId, prop });
      }
      if (prop.over_odds == null || prop.under_odds == null) {
        console.warn("⚠️ Null odds value for:", { oddId, prop });
      }
      if (!prop.sportsbook) {
        console.warn("⚠️ Missing sportsbook for:", { oddId, prop });
      }

      validProps.push(prop);
    }

    console.log(`✅ Processed ${validProps.length} valid props out of ${props.length} total for odd ${oddId}`);
    return validProps;
  } catch (err) {
    console.error("❌ Exception in createPlayerPropsFromOddDebug:", err, "OddId:", oddId, "Odd:", JSON.stringify(odd, null, 2));
    return [];
  }
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
    console.log(`⚠️ No corresponding under odd found for ${oddId}`)
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
          oddId, // Pass the oddId directly
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

function createIngestedPlayerProp(odd: any, oddId: string, overData: any, underData: any, bookmakerId: string, event: any, league: string, season: string, week?: string): any {
  try {
    // Extract player ID from the odd ID structure
    const oddIdParts = oddId.split('-')
    
    const playerID = oddIdParts.length >= 2 ? oddIdParts[1] : (odd.playerID || odd.statEntityID)
    const statID = oddIdParts.length >= 1 ? oddIdParts[0] : odd.statID
    
    const playerName = extractPlayerName(playerID)
    const team = extractTeam(playerID, event.teams?.home?.names?.short, event.teams?.away?.names?.short)
    const sportsbookName = mapBookmakerIdToName(bookmakerId)
    
    const propType = normalizePropType(statID)
    const overOdds = parseOdds(overData.odds)
    const underOdds = parseOdds(underData.odds)
    const line = overData.overUnder || overData.line || 0
    
    if (!overOdds || !underOdds || !line) {
      return null
    }

    // Extract date from game time with safety check
    const gameTime = new Date(event.status?.startsAt || new Date());
    const gameDate = gameTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Safety check - ensure we have a valid date
    if (!gameDate || gameDate === 'Invalid Date' || gameDate.includes('Invalid')) {
      console.error(`Invalid date extracted: ${gameDate} from ${event.status?.startsAt}`);
      return null
    }

    // Log the data for debugging
    console.log(`Creating prop:`, {
      playerID,
      playerName,
      team,
      propType,
      sportsbookName,
      gameDate,
      line,
      overOdds,
      underOdds
    });

    // Validate all required fields
    if (!playerID || !playerName || !team || !propType || !sportsbookName) {
      console.error(`Missing required fields:`, {
        playerID: !!playerID,
        playerName: !!playerName,
        team: !!team,
        propType: !!propType,
        sportsbookName: !!sportsbookName
      });
      return null
    }
    
    // Generate conflict key for efficient upserts
    const conflictKey = `${playerID}-${propType}-${line}-${sportsbookName}-${gameDate}`;
    
    return {
      player_id: playerID.substring(0, 64), // Truncate to match VARCHAR(64)
      player_name: playerName.substring(0, 128), // Truncate to match VARCHAR(128)
      team: team.substring(0, 8), // Truncate to match VARCHAR(8)
      opponent: (team === event.teams?.home?.names?.short ? event.teams?.away?.names?.short : event.teams?.home?.names?.short)?.substring(0, 8) || 'UNKNOWN',
      season: parseInt(season),
      date: gameDate,
      prop_type: propType.substring(0, 64), // Truncate to match VARCHAR(64)
      line: line,
      over_odds: overOdds,
      under_odds: underOdds,
      sportsbook: sportsbookName.substring(0, 32) // Truncate to match VARCHAR(32)
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

  // For now, just try to insert all records (ignore duplicates)
  for (const prop of props) {
    try {
      // Insert new record - let the database handle duplicates via unique constraint
      const { error } = await supabaseClient
        .from('proplines')
        .insert({
          ...prop,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.log(`Database error for prop:`, JSON.stringify(prop, null, 2))
        console.log(`Error details:`, JSON.stringify(error, null, 2))
        // If it's a duplicate key error, count as updated
        if (error.code === '23505') { // Unique constraint violation
          console.log(`Duplicate key error - counting as updated`)
          updated++
        } else {
          throw error
        }
      } else {
        console.log(`Successfully inserted prop:`, prop.player_id, prop.prop_type, prop.line)
        inserted++
      }
    } catch (error) {
      console.error('Error inserting prop:', error)
      console.error('Prop data:', JSON.stringify(prop, null, 2))
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
