#!/usr/bin/env node

// Test small ingestion to see what prop types are actually being stored

async function testSmallIngestion() {
  console.log('🧪 Testing Small Ingestion to See Actual Prop Types\n');

  try {
    // Trigger a small ingestion
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/ingest/NFL?limit=3');
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Ingestion successful');
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (result.inserted > 0) {
        console.log('\n🎯 New props were inserted!');
        console.log('   Check your database for the new prop types.');
        console.log('   The worker should have used normalizePropType() for these.');
      } else {
        console.log('\n⚠️ No new props were inserted.');
        console.log('   This might mean all props already exist or there were errors.');
      }
      
      if (result.errors > 0) {
        console.log(`\n⚠️ ${result.errors} errors occurred during ingestion.`);
        console.log('   This might indicate normalization issues.');
      }
    } else {
      console.log('❌ Ingestion failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSmallIngestion();
