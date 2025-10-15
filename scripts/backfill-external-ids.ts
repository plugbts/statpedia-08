#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  console.error('❌ NEON_DATABASE_URL not found');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function backfillExternalIds() {
  console.log('🔄 Backfilling external_id for NFL players...');
  
  try {
    // Get all NFL players without external_id
    const players = await db.execute(sql`
      SELECT p.id, p.name, t.abbreviation as team
      FROM players p
      JOIN teams t ON t.id = p.team_id
      JOIN leagues l ON l.id = t.league_id
      WHERE l.code = 'NFL'
      AND p.external_id IS NULL
    `);
    
    console.log(`📊 Found ${players.length} NFL players without external_id`);
    
    if (players.length === 0) {
      console.log('✅ All NFL players already have external_id values');
      return;
    }
    
    let updated = 0;
    
    // Update each player with external_id
    for (const player of players) {
      const externalId = `${player.name.replace(/\s+/g, '_')}_1_NFL`;
      
      try {
        await db.execute(sql`
          UPDATE players 
          SET external_id = ${externalId}
          WHERE id = ${player.id}
        `);
        
        updated++;
        if (updated % 100 === 0) {
          console.log(`✅ Updated ${updated}/${players.length} players...`);
        }
      } catch (error) {
        console.error(`❌ Failed to update ${player.name}:`, error);
      }
    }
    
    console.log(`🎉 Successfully updated ${updated} NFL players with external_id`);
    
    // Verify the update
    const verify = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM players p
      JOIN teams t ON t.id = p.team_id
      JOIN leagues l ON l.id = t.league_id
      WHERE l.code = 'NFL'
      AND p.external_id IS NOT NULL
    `);
    
    console.log(`📊 NFL players with external_id: ${verify[0]?.count || 0}`);
    
  } catch (error) {
    console.error('❌ Error backfilling external_id:', error);
  } finally {
    await client.end();
  }
}

// Run the backfill
backfillExternalIds().catch(console.error);
