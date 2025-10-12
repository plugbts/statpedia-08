#!/usr/bin/env node

// Find all available NFL prop types in the data

async function findAllNFLProps() {
  console.log('🔍 Finding All Available NFL Prop Types\n');

  try {
    // Get a broader sample of NFL data
    const response = await fetch('https://statpedia-player-props.statpedia.workers.dev/debug/sgo-api?league=nfl');
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.sampleEvents) {
        console.log(`📊 Analyzing ${result.sampleEvents.length} NFL Events...\n`);
        
        const allPlayerProps = [];
        const statTypes = new Set();
        const oddIds = new Set();
        
        result.sampleEvents.forEach((event, eventIndex) => {
          if (event.playerPropsOdds) {
            console.log(`Game ${eventIndex + 1}: ${event.playerPropsOdds.length} player props`);
            event.playerPropsOdds.forEach(prop => {
              allPlayerProps.push(prop);
              statTypes.add(prop.statID);
              oddIds.add(prop.oddId);
            });
          }
        });
        
        console.log('\n🎯 All Unique Stat Types Found:');
        Array.from(statTypes).sort().forEach(statType => {
          const count = allPlayerProps.filter(p => p.statID === statType).length;
          console.log(`  ${statType}: ${count} props`);
        });
        
        console.log('\n🔍 Sample Odd IDs:');
        Array.from(oddIds).slice(0, 20).forEach(oddId => {
          console.log(`  ${oddId}`);
        });
        
        if (oddIds.size > 20) {
          console.log(`  ... and ${oddIds.size - 20} more`);
        }
        
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
          
          console.log('\n💡 Suggested oddIDs additions:');
          missingStats.forEach(stat => {
            console.log(`  ${stat}-PLAYER_ID-game-yn-yes,${stat}-PLAYER_ID-game-yn-no`);
          });
        } else {
          console.log('  ✅ All stat types are configured!');
        }
        
        // Check if we have any regular NFL props
        const regularNFLStats = ['passing_yards', 'rushing_yards', 'receiving_yards', 'receptions'];
        const hasRegularProps = regularNFLStats.some(stat => statTypes.has(stat));
        
        if (!hasRegularProps) {
          console.log('\n⚠️ WARNING: No regular NFL props found!');
          console.log('   The current data only contains special props (like firstTouchdown).');
          console.log('   This might be why NFL ingestion is failing - no matching props to process.');
        } else {
          console.log('\n✅ Regular NFL props found in data!');
        }
        
      }
    } else {
      console.log('❌ Failed to get NFL data:', response.status);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

findAllNFLProps();
