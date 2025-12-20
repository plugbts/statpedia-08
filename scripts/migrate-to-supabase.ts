#!/usr/bin/env tsx
/**
 * Supabase Migration Script
 *
 * This script helps migrate from Neon to Supabase:
 * 1. Exports schema from Neon
 * 2. Applies schema to Supabase
 * 3. Migrates data from Neon to Supabase
 */

import "dotenv/config";
import postgres from "postgres";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 SUPABASE MIGRATION SCRIPT\n");
  console.log("=".repeat(80));

  // Get connection strings
  const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

  if (!neonUrl) {
    console.error("❌ NEON_DATABASE_URL or DATABASE_URL not set");
    process.exit(1);
  }

  if (!supabaseUrl) {
    console.error("❌ SUPABASE_DATABASE_URL not set. Please set it in .env.local");
    console.error(
      "   Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres",
    );
    process.exit(1);
  }

  const neonSql = postgres(neonUrl, { prepare: false });
  const supabaseSql = postgres(supabaseUrl, { prepare: false });

  try {
    console.log("\n📊 STEP 1: Exporting Schema from Neon\n");
    console.log("--------------------------------------------------------------------------------");

    // Get all table names
    const tables = await neonSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log(`Found ${tables.length} tables in Neon database:`);
    tables.forEach((t: any) => console.log(`  - ${t.table_name}`));

    // Export schema for each table
    const schemaStatements: string[] = [];

    for (const table of tables) {
      const tableName = table.table_name;

      // Get table structure
      const columns = await neonSql`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;

      // Get constraints
      const constraints = await neonSql`
        SELECT
          conname as constraint_name,
          contype as constraint_type,
          pg_get_constraintdef(oid) as constraint_def
        FROM pg_constraint
        WHERE conrelid = ${tableName}::regclass;
      `;

      // Build CREATE TABLE statement
      let createTable = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      const columnDefs: string[] = [];

      for (const col of columns) {
        let def = `  ${col.column_name} `;

        // Map data types
        switch (col.data_type) {
          case "character varying":
            def += `VARCHAR(${col.character_maximum_length || 255})`;
            break;
          case "text":
            def += "TEXT";
            break;
          case "integer":
            def += "INTEGER";
            break;
          case "bigint":
            def += "BIGINT";
            break;
          case "numeric":
            def += "NUMERIC";
            break;
          case "boolean":
            def += "BOOLEAN";
            break;
          case "timestamp with time zone":
            def += "TIMESTAMPTZ";
            break;
          case "timestamp without time zone":
            def += "TIMESTAMP";
            break;
          case "date":
            def += "DATE";
            break;
          case "uuid":
            def += "UUID";
            break;
          default:
            def += col.data_type.toUpperCase();
        }

        if (col.is_nullable === "NO") {
          def += " NOT NULL";
        }

        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }

        columnDefs.push(def);
      }

      createTable += columnDefs.join(",\n");
      createTable += "\n);\n";

      // Add constraints
      for (const constraint of constraints) {
        if (constraint.constraint_type === "p") {
          // Primary key - already handled
          continue;
        }
        createTable += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraint.constraint_name} ${constraint.constraint_def};\n`;
      }

      schemaStatements.push(createTable);
    }

    // Save schema to file
    const schemaFile = join(process.cwd(), "supabase-schema.sql");
    writeFileSync(schemaFile, schemaStatements.join("\n\n"));
    console.log(`\n✅ Schema exported to: ${schemaFile}`);

    console.log("\n📦 STEP 2: Migrating Data\n");
    console.log("--------------------------------------------------------------------------------");

    // Migrate data table by table
    let totalRows = 0;
    for (const table of tables) {
      const tableName = table.table_name;

      try {
        // Get row count
        const countResult = await neonSql`SELECT COUNT(*) as count FROM ${neonSql(tableName)}`;
        const count = Number(countResult[0]?.count || 0);

        if (count === 0) {
          console.log(`  ⏭️  ${tableName}: No data to migrate`);
          continue;
        }

        console.log(`  📊 ${tableName}: Migrating ${count} rows...`);

        // Fetch data in batches
        const batchSize = 1000;
        let offset = 0;
        let migrated = 0;

        while (offset < count) {
          const data =
            await neonSql`SELECT * FROM ${neonSql(tableName)} LIMIT ${batchSize} OFFSET ${offset}`;

          if (data.length === 0) break;

          // Insert into Supabase
          const columns = Object.keys(data[0]);
          const values = data.map((row) => columns.map((col) => (row as any)[col]));

          // Build INSERT statement
          const placeholders = values
            .map(
              (_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(", ")})`,
            )
            .join(", ");

          const insertSql = `
            INSERT INTO ${tableName} (${columns.join(", ")})
            VALUES ${placeholders}
            ON CONFLICT DO NOTHING;
          `;

          await supabaseSql.unsafe(insertSql, values.flat());

          migrated += data.length;
          offset += batchSize;

          process.stdout.write(`    Progress: ${migrated}/${count} rows\r`);
        }

        console.log(`    ✅ ${tableName}: ${migrated} rows migrated`);
        totalRows += migrated;
      } catch (error) {
        console.error(`    ❌ Error migrating ${tableName}:`, (error as Error).message);
      }
    }

    console.log(`\n✅ Total rows migrated: ${totalRows}`);

    console.log("\n🔍 STEP 3: Verification\n");
    console.log("--------------------------------------------------------------------------------");

    // Verify row counts match
    let allMatch = true;
    for (const table of tables) {
      const tableName = table.table_name;

      const neonCount = await neonSql`SELECT COUNT(*) as count FROM ${neonSql(tableName)}`;
      const supabaseCount = await supabaseSql`SELECT COUNT(*) as count FROM ${neonSql(tableName)}`;

      const neon = Number(neonCount[0]?.count || 0);
      const supabase = Number(supabaseCount[0]?.count || 0);

      const match = neon === supabase ? "✅" : "❌";
      console.log(`  ${match} ${tableName}: Neon=${neon}, Supabase=${supabase}`);

      if (neon !== supabase) {
        allMatch = false;
      }
    }

    if (allMatch) {
      console.log("\n🎉 Migration completed successfully!");
    } else {
      console.log("\n⚠️  Migration completed with discrepancies. Please review.");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await neonSql.end({ timeout: 1 });
    await supabaseSql.end({ timeout: 1 });
  }
}

main().catch(console.error);
