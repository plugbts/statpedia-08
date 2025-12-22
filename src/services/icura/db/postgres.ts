import postgres from "postgres";

export function getIcuraDbConnString(): string {
  const c =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!c)
    throw new Error("No DB URL configured (NEON_DATABASE_URL/DATABASE_URL/SUPABASE_DATABASE_URL)");
  return c;
}

export function getIcuraSql() {
  return postgres(getIcuraDbConnString(), { prepare: false });
}
