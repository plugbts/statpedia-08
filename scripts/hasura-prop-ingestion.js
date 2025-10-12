/**
 * Hasura Prop Ingestion Script
 * Fetches real player props from SportsGameOdds API and populates our Hasura/Neon database
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.SPORTSGAMEODDS_API_KEY;
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'https://statpedia-proxy.statpedia.workers.dev/v1/graphql';
const LEAGUES = ["NFL", "NBA", "MLB", "NHL"];

// Check if API key is available
if (!API_KEY) {
  console.error('❌ SPORTSGAMEODDS_API_KEY environment variable is required');
  process.exit(1);
}

async function sendGraphQLMutation(query, variables = {}) {
  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    }),
  });

  const result = await response.json();
  
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    return null;
  }
  
  return result.data;
}

async function ingestPropsForLeague(league, season) {
  console.log(`🎯 Processing ${league} props for season ${season}...`);
  
  let totalProps = 0;
  let nextCursor = null;
  let pageCount = 0;

  do {
    try {
      const url = `https://api.sportsgameodds.com/v2/events?apiKey=${API_KEY}&oddsAvailable=true&leagueID=${league}&season=${season}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ""}`;
      
      console.log(`  📡 Fetching page ${++pageCount}...`);
      
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`❌ Failed to fetch props for ${league}:`, res.status, await res.text());
        break;
      }

      const data = await res.json();
      const events = data.data || [];
      
      console.log(`  📊 Found ${events.length} events`);

      for (const event of events) {
        // The props are in event.odds object, not playerProps array
        const odds = event.odds || {};
        const players = event.players || {};
        
        // Extract player props from the odds object
        const playerProps = Object.entries(odds).filter(([key, odd]) => {
          return odd.playerID && odd.betTypeID === 'ou'; // Only over/under props
        });

        console.log(`  🎯 Found ${playerProps.length} player props in this event`);

        for (const [oddId, odd] of playerProps) {
          try {
            // Extract player info from players object
            const player = players[odd.playerID];
            if (!player) continue;
            
            const playerName = player.name;
            const [firstName, ...lastNameParts] = playerName.split(' ');
            const lastName = lastNameParts.join(' ');
            
            // Extract prop details from odd object
            const propName = odd.marketName || odd.statID;
            const line = parseFloat(odd.bookOverUnder || odd.fairOverUnder);
            
            // Get both over and under odds from the same odd pair
            let overOdds = odd.bookOdds;
            let underOdds = null;
            
            // Try to find the opposing odd for under odds
            if (odd.opposingOddID && odds[odd.opposingOddID]) {
              underOdds = odds[odd.opposingOddID].bookOdds;
            }
            
            if (!propName || isNaN(line)) continue;

            // Map league to sport
            const sportMap = {
              'NFL': 'nfl',
              'NBA': 'nba', 
              'MLB': 'mlb',
              'NHL': 'nhl'
            };
            const sport = sportMap[league] || league.toLowerCase();

            // First, ensure we have the prop type
            const propTypeQuery = `
              mutation UpsertPropType($name: String!, $category: String!, $sport: String!, $unit: String!) {
                insert_prop_types_one(object: {
                  name: $name,
                  category: $category,
                  sport: $sport,
                  unit: $unit,
                  is_over_under: true
                }, on_conflict: {
                  constraint: prop_types_name_unique,
                  update_columns: [category, sport, unit]
                }) {
                  id
                }
              }
            `;

            const propTypeResult = await sendGraphQLMutation(propTypeQuery, {
              name: propName,
              category: 'general',
              sport: sport,
              unit: 'units'
            });

            if (!propTypeResult?.insert_prop_types_one?.id) continue;

            // Ensure we have the player
            const playerQuery = `
              mutation UpsertPlayer($firstName: String!, $lastName: String!, $fullName: String!, $position: String!, $teamId: uuid!) {
                insert_players_one(object: {
                  first_name: $firstName,
                  last_name: $lastName,
                  full_name: $fullName,
                  position: $position,
                  position_category: "General",
                  team_id: $teamId
                }, on_conflict: {
                  constraint: players_full_name_key,
                  update_columns: [first_name, last_name, position, team_id]
                }) {
                  id
                }
              }
            `;

            // For now, use a default team ID - in production you'd map this properly
            const defaultTeamId = "77276cba-1038-489f-ace4-4872a488c243";
            
            const playerResult = await sendGraphQLMutation(playerQuery, {
              firstName,
              lastName,
              fullName: playerName,
              position: prop.position || 'UNK',
              teamId: defaultTeamId
            });

            if (!playerResult?.insert_players_one?.id) continue;

            // Insert the player prop
            const propQuery = `
              mutation InsertPlayerProp($playerId: uuid!, $gameId: uuid!, $propTypeId: uuid!, $line: numeric!, $overOdds: String!, $underOdds: String!) {
                insert_player_props_one(object: {
                  player_id: $playerId,
                  game_id: $gameId,
                  prop_type_id: $propTypeId,
                  line: $line,
                  over_odds: $overOdds,
                  under_odds: $underOdds,
                  odds: $overOdds
                }) {
                  id
                }
              }
            `;

            // Use a default game ID for now
            const defaultGameId = "c8633597-e1b8-44fb-98ce-e0a2827a039e";
            
            const propResult = await sendGraphQLMutation(propQuery, {
              playerId: playerResult.insert_players_one.id,
              gameId: defaultGameId,
              propTypeId: propTypeResult.insert_prop_types_one.id,
              line: line,
              overOdds: overOdds?.toString() || '-110',
              underOdds: underOdds?.toString() || '-110'
            });

            if (propResult?.insert_player_props_one?.id) {
              totalProps++;
              if (totalProps % 50 === 0) {
                console.log(`    ✅ Processed ${totalProps} props so far...`);
              }
            }

          } catch (error) {
            console.error(`    ❌ Error processing prop:`, error.message);
          }
        }
      }

      nextCursor = data.nextCursor;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error fetching ${league} data:`, error.message);
      break;
    }
  } while (nextCursor);

  console.log(`✅ Completed ${league}: ${totalProps} props ingested`);
  return totalProps;
}

async function ingestAllProps(season = '2025') {
  console.log(`🚀 Starting real prop ingestion for season ${season}...`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));

  let totalProps = 0;

  for (const league of LEAGUES) {
    const leagueProps = await ingestPropsForLeague(league, season);
    totalProps += leagueProps;
  }

  console.log('=' .repeat(60));
  console.log(`🎉 INGESTION COMPLETE!`);
  console.log(`📊 Total props ingested: ${totalProps}`);
  console.log(`⏰ Completed at: ${new Date().toISOString()}`);
}

// Run the ingestion
ingestAllProps().catch(console.error);
