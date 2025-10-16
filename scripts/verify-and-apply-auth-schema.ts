#!/usr/bin/env tsx

/**
 * Verify and apply the custom auth schema to the Neon/Postgres database
 * Uses postgres-js directly; idempotent operations
 */

import { config } from "dotenv";
config();
config({ path: ".env.local" });

import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL/NEON_DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { prepare: false });
  try {
    console.log("🔍 Verifying auth tables...");
    const tables = await sql /* sql */ `
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('auth_user','auth_credential','auth_identity','auth_session','auth_audit','auth_verification_token')
      ORDER BY table_name;
    `;

    const existing = new Set(tables.map((r: any) => r.table_name));
    const missing = [
      "auth_user",
      "auth_credential",
      "auth_identity",
      "auth_session",
      "auth_audit",
      "auth_verification_token",
    ].filter((t) => !existing.has(t));

    if (missing.length === 0) {
      console.log("✅ All auth tables exist");
    } else {
      console.log("⚠️ Missing tables:", missing.join(", "));
      const schemaPath = path.resolve("scripts/create-auth-schema.sql");
      const ddl = fs.readFileSync(schemaPath, "utf8");
      console.log("🛠️ Applying schema from", schemaPath);
      await sql.unsafe(ddl);
    }

    // Ensure username column exists to match Drizzle schema
    const usernameCol = await sql /* sql */ `
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='auth_user' AND column_name='username'
    `;
    if (usernameCol.length === 0) {
      console.log("🛠️ Adding username column to auth_user");
      await sql /* sql */ `ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;`;
    }

    // Ensure subscription_tier column exists with default 'free'
    const subCol = await sql /* sql */ `
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='auth_user' AND column_name='subscription_tier'
    `;
    if (subCol.length === 0) {
      console.log("🛠️ Adding subscription_tier column to auth_user");
      await sql /* sql */ `ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free';`;
      // Backfill existing rows to 'free'
      await sql /* sql */ `UPDATE auth_user SET subscription_tier = 'free' WHERE subscription_tier IS NULL;`;
    }

    console.log("🔎 Quick column check for auth_user");
    const cols = await sql /* sql */ `
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='auth_user' ORDER BY ordinal_position;
    `;
    console.table(cols);

    console.log("✅ Auth schema verified/applied successfully");
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((err) => {
  console.error("❌ Failed to verify/apply auth schema:", err);
  process.exit(1);
});
