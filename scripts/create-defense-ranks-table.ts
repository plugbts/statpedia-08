#!/usr/bin/env tsx

/**
 * Create defense_ranks table if it doesn't exist (matching Drizzle schema).
 */

import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });

async function getSupabaseConnection(): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!supabaseUrl) {
    throw new Error("SUPABASE_DATABASE_URL is required for matchup database");
  }

  const postgres = (await import("postgres")).default;
  const probe = postgres(supabaseUrl, { prepare: false, max: 1 });
  try {
    await probe`select 1 as ok`;
    await probe.end({ timeout: 1 });
    console.log("[create-defense-ranks] ✅ Supabase connection verified");
    return supabaseUrl;
  } catch (e: any) {
    await probe.end({ timeout: 1 }).catch(() => {});
    throw new Error(`Failed to connect to Supabase: ${e?.message || e}`);
  }
}

async function main() {
  const connectionString = await getSupabaseConnection();
  const postgres = (await import("postgres")).default;
  const client = postgres(connectionString, { prepare: false });

  console.log("[create-defense-ranks] creating table if not exists...");

  try {
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS public.defense_ranks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
        league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
        prop_type TEXT NOT NULL,
        rank INT NOT NULL,
        rank_percentile NUMERIC NOT NULL,
        season TEXT NOT NULL,
        games_tracked INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_defense_rank UNIQUE(team_id, prop_type, season)
      );
    `);

    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_defense_ranks_team ON public.defense_ranks(team_id);
      CREATE INDEX IF NOT EXISTS idx_defense_ranks_prop_type ON public.defense_ranks(prop_type);
      CREATE INDEX IF NOT EXISTS idx_defense_ranks_league ON public.defense_ranks(league_id);
      CREATE INDEX IF NOT EXISTS idx_defense_ranks_performance ON public.defense_ranks(team_id, prop_type, season);
    `);

    console.log("[create-defense-ranks] ✅ table and indexes created");
  } catch (e: any) {
    console.error("[create-defense-ranks] ❌ failed:", e?.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[create-defense-ranks] fatal:", e);
  process.exit(1);
});
