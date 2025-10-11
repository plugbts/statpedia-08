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

// Bulletproof batch persistence function
async function persistBatch(env: any, rows: any[], table: string): Promise<{ success: boolean; inserted: number; error?: string }> {
  if (!rows.length) {
    console.log(`[persist] skipped empty batch for ${table}`);
    return { success: true, inserted: 0 };
  }

  console.log(`[persist] inserting ${rows.length} rows into ${table}`);
  console.log(`[persist] sample row:`, {
    table,
    sampleKeys: Object.keys(rows[0]),
    sampleRow: rows[0]
  });
  
  // Row-level debug logging for first row to catch hidden mismatches
  if (rows.length > 0) {
    console.log(`[persist] first row debug:`, {
      table,
      rowKeys: Object.keys(rows[0]),
      rowValues: Object.entries(rows[0]).map(([key, value]) => ({
        key,
        value,
        type: typeof value,
        isNull: value === null,
        isUndefined: value === undefined
      }))
    });
  }

  try {
    const response = await supabaseFetch(env, table, {
      method: "POST",
      body: rows,
      headers: { 
        Prefer: "resolution=ignore-duplicates", // Use ignore-duplicates to skip conflicts
        "Content-Type": "application/json"
      },
    });

    // Detailed response logging
    console.log(`[persist] Supabase response for ${table}:`, {
      responseType: typeof response,
      responseIsNull: response === null,
      responseIsUndefined: response === undefined,
      responseIsArray: Array.isArray(response),
      responseLength: Array.isArray(response) ? response.length : 'N/A',
      responseKeys: response && typeof response === 'object' ? Object.keys(response) : 'N/A',
      fullResponse: response
    });

    // Check for explicit errors in response
    if (response && typeof response === 'object' && 'error' in response) {
      console.error(`[persist] insert error in ${table}:`, JSON.stringify(response.error, null, 2));
      return { success: false, inserted: 0, error: JSON.stringify(response.error, null, 2) };
    }

    // Success - check if we got data back
    if (response === null || response === undefined) {
      console.log(`[persist] inserted ${rows.length} rows into ${table} (empty response = success)`);
      return { success: true, inserted: rows.length };
    } else if (Array.isArray(response) && response.length > 0) {
      console.log(`[persist] inserted ${response.length} rows into ${table} (returned data)`);
      return { success: true, inserted: response.length };
    } else {
      console.log(`[persist] inserted ${rows.length} rows into ${table} (response:`, response, ')');
      return { success: true, inserted: rows.length };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[persist] insert failed for ${table}:`, errorMsg);
    return { success: false, inserted: 0, error: errorMsg };
  }
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

  // Insert into proplines using bulletproof persistBatch
  console.log("🔄 Inserting proplines using bulletproof persistence...");
  const proplinesBatches = chunk(mapped, 50); // Much smaller batches to test
  
  for (let i = 0; i < proplinesBatches.length; i++) {
    const batch = proplinesBatches[i];
    const persistResult = await persistBatch(env, batch, "proplines");
    
    if (persistResult.success) {
      result.proplinesInserted += persistResult.inserted;
      console.log(`✅ Proplines batch ${i + 1}/${proplinesBatches.length}: ${persistResult.inserted} rows inserted`);
    } else {
      result.success = false;
      result.errors += batch.length;
      result.errorDetails.push({
        table: 'proplines',
        batchIndex: i,
        error: persistResult.error || 'Unknown error',
        sampleData: batch[0]
      });
      console.error(`❌ Proplines batch ${i + 1}/${proplinesBatches.length} failed:`, persistResult.error);
    }
  }

  // Insert into player_game_logs using bulletproof persistBatch
  console.log("🔄 Inserting player_game_logs using bulletproof persistence...");
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

  const gameLogBatches = chunk(gamelogRows, 50); // Much smaller batches to test
  
  for (let i = 0; i < gameLogBatches.length; i++) {
    const batch = gameLogBatches[i];
    const persistResult = await persistBatch(env, batch, "player_game_logs");
    
    if (persistResult.success) {
      result.gameLogsInserted += persistResult.inserted;
      console.log(`✅ Player game logs batch ${i + 1}/${gameLogBatches.length}: ${persistResult.inserted} rows inserted`);
    } else {
      result.success = false;
      result.errors += batch.length;
      result.errorDetails.push({
        table: 'player_game_logs',
        batchIndex: i,
        error: persistResult.error || 'Unknown error',
        sampleData: batch[0]
      });
      console.error(`❌ Player game logs batch ${i + 1}/${gameLogBatches.length} failed:`, persistResult.error);
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
