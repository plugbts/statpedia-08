// Supabase removed - keeping a flexible stub to avoid type errors while ensuring any call fails at runtime
export async function supabaseFetch(..._args: any[]): Promise<any> {
  throw new Error("supabaseFetch is removed. Use Neon/Hasura/SGO paths instead.");
}
