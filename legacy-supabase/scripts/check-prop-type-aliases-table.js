#!/usr/bin/env node

/**
 * Check the actual structure of the prop_type_aliases table
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPropTypeAliasesTable() {
  console.log("🔍 Checking prop_type_aliases table structure...\n");

  try {
    // Try to get a few rows to see the structure
    const { data: aliases, error } = await supabase.from("prop_type_aliases").select("*").limit(5);

    if (error) {
      console.error("❌ Error querying prop_type_aliases:", error.message);

      // If the table doesn't exist, let's check what tables do exist
      console.log("\n🔍 Checking if table exists...");
      const { data: tables, error: tablesError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .ilike("table_name", "%prop%");

      if (tablesError) {
        console.error("❌ Error querying tables:", tablesError.message);
      } else if (tables && tables.length > 0) {
        console.log('📊 Tables with "prop" in name:');
        tables.forEach((table) => {
          console.log(`   ${table.table_name}`);
        });
      }

      return;
    }

    if (aliases && aliases.length > 0) {
      console.log("📊 Sample rows from prop_type_aliases:");
      aliases.forEach((alias, index) => {
        console.log(`${index + 1}. Row structure:`);
        Object.keys(alias).forEach((key) => {
          console.log(`   ${key}: ${alias[key]}`);
        });
        console.log("");
      });

      console.log("📋 Available columns:");
      Object.keys(aliases[0]).forEach((column) => {
        console.log(`   - ${column}`);
      });
    } else {
      console.log("❌ No data found in prop_type_aliases table");
    }

    // Also check the total count
    const { count, error: countError } = await supabase
      .from("prop_type_aliases")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Error counting rows:", countError.message);
    } else {
      console.log(`\n📊 Total rows in prop_type_aliases: ${count}`);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

checkPropTypeAliasesTable().catch(console.error);
