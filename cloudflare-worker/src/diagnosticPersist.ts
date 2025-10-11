/**
 * Diagnostic persistence function to identify validation errors
 * 
 * This replaces the bulk upsert with row-by-row insertion to catch
 * the exact validation error that's preventing all inserts.
 */

import { createClient } from "@supabase/supabase-js";

export async function diagnosticPersistProps(env: any, enriched: any[]): Promise<void> {
  if (!enriched.length) {
    console.log("⚠️ No rows to insert");
    return;
  }

  console.log(`🔍 DIAGNOSTIC: Testing persistence of ${enriched.length} props...`);

  // Create Supabase client for direct access
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY
  );

  // Try inserting one row at a time for diagnostics
  for (let i = 0; i < Math.min(enriched.length, 3); i++) { // Only test first 3 rows
    const prop = enriched[i];
    
    // Transform to database format (same as original)
    const row = {
      id: `${prop.player_id}-${prop.date_normalized}-${prop.prop_type}`,
      player_id: prop.player_id,
      player_name: prop.clean_player_name,
      team: prop.team_abbr,
      opponent: prop.opponent_abbr,
      league: prop.league,
      season: prop.season,
      game_id: prop.game_id,
      date_normalized: prop.date_normalized,
      date: prop.date_normalized, // Add the missing date field
      prop_type: prop.prop_type,
      line: prop.line,
      over_odds: prop.over_odds,
      under_odds: prop.under_odds,
      odds: null,
      conflict_key: `${prop.player_id}|${prop.date_normalized}|${prop.prop_type}|SportsGameOdds|${prop.league}|${prop.season}`
    };

    console.log(`\n🔍 Testing row ${i + 1}:`);
    console.log(`📋 Row payload:`, JSON.stringify(row, null, 2));

    try {
      const { error } = await supabase
        .from("proplines")
        .insert([row]);

      if (error) {
        console.error(`❌ Insert failed at row ${i + 1}`);
        console.error(`🚨 Supabase error:`, error.message);
        console.error(`📝 Error details:`, error.details);
        console.error(`🔧 Error hint:`, error.hint);
        
        // Try to identify the specific issue
        if (error.message.includes('invalid input syntax for type numeric')) {
          console.error(`💡 LIKELY FIX: Cast odds to numbers - over_odds: ${typeof row.over_odds}, under_odds: ${typeof row.under_odds}`);
        }
        if (error.message.includes('null value in column') && error.message.includes('violates not-null constraint')) {
          console.error(`💡 LIKELY FIX: Missing required field - check which column is null`);
        }
        if (error.message.includes('invalid input value for enum')) {
          console.error(`💡 LIKELY FIX: Invalid enum value - league: "${row.league}", check valid values`);
        }
        
        break; // Stop after first failure for clarity
      } else {
        console.log(`✅ Row ${i + 1} inserted successfully: ${row.player_name} ${row.prop_type}`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error at row ${i + 1}:`, err);
      break;
    }
  }
}

/**
 * Alternative diagnostic: Test manual SQL insert
 */
export async function testManualInsert(env: any): Promise<any> {
  console.log(`🔍 DIAGNOSTIC: Testing manual SQL insert...`);
  
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY
  );

  // Test with a simple, known-good row
  const testRow = {
    player_id: 'test_player_123',
    player_name: 'Test Player',
    prop_type: 'passing_yards',
    line: 250.5,
    over_odds: -110,
    under_odds: -110,
    team: 'NYJ',
    opponent: 'DEN',
    league: 'nfl',
    season: 2025,
    game_id: 'test_game_123',
    date_normalized: '2025-10-11',
    date: '2025-10-11', // Add the missing date field
    odds: null,
    conflict_key: 'test_player_123|2025-10-11|passing_yards|SportsGameOdds|nfl|2025'
  };

  console.log(`📋 Test row:`, JSON.stringify(testRow, null, 2));

  try {
    const { error } = await supabase
      .from("proplines")
      .insert([testRow]);

    if (error) {
      console.error(`❌ Manual test failed:`, error.message);
      console.error(`📝 Error details:`, error.details);
      return { 
        success: false, 
        error: error.message, 
        details: error.details,
        hint: error.hint 
      };
    } else {
      console.log(`✅ Manual test succeeded!`);
      
      // Clean up test row
      await supabase
        .from("proplines")
        .delete()
        .eq('player_id', 'test_player_123');
      
      return { success: true, message: "Manual test succeeded" };
    }
  } catch (err) {
    console.error(`❌ Manual test error:`, err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : String(err) 
    };
  }
}
