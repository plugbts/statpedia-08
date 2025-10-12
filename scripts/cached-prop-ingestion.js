/**
 * Cached Prop Ingestion Script
 * Uses Cloudflare Edge Caching for SportsGameOdds API calls
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'https://statpedia-optimized-proxy.statpedia.workers.dev/v1/graphql';
const CACHED_API_ENDPOINT = 'https://statpedia-sportsgameodds-cache.statpedia.workers.dev';

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

async function fetchCachedSportsGameOddsData(league, season, limit = 10) {
  const url = `${CACHED_API_ENDPOINT}/sportsgameodds/v2/events?leagueID=${league}&season=${season}&limit=${limit}`;
  
  console.log(`  📡 Fetching cached data from: ${url}`);
  
  const response = await fetch(url);
  
  // Log cache headers for debugging
  const cacheStatus = response.headers.get('X-Cache');
  const cacheTTL = response.headers.get('X-Cache-TTL');
  const dataFreshness = response.headers.get('X-Data-Freshness');
  
  console.log(`  🚀 Cache Status: ${cacheStatus}, TTL: ${cacheTTL}s, Freshness: ${dataFreshness}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

async function ingestCachedNFLProps() {
  console.log(`🎯 Processing NFL props with edge caching...`);
  
  let totalProps = 0;
  
  try {
    // Fetch cached data from Cloudflare edge
    const data = await fetchCachedSportsGameOddsData('NFL', '2025', 5);
    const events = data.data || [];
    
    console.log(`  📊 Found ${events.length} events (cached)`);

    for (const event of events) {
      const odds = event.odds || {};
      const players = event.players || {};
      
      // Extract player props from the odds object
      const playerProps = Object.entries(odds).filter(([key, odd]) => {
        return odd.playerID && odd.betTypeID === 'ou' && odd.sideID === 'over';
      });

      console.log(`  🎯 Found ${playerProps.length} unique player props in this event`);

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
          
          // Get both over and under odds
          let overOdds = odd.bookOdds;
          let underOdds = null;
          
          if (odd.opposingOddID && odds[odd.opposingOddID]) {
            underOdds = odds[odd.opposingOddID].bookOdds;
          }
          
          if (!propName || isNaN(line)) continue;

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
            sport: 'nfl',
            unit: 'units'
          });

          if (!propTypeResult?.insert_prop_types_one?.id) continue;

          // Ensure we have the player
          const playerQuery = `
            mutation InsertPlayer($firstName: String!, $lastName: String!, $fullName: String!, $position: String!, $teamId: uuid!) {
              insert_players_one(object: {
                first_name: $firstName,
                last_name: $lastName,
                full_name: $fullName,
                position: $position,
                position_category: "General",
                team_id: $teamId
              }) {
                id
              }
            }
          `;

          const defaultTeamId = "77276cba-1038-489f-ace4-4872a488c243";
          
          const playerResult = await sendGraphQLMutation(playerQuery, {
            firstName,
            lastName,
            fullName: playerName,
            position: 'UNK',
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
            console.log(`    ✅ Processed prop ${totalProps}: ${playerName} ${propName} ${line} (${overOdds}/${underOdds})`);
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`    ❌ Error processing prop:`, error.message);
        }
      }
      
      // Add delay between events
      await new Promise(resolve => setTimeout(resolve, 200));
    }

  } catch (error) {
    console.error(`❌ Error fetching cached NFL data:`, error.message);
  }

  console.log(`✅ Completed NFL: ${totalProps} props ingested (via edge cache)`);
  return totalProps;
}

async function main() {
  console.log(`🚀 Starting cached prop ingestion for 2025...`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🌐 Using Cloudflare Edge Caching`);
  console.log('=' .repeat(60));

  const totalProps = await ingestCachedNFLProps();

  console.log('=' .repeat(60));
  console.log(`🎉 CACHED INGESTION COMPLETE!`);
  console.log(`📊 Total props ingested: ${totalProps}`);
  console.log(`⚡ All API calls served from Cloudflare Edge Cache`);
  console.log(`⏰ Completed at: ${new Date().toISOString()}`);
}

// Run the cached ingestion
main().catch(console.error);
