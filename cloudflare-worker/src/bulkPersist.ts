/**
 * Bulk Persistence Functions for Cloudflare Worker
 * 
 * This module provides bulk upsert functions to reduce Cloudflare's subrequest limit
 * by using Supabase RPC functions instead of individual database calls.
 */

import { createClient } from "@supabase/supabase-js";

export interface BulkUpsertResult {
  inserted_count: number;
  updated_count: number;
  error_count: number;
  errors: any[];
}

/**
 * Bulk upsert props using Supabase RPC function
 */
export async function bulkUpsertProps(env: any, props: any[]): Promise<BulkUpsertResult> {
  if (!props.length) {
    return { inserted_count: 0, updated_count: 0, error_count: 0, errors: [] };
  }

  console.log(`🔄 [bulkUpsertProps] Starting bulk upsert of ${props.length} props...`);

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Transform props to the format expected by the RPC function
    const rows = props.map(prop => ({
      player_id: prop.player_id,
      player_name: prop.player_name,
      team: prop.team,
      opponent: prop.opponent,
      league: prop.league,
      season: prop.season,
      game_id: prop.game_id,
      date_normalized: prop.date_normalized,
      date: prop.date || prop.date_normalized,
      prop_type: prop.prop_type,
      line: prop.line,
      over_odds: prop.over_odds,
      under_odds: prop.under_odds,
      odds: prop.odds,
      sportsbook: prop.sportsbook || 'SportsGameOdds',
      conflict_key: prop.conflict_key
    }));

    console.log(`📊 [bulkUpsertProps] Prepared ${rows.length} rows for bulk upsert`);

    // Call the RPC function
    const { data, error } = await supabase.rpc('bulk_upsert_proplines', { 
      rows: rows 
    });

    if (error) {
      console.error(`❌ [bulkUpsertProps] RPC error:`, error);
      throw error;
    }

    const result = data?.[0] || { inserted_count: 0, updated_count: 0, error_count: 0, errors: [] };
    
    console.log(`✅ [bulkUpsertProps] Bulk upsert completed:`, {
      inserted: result.inserted_count,
      updated: result.updated_count,
      errors: result.error_count
    });

    if (result.error_count > 0) {
      console.warn(`⚠️ [bulkUpsertProps] ${result.error_count} errors occurred:`, result.errors);
    }

    return result;

  } catch (error) {
    console.error(`❌ [bulkUpsertProps] Bulk upsert failed:`, error);
    
    // Fallback to chunked individual upserts if RPC fails
    console.log(`🔄 [bulkUpsertProps] Falling back to chunked individual upserts...`);
    return await chunkedUpsertProps(env, props);
  }
}

/**
 * Bulk upsert player game logs using Supabase RPC function
 */
export async function bulkUpsertPlayerGameLogs(env: any, logs: any[]): Promise<BulkUpsertResult> {
  if (!logs.length) {
    return { inserted_count: 0, updated_count: 0, error_count: 0, errors: [] };
  }

  console.log(`🔄 [bulkUpsertPlayerGameLogs] Starting bulk upsert of ${logs.length} game logs...`);

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Transform logs to the format expected by the RPC function
    const rows = logs.map(log => ({
      player_id: log.player_id,
      player_name: log.player_name,
      team: log.team,
      opponent: log.opponent,
      season: log.season,
      date: log.date,
      prop_type: log.prop_type,
      value: log.value,
      sport: log.sport,
      league: log.league,
      game_id: log.game_id,
      home_away: log.home_away,
      weather_conditions: log.weather_conditions || 'unknown',
      injury_status: log.injury_status || 'healthy'
    }));

    console.log(`📊 [bulkUpsertPlayerGameLogs] Prepared ${rows.length} rows for bulk upsert`);

    // Call the RPC function
    const { data, error } = await supabase.rpc('bulk_upsert_player_game_logs', { 
      rows: rows 
    });

    if (error) {
      console.error(`❌ [bulkUpsertPlayerGameLogs] RPC error:`, error);
      throw error;
    }

    const result = data?.[0] || { inserted_count: 0, updated_count: 0, error_count: 0, errors: [] };
    
    console.log(`✅ [bulkUpsertPlayerGameLogs] Bulk upsert completed:`, {
      inserted: result.inserted_count,
      updated: result.updated_count,
      errors: result.error_count
    });

    if (result.error_count > 0) {
      console.warn(`⚠️ [bulkUpsertPlayerGameLogs] ${result.error_count} errors occurred:`, result.errors);
    }

    return result;

  } catch (error) {
    console.error(`❌ [bulkUpsertPlayerGameLogs] Bulk upsert failed:`, error);
    
    // Fallback to chunked individual upserts if RPC fails
    console.log(`🔄 [bulkUpsertPlayerGameLogs] Falling back to chunked individual upserts...`);
    return await chunkedUpsertPlayerGameLogs(env, logs);
  }
}

/**
 * Fallback: Chunked individual upserts to avoid subrequest limits
 */
async function chunkedUpsertProps(env: any, props: any[]): Promise<BulkUpsertResult> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const chunkSize = 25; // Smaller chunks to avoid subrequest limits
  let totalInserted = 0;
  const totalUpdated = 0;
  let totalErrors = 0;
  const allErrors: any[] = [];

  for (let i = 0; i < props.length; i += chunkSize) {
    const chunk = props.slice(i, i + chunkSize);
    
    try {
      const { error } = await supabase
        .from("proplines")
        .upsert(chunk, { onConflict: 'player_id,date,prop_type,sportsbook,line' });

      if (error) {
        console.error(`❌ [chunkedUpsertProps] Chunk ${i}-${i + chunk.length} failed:`, error);
        totalErrors += chunk.length;
        allErrors.push({ chunk: i, error: error.message });
      } else {
        totalInserted += chunk.length;
      }
    } catch (err) {
      console.error(`❌ [chunkedUpsertProps] Chunk ${i}-${i + chunk.length} exception:`, err);
      totalErrors += chunk.length;
      allErrors.push({ chunk: i, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    inserted_count: totalInserted,
    updated_count: 0, // Can't easily determine updates in chunked approach
    error_count: totalErrors,
    errors: allErrors
  };
}

/**
 * Fallback: Chunked individual upserts for player game logs
 */
async function chunkedUpsertPlayerGameLogs(env: any, logs: any[]): Promise<BulkUpsertResult> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const chunkSize = 25; // Smaller chunks to avoid subrequest limits
  let totalInserted = 0;
  const totalUpdated = 0;
  let totalErrors = 0;
  const allErrors: any[] = [];

  for (let i = 0; i < logs.length; i += chunkSize) {
    const chunk = logs.slice(i, i + chunkSize);
    
    try {
      const { error } = await supabase
        .from("player_game_logs")
        .upsert(chunk, { onConflict: 'player_id,date,prop_type' });

      if (error) {
        console.error(`❌ [chunkedUpsertPlayerGameLogs] Chunk ${i}-${i + chunk.length} failed:`, error);
        totalErrors += chunk.length;
        allErrors.push({ chunk: i, error: error.message });
      } else {
        totalInserted += chunk.length;
      }
    } catch (err) {
      console.error(`❌ [chunkedUpsertPlayerGameLogs] Chunk ${i}-${i + chunk.length} exception:`, err);
      totalErrors += chunk.length;
      allErrors.push({ chunk: i, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    inserted_count: totalInserted,
    updated_count: 0, // Can't easily determine updates in chunked approach
    error_count: totalErrors,
    errors: allErrors
  };
}
