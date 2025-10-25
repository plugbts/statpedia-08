// coverageReport.ts (NO SUPABASE)
// Placeholder implementation; returns empty report structures.

export async function initializeCoverageReport(_supabaseUrl: string, _supabaseKey: string) {
  console.log("⚠️ initializeCoverageReport called, but Supabase is removed.");
}

type CoverageMap = Record<string, { logs: Set<string>; props: Set<string> }>;

export async function generateCoverageReport(): Promise<CoverageMap> {
  console.log("ℹ️ generateCoverageReport: Supabase removed. Returning empty coverage map.");
  return {};
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
      overlap: overlap,
    };
  });

  return summary;
}
