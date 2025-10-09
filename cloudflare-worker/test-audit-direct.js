#!/usr/bin/env node

/**
 * Direct Conflict Key Audit Test
 * Run the audit function directly to debug the issue
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rfdrifnsfobqlzorcesn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function auditConflictKeys() {
  console.log('🔍 Running direct conflict key audit...\n');

  try {
    const { data, error } = await supabase
      .from("player_game_logs")
      .select("league, conflict_key, prop_type");

    if (error) {
      console.error("❌ Supabase error:", error);
      return;
    }

    console.log(`📊 Raw data count: ${data?.length || 0}`);
    
    if (data && data.length > 0) {
      console.log('📊 Sample record:', JSON.stringify(data[0], null, 2));
    }

    const results = {};

    data?.forEach(row => {
      const league = row.league || "unknown";
      if (!results[league]) results[league] = { bad: 0, good: 0, total: 0, badExamples: [] };

      results[league].total++;
      if (row.conflict_key.includes("|gamelog|")) {
        results[league].bad++;
        // Collect examples of bad conflict keys with prop types
        if (results[league].badExamples.length < 3) {
          results[league].badExamples.push(`${row.prop_type} -> ${row.conflict_key}`);
        }
      } else {
        results[league].good++;
      }
    });

    console.log("📊 Conflict Key Audit Results:");
    Object.entries(results).forEach(([league, counts]) => {
      console.log(
        `${league.toUpperCase()}: total=${counts.total}, good=${counts.good}, bad=${counts.bad}`
      );
      if (counts.badExamples.length > 0) {
        console.log(`  Bad examples:`, counts.badExamples);
      }
    });

    return results;

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    throw error;
  }
}

auditConflictKeys().then((results) => {
  console.log('\n✅ Direct audit completed');
  console.log('📊 Final results:', JSON.stringify(results, null, 2));
}).catch(error => {
  console.error('❌ Direct audit script failed:', error);
  process.exit(1);
});
