// Enhanced insertProps with comprehensive error handling and debugging (NO SUPABASE)
import { bulkUpsertProps, bulkUpsertPlayerGameLogs } from "../bulkPersist";

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

// Diagnostic insert wrapper (NO SUPABASE): no-op for compatibility
async function diagnosticInsert(
  _env: any,
  rows: any[],
  table: string,
): Promise<{ success: boolean; inserted: number; error?: string }> {
  console.log(`[diagnostic] NO-OP: would insert ${rows.length} rows into ${table}`);
  return { success: true, inserted: 0 };
}

// Bulletproof batch persistence function
async function persistBatch(
  _env: any,
  rows: any[],
  table: string,
): Promise<{ success: boolean; inserted: number; error?: string }> {
  if (!rows.length) {
    console.log(`[persist] skipped empty batch for ${table}`);
    return { success: true, inserted: 0 };
  }

  console.log(`[persist] NO-OP (NO SUPABASE): would insert ${rows.length} rows into ${table}`);
  console.log(`[persist] sample row:`, {
    table,
    sampleKeys: Object.keys(rows[0]),
    sampleRow: rows[0],
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
        isUndefined: value === undefined,
      })),
    });
  }

  // No-op persistence
  return { success: true, inserted: 0 };
}

export async function insertPropsWithDebugging(env: any, mapped: any[]): Promise<InsertResult> {
  if (!mapped.length) {
    console.log("⚠️ No props to insert");
    return {
      success: true,
      proplinesInserted: 0,
      gameLogsInserted: 0,
      errors: 0,
      errorDetails: [],
    };
  }

  console.log(`🔄 Starting enhanced insertion of ${mapped.length} props...`);

  const result: InsertResult = {
    success: true,
    proplinesInserted: 0,
    gameLogsInserted: 0,
    errors: 0,
    errorDetails: [],
  };

  // Validate data structure before insertion
  // console.log("🔍 Validating data structure..."); // Reduced logging
  const validationErrors = validatePropData(mapped);
  if (validationErrors.length > 0) {
    console.error("❌ Data validation failed:", validationErrors);
    result.success = false;
    result.errors += validationErrors.length;
    result.errorDetails.push(
      ...validationErrors.map((error) => ({
        table: "validation",
        batchIndex: -1,
        error: error.message,
        sampleData: error.sampleData,
      })),
    );
    return result;
  }

  // Insert into proplines using bulk upsert
  console.log("🔄 Inserting proplines using bulk upsert...");

  try {
    const bulkResult = await bulkUpsertProps(env, mapped);

    result.proplinesInserted = bulkResult.inserted_count + bulkResult.updated_count;
    result.errors += bulkResult.error_count;

    if (bulkResult.error_count > 0) {
      result.success = false;
      result.errorDetails.push({
        table: "proplines",
        batchIndex: 0,
        error: `${bulkResult.error_count} rows failed to insert`,
        sampleData: bulkResult.errors[0] || null,
      });
      console.warn(`⚠️ Proplines bulk insert completed with ${bulkResult.error_count} errors`);
    } else {
      console.log(
        `✅ Proplines bulk insert completed: ${bulkResult.inserted_count} inserted, ${bulkResult.updated_count} updated`,
      );
    }
  } catch (error) {
    result.success = false;
    result.errors += mapped.length;
    result.errorDetails.push({
      table: "proplines",
      batchIndex: 0,
      error: error instanceof Error ? error.message : String(error),
      sampleData: mapped[0],
    });
    console.error(`❌ Proplines bulk insert failed:`, error);
  }

  // Insert into player_game_logs using bulk upsert
  console.log("🔄 Inserting player_game_logs using bulk upsert...");
  const gamelogRows = mapped.map((row) => ({
    player_id: row.player_id,
    player_name: row.player_name,
    team: row.team,
    opponent: row.opponent,
    season: row.season,
    date: row.date,
    prop_type: row.prop_type,
    value: row.line, // Use line as the value for game logs
    sport: row.league?.toUpperCase() || "NFL",
    league: row.league,
    game_id: row.game_id,
  }));

  try {
    const bulkResult = await bulkUpsertPlayerGameLogs(env, gamelogRows);

    result.gameLogsInserted = bulkResult.inserted_count + bulkResult.updated_count;
    result.errors += bulkResult.error_count;

    if (bulkResult.error_count > 0) {
      result.success = false;
      result.errorDetails.push({
        table: "player_game_logs",
        batchIndex: 0,
        error: `${bulkResult.error_count} rows failed to insert`,
        sampleData: bulkResult.errors[0] || null,
      });
      console.warn(
        `⚠️ Player game logs bulk insert completed with ${bulkResult.error_count} errors`,
      );
    } else {
      console.log(
        `✅ Player game logs bulk insert completed: ${bulkResult.inserted_count} inserted, ${bulkResult.updated_count} updated`,
      );
    }
  } catch (error) {
    result.success = false;
    result.errors += gamelogRows.length;
    result.errorDetails.push({
      table: "player_game_logs",
      batchIndex: 0,
      error: error instanceof Error ? error.message : String(error),
      sampleData: gamelogRows[0],
    });
    console.error(`❌ Player game logs bulk insert failed:`, error);
  }

  console.log(`✅ Enhanced insertion complete:`, {
    totalProps: mapped.length,
    proplinesInserted: result.proplinesInserted,
    gameLogsInserted: result.gameLogsInserted,
    errors: result.errors,
    success: result.success,
  });

  return result;
}

// Data validation function
function validatePropData(mapped: any[]): Array<{ message: string; sampleData?: any }> {
  const errors: Array<{ message: string; sampleData?: any }> = [];

  for (let i = 0; i < mapped.length; i++) {
    const prop = mapped[i];

    // Check required fields (over_odds and under_odds can be null)
    const requiredFields = [
      "player_id",
      "player_name",
      "team",
      "opponent",
      "prop_type",
      "line",
      "sportsbook",
      "league",
      "season",
      "date",
      "game_id",
      "conflict_key",
    ];

    for (const field of requiredFields) {
      if (prop[field] === undefined || prop[field] === null || prop[field] === "") {
        errors.push({
          message: `Missing required field '${field}' in prop at index ${i}`,
          sampleData: prop,
        });
      }
    }

    // Check that at least one odds field is present
    if (prop.over_odds === null && prop.under_odds === null) {
      errors.push({
        message: `At least one odds field (over_odds or under_odds) must be present at index ${i}`,
        sampleData: prop,
      });
    }

    // Check data types
    if (typeof prop.line !== "number") {
      errors.push({
        message: `Invalid line type: expected number, got ${typeof prop.line} at index ${i}`,
        sampleData: prop,
      });
    }

    if (prop.over_odds !== null && typeof prop.over_odds !== "number") {
      errors.push({
        message: `Invalid over_odds type: expected number or null, got ${typeof prop.over_odds} at index ${i}`,
        sampleData: prop,
      });
    }

    if (prop.under_odds !== null && typeof prop.under_odds !== "number") {
      errors.push({
        message: `Invalid under_odds type: expected number or null, got ${typeof prop.under_odds} at index ${i}`,
        sampleData: prop,
      });
    }

    if (typeof prop.season !== "number") {
      errors.push({
        message: `Invalid season type: expected number, got ${typeof prop.season} at index ${i}`,
        sampleData: prop,
      });
    }

    // Check conflict_key format
    if (prop.conflict_key && typeof prop.conflict_key !== "string") {
      errors.push({
        message: `Invalid conflict_key type: expected string, got ${typeof prop.conflict_key} at index ${i}`,
        sampleData: prop,
      });
    }
  }

  return errors;
}

// Backward compatibility - export the original function as well
export { insertPropsWithDebugging as insertProps };
