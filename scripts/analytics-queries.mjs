#!/usr/bin/env node

/**
 * Prop Click Analytics Queries
 * 
 * Run various analytics queries on prop click data
 */

import pg from 'pg';
const { Client } = pg;

async function runAnalytics() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('❌ Missing DATABASE_URL');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    console.log('📊 Prop Click Analytics Report\n');
    console.log('='.repeat(60));
    
    // 1. Total clicks
    const totalRes = await client.query('SELECT COUNT(*) FROM prop_clicks');
    console.log(`\n📈 Total Clicks: ${totalRes.rows[0].count}\n`);
    
    // 2. Top clicked prop types (all time)
    console.log('🏆 Top 20 Clicked Prop Types (All Time):');
    const topPropsRes = await client.query(`
      SELECT 
        p.prop_type,
        l.code as league,
        COUNT(*) as clicks,
        COUNT(DISTINCT c.user_id) as unique_users
      FROM prop_clicks c
      JOIN props p ON c.prop_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY p.prop_type, l.code
      ORDER BY clicks DESC
      LIMIT 20
    `);
    
    topPropsRes.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. [${row.league}] ${row.prop_type}: ${row.clicks} clicks (${row.unique_users} users)`);
    });
    
    // 3. Clicks by league
    console.log('\n\n📊 Clicks by League:');
    const byLeagueRes = await client.query(`
      SELECT 
        l.code as league,
        COUNT(*) as clicks,
        COUNT(DISTINCT c.user_id) as unique_users,
        COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '24 hours') as clicks_24h,
        COUNT(*) FILTER (WHERE c.clicked_at > now() - interval '7 days') as clicks_7d
      FROM prop_clicks c
      JOIN props p ON c.prop_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY l.code
      ORDER BY clicks DESC
    `);
    
    byLeagueRes.rows.forEach(row => {
      console.log(`   ${row.league}: ${row.clicks} total (${row.clicks_24h} last 24h, ${row.clicks_7d} last 7d)`);
    });
    
    // 4. Clicks by device type
    console.log('\n\n📱 Clicks by Device Type:');
    const byDeviceRes = await client.query(`
      SELECT 
        device_type,
        COUNT(*) as clicks,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM prop_clicks
      WHERE device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY clicks DESC
    `);
    
    byDeviceRes.rows.forEach(row => {
      console.log(`   ${row.device_type || 'Unknown'}: ${row.clicks} (${row.percentage}%)`);
    });
    
    // 5. Click trends by hour
    console.log('\n\n⏰ Click Trends (Last 24 Hours):');
    const hourlyRes = await client.query(`
      SELECT 
        EXTRACT(HOUR FROM clicked_at) as hour,
        COUNT(*) as clicks
      FROM prop_clicks
      WHERE clicked_at > now() - interval '24 hours'
      GROUP BY hour
      ORDER BY hour
    `);
    
    hourlyRes.rows.forEach(row => {
      const bar = '█'.repeat(Math.ceil(row.clicks / 10));
      console.log(`   ${String(row.hour).padStart(2, '0')}:00 ${bar} ${row.clicks}`);
    });
    
    // 6. Most active users
    console.log('\n\n👥 Most Active Users (Top 10):');
    const activeUsersRes = await client.query(`
      SELECT 
        user_id,
        COUNT(*) as clicks,
        COUNT(DISTINCT prop_id) as unique_props,
        MAX(clicked_at) as last_active
      FROM prop_clicks
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      ORDER BY clicks DESC
      LIMIT 10
    `);
    
    activeUsersRes.rows.forEach((row, i) => {
      const userId = row.user_id.substring(0, 8) + '...';
      console.log(`   ${i + 1}. User ${userId}: ${row.clicks} clicks on ${row.unique_props} props`);
    });
    
    // 7. Session analysis
    console.log('\n\n🔄 Session Statistics:');
    const sessionRes = await client.query(`
      SELECT 
        COUNT(DISTINCT session_id) as total_sessions,
        ROUND(AVG(clicks_per_session), 1) as avg_clicks_per_session,
        MAX(clicks_per_session) as max_clicks_per_session
      FROM (
        SELECT 
          session_id,
          COUNT(*) as clicks_per_session
        FROM prop_clicks
        WHERE session_id IS NOT NULL
        GROUP BY session_id
      ) subq
    `);
    
    const sessionStats = sessionRes.rows[0];
    console.log(`   Total Sessions: ${sessionStats.total_sessions}`);
    console.log(`   Avg Clicks/Session: ${sessionStats.avg_clicks_per_session}`);
    console.log(`   Max Clicks/Session: ${sessionStats.max_clicks_per_session}`);
    
    // 8. Priority vs Extended props clicks
    console.log('\n\n⭐ Priority vs Extended Props:');
    const priorityRes = await client.query(`
      SELECT 
        CASE WHEN p.priority THEN 'Priority' ELSE 'Extended' END as prop_category,
        COUNT(*) as clicks,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM prop_clicks c
      JOIN props p ON c.prop_id = p.id
      GROUP BY p.priority
      ORDER BY clicks DESC
    `);
    
    priorityRes.rows.forEach(row => {
      console.log(`   ${row.prop_category}: ${row.clicks} clicks (${row.percentage}%)`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analytics report complete\n');
    
  } finally {
    await client.end();
  }
}

runAnalytics().catch((e) => {
  console.error('❌ Analytics failed:', error);
  process.exit(1);
});

