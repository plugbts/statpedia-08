import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConflictKeyFormats() {
  console.log("🔍 Checking conflict_key formats in both tables...");
  
  try {
    // Check player_game_logs format
    const { data: gameLogs, error: glError } = await supabase
      .from("player_game_logs")
      .select("player_id, game_id, prop_type, league, season, conflict_key")
      .limit(5);
    
    if (glError) {
      console.error("❌ Error fetching game logs:", glError);
      return;
    }
    
    console.log("📊 Player Game Logs conflict_key format:");
    gameLogs?.forEach((log, i) => {
      console.log(`${i + 1}. ${log.conflict_key}`);
    });
    
    // Check proplines format
    const { data: props, error: prError } = await supabase
      .from("proplines")
      .select("player_id, game_id, prop_type, league, season, conflict_key")
      .limit(5);
    
    if (prError) {
      console.error("❌ Error fetching props:", prError);
      return;
    }
    
    console.log("\n📊 Proplines conflict_key format:");
    props?.forEach((prop, i) => {
      console.log(`${i + 1}. ${prop.conflict_key}`);
    });
    
    // Analyze the difference
    if (gameLogs?.length > 0 && props?.length > 0) {
      const gameLogKey = gameLogs[0].conflict_key;
      const propKey = props[0].conflict_key;
      
      console.log("\n🔍 Analysis:");
      console.log(`Game Log Key: ${gameLogKey}`);
      console.log(`Prop Key:     ${propKey}`);
      
      const gameLogParts = gameLogKey.split('|');
      const propParts = propKey.split('|');
      
      console.log(`Game Log Parts (${gameLogParts.length}):`, gameLogParts);
      console.log(`Prop Parts (${propParts.length}):`, propParts);
      
      if (gameLogParts.length !== propParts.length) {
        console.log("⚠️ Different number of parts in conflict_key!");
        console.log("Missing part in game logs:", propParts[gameLogParts.length]);
      }
    }
    
  } catch (error) {
    console.error("❌ Check failed:", error);
  }
}

checkConflictKeyFormats().catch(console.error);
