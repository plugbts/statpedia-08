import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixConflictKeys() {
  console.log("🔧 Starting conflict_key repair migration...");
  
  try {
    // First, check current conflict_key format
    const { data: sampleLogs, error: sampleError } = await supabase
      .from("player_game_logs")
      .select("player_id, game_id, prop_type, league, season, conflict_key")
      .limit(5);
    
    if (sampleError) {
      console.error("❌ Error fetching sample logs:", sampleError);
      return;
    }
    
    console.log("📊 Current conflict_key format:");
    sampleLogs?.forEach((log, i) => {
      console.log(`${i + 1}. ${log.conflict_key}`);
    });
    
    // Get all player_game_logs to update conflict_key
    const { data: allLogs, error: fetchError } = await supabase
      .from("player_game_logs")
      .select("id, player_id, game_id, prop_type, league, season, conflict_key");
    
    if (fetchError) {
      console.error("❌ Error fetching logs:", fetchError);
      return;
    }
    
    console.log(`📊 Found ${allLogs?.length || 0} logs to update`);
    
    // Update each log with correct conflict_key format
    let updatedCount = 0;
    for (const log of allLogs || []) {
      const newConflictKey = `${log.player_id}|${log.game_id}|${log.prop_type}|${log.league}|${log.season}`;
      
      if (log.conflict_key !== newConflictKey) {
        const { error: updateError } = await supabase
          .from("player_game_logs")
          .update({ conflict_key: newConflictKey })
          .eq('id', log.id);
        
        if (updateError) {
          console.error(`❌ Error updating log ${log.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Updated ${updatedCount} conflict_keys`);
    
    console.log("✅ Conflict key update completed");
    
    // Verify the update
    const { data: updatedLogs, error: verifyError } = await supabase
      .from("player_game_logs")
      .select("player_id, game_id, prop_type, league, season, conflict_key")
      .limit(5);
    
    if (verifyError) {
      console.error("❌ Error verifying update:", verifyError);
      return;
    }
    
    console.log("📊 Updated conflict_key format:");
    updatedLogs?.forEach((log, i) => {
      console.log(`${i + 1}. ${log.conflict_key}`);
    });
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

fixConflictKeys().catch(console.error);
