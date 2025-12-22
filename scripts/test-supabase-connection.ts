import "dotenv/config";
import postgres from "postgres";

async function testConnection(conn: string, label: string) {
  console.log(`\n🔍 Testing ${label}...`);
  try {
    const sql = postgres(conn, { prepare: false, max: 1, timeout: 5 });
    const result = await sql`SELECT version() as v, current_database() as db`;
    console.log(`✅ ${label} SUCCESS`);
    console.log(`   Database: ${result[0].db}`);
    await sql.end({ timeout: 2 });
    return true;
  } catch (e: any) {
    console.log(`❌ ${label} FAILED: ${e.message?.split("\n")[0] || e.code || e}`);
    return false;
  }
}

async function main() {
  const password = "Tkinggaming!";
  const projectRef = "jvnmbybielczkleckogr";

  const connections = [
    {
      conn: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
      label: "Direct (port 5432)",
    },
    {
      conn: `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      label: "Pooler (port 6543)",
    },
    {
      conn: `postgresql://postgres:${password}@${projectRef}.pooler.supabase.com:5432/postgres`,
      label: "Pooler alt (port 5432)",
    },
  ];

  console.log("Testing Supabase connection strings...\n");

  for (const { conn, label } of connections) {
    const success = await testConnection(conn, label);
    if (success) {
      console.log(`\n✅ Use this connection string: ${conn.replace(password, "****")}`);
      process.exit(0);
    }
  }

  console.log("\n❌ All connection attempts failed.");
  console.log("\nPossible issues:");
  console.log("  1. Supabase project may be paused (check https://supabase.com/dashboard)");
  console.log("  2. Project may have been deleted");
  console.log("  3. Network/DNS issue");
  console.log("  4. Password may be incorrect");
  process.exit(1);
}

main();
