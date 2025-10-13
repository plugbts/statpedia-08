#!/usr/bin/env node

/**
 * Scheduled Props Ingestion Cron Jobs
 * 
 * Schedules:
 * 1. Daily baseline at 3 AM UTC: Full slate ingestion
 * 2. Regular refresh every 15 minutes: Keep props updated
 * 3. Pre-game surge jobs:
 *    - NFL Sundays: Every 5 minutes from 5 PM - 11 PM UTC
 *    - NBA weeknights: Every 5 minutes from 11 PM - 4 AM UTC
 * 4. Optional live props: Every minute (disabled by default)
 */

import cron from 'node-cron';
import { execSync } from 'child_process';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const API_KEY = process.env.SPORTSGAMEODDS_API_KEY || process.env.SPORTS_API_KEY;

if (!DATABASE_URL || !API_KEY) {
  console.error('❌ Missing required environment variables: DATABASE_URL and SPORTSGAMEODDS_API_KEY');
  process.exit(1);
}

const ENABLE_LIVE_PROPS = process.env.ENABLE_LIVE_PROPS === 'true'; // Set to 'true' to enable minute-by-minute updates

function runIngestion(leagues = 'ALL', label = 'Ingestion') {
  console.log(`\n🚀 ${label} started at ${new Date().toISOString()}`);
  console.log(`📊 Leagues: ${leagues}`);
  
  try {
    const cmd = `DATABASE_URL='${DATABASE_URL}' SPORTSGAMEODDS_API_KEY='${API_KEY}' npm run ingest:props:drizzle ${leagues}`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    console.log(`✅ ${label} completed successfully`);
    
    // Run validation
    validateIngestion();
  } catch (error) {
    console.error(`❌ ${label} failed:`, error.message);
  }
}

function validateIngestion() {
  try {
    const cmd = `DATABASE_URL='${DATABASE_URL}' node scripts/validate-props.mjs`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log('📊 Validation:', output);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

// 1. Daily baseline at 3 AM UTC - Full slate for the day
cron.schedule('0 3 * * *', () => {
  runIngestion('ALL', 'Daily Baseline Ingestion (3 AM UTC)');
}, {
  timezone: 'UTC'
});

// 2. Regular refresh every 15 minutes - Keep props updated throughout the day
cron.schedule('*/15 * * * *', () => {
  runIngestion('ALL', '15-Minute Refresh');
}, {
  timezone: 'UTC'
});

// 3. Pre-game surge jobs
// NFL Sundays: Every 5 minutes from 5 PM - 11 PM UTC (covers 12 PM - 6 PM ET typical NFL times)
cron.schedule('*/5 17-23 * * 0', () => {
  runIngestion('NFL', 'NFL Sunday Surge');
}, {
  timezone: 'UTC'
});

// NBA weeknights: Every 5 minutes from 11 PM - 4 AM UTC (covers 6 PM - 11 PM ET typical NBA times)
cron.schedule('*/5 23-4 * * 1-6', () => {
  runIngestion('NBA', 'NBA Weeknight Surge');
}, {
  timezone: 'UTC'
});

// 4. Optional: Live props every minute during games (disabled by default)
if (ENABLE_LIVE_PROPS) {
  cron.schedule('*/1 * * * *', () => {
    runIngestion('ALL', 'Live Props Update (1-Minute)');
  }, {
    timezone: 'UTC'
  });
  console.log('⚡ Live props updates enabled (every minute)');
}

console.log('📅 Props Ingestion Scheduler Started');
console.log('=' .repeat(60));
console.log('Schedule Summary:');
console.log('  1. Daily baseline: 3 AM UTC (all leagues)');
console.log('  2. Regular refresh: Every 15 minutes (all leagues)');
console.log('  3. NFL Sunday surge: Every 5 minutes, 5 PM - 11 PM UTC');
console.log('  4. NBA weeknight surge: Every 5 minutes, 11 PM - 4 AM UTC');
console.log(`  5. Live props: ${ENABLE_LIVE_PROPS ? '✅ ENABLED (every minute)' : '❌ DISABLED'}`);
console.log('=' .repeat(60));
console.log('🟢 Scheduler is running. Press Ctrl+C to stop.');
console.log('');

// Run initial ingestion on startup
console.log('🔄 Running initial ingestion...');
runIngestion('ALL', 'Initial Startup Ingestion');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Scheduler stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Scheduler terminated');
  process.exit(0);
});

