import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("Set DATABASE_URL or NEON_DATABASE_URL");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });
  try {
    const rows = await sql<
      {
        league: string;
        season: string | null;
        game_external_id: string;
        bucket: string | null;
        object_key: string | null;
        fetched_at: string;
      }[]
    >`
      SELECT league, season, game_external_id, bucket, object_key, fetched_at
      FROM public.player_game_logs_raw
      WHERE object_key IS NOT NULL
      ORDER BY fetched_at DESC
      LIMIT 50
    `;

    const baseFromEnv = process.env.R2_PUBLIC_BASE_URL || "";
    const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";

    if (!rows.length) {
      console.log("No R2-backed raw logs found yet. Ingest some games first.");
      return;
    }

    console.log("\nRecent raw objects:");
    for (const r of rows) {
      let url = "";
      if (baseFromEnv) {
        // Preferred: custom/public domain bound to your R2 bucket, e.g. https://raw.yourdomain.com
        url = `${baseFromEnv.replace(/\/$/, "")}/${r.object_key}`;
      } else if (accountId && r.bucket) {
        // Fallback: direct R2 endpoint (requires public access config)
        url = `https://${accountId}.r2.cloudflarestorage.com/${r.bucket}/${r.object_key}`;
      } else {
        url = `(set R2_PUBLIC_BASE_URL to enable clickable links)`;
      }
      console.log(`- [${r.league}] ${r.season ?? ""} game=${r.game_external_id} -> ${url}`);
    }
    if (!baseFromEnv) {
      console.log(
        "\nTip: set R2_PUBLIC_BASE_URL to your R2 public domain (e.g. https://raw.example.com) to generate clean links.",
      );
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
