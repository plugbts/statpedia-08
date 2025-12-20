import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

// Support both Neon and Supabase connections
// Priority: SUPABASE_DATABASE_URL > NEON_DATABASE_URL > DATABASE_URL
const connectionString =
  process.env.SUPABASE_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Database connection string not found. Please set SUPABASE_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL",
  );
}

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
