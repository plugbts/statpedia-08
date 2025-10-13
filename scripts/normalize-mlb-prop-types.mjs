#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

// Mapping from current DB values to normalized values
const MLB_PROP_TYPE_MAPPINGS = {
  'Batting Homeruns': 'Home Runs',
  'Batting Home_Runs': 'Home Runs',
  'Batting Rbi': 'RBIs',
  'Batting Rbis': 'RBIs',
  'Batting Basesonballs': 'Walks',
  'Batting Totalbases': 'Total Bases',
  'Batting Hits+Runs+Rbi': 'Hits+Runs+RBI',
  'Batting Stolenbases': 'Stolen Bases',
  'Batting Strikeouts': 'Strikeouts',
  'Pitching Strikeouts': 'Pitcher Strikeouts',
  'Pitching Outs': 'Pitcher Strikeouts',
  'Pitching Earnedruns': 'Earned Runs',
  'Pitching Hits': 'Hits Allowed',
  'Pitching Basesonballs': 'Pitcher Walks',
};

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('❌ Missing DATABASE_URL');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    console.log('🔄 Normalizing MLB prop types...\n');
    
    let totalUpdated = 0;
    let totalPriorityUpdated = 0;
    
    for (const [oldName, newName] of Object.entries(MLB_PROP_TYPE_MAPPINGS)) {
      const res = await client.query(`
        UPDATE props
        SET prop_type = $1
        WHERE prop_type = $2
      `, [newName, oldName]);
      
      if (res.rowCount > 0) {
        console.log(`✅ ${oldName} → ${newName} (${res.rowCount} props)`);
        totalUpdated += res.rowCount;
      }
    }
    
    console.log(`\n📊 Total props normalized: ${totalUpdated}\n`);
    
    // Now backfill priority flags for newly normalized props
    console.log('🔄 Backfilling priority flags for normalized MLB props...\n');
    
    const priorityMLBProps = [
      'Hits', 'Singles', 'Doubles', 'Triples', 'Home Runs', 'Total Bases',
      'Runs', 'RBIs', 'Walks', 'Stolen Bases', 'Strikeouts',
      'Pitcher Strikeouts', 'Earned Runs', 'Hits Allowed', 'Pitcher Walks', 'Innings Pitched'
    ];
    
    const priorityList = priorityMLBProps.map(p => `'${p}'`).join(', ');
    
    const priorityRes = await client.query(`
      UPDATE props
      SET priority = true
      WHERE prop_type IN (${priorityList})
      AND (priority = false OR priority IS NULL)
    `);
    
    console.log(`✅ Updated ${priorityRes.rowCount} MLB props to priority = true\n`);
    totalPriorityUpdated = priorityRes.rowCount;
    
    // Show final stats
    const statsRes = await client.query(`
      SELECT 
        l.code,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE p.priority = true) as priority_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE p.priority = true) / COUNT(*), 1) as priority_percent
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE l.code = 'MLB'
      GROUP BY l.code
    `);
    
    console.log('📊 MLB Priority Stats:');
    if (statsRes.rows.length > 0) {
      const row = statsRes.rows[0];
      console.log(`   Total: ${row.total}`);
      console.log(`   Priority: ${row.priority_count} (${row.priority_percent}%)\n`);
    }
    
    // Show top MLB prop types
    const topPropsRes = await client.query(`
      SELECT 
        p.prop_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE p.priority = true) as priority_count
      FROM props p
      JOIN teams t ON p.team_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE l.code = 'MLB'
      GROUP BY p.prop_type
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('📊 Top 20 MLB Prop Types:');
    topPropsRes.rows.forEach((row, i) => {
      const isPriority = row.priority_count > 0 ? ' ✅' : '';
      console.log(`   ${i + 1}. ${row.prop_type}: ${row.count}${isPriority}`);
    });
    
    console.log('\n✅ MLB prop normalization complete!\n');
    
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('❌ Normalization failed:', e);
  process.exit(1);
});

