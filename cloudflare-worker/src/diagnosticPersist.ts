/**
 * Diagnostic persistence (NO SUPABASE)
 *
 * These helpers are now no-ops to avoid any Supabase access. They log the
 * inputs and return placeholder results so that debug endpoints remain
 * callable without performing DB writes.
 */

export async function diagnosticPersistProps(_env: any, enriched: any[]): Promise<void> {
  const count = Array.isArray(enriched) ? Math.min(enriched.length, 3) : 0;
  console.log(`� DIAGNOSTIC (NO-OP): would test-insert first ${count} rows`);
  if (count > 0) {
    console.log("� Sample row:", JSON.stringify(enriched[0], null, 2));
  }
}

export async function testManualInsert(_env: any): Promise<any> {
  console.log("🔍 DIAGNOSTIC (NO-OP): manual SQL insert disabled (NO SUPABASE)");
  return { success: false, error: "Supabase removed. Persistence disabled in worker." };
}
