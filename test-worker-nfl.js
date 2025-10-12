#!/usr/bin/env node

/**
 * Test the worker with correct NFL case
 */

async function testWorkerNFL() {
  console.log('🧪 Testing worker with NFL (uppercase)...\n');

  try {
    const workerUrl = 'https://statpedia-player-props.statpedia.workers.dev';
    
    console.log('1. Testing NFL ingestion with correct case...');
    const ingestResponse = await fetch(`${workerUrl}/ingest/NFL`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (ingestResponse.ok) {
      const ingestData = await ingestResponse.json();
      console.log('   ✅ NFL ingestion successful');
      console.log(`   Response: ${JSON.stringify(ingestData, null, 2)}`);
    } else {
      console.log('   ❌ NFL ingestion failed');
      const errorText = await ingestResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    console.log('\n2. Waiting 5 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n3. Checking database for new props...');
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfdrifnsfobqlzorcesn.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: nflProps, error } = await supabase
      .from('proplines')
      .select('prop_type, player_name, line, over_odds, under_odds')
      .eq('league', 'nfl')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }

    console.log(`   📊 Found ${nflProps.length} recent NFL props`);
    
    // Group by prop type
    const propTypes = {};
    nflProps.forEach(prop => {
      if (!propTypes[prop.prop_type]) {
        propTypes[prop.prop_type] = [];
      }
      propTypes[prop.prop_type].push(prop);
    });

    console.log('\n   📋 Recent prop types:');
    Object.entries(propTypes).forEach(([type, props]) => {
      console.log(`     ${type}: ${props.length} props`);
      if (type.includes('receiving') || type.includes('combo') || type.includes('+')) {
        console.log(`       🎯 Sample: ${props[0].player_name} - ${props[0].line}`);
      }
    });

    // Check for receiving yards specifically
    const receivingYards = nflProps.filter(prop => 
      prop.prop_type && prop.prop_type.toLowerCase().includes('receiving')
    );
    console.log(`\n   🎯 Receiving-related props: ${receivingYards.length}`);
    if (receivingYards.length > 0) {
      receivingYards.slice(0, 3).forEach(prop => {
        console.log(`     ${prop.player_name}: ${prop.prop_type} ${prop.line}`);
      });
    }

    // Check for combo props
    const comboProps = nflProps.filter(prop => 
      prop.prop_type && (prop.prop_type.includes('+') || prop.prop_type.includes('_'))
    );
    console.log(`\n   🎯 Combo props: ${comboProps.length}`);
    if (comboProps.length > 0) {
      comboProps.slice(0, 3).forEach(prop => {
        console.log(`     ${prop.player_name}: ${prop.prop_type} ${prop.line}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testWorkerNFL().catch(console.error);
