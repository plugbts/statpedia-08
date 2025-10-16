#!/usr/bin/env tsx

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error("❌ Missing DATABASE_URL or NEON_DATABASE_URL");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool);

  try {
    console.log("Connected to DB");

    // Count by prop_type in sportsbook props
    const propsCounts = await db.execute(
      sql`SELECT prop_type AS market, COUNT(*)::int AS count FROM props GROUP BY prop_type ORDER BY count DESC;`,
    );
    console.log("\nSportsbook props by market:");
    console.table(propsCounts.rows);

    // Count by prop_type in pickem props
    try {
      const pickemCounts = await db.execute(
        sql`SELECT prop_type AS market, COUNT(*)::int AS count FROM pickem_props GROUP BY prop_type ORDER BY count DESC;`,
      );
      console.log("\nPickem props by market:");
      console.table(pickemCounts.rows);
    } catch (e) {
      console.warn("Pickem table check skipped or failed:", (e as Error).message);
    }

    // Total rows quick check
    const totalProps = await db.execute(sql`SELECT COUNT(*)::int AS count FROM props;`);
    const totalPickem = await db
      .execute(sql`SELECT COUNT(*)::int AS count FROM pickem_props;`)
      .catch(() => ({ rows: [{ count: 0 }] }) as any);
    console.log(
      `\nTotals -> props: ${totalProps.rows[0]?.count ?? 0}, pickem_props: ${totalPickem.rows[0]?.count ?? 0}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
