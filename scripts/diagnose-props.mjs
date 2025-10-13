#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    console.log('🔎 STEP 1: Confirm raw ingestion in Neon\n');
    
    // Total props count
    console.log('1️⃣ Total props count:');
    const total = await client.query('SELECT COUNT(*) FROM props');
    console.log(`   Total: ${total.rows[0].count}\n`);
    
    // Props per league
    console.log('2️⃣ Props per league:');
    const byLeague = await client.query(`
      SELECT l.code, COUNT(*) as count
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      GROUP BY l.code
      ORDER BY count DESC
    `);
    byLeague.rows.forEach(row => console.log(`   ${row.code}: ${row.count}`));
    console.log('');
    
    // Check if games table exists and has data
    console.log('3️⃣ Games table check:');
    try {
      const gamesCount = await client.query('SELECT COUNT(*) FROM games');
      console.log(`   Total games: ${gamesCount.rows[0].count}`);
      
      if (parseInt(gamesCount.rows[0].count) === 0) {
        console.log('   ⚠️  WARNING: games table is empty! Props have game_id but no games exist.');
        console.log('   This will cause JOIN failures. Need to populate games table.\n');
      }
    } catch (e) {
      console.log(`   ❌ ERROR: ${e.message}\n`);
    }
    
    // Sample props (without games table)
    console.log('4️⃣ Sample props (latest 20):');
    const sample = await client.query(`
      SELECT 
        p.prop_type, 
        p.line, 
        p.odds, 
        pl.name as player_name, 
        t.abbreviation as team,
        p.game_id,
        p.created_at
      FROM props p
      JOIN players pl ON p.player_id = pl.id
      JOIN teams t ON p.team_id = t.id
      ORDER BY p.created_at DESC
      LIMIT 20
    `);
    
    sample.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.player_name} (${row.team})`);
      console.log(`      ${row.prop_type}: ${row.line} @ ${row.odds}`);
      console.log(`      Game ID: ${row.game_id || 'NULL'}`);
    });
    
    console.log('\n5️⃣ Data integrity checks:');
    
    // Props with NULL player_id
    const nullPlayers = await client.query('SELECT COUNT(*) FROM props WHERE player_id IS NULL');
    console.log(`   Props with NULL player_id: ${nullPlayers.rows[0].count}`);
    
    // Props with NULL team_id
    const nullTeams = await client.query('SELECT COUNT(*) FROM props WHERE team_id IS NULL');
    console.log(`   Props with NULL team_id: ${nullTeams.rows[0].count}`);
    
    // Props with NULL game_id
    const nullGames = await client.query('SELECT COUNT(*) FROM props WHERE game_id IS NULL');
    console.log(`   Props with NULL game_id: ${nullGames.rows[0].count}`);
    
    console.log('\n✅ Step 1 complete. Review output above.\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Diagnostic failed:', e);
  process.exit(1);
});

