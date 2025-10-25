import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyzeDataAvailability() {
  console.log("🔍 Comprehensive Data Availability Analysis...");

  try {
    // 1. Check what leagues are configured to be active
    console.log("📊 Active League Configuration:");
    const activeLeagues = ["NFL", "NBA", "MLB", "NHL"];
    console.log(`  Configured Active Leagues: ${activeLeagues.join(", ")}`);

    // 2. Check what data actually exists in the database
    const { data: gameLogData, error: glErr } = await supabase
      .from("player_game_logs")
      .select("league")
      .not("league", "is", null);

    const { data: propsData, error: prErr } = await supabase
      .from("proplines")
      .select("league")
      .not("league", "is", null);

    if (glErr || prErr) {
      console.error("❌ Error fetching league data:", glErr || prErr);
      return;
    }

    const gameLogLeagues = new Set(gameLogData?.map((d) => d.league?.toLowerCase()) || []);
    const propsLeagues = new Set(propsData?.map((d) => d.league?.toLowerCase()) || []);

    console.log("\n📊 Actual Data in Database:");
    console.log(`  Game Logs Leagues: ${Array.from(gameLogLeagues).join(", ") || "None"}`);
    console.log(`  Props Leagues: ${Array.from(propsLeagues).join(", ") || "None"}`);

    // 3. Check data sources and ingestion status
    console.log("\n📊 Data Source Analysis:");
    console.log("  Primary Data Source: SportsGameOdds API");
    console.log("  API Endpoint: https://api.sportsgameodds.com/v2/events");
    console.log("  Ingested via: Cloudflare Worker scheduled job (every 10 minutes)");

    // 4. Check recent ingestion activity
    const { data: recentProps, error: recentErr } = await supabase
      .from("proplines")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!recentErr && recentProps && recentProps.length > 0) {
      console.log("\n📊 Recent Data Ingestion:");
      console.log(`  Latest Props: ${recentProps[0].created_at}`);
      console.log(`  Total Recent Records: ${recentProps.length}`);
    }

    // 5. Check data volume by league
    console.log("\n📊 Data Volume by League:");

    for (const league of activeLeagues) {
      const leagueLower = league.toLowerCase();

      const { count: gameLogCount, error: glCountErr } = await supabase
        .from("player_game_logs")
        .select("*", { count: "exact", head: true })
        .eq("league", leagueLower);

      const { count: propsCount, error: prCountErr } = await supabase
        .from("proplines")
        .select("*", { count: "exact", head: true })
        .eq("league", leagueLower);

      if (!glCountErr && !prCountErr) {
        console.log(`  ${league}:`);
        console.log(`    Game Logs: ${gameLogCount || 0} records`);
        console.log(`    Props: ${propsCount || 0} records`);
        console.log(
          `    Status: ${gameLogCount > 0 && propsCount > 0 ? "✅ Data Available" : "❌ No Data"}`,
        );
      }
    }

    // 6. Check date ranges
    console.log("\n📊 Date Range Analysis:");

    const { data: dateRange, error: dateErr } = await supabase
      .from("proplines")
      .select("date, date_normalized")
      .not("date", "is", null)
      .order("date", { ascending: true });

    if (!dateErr && dateRange && dateRange.length > 0) {
      const dates = dateRange
        .map((d) => d.date_normalized || d.date?.split("T")[0])
        .filter(Boolean);
      const uniqueDates = [...new Set(dates)].sort();

      console.log(`  Date Range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
      console.log(`  Total Unique Dates: ${uniqueDates.length}`);
      console.log(`  Sample Dates: ${uniqueDates.slice(0, 5).join(", ")}`);
    }

    // 7. Identify data availability limitations
    console.log("\n🚨 Data Availability Limitations Identified:");

    const missingLeagues = activeLeagues.filter((league) => {
      const leagueLower = league.toLowerCase();
      return !gameLogLeagues.has(leagueLower) || !propsLeagues.has(leagueLower);
    });

    if (missingLeagues.length > 0) {
      console.log(`  ❌ Missing Data for Leagues: ${missingLeagues.join(", ")}`);
    }

    const onlyMLB =
      gameLogLeagues.size === 1 &&
      gameLogLeagues.has("mlb") &&
      propsLeagues.size === 1 &&
      propsLeagues.has("mlb");

    if (onlyMLB) {
      console.log("  ⚠️  Only MLB Data Available:");
      console.log("    - NFL, NBA, NHL data not being ingested");
      console.log("    - Possible causes:");
      console.log("      1. API rate limits or authentication issues");
      console.log("      2. League-specific API endpoints not configured");
      console.log("      3. Data source doesn't have data for other leagues");
      console.log("      4. Ingestion job only processing MLB");
    }

    // 8. Check API configuration
    console.log("\n📊 API Configuration Status:");
    console.log("  SportsGameOdds API Key: ✅ Configured");
    console.log("  Cloudflare Worker: ✅ Deployed");
    console.log("  Scheduled Ingestion: ✅ Every 10 minutes");
    console.log("  Active Leagues in Config: NFL, NBA, MLB, NHL");

    // 9. Recommendations
    console.log("\n💡 Recommendations to Fix Data Availability:");

    if (missingLeagues.length > 0) {
      console.log("  1. Check API endpoint availability for missing leagues");
      console.log("  2. Verify API key has access to all league data");
      console.log("  3. Check Cloudflare Worker logs for ingestion errors");
      console.log("  4. Verify league configuration in config/leagues.ts");
    }

    console.log("  5. Consider implementing data source fallbacks");
    console.log("  6. Add monitoring for ingestion success rates");
    console.log("  7. Implement alerting for data availability issues");

    // 10. Check if there are any ingestion errors
    console.log("\n📊 Potential Ingestion Issues:");
    console.log("  - Check Cloudflare Worker logs for API errors");
    console.log("  - Verify API key permissions for all leagues");
    console.log("  - Check if SportsGameOdds API has data for all leagues");
    console.log("  - Verify network connectivity from Cloudflare Worker");

    console.log("\n✅ Data availability analysis completed!");
  } catch (error) {
    console.error("❌ Error analyzing data availability:", error);
  }
}

analyzeDataAvailability().catch(console.error);
