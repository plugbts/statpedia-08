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

async function debugCurrentIngestion() {
  console.log('🔍 Debugging Current Ingestion - Why "Over/Under" Still Appears\n');

  try {
    // Check the most recent props (last 30 minutes)
    const { data: recentProps, error: recentError } = await supabase
      .from("proplines")
      .select("*")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    if (recentError) {
      console.error("❌ Error fetching recent props:", recentError);
      return;
    }

    console.log(`📊 Recent Props (Last 30 minutes): ${recentProps.length} props found\n`);

    if (recentProps.length === 0) {
      console.log("⚠️ No recent props found. Worker may not be ingesting new data.");

      // Check props from last 2 hours
      const { data: olderProps, error: olderError } = await supabase
        .from("proplines")
        .select("*")
        .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (olderError) {
        console.error("❌ Error fetching older props:", olderError);
        return;
      }

      console.log(`📊 Older Props (Last 2 hours): ${olderProps.length} props found\n`);

      if (olderProps.length > 0) {
        console.log("Recent props:");
        olderProps.forEach((prop, index) => {
          console.log(
            `${index + 1}. ${prop.player_name} | ${prop.prop_type} | ${prop.line} | ${prop.over_odds}/${prop.under_odds} | ${prop.created_at}`,
          );
        });
      }
      return;
    }

    console.log("Recent props:");
    recentProps.forEach((prop, index) => {
      console.log(
        `${index + 1}. ${prop.player_name} | ${prop.prop_type} | ${prop.line} | ${prop.over_odds}/${prop.under_odds} | ${prop.created_at}`,
      );
    });

    // Check prop type distribution in recent props
    const propTypeCounts = {};
    recentProps.forEach((prop) => {
      propTypeCounts[prop.prop_type] = (propTypeCounts[prop.prop_type] || 0) + 1;
    });

    console.log("\n📈 Prop Type Distribution in Recent Props:");
    Object.entries(propTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([propType, count]) => {
        console.log(`  ${propType}: ${count}`);
      });

    // Check if "Over/Under" or "over_under" are still appearing
    const problematicProps = recentProps.filter(
      (prop) =>
        prop.prop_type === "Over/Under" ||
        prop.prop_type === "over_under" ||
        prop.prop_type === "unknown",
    );

    if (problematicProps.length > 0) {
      console.log("\n⚠️ PROBLEMATIC PROPS STILL BEING INGESTED:");
      problematicProps.forEach((prop, index) => {
        console.log(
          `${index + 1}. ${prop.player_name} | ${prop.prop_type} | ${prop.line} | ${prop.over_odds}/${prop.under_odds}`,
        );
      });

      console.log("\n🔧 This means the worker normalization is not working properly.");
      console.log("   The worker may not be using the updated normalizePropType function.");
    } else {
      console.log("\n✅ No problematic prop types found in recent ingestion!");
      console.log("   The worker normalization appears to be working correctly.");
    }

    // Test worker endpoint directly
    console.log("\n🧪 Testing Worker Endpoint...");
    try {
      const response = await fetch("https://statpedia-player-props.statpedia.workers.dev/status");
      if (response.ok) {
        const status = await response.json();
        console.log("✅ Worker is responding:", status);
      } else {
        console.log("⚠️ Worker responded with status:", response.status);
      }
    } catch (error) {
      console.log("❌ Error testing worker:", error.message);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

debugCurrentIngestion();
