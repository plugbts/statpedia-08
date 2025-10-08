// Create mock performance data to test streaks functionality
const SUPABASE_URL = 'https://rfdrifnsfobqlzorcesn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g';

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${response.statusText} - ${text}`);
  }
  
  return response.json();
}

function generateMockPerformance(propType, line) {
  // Generate realistic performance data based on prop type and line
  const baseLine = parseFloat(line);
  
  switch (propType.toLowerCase()) {
    case 'assists':
    case 'points':
    case 'rebounds':
    case 'steals':
    case 'blocks':
    case 'threes made':
    case '3pt made':
      // For counting stats, generate performance around the line with some variance
      const variance = Math.random() * 3 - 1.5; // -1.5 to +1.5
      return Math.max(0, Math.round(baseLine + variance));
      
    case 'passing yards':
    case 'rushing yards':
    case 'receiving yards':
      // For yardage stats, more variance
      const yardVariance = Math.random() * 50 - 25; // -25 to +25
      return Math.max(0, Math.round(baseLine + yardVariance));
      
    default:
      // Default: generate performance around the line
      const defaultVariance = Math.random() * 2 - 1; // -1 to +1
      return Math.max(0, Math.round(baseLine + defaultVariance));
  }
}

async function createMockStreaksData() {
  console.log('🔍 Creating mock performance data for streaks testing...\n');
  
  try {
    // Get existing prop lines
    console.log('📊 Fetching existing prop lines...');
    const proplines = await supabaseRequest('proplines?limit=20');
    console.log(`📊 Found ${proplines.length} prop lines`);
    
    if (proplines.length === 0) {
      console.log('❌ No prop lines found. Please run ingestion first.');
      return;
    }
    
    // Create mock performance data for each prop line
    console.log('\n📊 Creating mock performance data...');
    const mockGameLogs = [];
    
    for (const prop of proplines) {
      // Skip if essential data is missing
      if (!prop.player_id || !prop.prop_type || !prop.date || !prop.line) {
        console.log(`⚠️ Skipping prop with missing data: ${prop.player_name}`);
        continue;
      }
      
      const mockPerformance = generateMockPerformance(prop.prop_type, prop.line);
      
      const mockGameLog = {
        player_id: prop.player_id,
        player_name: prop.player_name,
        team: prop.team || 'UNK',
        opponent: prop.opponent || 'UNK',
        season: prop.season || 2025,
        date: prop.date,
        prop_type: prop.prop_type,
        value: mockPerformance, // This is the actual performance
        sport: prop.league?.toUpperCase() || 'UNK',
        league: prop.league || 'unk',
        game_id: prop.game_id || `${prop.player_id}-${prop.date}`
      };
      
      mockGameLogs.push(mockGameLog);
      
      console.log(`📊 ${prop.player_name}: ${prop.prop_type} - Line: ${prop.line}, Performance: ${mockPerformance}`);
    }
    
    if (mockGameLogs.length === 0) {
      console.log('❌ No valid mock game logs created');
      return;
    }
    
    // Insert mock game logs
    console.log(`\n📊 Inserting ${mockGameLogs.length} mock game logs...`);
    
    // Insert in batches of 10
    const batchSize = 10;
    for (let i = 0; i < mockGameLogs.length; i += batchSize) {
      const batch = mockGameLogs.slice(i, i + batchSize);
      
      try {
        const result = await supabaseRequest('player_game_logs', {
          method: 'POST',
          body: batch,
          headers: { 'Prefer': 'resolution=merge-duplicates' }
        });
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)`);
      } catch (error) {
        console.log(`❌ Failed to insert batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }
    
    console.log('\n🎉 Mock performance data created successfully!');
    console.log('\n📊 Now testing streaks...');
    
    // Test streaks with different leagues
    const leagues = ['nfl', 'nba', 'mlb', 'nhl'];
    for (const league of leagues) {
      try {
        const response = await fetch(`https://statpedia-player-props.statpedia.workers.dev/analytics/streaks?league=${league.toUpperCase()}&limit=5`);
        const data = await response.json();
        
        console.log(`📊 ${league.toUpperCase()}: ${data.data?.length || 0} streaks found`);
        if (data.data && data.data.length > 0) {
          console.log(`📊 Sample streak: ${data.data[0].player_name} - ${data.data[0].prop_type} - ${data.data[0].current_streak} game streak`);
        }
      } catch (error) {
        console.log(`❌ ${league.toUpperCase()} streaks failed:`, error.message);
      }
    }
    
    // Test with all leagues
    try {
      const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/analytics/streaks?league=all&limit=10');
      const data = await response.json();
      
      console.log(`\n📊 ALL LEAGUES: ${data.data?.length || 0} streaks found`);
      if (data.data && data.data.length > 0) {
        console.log('📊 Top streaks:');
        data.data.slice(0, 5).forEach((streak, i) => {
          console.log(`  ${i + 1}. ${streak.player_name} - ${streak.prop_type} - ${streak.current_streak} game streak (${streak.streak_type})`);
        });
      }
    } catch (error) {
      console.log(`❌ All leagues streaks failed:`, error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

// Run the mock data creation
createMockStreaksData().catch(console.error);
