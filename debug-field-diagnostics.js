import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runDiagnostics() {
  console.log("🔍 Starting Field-Level Diagnostics...");
  
  // 1. Fetch sample data
  const { data: gameLogs, error: glErr } = await supabase
    .from("player_game_logs")
    .select("player_id, game_id, prop_type, league, season, date, conflict_key")
    .limit(200);

  const { data: props, error: prErr } = await supabase
    .from("proplines")
    .select("player_id, game_id, prop_type, league, season, date, date_normalized, conflict_key")
    .limit(200);

  if (glErr || prErr) {
    console.error("❌ Supabase error:", glErr || prErr);
    return;
  }

  console.log(`📊 Fetched ${gameLogs?.length || 0} game logs and ${props?.length || 0} props`);

  let matched = 0;
  let mismatched = 0;
  const mismatchDetails = [];

  // 2. Compare logs to props
  gameLogs?.forEach((g) => {
    const candidates = props?.filter((p) => p.player_id === g.player_id && p.game_id === g.game_id);

    if (candidates.length === 0) {
      console.log(`❌ No props at all for player ${g.player_id}, game ${g.game_id}`);
      mismatched++;
      return;
    }

    const match = candidates.find(
      (p) =>
        p.conflict_key === g.conflict_key &&
        p.date_normalized === g.date &&
        p.prop_type === g.prop_type &&
        p.league.toLowerCase() === g.league.toLowerCase()
    );

    if (match) {
      matched++;
    } else {
      mismatched++;
      const issues = [];
      if (g.conflict_key !== candidates[0].conflict_key) issues.push(`conflict_key: "${g.conflict_key}" vs "${candidates[0].conflict_key}"`);
      if (g.date !== candidates[0].date_normalized) issues.push(`date: "${g.date}" vs "${candidates[0].date_normalized}"`);
      if (g.prop_type !== candidates[0].prop_type) issues.push(`prop_type: "${g.prop_type}" vs "${candidates[0].prop_type}"`);
      if (g.league.toLowerCase() !== candidates[0].league.toLowerCase()) issues.push(`league: "${g.league}" vs "${candidates[0].league}"`);
      
      const mismatchInfo = `⚠️ Mismatch for player ${g.player_id}, game ${g.game_id}: ${issues.join(", ")}`;
      console.log(mismatchInfo);
      mismatchDetails.push({ player_id: g.player_id, game_id: g.game_id, issues });
    }
  });

  // 3. Summary
  console.log("\n📊 Diagnostic Summary:");
  console.log(`✅ Matched: ${matched}`);
  console.log(`❌ Mismatched: ${mismatched}`);
  console.log(`📈 Success Rate: ${((matched / (matched + mismatched)) * 100).toFixed(1)}%`);
  
  // 4. Show sample mismatches
  if (mismatchDetails.length > 0) {
    console.log("\n🔍 Sample Mismatch Details:");
    mismatchDetails.slice(0, 5).forEach((mismatch, i) => {
      console.log(`${i + 1}. Player ${mismatch.player_id}, Game ${mismatch.game_id}:`);
      mismatch.issues.forEach(issue => console.log(`   - ${issue}`));
    });
  }

  return {
    matched,
    mismatched,
    successRate: (matched / (matched + mismatched)) * 100,
    mismatchDetails
  };
}

runDiagnostics().catch(console.error);
