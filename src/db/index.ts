import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Support both Neon and Supabase connections
// Priority: SUPABASE_DATABASE_URL > NEON_DATABASE_URL > DATABASE_URL
const connectionString =
  process.env.SUPABASE_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Database connection string not found. Please set SUPABASE_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL",
  );
}

// Create the database connection
// Use postgres-js for both Neon and Supabase (they're both PostgreSQL)
const sql = postgres(connectionString, {
  prepare: false,
  max: 10, // Connection pool size
});

export const db = drizzle(sql, { schema });

// Export schema for use in other files
export * from "./schema";
export type Database = typeof db;
