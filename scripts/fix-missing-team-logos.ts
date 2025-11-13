import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) throw new Error("DATABASE_URL missing");
const db = postgres(conn);

async function fixMissingLogos() {
  console.log("🔧 Fixing missing team logo URLs...\n");

  // Check teams without logos
  const missingLogos = await db`
    SELECT t.id, t.name, t.abbreviation, l.code as league_code
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    WHERE t.logo_url IS NULL
    ORDER BY l.code, t.name
  `;

  console.log(`Found ${missingLogos.length} teams without logo_url:\n`);
  console.table(missingLogos);

  if (missingLogos.length === 0) {
    console.log("\n✅ All teams already have logo URLs!");
    process.exit(0);
  }

  console.log("\n📝 Generating ESPN CDN URLs...\n");

  // Update teams with generated logo URLs
  const result = await db`
    UPDATE teams 
    SET logo_url = 'https://a.espncdn.com/i/teamlogos/' || 
      LOWER((SELECT code FROM leagues WHERE id = teams.league_id)) || 
      '/500/' || LOWER(abbreviation) || '.png'
    WHERE logo_url IS NULL
  `;

  console.log(`✅ Updated ${result.count} teams with logo URLs`);

  // Verify the update
  const updated = await db`
    SELECT t.id, t.name, t.abbreviation, t.logo_url, l.code as league_code
    FROM teams t
    JOIN leagues l ON l.id = t.league_id
    WHERE t.id = ANY(${missingLogos.map((t) => t.id)})
    ORDER BY l.code, t.name
  `;

  console.log("\n📋 Updated teams:");
  console.table(updated);

  process.exit(0);
}

fixMissingLogos().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
