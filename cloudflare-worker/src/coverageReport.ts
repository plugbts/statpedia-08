// coverageReport.ts
import { createClient } from "@supabase/supabase-js";

let supabase: any = null;

export async function initializeCoverageReport(supabaseUrl: string, supabaseKey: string) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

type CoverageMap = Record<
  string,
  { logs: Set<string>; props: Set<string> }
>;

export async function generateCoverageReport(): Promise<CoverageMap> {
  if (!supabase) {
    console.error("❌ Supabase client not initialized for coverage report");
    return {};
  }

  try {
    console.log("🔍 Generating coverage report...");

    // 1. Fetch distinct prop_types from logs
    const { data: logTypes, error: logErr } = await supabase
      .from("player_game_logs")
      .select("league, prop_type")
      .neq("prop_type", null);

    // 2. Fetch distinct prop_types from props
    const { data: propTypes, error: propErr } = await supabase
      .from("proplines")
      .select("league, prop_type")
      .neq("prop_type", null);

    if (logErr || propErr) {
      console.error("❌ Error fetching prop types:", logErr || propErr);
      return {};
    }

    const coverage: CoverageMap = {};

    // Build sets for logs
    logTypes?.forEach((row: any) => {
      const league = row.league?.toLowerCase();
      if (!league) return;
      
      if (!coverage[league]) coverage[league] = { logs: new Set(), props: new Set() };
      coverage[league].logs.add(row.prop_type.toLowerCase());
    });

    // Build sets for props
    propTypes?.forEach((row: any) => {
      const league = row.league?.toLowerCase();
      if (!league) return;
      
      if (!coverage[league]) coverage[league] = { logs: new Set(), props: new Set() };
      coverage[league].props.add(row.prop_type.toLowerCase());
    });

    // Print detailed report
    console.log("\n📊 COVERAGE REPORT");
    console.log("==================");
    
    Object.entries(coverage).forEach(([league, { logs, props }]) => {
      const onlyInLogs = [...logs].filter((t) => !props.has(t));
      const onlyInProps = [...props].filter((t) => !logs.has(t));
      const overlap = [...logs].filter((t) => props.has(t));

      console.log(`\n🏈 ${league.toUpperCase()} Coverage:`);
      console.log(`   📊 Logs: ${logs.size} prop types`);
      console.log(`   📊 Props: ${props.size} prop types`);
      console.log(`   ✅ Overlap: ${overlap.length} prop types`);
      console.log(`   ❌ Logs only: ${onlyInLogs.length} prop types`);
      console.log(`   ❌ Props only: ${onlyInProps.length} prop types`);
      
      if (overlap.length > 0) {
        console.log(`   ✅ Overlapping: ${overlap.join(", ")}`);
      }
      
      if (onlyInLogs.length > 0) {
        console.log(`   ⚠️  Logs only: ${onlyInLogs.join(", ")}`);
      }
      
      if (onlyInProps.length > 0) {
        console.log(`   ⚠️  Props only: ${onlyInProps.slice(0, 10).join(", ")}${onlyInProps.length > 10 ? `... (+${onlyInProps.length - 10} more)` : ""}`);
      }
    });

    return coverage;
  } catch (error) {
    console.error("❌ Error generating coverage report:", error);
    return {};
  }
}

export function getCoverageSummary(coverage: CoverageMap): Record<string, any> {
  const summary: Record<string, any> = {};
  
  Object.entries(coverage).forEach(([league, { logs, props }]) => {
    const onlyInLogs = [...logs].filter((t) => !props.has(t));
    const onlyInProps = [...props].filter((t) => !logs.has(t));
    const overlap = [...logs].filter((t) => props.has(t));
    
    summary[league] = {
      logsCount: logs.size,
      propsCount: props.size,
      overlapCount: overlap.length,
      onlyInLogsCount: onlyInLogs.length,
      onlyInPropsCount: onlyInProps.length,
      overlapPercentage: logs.size > 0 ? Math.round((overlap.length / logs.size) * 100) : 0,
      onlyInLogs: onlyInLogs,
      onlyInProps: onlyInProps.slice(0, 5), // Limit for JSON response
      overlap: overlap
    };
  });
  
  return summary;
}
