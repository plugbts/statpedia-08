// Debug streaks data matching issue
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

async function debugStreaksData() {
  console.log('🔍 Debugging streaks data matching...\n');
  
  try {
    // Get sample data from both tables
    console.log('📊 Fetching sample data from player_game_logs...');
    const gameLogs = await supabaseRequest('player_game_logs?limit=10');
    console.log(`📊 Found ${gameLogs.length} game logs`);
    
    if (gameLogs.length > 0) {
      console.log('📊 Sample game logs:');
      gameLogs.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.player_name} (${log.player_id}) - ${log.prop_type} on ${log.date} - League: ${log.league}`);
      });
    }
    
    console.log('\n📊 Fetching sample data from proplines...');
    const proplines = await supabaseRequest('proplines?limit=10');
    console.log(`📊 Found ${proplines.length} proplines`);
    
    if (proplines.length > 0) {
      console.log('📊 Sample proplines:');
      proplines.forEach((prop, i) => {
        console.log(`  ${i + 1}. ${prop.player_name} (${prop.player_id}) - ${prop.prop_type} on ${prop.date} - League: ${prop.league}`);
      });
    }
    
    // Check for matching data
    console.log('\n🔍 Analyzing data matching potential...');
    
    if (gameLogs.length > 0 && proplines.length > 0) {
      const gameLogPlayerIds = [...new Set(gameLogs.map(g => g.player_id))];
      const gameLogPropTypes = [...new Set(gameLogs.map(g => g.prop_type))];
      const gameLogDates = [...new Set(gameLogs.map(g => g.date))];
      const gameLogLeagues = [...new Set(gameLogs.map(g => g.league).filter(Boolean))];
      
      const propPlayerIds = [...new Set(proplines.map(p => p.player_id))];
      const propPropTypes = [...new Set(proplines.map(p => p.prop_type))];
      const propDates = [...new Set(proplines.map(p => p.date))];
      const propLeagues = [...new Set(proplines.map(p => p.league).filter(Boolean))];
      
      console.log('📊 Game Logs Analysis:');
      console.log(`  Player IDs: ${gameLogPlayerIds.length} unique (${gameLogPlayerIds.slice(0, 3).join(', ')}...)`);
      console.log(`  Prop Types: ${gameLogPropTypes.length} unique (${gameLogPropTypes.slice(0, 3).join(', ')}...)`);
      console.log(`  Dates: ${gameLogDates.length} unique (${gameLogDates.slice(0, 3).join(', ')}...)`);
      console.log(`  Leagues: ${gameLogLeagues.length} unique (${gameLogLeagues.join(', ')})`);
      
      console.log('📊 Proplines Analysis:');
      console.log(`  Player IDs: ${propPlayerIds.length} unique (${propPlayerIds.slice(0, 3).join(', ')}...)`);
      console.log(`  Prop Types: ${propPropTypes.length} unique (${propPropTypes.slice(0, 3).join(', ')}...)`);
      console.log(`  Dates: ${propDates.length} unique (${propDates.slice(0, 3).join(', ')}...)`);
      console.log(`  Leagues: ${propLeagues.length} unique (${propLeagues.join(', ')})`);
      
      // Check for overlaps
      const playerIdOverlap = gameLogPlayerIds.filter(id => propPlayerIds.includes(id));
      const propTypeOverlap = gameLogPropTypes.filter(type => propPropTypes.includes(type));
      const dateOverlap = gameLogDates.filter(date => propDates.includes(date));
      const leagueOverlap = gameLogLeagues.filter(league => propLeagues.includes(league));
      
      console.log('\n🔍 Overlap Analysis:');
      console.log(`  Player ID Overlap: ${playerIdOverlap.length}/${Math.max(gameLogPlayerIds.length, propPlayerIds.length)}`);
      console.log(`  Prop Type Overlap: ${propTypeOverlap.length}/${Math.max(gameLogPropTypes.length, propPropTypes.length)}`);
      console.log(`  Date Overlap: ${dateOverlap.length}/${Math.max(gameLogDates.length, propDates.length)}`);
      console.log(`  League Overlap: ${leagueOverlap.length}/${Math.max(gameLogLeagues.length, propLeagues.length)}`);
      
      if (playerIdOverlap.length > 0) {
        console.log(`  Sample overlapping player IDs: ${playerIdOverlap.slice(0, 3).join(', ')}`);
      }
      
      // Try to find a specific match
      console.log('\n🔍 Looking for specific matches...');
      let matchFound = false;
      
      for (const gameLog of gameLogs.slice(0, 5)) {
        const matchingProps = proplines.filter(prop => 
          prop.player_id === gameLog.player_id &&
          prop.prop_type === gameLog.prop_type &&
          prop.date === gameLog.date
        );
        
        if (matchingProps.length > 0) {
          console.log(`✅ Found match for ${gameLog.player_name}:`);
          console.log(`   Game Log: ${gameLog.player_id} - ${gameLog.prop_type} - ${gameLog.date} - Value: ${gameLog.value}`);
          console.log(`   Prop Line: ${matchingProps[0].player_id} - ${matchingProps[0].prop_type} - ${matchingProps[0].date} - Line: ${matchingProps[0].line}`);
          matchFound = true;
          break;
        }
      }
      
      if (!matchFound) {
        console.log('❌ No direct matches found between game logs and proplines');
        console.log('📊 This explains why streaks calculation returns no data');
        
        // Show sample data for comparison
        if (gameLogs.length > 0 && proplines.length > 0) {
          console.log('\n📊 Sample comparison:');
          console.log('Game Log:', JSON.stringify({
            player_id: gameLogs[0].player_id,
            player_name: gameLogs[0].player_name,
            prop_type: gameLogs[0].prop_type,
            date: gameLogs[0].date,
            league: gameLogs[0].league,
            value: gameLogs[0].value
          }, null, 2));
          
          console.log('Prop Line:', JSON.stringify({
            player_id: proplines[0].player_id,
            player_name: proplines[0].player_name,
            prop_type: proplines[0].prop_type,
            date: proplines[0].date,
            league: proplines[0].league,
            line: proplines[0].line
          }, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugStreaksData().catch(console.error);
