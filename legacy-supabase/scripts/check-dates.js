import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDates() {
  console.log("🔍 Checking dates in the data...");

  try {
    // Check dates in player_game_logs
    const { data: logDates, error: logErr } = await supabase
      .from("player_game_logs")
      .select("date, league")
      .limit(10);

    if (logErr) {
      console.error("❌ Error getting log dates:", logErr);
      return;
    }

    console.log("📊 Sample dates from player_game_logs:");
    logDates?.forEach((row, i) => {
      console.log(`${i + 1}. ${row.league}: ${row.date}`);
    });

    // Check dates in proplines
    const { data: propDates, error: propErr } = await supabase
      .from("proplines")
      .select("date, date_normalized, league")
      .limit(10);

    if (propErr) {
      console.error("❌ Error getting prop dates:", propErr);
      return;
    }

    console.log("\n📊 Sample dates from proplines:");
    propDates?.forEach((row, i) => {
      console.log(`${i + 1}. ${row.league}: ${row.date} (normalized: ${row.date_normalized})`);
    });

    // Check unique dates
    const { data: uniqueLogDates, error: uniqueLogErr } = await supabase
      .from("player_game_logs")
      .select("date")
      .not("date", "is", null);

    const { data: uniquePropDates, error: uniquePropErr } = await supabase
      .from("proplines")
      .select("date, date_normalized")
      .not("date", "is", null);

    if (uniqueLogErr || uniquePropErr) {
      console.error("❌ Error getting unique dates:", uniqueLogErr || uniquePropErr);
      return;
    }

    const logDateSet = new Set(uniqueLogDates?.map((row) => row.date) || []);
    const propDateSet = new Set(uniquePropDates?.map((row) => row.date) || []);
    const propNormalizedDateSet = new Set(
      uniquePropDates?.map((row) => row.date_normalized).filter((d) => d) || [],
    );

    console.log("\n📊 Unique dates summary:");
    console.log(`Game logs: ${logDateSet.size} unique dates`);
    console.log(`Props (date): ${propDateSet.size} unique dates`);
    console.log(`Props (date_normalized): ${propNormalizedDateSet.size} unique dates`);

    console.log("\n📊 Sample unique dates:");
    console.log("Game logs:", Array.from(logDateSet).slice(0, 5));
    console.log("Props (date):", Array.from(propDateSet).slice(0, 5));
    console.log("Props (date_normalized):", Array.from(propNormalizedDateSet).slice(0, 5));
  } catch (error) {
    console.error("❌ Check dates failed:", error);
  }
}

checkDates().catch(console.error);
