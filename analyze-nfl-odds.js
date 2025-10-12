#!/usr/bin/env node

// Analyze NFL odds to see what prop types are actually available

async function analyzeNFLOdds() {
  console.log('🔍 Analyzing NFL Odds to Find Missing Prop Types\n');

  try {
    // Get more detailed NFL data
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/debug/sgo-api?league=nfl');
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.sampleEvents) {
        console.log('📊 Analyzing NFL Player Props...\n');
        
        const allPlayerProps = [];
        const statTypes = new Set();
        
        result.sampleEvents.forEach((event, eventIndex) => {
          if (event.playerPropsOdds) {
            console.log(`Game ${eventIndex + 1} (${event.gameId}):`);
            event.playerPropsOdds.forEach(prop => {
              allPlayerProps.push(prop);
              statTypes.add(prop.statID);
              console.log(`  ${prop.statID}: ${prop.playerID}`);
            });
            console.log('');
          }
        });
        
        console.log('🎯 Unique Stat Types Found:');
        Array.from(statTypes).sort().forEach(statType => {
          const count = allPlayerProps.filter(p => p.statID === statType).length;
          console.log(`  ${statType}: ${count} props`);
        });
        
        console.log('\n📋 Current NFL oddIDs Configuration:');
        const currentOddIDs = "passing_yards-PLAYER_ID-game-ou-over,rushing_yards-PLAYER_ID-game-ou-over,receiving_yards-PLAYER_ID-game-ou-over,receptions-PLAYER_ID-game-ou-over,passing_touchdowns-PLAYER_ID-game-ou-over,rushing_touchdowns-PLAYER_ID-game-ou-over,receiving_touchdowns-PLAYER_ID-game-ou-over,passing+rushing_yards-PLAYER_ID-game-ou-over,rushing+receiving_yards-PLAYER_ID-game-ou-over,firstTouchdown-PLAYER_ID-game-yn-yes,firstTouchdown-PLAYER_ID-game-yn-no";
        console.log(currentOddIDs);
        
        console.log('\n🔍 Missing Stat Types (not in current config):');
        const configuredStats = ['passing_yards', 'rushing_yards', 'receiving_yards', 'receptions', 'passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns', 'passing+rushing_yards', 'rushing+receiving_yards', 'firstTouchdown'];
        const missingStats = Array.from(statTypes).filter(stat => !configuredStats.includes(stat));
        
        if (missingStats.length > 0) {
          missingStats.forEach(stat => {
            const count = allPlayerProps.filter(p => p.statID === stat).length;
            console.log(`  ❌ ${stat}: ${count} props (MISSING FROM CONFIG)`);
          });
        } else {
          console.log('  ✅ All stat types are configured!');
        }
        
      }
    } else {
      console.log('❌ Failed to get NFL data:', response.status);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

analyzeNFLOdds();
