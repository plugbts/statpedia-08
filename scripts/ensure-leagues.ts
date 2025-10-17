import "dotenv/config";
import postgres from "postgres";

async function main() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) {
    console.error("No DATABASE_URL/NEON_DATABASE_URL");
    process.exit(1);
  }
  const sql = postgres(conn, { prepare: false });
  try {
    const need = ["NBA", "NFL", "MLB", "WNBA", "NHL"];
    const names: Record<string, string> = {
      NBA: "National Basketball Association",
      NFL: "National Football League",
      MLB: "Major League Baseball",
      WNBA: "Women's National Basketball Association",
      NHL: "National Hockey League",
    };
    const rows = await sql<{ code: string }[]>`SELECT code FROM leagues`;
    const have = new Set(rows.map((r) => r.code));
    const ins = need.filter((c) => !have.has(c));
    if (ins.length) {
      await sql.unsafe(
        "INSERT INTO leagues (code, name) VALUES " +
          ins.map((c) => `('${c}','${names[c].replace(/'/g, "''")}')`).join(",") +
          " ON CONFLICT (code) DO NOTHING",
      );
      console.log("Inserted leagues:", ins);
    } else {
      console.log("All target leagues already present");
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((e) => {
  console.error("ensure-leagues failed:", e.message || e);
  process.exit(1);
});
