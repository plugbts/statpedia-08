// Script to populate the players table with comprehensive player data
// This can be run to bulk load players from various sources

const SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODgzNiwiZXhwIjoyMDc0NjI0ODM2fQ.E9LQFvqVs9Z1cXoS34ov5qV3jBkbqCHPCL16GBt480g";

// Comprehensive player data
const PLAYERS_DATA = [
  // NFL Players - Extended list
  { player_id: 'JOSH_ALLEN-QB-BUF', full_name: 'Josh Allen', first_name: 'Josh', last_name: 'Allen', team: 'BUF', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'PATRICK_MAHOMES-QB-KC', full_name: 'Patrick Mahomes', first_name: 'Patrick', last_name: 'Mahomes', team: 'KC', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'LAMAR_JACKSON-QB-BAL', full_name: 'Lamar Jackson', first_name: 'Lamar', last_name: 'Jackson', team: 'BAL', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'AARON_RODGERS-QB-NYJ', full_name: 'Aaron Rodgers', first_name: 'Aaron', last_name: 'Rodgers', team: 'NYJ', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'DEREK_CARR-QB-NO', full_name: 'Derek Carr', first_name: 'Derek', last_name: 'Carr', team: 'NO', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'DANIEL_JONES-QB-NYG', full_name: 'Daniel Jones', first_name: 'Daniel', last_name: 'Jones', team: 'NYG', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'JALEN_HURTS-QB-PHI', full_name: 'Jalen Hurts', first_name: 'Jalen', last_name: 'Hurts', team: 'PHI', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'DALLAS_PRESCOTT-QB-DAL', full_name: 'Dak Prescott', first_name: 'Dak', last_name: 'Prescott', team: 'DAL', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'RUSSELL_WILSON-QB-DEN', full_name: 'Russell Wilson', first_name: 'Russell', last_name: 'Wilson', team: 'DEN', league: 'NFL', position: 'QB', sport: 'football' },
  { player_id: 'KIRK_COUSINS-QB-MIN', full_name: 'Kirk Cousins', first_name: 'Kirk', last_name: 'Cousins', team: 'MIN', league: 'NFL', position: 'QB', sport: 'football' },
  
  // NFL Running Backs
  { player_id: 'AUSTIN_EKELER-RB-LAC', full_name: 'Austin Ekeler', first_name: 'Austin', last_name: 'Ekeler', team: 'LAC', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'DERRICK_HENRY-RB-TEN', full_name: 'Derrick Henry', first_name: 'Derrick', last_name: 'Henry', team: 'TEN', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'JONATHAN_TAYLOR-RB-IND', full_name: 'Jonathan Taylor', first_name: 'Jonathan', last_name: 'Taylor', team: 'IND', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'CHRISTIAN_MCCAFFREY-RB-SF', full_name: 'Christian McCaffrey', first_name: 'Christian', last_name: 'McCaffrey', team: 'SF', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'NICK_CHUBB-RB-CLE', full_name: 'Nick Chubb', first_name: 'Nick', last_name: 'Chubb', team: 'CLE', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'SAQUON_BARKLEY-RB-NYG', full_name: 'Saquon Barkley', first_name: 'Saquon', last_name: 'Barkley', team: 'NYG', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'ALVIN_KAMARA-RB-NO', full_name: 'Alvin Kamara', first_name: 'Alvin', last_name: 'Kamara', team: 'NO', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'DALVIN_COOK-RB-NYJ', full_name: 'Dalvin Cook', first_name: 'Dalvin', last_name: 'Cook', team: 'NYJ', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'JOE_MIXON-RB-CIN', full_name: 'Joe Mixon', first_name: 'Joe', last_name: 'Mixon', team: 'CIN', league: 'NFL', position: 'RB', sport: 'football' },
  { player_id: 'JOSH_JACOBS-RB-GB', full_name: 'Josh Jacobs', first_name: 'Josh', last_name: 'Jacobs', team: 'GB', league: 'NFL', position: 'RB', sport: 'football' },
  
  // NFL Wide Receivers
  { player_id: 'STEFON_DIGGS-WR-BUF', full_name: 'Stefon Diggs', first_name: 'Stefon', last_name: 'Diggs', team: 'BUF', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'TYREEK_HILL-WR-MIA', full_name: 'Tyreek Hill', first_name: 'Tyreek', last_name: 'Hill', team: 'MIA', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'DAVANTE_ADAMS-WR-LAR', full_name: 'Davante Adams', first_name: 'Davante', last_name: 'Adams', team: 'LAR', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'COOPER_KUPP-WR-LAR', full_name: 'Cooper Kupp', first_name: 'Cooper', last_name: 'Kupp', team: 'LAR', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'JAXON_SMITHNJIGBA-WR-SEA', full_name: 'Jaxon Smith-Njigba', first_name: 'Jaxon', last_name: 'Smith-Njigba', team: 'SEA', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'CEEDEE_LAMB-WR-DAL', full_name: 'CeeDee Lamb', first_name: 'CeeDee', last_name: 'Lamb', team: 'DAL', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'AJ_BROWN-WR-PHI', full_name: 'AJ Brown', first_name: 'AJ', last_name: 'Brown', team: 'PHI', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'MIKE_EVANS-WR-TB', full_name: 'Mike Evans', first_name: 'Mike', last_name: 'Evans', team: 'TB', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'KEELEEN_ALLEN-WR-LAC', full_name: 'Keenan Allen', first_name: 'Keenan', last_name: 'Allen', team: 'LAC', league: 'NFL', position: 'WR', sport: 'football' },
  { player_id: 'AMARI_COOPER-WR-CLE', full_name: 'Amari Cooper', first_name: 'Amari', last_name: 'Cooper', team: 'CLE', league: 'NFL', position: 'WR', sport: 'football' },
  
  // NFL Tight Ends
  { player_id: 'TRAVIS_KELCE-TE-KC', full_name: 'Travis Kelce', first_name: 'Travis', last_name: 'Kelce', team: 'KC', league: 'NFL', position: 'TE', sport: 'football' },
  { player_id: 'MARK_ANDREWS-TE-BAL', full_name: 'Mark Andrews', first_name: 'Mark', last_name: 'Andrews', team: 'BAL', league: 'NFL', position: 'TE', sport: 'football' },
  { player_id: 'GEORGE_KITTLE-TE-SF', full_name: 'George Kittle', first_name: 'George', last_name: 'Kittle', team: 'SF', league: 'NFL', position: 'TE', sport: 'football' },
  { player_id: 'DARREN_WALLER-TE-NYG', full_name: 'Darren Waller', first_name: 'Darren', last_name: 'Waller', team: 'NYG', league: 'NFL', position: 'TE', sport: 'football' },
  { player_id: 'KYLE_PITTS-TE-ATL', full_name: 'Kyle Pitts', first_name: 'Kyle', last_name: 'Pitts', team: 'ATL', league: 'NFL', position: 'TE', sport: 'football' },
  
  // NBA Players - Extended list
  { player_id: 'LEBRON_JAMES-SF-LAL', full_name: 'LeBron James', first_name: 'LeBron', last_name: 'James', team: 'LAL', league: 'NBA', position: 'SF', sport: 'basketball' },
  { player_id: 'STEPHEN_CURRY-PG-GSW', full_name: 'Stephen Curry', first_name: 'Stephen', last_name: 'Curry', team: 'GSW', league: 'NBA', position: 'PG', sport: 'basketball' },
  { player_id: 'KEVIN_DURANT-SF-PHX', full_name: 'Kevin Durant', first_name: 'Kevin', last_name: 'Durant', team: 'PHX', league: 'NBA', position: 'SF', sport: 'basketball' },
  { player_id: 'GIANNIS_ANTETOKOUNMPO-PF-MIL', full_name: 'Giannis Antetokounmpo', first_name: 'Giannis', last_name: 'Antetokounmpo', team: 'MIL', league: 'NBA', position: 'PF', sport: 'basketball' },
  { player_id: 'LUKA_DONCIC-PG-DAL', full_name: 'Luka Doncic', first_name: 'Luka', last_name: 'Doncic', team: 'DAL', league: 'NBA', position: 'PG', sport: 'basketball' },
  { player_id: 'JAYSON_TATUM-SF-BOS', full_name: 'Jayson Tatum', first_name: 'Jayson', last_name: 'Tatum', team: 'BOS', league: 'NBA', position: 'SF', sport: 'basketball' },
  { player_id: 'JIMMY_BUTLER-SF-MIA', full_name: 'Jimmy Butler', first_name: 'Jimmy', last_name: 'Butler', team: 'MIA', league: 'NBA', position: 'SF', sport: 'basketball' },
  { player_id: 'JOEL_EMBIID-C-PHI', full_name: 'Joel Embiid', first_name: 'Joel', last_name: 'Embiid', team: 'PHI', league: 'NBA', position: 'C', sport: 'basketball' },
  { player_id: 'NIKOLA_JOKIC-C-DEN', full_name: 'Nikola Jokic', first_name: 'Nikola', last_name: 'Jokic', team: 'DEN', league: 'NBA', position: 'C', sport: 'basketball' },
  { player_id: 'DAMIAN_LILLARD-PG-MIL', full_name: 'Damian Lillard', first_name: 'Damian', last_name: 'Lillard', team: 'MIL', league: 'NBA', position: 'PG', sport: 'basketball' },
  
  // MLB Players - Extended list
  { player_id: 'MIKE_TROUT-OF-LAA', full_name: 'Mike Trout', first_name: 'Mike', last_name: 'Trout', team: 'LAA', league: 'MLB', position: 'OF', sport: 'baseball' },
  { player_id: 'RONALD_ACUNA_JR-OF-ATL', full_name: 'Ronald Acuna Jr', first_name: 'Ronald', last_name: 'Acuna Jr', team: 'ATL', league: 'MLB', position: 'OF', sport: 'baseball' },
  { player_id: 'AARON_JUDGE-OF-NYY', full_name: 'Aaron Judge', first_name: 'Aaron', last_name: 'Judge', team: 'NYY', league: 'MLB', position: 'OF', sport: 'baseball' },
  { player_id: 'FREDDIE_FREEMAN-1B-LAD', full_name: 'Freddie Freeman', first_name: 'Freddie', last_name: 'Freeman', team: 'LAD', league: 'MLB', position: '1B', sport: 'baseball' },
  { player_id: 'JOSE_ALTUVE-2B-HOU', full_name: 'Jose Altuve', first_name: 'Jose', last_name: 'Altuve', team: 'HOU', league: 'MLB', position: '2B', sport: 'baseball' },
  { player_id: 'MOOKIE_BETTS-OF-LAD', full_name: 'Mookie Betts', first_name: 'Mookie', last_name: 'Betts', team: 'LAD', league: 'MLB', position: 'OF', sport: 'baseball' },
  { player_id: 'JUAN_SOTO-OF-SD', full_name: 'Juan Soto', first_name: 'Juan', last_name: 'Soto', team: 'SD', league: 'MLB', position: 'OF', sport: 'baseball' },
  { player_id: 'VLADIMIR_GUERRERO_JR-1B-TOR', full_name: 'Vladimir Guerrero Jr', first_name: 'Vladimir', last_name: 'Guerrero Jr', team: 'TOR', league: 'MLB', position: '1B', sport: 'baseball' },
  { player_id: 'BO_BICHETTE-SS-TOR', full_name: 'Bo Bichette', first_name: 'Bo', last_name: 'Bichette', team: 'TOR', league: 'MLB', position: 'SS', sport: 'baseball' },
  { player_id: 'FERNANDO_TATIS_JR-SS-SD', full_name: 'Fernando Tatis Jr', first_name: 'Fernando', last_name: 'Tatis Jr', team: 'SD', league: 'MLB', position: 'SS', sport: 'baseball' },
  
  // NHL Players - Extended list
  { player_id: 'CONNOR_MCDAVID-C-EDM', full_name: 'Connor McDavid', first_name: 'Connor', last_name: 'McDavid', team: 'EDM', league: 'NHL', position: 'C', sport: 'hockey' },
  { player_id: 'LEON_DRAISAITL-C-EDM', full_name: 'Leon Draisaitl', first_name: 'Leon', last_name: 'Draisaitl', team: 'EDM', league: 'NHL', position: 'C', sport: 'hockey' },
  { player_id: 'AUSTON_MATTHEWS-C-TOR', full_name: 'Auston Matthews', first_name: 'Auston', last_name: 'Matthews', team: 'TOR', league: 'NHL', position: 'C', sport: 'hockey' },
  { player_id: 'MITCH_MARNER-RW-TOR', full_name: 'Mitch Marner', first_name: 'Mitch', last_name: 'Marner', team: 'TOR', league: 'NHL', position: 'RW', sport: 'hockey' },
  { player_id: 'ARTEMI_PANARIN-LW-NYR', full_name: 'Artemi Panarin', first_name: 'Artemi', last_name: 'Panarin', team: 'NYR', league: 'NHL', position: 'LW', sport: 'hockey' },
  { player_id: 'ALEXANDER_OVECHKIN-LW-WSH', full_name: 'Alexander Ovechkin', first_name: 'Alexander', last_name: 'Ovechkin', team: 'WSH', league: 'NHL', position: 'LW', sport: 'hockey' },
  { player_id: 'SIDNEY_CROSBY-C-PIT', full_name: 'Sidney Crosby', first_name: 'Sidney', last_name: 'Crosby', team: 'PIT', league: 'NHL', position: 'C', sport: 'hockey' },
  { player_id: 'EVGENI_MALKIN-C-PIT', full_name: 'Evgeni Malkin', first_name: 'Evgeni', last_name: 'Malkin', team: 'PIT', league: 'NHL', position: 'C', sport: 'hockey' },
  { player_id: 'NIKITA_KUCHEROV-RW-TB', full_name: 'Nikita Kucherov', first_name: 'Nikita', last_name: 'Kucherov', team: 'TB', league: 'NHL', position: 'RW', sport: 'hockey' },
  { player_id: 'STEVEN_STAMKOS-C-TB', full_name: 'Steven Stamkos', first_name: 'Steven', last_name: 'Stamkos', team: 'TB', league: 'NHL', position: 'C', sport: 'hockey' },
];

async function populatePlayersTable() {
  console.log('🔄 Populating players table...');
  
  try {
    // Check current count
    const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/players?select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    const existingPlayers = await countResponse.json();
    console.log(`📊 Current players in table: ${existingPlayers.length}`);
    
    // Insert players in batches
    const batchSize = 50;
    let inserted = 0;
    let skipped = 0;
    
    for (let i = 0; i < PLAYERS_DATA.length; i += batchSize) {
      const batch = PLAYERS_DATA.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates'
          },
          body: JSON.stringify(batch)
        });
        
        if (response.ok) {
          const result = await response.json();
          inserted += Array.isArray(result) ? result.length : batch.length;
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${Array.isArray(result) ? result.length : batch.length} players`);
        } else {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, response.statusText);
          skipped += batch.length;
        }
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error);
        skipped += batch.length;
      }
    }
    
    console.log(`\n🎉 Population complete!`);
    console.log(`✅ Inserted: ${inserted} players`);
    console.log(`⚠️ Skipped: ${skipped} players`);
    
    // Verify final count
    const finalCountResponse = await fetch(`${SUPABASE_URL}/rest/v1/players?select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    const finalPlayers = await finalCountResponse.json();
    console.log(`📊 Final players in table: ${finalPlayers.length}`);
    
  } catch (error) {
    console.error('❌ Error populating players table:', error);
    process.exit(1);
  }
}

// Run the population
populatePlayersTable();
