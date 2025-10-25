#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseProps() {
  console.log("🔍 Checking What's Actually in the Database\n");

  try {
    // Check current prop types in database
    const { data: propTypes, error } = await supabase
      .from("proplines")
      .select("prop_type, league, COUNT(*) as count")
      .order("count", { ascending: false })
      .limit(20);

    if (error) {
      console.error("❌ Error fetching prop types:", error);
      return;
    }

    console.log("📊 Current Prop Types in Database (Top 20):");
    propTypes.forEach((row) => {
      console.log(`  ${row.prop_type}: ${row.count} props (${row.league})`);
    });

    // Check for problematic prop types
    const { data: problematicProps, error: probError } = await supabase
      .from("proplines")
      .select("prop_type, COUNT(*) as count")
      .or(
        "prop_type.eq.Over/Under,prop_type.eq.over_under,prop_type.ilike.%receivingeptions%,prop_type.eq.unknown",
      )
      .order("count", { ascending: false });

    if (probError) {
      console.error("❌ Error fetching problematic props:", probError);
      return;
    }

    if (problematicProps && problematicProps.length > 0) {
      console.log("\n⚠️ PROBLEMATIC PROPS STILL IN DATABASE:");
      problematicProps.forEach((row) => {
        console.log(`  ${row.prop_type}: ${row.count} props`);
      });

      console.log("\n💡 SOLUTION: Run the cleanup script to remove these!");
      console.log(
        "   Copy and paste the contents of ultra-safe-cleanup.sql into your Supabase SQL Editor",
      );
    } else {
      console.log("\n✅ No problematic prop types found in database!");
    }

    // Check recent props to see if new normalized props are coming in
    const { data: recentProps, error: recentError } = await supabase
      .from("proplines")
      .select("player_name, prop_type, line, over_odds, under_odds, created_at")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentError) {
      console.error("❌ Error fetching recent props:", recentError);
      return;
    }

    if (recentProps && recentProps.length > 0) {
      console.log("\n🆕 Recent Props (Last Hour):");
      recentProps.forEach((prop, index) => {
        console.log(
          `${index + 1}. ${prop.player_name} | ${prop.prop_type} | ${prop.line} | ${prop.created_at}`,
        );
      });

      // Check if recent props have clean prop types
      const cleanRecentProps = recentProps.filter(
        (p) =>
          p.prop_type !== "Over/Under" &&
          p.prop_type !== "over_under" &&
          !p.prop_type.includes("receivingeptions") &&
          p.prop_type !== "unknown",
      );

      if (cleanRecentProps.length === recentProps.length) {
        console.log("\n✅ All recent props have clean, normalized prop types!");
      } else {
        console.log(
          `\n⚠️ ${recentProps.length - cleanRecentProps.length} recent props still have problematic types`,
        );
      }
    } else {
      console.log("\n⚠️ No recent props found in the last hour");
      console.log(
        "   This might mean the worker isn't ingesting new data, or there's a timezone issue",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkDatabaseProps();
