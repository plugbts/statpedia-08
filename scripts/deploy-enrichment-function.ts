#!/usr/bin/env tsx

/**
 * Script to deploy the enrichment function to the database
 * This function will be exposed as a Hasura mutation for cron triggers
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ NEON_DATABASE_URL not found in environment variables');
  console.error('Please set it in your .env.local file');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function deployEnrichmentFunction() {
  console.log('🚀 Deploying enrichment function to database...\n');

  try {
    // Read the SQL function
    const functionSQL = readFileSync(resolve(process.cwd(), 'sql/create-enrichment-function.sql'), 'utf8');
    
    console.log('📋 Deploying function: public.refresh_enrichment()');
    
    // Execute the function creation
    await db.execute(sql.raw(functionSQL));
    
    console.log('✅ Function deployed successfully!');
    
    // Test the function
    console.log('\n🧪 Testing the function...');
    const testResult = await db.execute(sql`
      SELECT * FROM public.refresh_enrichment();
    `);
    
    console.log('📊 Test results:', testResult[0]);
    
    // Check if analytics were created
    const analyticsCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM public.player_analytics;
    `);
    
    console.log(`✅ Analytics records created: ${analyticsCount[0]?.count || 0}`);
    
    console.log('\n🎉 Function deployment completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Expose the function as a mutation in Hasura');
    console.log('2. Create a webhook handler for the cron trigger');
    console.log('3. Set up the cron trigger in Hasura console');
    
  } catch (error) {
    console.error('❌ Error deploying enrichment function:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the script
deployEnrichmentFunction()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
