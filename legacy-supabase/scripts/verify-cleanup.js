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

async function verifyCleanup() {
  console.log("🔍 Verifying Cleanup Results\n");

  try {
    // Check for any remaining problematic props
    const { data: problematicProps, error: probError } = await supabase
      .from("proplines")
      .select("prop_type, COUNT(*) as count")
      .or(
        "prop_type.eq.Over/Under,prop_type.eq.over_under,prop_type.ilike.%receivingeptions%,prop_type.eq.unknown",
      )
      .order("count", { ascending: false });

    if (probError) {
      console.error("❌ Error checking problematic props:", probError);
      return;
    }

    if (problematicProps && problematicProps.length > 0) {
      console.log("⚠️ PROBLEMATIC PROPS STILL EXIST:");
      problematicProps.forEach((row) => {
        console.log(`  ${row.prop_type}: ${row.count} props`);
      });
    } else {
      console.log("✅ SUCCESS! No problematic props found!");
    }

    // Show current clean prop types
    const { data: cleanProps, error: cleanError } = await supabase
      .from("proplines")
      .select("prop_type, COUNT(*) as count")
      .order("count", { ascending: false })
      .limit(15);

    if (cleanError) {
      console.error("❌ Error fetching clean props:", cleanError);
      return;
    }

    console.log("\n📊 Current Prop Types in Database (Top 15):");
    cleanProps.forEach((row, index) => {
      console.log(`${index + 1}. ${row.prop_type}: ${row.count} props`);
    });

    // Check recent props
    const { data: recentProps, error: recentError } = await supabase
      .from("proplines")
      .select("player_name, prop_type, line, over_odds, under_odds, created_at")
      .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentError) {
      console.error("❌ Error fetching recent props:", recentError);
      return;
    }

    if (recentProps && recentProps.length > 0) {
      console.log("\n🆕 Recent Props (Last 2 Hours):");
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

      console.log(
        `\n📈 Clean Recent Props: ${cleanRecentProps.length}/${recentProps.length} (${((cleanRecentProps.length / recentProps.length) * 100).toFixed(1)}%)`,
      );
    } else {
      console.log("\n⚠️ No recent props found in the last 2 hours");
    }

    // Total summary
    const { data: totalProps, error: totalError } = await supabase
      .from("proplines")
      .select("COUNT(*) as total");

    if (totalError) {
      console.error("❌ Error fetching total props:", totalError);
      return;
    }

    console.log(`\n📊 Total Props in Database: ${totalProps[0]?.total || 0}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

verifyCleanup();
