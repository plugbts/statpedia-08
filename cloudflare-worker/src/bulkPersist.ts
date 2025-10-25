/**
 * Bulk Persistence Functions (NO SUPABASE)
 *
 * Supabase has been removed from the Worker. These functions are retained as
 * no-ops to keep call sites stable while persistence is handled elsewhere
 * (e.g., Neon/Hasura pipeline or backend services).
 */

export interface BulkUpsertResult {
  inserted_count: number;
  updated_count: number;
  error_count: number;
  errors: any[];
}

export async function bulkUpsertProps(_env: any, props: any[]): Promise<BulkUpsertResult> {
  const count = Array.isArray(props) ? props.length : 0;
  console.log(`🔄 [bulkUpsertProps] NO-OP (Supabase removed). Received ${count} rows.`);
  return { inserted_count: 0, updated_count: 0, error_count: 0, errors: [] };
}

export async function bulkUpsertPlayerGameLogs(_env: any, logs: any[]): Promise<BulkUpsertResult> {
  const count = Array.isArray(logs) ? logs.length : 0;
  console.log(`🔄 [bulkUpsertPlayerGameLogs] NO-OP (Supabase removed). Received ${count} rows.`);
  return { inserted_count: 0, updated_count: 0, error_count: 0, errors: [] };
}
