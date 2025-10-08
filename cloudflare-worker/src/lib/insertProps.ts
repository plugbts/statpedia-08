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
      await supabaseFetch(env, "proplines", {
        method: "POST",
        body: batch,
        // Upsert on conflict key
        headers: { Prefer: "resolution=merge-duplicates" },
      });
      console.log(`✅ Inserted proplines batch of ${batch.length}`);
    } catch (e) {
      console.error("❌ Proplines insert failed:", e);
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
      await supabaseFetch(env, "player_game_logs", {
        method: "POST",
        body: batch,
        headers: { Prefer: "resolution=merge-duplicates" },
      });
      console.log(`✅ Inserted gamelog batch of ${batch.length}`);
    } catch (e) {
      console.error("❌ Gamelogs insert failed:", e);
    }
  }

  console.log(`✅ Completed insertion of ${mapped.length} props into both tables`);
}
