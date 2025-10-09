// Backfill Progress Monitor
// Monitors the 365-day backfill process and provides regular updates

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://rfdrifnsfobqlzorcesn.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZnJzZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g"
);

class BackfillMonitor {
  constructor() {
    this.startTime = Date.now();
    this.lastCounts = { logs: 0, props: 0 };
    this.targetRecords = {
      logs: 50000,  // Estimated target for 365 days across 4 leagues
      props: 50000
    };
  }

  async checkProgress() {
    try {
      console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Backfill Progress Check`);
      console.log('=' .repeat(60));

      // Get current record counts
      const { count: logsCount, error: logsError } = await supabase
        .from("player_game_logs")
        .select("*", { count: "exact", head: true });
        
      const { count: propsCount, error: propsError } = await supabase
        .from("proplines")
        .select("*", { count: "exact", head: true });

      // Debug connection
      if (logsError) {
        console.log("🔍 Debug - logsError:", logsError);
      }
      if (propsError) {
        console.log("🔍 Debug - propsError:", propsError);
      }

      if (logsError || propsError) {
        console.error("❌ Error fetching counts:", logsError || propsError);
        return;
      }

      const currentCounts = { 
        logs: logsCount || 0, 
        props: propsCount || 0 
      };

      // Calculate progress
      const logsProgress = (currentCounts.logs / this.targetRecords.logs * 100).toFixed(1);
      const propsProgress = (currentCounts.props / this.targetRecords.props * 100).toFixed(1);

      // Calculate growth since last check
      const logsGrowth = currentCounts.logs - this.lastCounts.logs;
      const propsGrowth = currentCounts.props - this.lastCounts.props;

      // Estimate time remaining
      const elapsedHours = (Date.now() - this.startTime) / (1000 * 60 * 60);
      const logsRate = currentCounts.logs / elapsedHours;
      const propsRate = currentCounts.props / elapsedHours;
      
      const logsRemaining = this.targetRecords.logs - currentCounts.logs;
      const propsRemaining = this.targetRecords.props - currentCounts.props;
      
      const estimatedHoursRemaining = Math.max(
        logsRemaining / logsRate,
        propsRemaining / propsRate
      );

      // Display progress
      console.log(`📊 Current Status:`);
      console.log(`   player_game_logs: ${currentCounts.logs.toLocaleString()} records (${logsProgress}%)`);
      console.log(`   proplines: ${currentCounts.props.toLocaleString()} records (${propsProgress}%)`);
      
      console.log(`\n📈 Growth (last 5 minutes):`);
      console.log(`   player_game_logs: +${logsGrowth.toLocaleString()} records`);
      console.log(`   proplines: +${propsGrowth.toLocaleString()} records`);
      
      console.log(`\n⏱️ Time Estimates:`);
      console.log(`   Elapsed: ${elapsedHours.toFixed(1)} hours`);
      console.log(`   Rate: ${logsRate.toFixed(0)} logs/hour, ${propsRate.toFixed(0)} props/hour`);
      console.log(`   Estimated remaining: ${estimatedHoursRemaining.toFixed(1)} hours`);

      // Check for H2H data
      await this.checkH2HProgress();

      // Check if backfill process is still running
      await this.checkProcessStatus();

      // Update last counts
      this.lastCounts = currentCounts;

      // Determine if we should continue monitoring
      if (currentCounts.logs >= this.targetRecords.logs * 0.95 && 
          currentCounts.props >= this.targetRecords.props * 0.95) {
        console.log(`\n🎉 Backfill appears to be nearly complete!`);
        console.log(`📊 Final counts: ${currentCounts.logs} logs, ${currentCounts.props} props`);
        return false; // Stop monitoring
      }

      return true; // Continue monitoring

    } catch (error) {
      console.error("❌ Error checking progress:", error);
      return true; // Continue monitoring despite error
    }
  }

  async checkH2HProgress() {
    try {
      // Check for repeat matchups
      const { data: gameLogs, error } = await supabase
        .from("player_game_logs")
        .select("player_id, opponent, date")
        .not("opponent", "is", null)
        .not("opponent", "eq", "UNK")
        .limit(5000);

      if (error) {
        console.log(`\n🔍 H2H Status: Unable to check (${error.message})`);
        return;
      }

      const matchupCounts = new Map();
      gameLogs.forEach(log => {
        const key = `${log.player_id}-${log.opponent}`;
        matchupCounts.set(key, (matchupCounts.get(key) || 0) + 1);
      });

      let repeatMatchups = 0;
      for (const count of matchupCounts.values()) {
        if (count > 1) {
          repeatMatchups++;
        }
      }

      console.log(`\n🎯 H2H Data Status:`);
      console.log(`   Valid opponents: ${gameLogs.length.toLocaleString()}`);
      console.log(`   Unique matchups: ${matchupCounts.size.toLocaleString()}`);
      console.log(`   Repeat matchups: ${repeatMatchups.toLocaleString()}`);
      
      if (repeatMatchups > 0) {
        console.log(`   ✅ H2H data is available!`);
      } else {
        console.log(`   ⏳ Still building H2H data...`);
      }

    } catch (error) {
      console.log(`\n🔍 H2H Status: Error checking (${error.message})`);
    }
  }

  async checkProcessStatus() {
    try {
      // Simple check - if we're still getting new data, process is running
      const growthThreshold = 100; // Minimum growth expected in 5 minutes
      const totalGrowth = (this.lastCounts.logs > 0 ? 
        (this.lastCounts.logs + this.lastCounts.props) - 
        (this.lastCounts.logs + this.lastCounts.props) : 0);

      if (totalGrowth >= growthThreshold) {
        console.log(`\n🔄 Backfill Process: ✅ Running (data growing)`);
      } else {
        console.log(`\n🔄 Backfill Process: ⚠️ Slow or stopped (minimal growth)`);
      }
    } catch (error) {
      console.log(`\n🔄 Backfill Process: ❓ Unknown status`);
    }
  }

  async startMonitoring() {
    console.log(`🚀 Starting Backfill Monitor`);
    console.log(`📊 Target: ~${this.targetRecords.logs.toLocaleString()} records across both tables`);
    console.log(`⏰ Monitoring every 5 minutes...`);
    console.log(`🛑 Press Ctrl+C to stop monitoring\n`);

    let continueMonitoring = true;
    let checkCount = 0;

    while (continueMonitoring) {
      continueMonitoring = await this.checkProgress();
      checkCount++;

      if (continueMonitoring) {
        console.log(`\n⏳ Next check in 5 minutes... (Check #${checkCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes
      }
    }

    console.log(`\n🏁 Monitoring complete after ${checkCount} checks`);
    console.log(`⏱️ Total monitoring time: ${((Date.now() - this.startTime) / (1000 * 60)).toFixed(1)} minutes`);
  }
}

// Start monitoring
const monitor = new BackfillMonitor();
monitor.startMonitoring().catch(console.error);
