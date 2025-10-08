// src/lib/insertProps.ts
import { supabaseFetch } from "../supabaseFetch";
import { chunk } from "../helpers";

export async function insertProps(env: any, mapped: any[]) {
  if (!mapped.length) {
    console.log("⚠️ No props to insert");
    return;
  }

  console.log(`🔄 Starting insertion of ${mapped.length} props...`);

  // Insert into proplines
  for (const batch of chunk(mapped, 500)) {
    try {
      console.log(`🔄 Inserting proplines batch of ${batch.length} props...`);
      
      const response = await supabaseFetch(env, "proplines", {
        method: "POST",
        body: batch,
        // Upsert on conflict key
        headers: { Prefer: "resolution=merge-duplicates" },
      });
      
      if (response === null || response === undefined) {
        console.log(`✅ Inserted proplines batch of ${batch.length} (empty response = success)`);
      } else {
        console.log(`✅ Inserted proplines batch of ${batch.length} with response:`, response);
      }
    } catch (e) {
      console.error("❌ Proplines insert failed:", {
        error: e instanceof Error ? e.message : String(e),
        batchSize: batch.length,
        sampleProp: batch[0] ? {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          conflict_key: batch[0].conflict_key
        } : null,
        fullError: e
      });
      throw e; // Re-throw to propagate the error
    }
  }

  // Insert into player_game_logs
  const gamelogRows = mapped.map(row => ({
    player_id: row.player_id,
    player_name: row.player_name,
    team: row.team,
    opponent: row.opponent,
    season: row.season,
    date: row.date,
    prop_type: row.prop_type,
    value: row.line, // Use line as the value for game logs
    sport: row.league?.toUpperCase() || 'NFL', // Default to NFL if league is missing
    league: row.league,
    game_id: row.game_id,
  }));

  for (const batch of chunk(gamelogRows, 500)) {
    try {
      console.log(`🔄 Inserting player_game_logs batch of ${batch.length} rows...`);
      
      const response = await supabaseFetch(env, "player_game_logs", {
        method: "POST",
        body: batch,
        headers: { Prefer: "resolution=merge-duplicates" },
      });
      
      if (response === null || response === undefined) {
        console.log(`✅ Inserted player_game_logs batch of ${batch.length} (empty response = success)`);
      } else {
        console.log(`✅ Inserted player_game_logs batch of ${batch.length} with response:`, response);
      }
    } catch (e) {
      console.error("❌ Player_game_logs insert failed:", {
        error: e instanceof Error ? e.message : String(e),
        batchSize: batch.length,
        sampleLog: batch[0] ? {
          player_id: batch[0].player_id,
          player_name: batch[0].player_name,
          prop_type: batch[0].prop_type,
          date: batch[0].date,
          league: batch[0].league,
          game_id: batch[0].game_id
        } : null,
        fullError: e
      });
      throw e; // Re-throw to propagate the error
    }
  }

  console.log(`✅ Completed insertion of ${mapped.length} props into both tables`);
}
