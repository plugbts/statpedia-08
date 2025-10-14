#!/usr/bin/env tsx

/**
 * Script to set up Hasura cron triggers for enrichment
 * 
 * This script helps configure the Hasura cron triggers by providing
 * the necessary configuration and instructions.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;
const WEBHOOK_URL = process.env.ENRICHMENT_WEBHOOK_URL || 'http://localhost:3002/refresh-enrichment';

async function setupHasuraCron() {
  console.log('🚀 Setting up Hasura cron triggers for enrichment...\n');

  try {
    console.log('📋 Configuration Summary:');
    console.log(`   Hasura Endpoint: ${HASURA_GRAPHQL_ENDPOINT}`);
    console.log(`   Webhook URL: ${WEBHOOK_URL}`);
    console.log(`   Admin Secret: ${HASURA_ADMIN_SECRET ? '✅ Set' : '❌ Missing'}\n`);

    if (!HASURA_ADMIN_SECRET) {
      console.log('❌ HASURA_ADMIN_SECRET is not set in environment variables');
      console.log('   Please add it to your .env.local file\n');
    }

    console.log('📝 Manual Setup Instructions:');
    console.log('1. Open Hasura Console: https://graphql-engine-latest-statpedia.onrender.com/console');
    console.log('2. Go to Events → Cron Triggers');
    console.log('3. Click "Create" to add a new cron trigger');
    console.log('4. Use the following configuration:\n');

    console.log('   Name: refresh_enrichment_nightly');
    console.log('   Webhook URL:', WEBHOOK_URL);
    console.log('   Schedule: 0 4 * * * (Every day at 4 AM UTC)');
    console.log('   Payload: {}');
    console.log('   Retry Configuration:');
    console.log('     - Number of retries: 3');
    console.log('     - Timeout: 300 seconds');
    console.log('     - Tolerance: 21600 seconds (6 hours)\n');

    console.log('   Headers:');
    console.log('     - Content-Type: application/json');
    console.log('     - User-Agent: Hasura-Cron-Trigger\n');

    console.log('5. Save the cron trigger');
    console.log('6. Test it by clicking "Invoke Now" or waiting for the scheduled time\n');

    console.log('🧪 Testing the webhook manually:');
    console.log(`   curl -X POST "${WEBHOOK_URL}"`);
    console.log(`   curl -X GET "${WEBHOOK_URL}"\n`);

    console.log('📊 Monitoring:');
    console.log('   - Check Hasura Console → Events → Cron Triggers for execution logs');
    console.log('   - Check your webhook server logs for enrichment results');
    console.log('   - Monitor the player_analytics table for updated records\n');

    console.log('🔧 Alternative: Use Hasura CLI');
    console.log('   1. Install Hasura CLI: npm install -g hasura-cli');
    console.log('   2. Initialize: hasura init');
    console.log('   3. Apply metadata: hasura metadata apply');
    console.log('   4. Apply migrations: hasura migrate apply\n');

    // Create a sample curl command for testing
    const testCommand = `curl -X POST "${WEBHOOK_URL}" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: Test-Request" \\
  -d '{}'`;

    console.log('🧪 Test Command:');
    console.log(testCommand);

    // Read the metadata file and show it
    try {
      const metadataPath = resolve(process.cwd(), 'hasura/metadata/cron_triggers.yaml');
      const metadata = readFileSync(metadataPath, 'utf8');
      
      console.log('\n📄 Cron Trigger Metadata (hasura/metadata/cron_triggers.yaml):');
      console.log('─'.repeat(60));
      console.log(metadata);
      console.log('─'.repeat(60));
      
    } catch (error) {
      console.log('\n⚠️ Could not read metadata file:', error.message);
    }

    console.log('\n✅ Setup instructions completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Configure the cron trigger in Hasura Console');
    console.log('2. Test the webhook manually');
    console.log('3. Monitor the first scheduled execution');
    console.log('4. Verify that player_analytics table is being updated');

  } catch (error) {
    console.error('❌ Error setting up Hasura cron:', error);
    throw error;
  }
}

// Run the script
setupHasuraCron()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
