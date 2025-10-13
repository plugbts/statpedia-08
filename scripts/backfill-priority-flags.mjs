#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

// Priority props set (must match ingestion script)
const PRIORITY_PROPS = new Set([
  // NFL
  'Passing Yards', 'Passing TDs', 'Passing Attempts', 'Passing Completions',
  'Rushing Yards', 'Rushing TDs', 'Rushing Attempts',
  'Receiving Yards', 'Receiving TDs', 'Receptions',
  'Rush+Rec Yards', 'Pass+Rush Yards',
  'Anytime TD', 'First TD',
  'Interceptions', 'Sacks', 'Tackles', 'Solo Tackles', 'Assisted Tackles',
  'Fantasy Score',
  
  // NBA
  'Points', 'Assists', 'Rebounds',
  '3-Pointers Made', 'Steals', 'Blocks', 'Turnovers',
  'Points+Assists', 'Points+Rebounds', 'Assists+Rebounds', 'Points+Assists+Rebounds',
  
  // MLB
  'Hits', 'Home Runs', 'RBIs', 'Stolen Bases', 'Total Bases', 'Runs',
  'Strikeouts', 'Walks',
  'Pitcher Strikeouts', 'Earned Runs', 'Hits Allowed',
  'Doubles', 'Triples',
  
  // NHL
  'Goals', 'Assists', 'Shots on Goal', 'Blocked Shots', 'Saves', 'Goals Against',
]);

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('❌ Missing DATABASE_URL');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    console.log('🔄 Backfilling priority flags for existing props...\n');
    
    // Get count before
    const beforeRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE priority = true) as priority_count
      FROM props
    `);
    console.log(`Before: ${beforeRes.rows[0].total} total props, ${beforeRes.rows[0].priority_count} marked as priority\n`);
    
    // Update props that match priority set
    const priorityList = Array.from(PRIORITY_PROPS).map(p => `'${p}'`).join(', ');
    
    const updateRes = await client.query(`
      UPDATE props
      SET priority = true
      WHERE prop_type IN (${priorityList})
      AND (priority = false OR priority IS NULL)
    `);
    
    console.log(`✅ Updated ${updateRes.rowCount} props to priority = true\n`);
    
    // Get count after
    const afterRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE priority = true) as priority_count
      FROM props
    `);
    console.log(`After: ${afterRes.rows[0].total} total props, ${afterRes.rows[0].priority_count} marked as priority\n`);
    
    // Show breakdown by league
    const byLeagueRes = await client.query(`
      SELECT 
        l.code,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE p.priority = true) as priority_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE p.priority = true) / COUNT(*), 1) as priority_percent
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY l.code
      ORDER BY total DESC
    `);
    
    console.log('📊 Priority props by league:');
    byLeagueRes.rows.forEach(row => {
      console.log(`   ${row.code}: ${row.priority_count}/${row.total} (${row.priority_percent}%)`);
    });
    
    console.log('\n✅ Backfill complete!\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});

