// Example usage of the new player name cleaning functionality
// This file demonstrates how to use the cleanPlayerNames function and fetchProps utilities

import { cleanPlayerNames, type RawPropRow } from "./playerNames";
import { fetchPropsForDate, fetchPropsForDateRange } from "./fetchProps";

// Example 1: Direct usage of cleanPlayerNames
export function exampleDirectUsage() {
  const rawProps: RawPropRow[] = [
    {
      player_name: "Tua Tagovailoa Passing Yards",
      prop_type: "Passing Yards",
      player_id: "tua_tagovailoa",
      league: "nfl",
      prop_date: "2025-01-03",
      sportsbook: "DraftKings"
    },
    {
      player_name: null,
      prop_type: "Points",
      player_id: "lebron_james",
      league: "nba",
      prop_date: "2025-01-03",
      sportsbook: "FanDuel"
    },
    {
      player_name: "",
      prop_type: "Hits",
      player_id: "mike_trout",
      league: "mlb",
      prop_date: "2025-01-03",
      sportsbook: "BetMGM"
    }
  ];

  const cleanedProps = cleanPlayerNames(rawProps, "[example]");
  
  console.log("Cleaned props:");
  cleanedProps.forEach((prop, index) => {
    console.log(`${index + 1}. ${prop.clean_player_name} (${prop.league})`);
    console.log(`   Original: "${prop.debug.original_player_name}"`);
    console.log(`   Source: ${prop.debug.name_source}`);
    console.log(`   Had prop in name: ${prop.debug.had_prop_in_name}`);
    console.log(`   Was empty/null: ${prop.debug.was_empty_or_null}`);
    console.log("");
  });

  return cleanedProps;
}

// Example 2: Using fetchPropsForDate (requires env object)
export async function exampleFetchProps(env: any) {
  try {
    // Fetch props for NFL on a specific date
    const nflProps = await fetchPropsForDate(env, "nfl", "2025-01-03");
    console.log(`Fetched ${nflProps.length} NFL props for 2025-01-03`);
    
    // Fetch props for NBA over a date range
    const nbaProps = await fetchPropsForDateRange(env, "nba", "2025-01-01", "2025-01-03");
    console.log(`Fetched ${nbaProps.length} NBA props for date range`);
    
    // Show sample cleaned names
    console.log("Sample cleaned player names:");
    nflProps.slice(0, 3).forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.clean_player_name} - ${prop.prop_type}`);
    });
    
    return { nflProps, nbaProps };
  } catch (error) {
    console.error("Error fetching props:", error);
    throw error;
  }
}

// Example 3: Processing props with debugging
export function exampleWithDebugging() {
  const propsWithIssues: RawPropRow[] = [
    {
      player_name: "Josh Allen Passing Yards",
      prop_type: "Passing Yards",
      player_id: "josh_allen",
      league: "nfl"
    },
    {
      player_name: "Passing Yards - Tua Tagovailoa",
      prop_type: "Passing Yards", 
      player_id: "tua_tagovailoa",
      league: "nfl"
    },
    {
      player_name: null,
      player_id: null,
      prop_type: "Points",
      league: "nba"
    }
  ];

  const cleanedProps = cleanPlayerNames(propsWithIssues, "[debug-example]");
  
  // Filter for anomalies
  const anomalies = cleanedProps.filter(prop => 
    prop.debug.had_prop_in_name || 
    prop.debug.was_empty_or_null || 
    prop.clean_player_name === "Unknown Player"
  );
  
  console.log(`Found ${anomalies.length} anomalies out of ${cleanedProps.length} props`);
  
  return {
    allProps: cleanedProps,
    anomalies: anomalies
  };
}

// Example 4: Integration with existing worker patterns
export function exampleWorkerIntegration() {
  // This shows how the worker now processes props
  const mockWorkerProps = [
    {
      prop_id: "123",
      player_name: "Tua Tagovailoa Passing Yards",
      player_id: "tua_tagovailoa",
      prop_type: "Passing Yards",
      league: "nfl",
      prop_date: "2025-01-03",
      team_abbr: "MIA",
      opponent_abbr: "BUF",
      line: 250.5,
      over_odds: -110,
      under_odds: -110,
      sportsbook: "DraftKings"
    }
  ];

  // Clean the names (this now happens automatically in the worker)
  const cleanedProps = cleanPlayerNames(mockWorkerProps, "[worker-integration]");
  
  // Transform to expected format (this is what the worker does)
  const transformedProps = cleanedProps.map(prop => ({
    id: prop.prop_id,
    playerId: prop.player_id,
    playerName: prop.clean_player_name, // Now uses cleaned name!
    team: prop.team_abbr,
    opponent: prop.opponent_abbr,
    propType: prop.prop_type,
    line: prop.line,
    overOdds: prop.over_odds,
    underOdds: prop.under_odds,
    sportsbooks: [prop.sportsbook || 'Unknown'],
    // ... other fields
  }));
  
  console.log("Transformed prop with cleaned name:");
  console.log(JSON.stringify(transformedProps[0], null, 2));
  
  return transformedProps;
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log("=== Player Name Cleaning Examples ===\n");
  
  console.log("1. Direct Usage:");
  exampleDirectUsage();
  
  console.log("\n2. With Debugging:");
  exampleWithDebugging();
  
  console.log("\n3. Worker Integration:");
  exampleWorkerIntegration();
}
