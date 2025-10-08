// Test script for the prop ingestion worker
const WORKER_URL = 'https://statpedia-player-props.workers.dev';

async function testIngestion() {
  console.log('🧪 Testing prop ingestion worker...\n');
  
  try {
    // Test ingestion status
    console.log('1. Testing ingestion status...');
    const statusResponse = await fetch(`${WORKER_URL}/ingest`);
    const status = await statusResponse.json();
    console.log('Status:', status);
    
    // Test ingestion with NFL only (smaller test)
    console.log('\n2. Testing NFL ingestion...');
    const ingestResponse = await fetch(`${WORKER_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        league: 'NFL',
        season: '2025',
        week: '1'
      })
    });
    
    const result = await ingestResponse.json();
    console.log('Ingestion result:', result);
    
    if (result.success) {
      console.log(`✅ Success! Processed ${result.totalProps} props`);
      console.log(`   - Inserted: ${result.inserted}`);
      console.log(`   - Updated: ${result.updated}`);
      console.log(`   - Errors: ${result.errors}`);
      console.log(`   - Duration: ${result.duration}`);
    } else {
      console.log('❌ Ingestion failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIngestion();
