#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentPropTypes() {
  console.log("🔍 Checking Current Prop Types in Database...\n");

  try {
    // Check recent NFL props
    const { data: recentProps, error } = await supabase
      .from("proplines")
      .select("player_name, prop_type, created_at")
      .eq("league", "nfl")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("❌ Error fetching recent props:", error);
      return;
    }

    console.log("📊 Recent NFL Props (Last 20):");
    console.log("=====================================");

    recentProps?.forEach((prop, index) => {
      const isOverUnder = prop.prop_type === "Over/Under";
      const status = isOverUnder ? "❌ Over/Under" : "✅ Proper";
      console.log(`${index + 1}. ${prop.player_name} - ${prop.prop_type} ${status}`);
    });

    // Check prop type distribution
    console.log("\n📈 Prop Type Distribution:");
    console.log("=====================================");

    const { data: propTypes } = await supabase
      .from("proplines")
      .select("prop_type")
      .eq("league", "nfl")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (propTypes) {
      const typeCounts = {};
      propTypes.forEach((prop) => {
        typeCounts[prop.prop_type] = (typeCounts[prop.prop_type] || 0) + 1;
      });

      Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          const isOverUnder = type === "Over/Under";
          const status = isOverUnder ? "❌" : "✅";
          console.log(`${status} ${type}: ${count} props`);
        });
    }

    // Check for Over/Under specifically
    const { data: overUnderCount } = await supabase
      .from("proplines")
      .select("prop_type", { count: "exact" })
      .eq("league", "nfl")
      .eq("prop_type", "Over/Under");

    console.log(`\n🚨 Total Over/Under entries: ${overUnderCount?.length || 0}`);

    if (overUnderCount && overUnderCount.length > 0) {
      console.log('\n💡 Run the SQL script "fix-duplicate-conflicts.sql" to clean these up!');
    }
  } catch (error) {
    console.error("❌ Error in analysis:", error);
  }
}

checkCurrentPropTypes();
