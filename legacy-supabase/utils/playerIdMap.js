import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY,
);

/**
 * Normalize a raw player_id from a given source into a canonical ID.
 * Falls back to player_name+team if no mapping exists.
 */
export async function mapPlayerId(source, rawId, playerName, team) {
  if (!rawId) return null;

  // 1. Look up mapping
  const { data, error } = await supabase
    .from("player_id_map")
    .select("canonical_player_id")
    .eq("source", source)
    .eq("source_player_id", rawId)
    .maybeSingle();

  if (error) {
    console.error("❌ player_id_map lookup error:", error);
    return null;
  }

  if (data) {
    return data.canonical_player_id;
  }

  // 2. If no mapping, create one using rawId as canonical (or name+team heuristic)
  const canonical = `${playerName?.trim() ?? rawId}-${team ?? "UNK"}`.replace(/\s+/g, "_");

  const { error: insertError } = await supabase.from("player_id_map").insert({
    source,
    source_player_id: rawId,
    canonical_player_id: canonical,
    player_name: playerName,
    team,
  });

  if (insertError) {
    console.error("❌ player_id_map insert error:", insertError);
  } else {
    console.log(`🆕 Added mapping for ${playerName} (${rawId}) → ${canonical}`);
  }

  return canonical;
}
