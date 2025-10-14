#!/usr/bin/env tsx

/**
 * Fix Player Logs Hit Calculation
 * 
 * This script fixes the hit calculation in player_game_logs
 * by properly calculating whether actual_value >= line
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.NEON_DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log('🔧 Fixing player logs hit calculation...\n');
  
  try {
    // Fix hit calculation - for over props, hit = actual_value >= line
    const result = await db.execute(sql`
      UPDATE player_game_logs 
      SET hit = (actual_value >= line)
      WHERE actual_value IS NOT NULL AND line IS NOT NULL
    `);
    
    console.log(`✅ Updated ${result.rowCount} player game logs`);
    
    // Show sample of fixed data
    const sample = await db.execute(sql`
      SELECT 
        pgl.prop_type,
        pgl.line,
        pgl.actual_value,
        pgl.hit,
        pgl.game_date,
        p.name as player_name
      FROM player_game_logs pgl
      JOIN players p ON pgl.player_id = p.id
      WHERE pgl.prop_type = 'Points'
      ORDER BY pgl.game_date DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Sample of fixed data:');
    console.table(sample);
    
    // Show hit rate by prop type
    const hitRates = await db.execute(sql`
      SELECT 
        prop_type,
        COUNT(*) as total_logs,
        AVG(hit::int) as hit_rate,
        COUNT(CASE WHEN hit THEN 1 END) as hits,
        COUNT(CASE WHEN NOT hit THEN 1 END) as misses
      FROM player_game_logs
      GROUP BY prop_type
      ORDER BY total_logs DESC
    `);
    
    console.log('\n📈 Hit rates by prop type:');
    console.table(hitRates);
    
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as fixPlayerLogsHitCalculation };
