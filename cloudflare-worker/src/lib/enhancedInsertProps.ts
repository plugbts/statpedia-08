// Enhanced insertProps with comprehensive error handling and debugging
import { supabaseFetch } from "../supabaseFetch";
import { chunk } from "../helpers";

export interface InsertResult {
  success: boolean;
  proplinesInserted: number;
  gameLogsInserted: number;
  errors: number;
  errorDetails: Array<{
    table: string;
    batchIndex: number;
    error: string;
    sampleData?: any;
  }>;
}

export async function insertPropsWithDebugging(env: any, mapped: any[]): Promise<InsertResult> {
  if (!mapped.length) {
    console.log("⚠️ No props to insert");
    return {
      success: true,
      proplinesInserted: 0,
      gameLogsInserted: 0,
      errors: 0,
      errorDetails: []
    };
  }

  console.log(`🔄 Starting enhanced insertion of ${mapped.length} props...`);
  
  const result: InsertResult = {
    success: true,
    proplinesInserted: 0,
    gameLogsInserted: 0,
    errors: 0,
    errorDetails: []
  };

  // Validate data structure before insertion
  // console.log("🔍 Validating data structure..."); // Reduced logging
  const validationErrors = validatePropData(mapped);
  if (validationErrors.length > 0) {
    console.error("❌ Data validation failed:", validationErrors);
    result.success = false;
    result.errors += validationErrors.length;
    result.errorDetails.push(...validationErrors.map(error => ({
      table: 'validation',
      batchIndex: -1,
      error: error.message,
      sampleData: error.sampleData
    })));
    return result;
  }

  // Insert into proplines with enhanced error handling
  // console.log("🔄 Inserting proplines..."); // Reduced logging
  const proplinesBatches = chunk(mapped, 250); // Smaller batches for better error isolation
  
  for (let i = 0; i < proplinesBatches.length; i++) {
    const batch = proplinesBatches[i];
    try {
      // console.log(`🔄 Inserting proplines batch ${i + 1}/${proplinesBatches.length} (${batch.length} props)...`); // Reduced logging
      
      // Log sample data for debugging
      if (i === 0 && batch.length > 0) {
        console.log("📊 Sample proplines data:", {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          conflict_key: batch[0].conflict_key,
          over_odds: batch[0].over_odds,
          under_odds: batch[0].under_odds
        });
      }
      
      const response = await supabaseFetch(env, "proplines", {
        method: "POST",
        body: batch,
        headers: { 
          Prefer: "resolution=merge-duplicates",
          "Content-Type": "application/json"
        },
      });
      
      if (response === null || response === undefined) {
        console.log(`✅ Inserted proplines batch ${i + 1} (${batch.length} props) - empty response = success`);
        result.proplinesInserted += batch.length;
      } else {
        console.log(`✅ Inserted proplines batch ${i + 1} (${batch.length} props) with response:`, response);
        result.proplinesInserted += batch.length;
      }
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Proplines batch ${i + 1} insert failed:`, {
        batchIndex: i,
        batchSize: batch.length,
        error: errorMsg,
        sampleProp: batch[0] ? {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          conflict_key: batch[0].conflict_key,
          over_odds: batch[0].over_odds,
          under_odds: batch[0].under_odds
        } : null,
        fullError: e
      });
      
      result.success = false;
      result.errors += batch.length;
      result.errorDetails.push({
        table: 'proplines',
        batchIndex: i,
        error: errorMsg,
        sampleData: batch[0]
      });
      
      // Continue with other batches instead of throwing
    }
  }

  // Insert into player_game_logs with enhanced error handling
  // console.log("🔄 Inserting player_game_logs..."); // Reduced logging
  const gamelogRows = mapped.map(row => ({
    player_id: row.player_id,
    player_name: row.player_name,
    team: row.team,
    opponent: row.opponent,
    season: row.season,
    date: row.date,
    prop_type: row.prop_type,
    value: row.line, // Use line as the value for game logs
    sport: row.league?.toUpperCase() || 'NFL',
    league: row.league,
    game_id: row.game_id,
  }));

  const gameLogBatches = chunk(gamelogRows, 250);
  
  for (let i = 0; i < gameLogBatches.length; i++) {
    const batch = gameLogBatches[i];
    try {
      // console.log(`🔄 Inserting player_game_logs batch ${i + 1}/${gameLogBatches.length} (${batch.length} rows)...`); // Reduced logging
      
      // Log sample data for debugging
      if (i === 0 && batch.length > 0) {
        console.log("📊 Sample game log data:", {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          game_id: batch[0].game_id,
          value: batch[0].value,
          sport: batch[0].sport
        });
      }
      
      const response = await supabaseFetch(env, "player_game_logs", {
        method: "POST",
        body: batch,
        headers: { 
          Prefer: "resolution=merge-duplicates",
          "Content-Type": "application/json"
        },
      });
      
      if (response === null || response === undefined) {
        console.log(`✅ Inserted player_game_logs batch ${i + 1} (${batch.length} rows) - empty response = success`);
        result.gameLogsInserted += batch.length;
      } else {
        console.log(`✅ Inserted player_game_logs batch ${i + 1} (${batch.length} rows) with response:`, response);
        result.gameLogsInserted += batch.length;
      }
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Player_game_logs batch ${i + 1} insert failed:`, {
        batchIndex: i,
        batchSize: batch.length,
        error: errorMsg,
        sampleLog: batch[0] ? {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          game_id: batch[0].game_id,
          value: batch[0].value,
          sport: batch[0].sport
        } : null,
        fullError: e
      });
      
      result.success = false;
      result.errors += batch.length;
      result.errorDetails.push({
        table: 'player_game_logs',
        batchIndex: i,
        error: errorMsg,
        sampleData: batch[0]
      });
      
      // Continue with other batches instead of throwing
    }
  }

  console.log(`✅ Enhanced insertion complete:`, {
    totalProps: mapped.length,
    proplinesInserted: result.proplinesInserted,
    gameLogsInserted: result.gameLogsInserted,
    errors: result.errors,
    success: result.success
  });

  return result;
}

// Data validation function
function validatePropData(mapped: any[]): Array<{message: string, sampleData?: any}> {
  const errors: Array<{message: string, sampleData?: any}> = [];
  
  for (let i = 0; i < mapped.length; i++) {
    const prop = mapped[i];
    
    // Check required fields (over_odds and under_odds can be null)
    const requiredFields = ['player_id', 'player_name', 'team', 'opponent', 'prop_type', 'line', 'sportsbook', 'league', 'season', 'date', 'game_id', 'conflict_key'];
    
    for (const field of requiredFields) {
      if (prop[field] === undefined || prop[field] === null || prop[field] === '') {
        errors.push({
          message: `Missing required field '${field}' in prop at index ${i}`,
          sampleData: prop
        });
      }
    }
    
    // Check that at least one odds field is present
    if (prop.over_odds === null && prop.under_odds === null) {
      errors.push({
        message: `At least one odds field (over_odds or under_odds) must be present at index ${i}`,
        sampleData: prop
      });
    }
    
    // Check data types
    if (typeof prop.line !== 'number') {
      errors.push({
        message: `Invalid line type: expected number, got ${typeof prop.line} at index ${i}`,
        sampleData: prop
      });
    }
    
    if (prop.over_odds !== null && typeof prop.over_odds !== 'number') {
      errors.push({
        message: `Invalid over_odds type: expected number or null, got ${typeof prop.over_odds} at index ${i}`,
        sampleData: prop
      });
    }
    
    if (prop.under_odds !== null && typeof prop.under_odds !== 'number') {
      errors.push({
        message: `Invalid under_odds type: expected number or null, got ${typeof prop.under_odds} at index ${i}`,
        sampleData: prop
      });
    }
    
    if (typeof prop.season !== 'number') {
      errors.push({
        message: `Invalid season type: expected number, got ${typeof prop.season} at index ${i}`,
        sampleData: prop
      });
    }
    
    // Check conflict_key format
    if (prop.conflict_key && typeof prop.conflict_key !== 'string') {
      errors.push({
        message: `Invalid conflict_key type: expected string, got ${typeof prop.conflict_key} at index ${i}`,
        sampleData: prop
      });
    }
  }
  
  return errors;
}

// Backward compatibility - export the original function as well
export { insertPropsWithDebugging as insertProps };
