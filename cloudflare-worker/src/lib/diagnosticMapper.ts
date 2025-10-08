// Diagnostic mapping function to identify exactly why props are being dropped
// This replaces the complex createPlayerPropsFromOdd function with a simpler, more transparent approach

// Example MARKET_MAP — expand this as you see new markets
const MARKET_MAP: Record<string, string> = {
  "Passing Yards": "Passing Yards",
  "Rushing Yards": "Rushing Yards", 
  "Receiving Yards": "Receiving Yards",
  "Completions": "Completions",
  "Receptions": "Receptions",
  "3PT Made": "3PT Made",
  "Points": "Points",
  "Assists": "Assists",
  "Rebounds": "Rebounds",
  
  // NFL specific
  "passing yards": "Passing Yards",
  "pass yards": "Passing Yards",
  "passing yds": "Passing Yards",
  "pass yds": "Passing Yards",
  "rushing yards": "Rushing Yards",
  "rush yards": "Rushing Yards",
  "rushing yds": "Rushing Yards",
  "rush yds": "Rushing Yards",
  "receiving yards": "Receiving Yards",
  "rec yards": "Receiving Yards",
  "receiving yds": "Receiving Yards",
  "rec yds": "Receiving Yards",
  "receptions": "Receptions",
  "passing touchdowns": "Passing Touchdowns",
  "pass tds": "Passing Touchdowns",
  "rushing touchdowns": "Rushing Touchdowns",
  "rush tds": "Rushing Touchdowns",
  "receiving touchdowns": "Receiving Touchdowns",
  "rec tds": "Receiving Touchdowns",
  
  // NBA specific
  "points": "Points",
  "assists": "Assists",
  "rebounds": "Rebounds",
  "threes made": "3PT Made",
  "3pt made": "3PT Made",
  "steals": "Steals",
  "blocks": "Blocks",
  
  // MLB specific
  "hits": "Hits",
  "runs": "Runs",
  "rbis": "RBIs",
  "total bases": "Total Bases",
  "strikeouts": "Strikeouts",
  
  // NHL specific
  "shots on goal": "Shots on Goal",
  "goals": "Goals",
  "saves": "Saves",
  
  // Yes/No bets (common patterns)
  "first touchdown": "First Touchdown",
  "anytime touchdown": "Anytime Touchdown",
  "to record first touchdown": "First Touchdown",
  "to record anytime touchdown": "Anytime Touchdown",
  "to score": "Anytime Touchdown",
  
  // Add more as needed
};

function normalizePlayerId(nameOrId?: string): string | null {
  if (!nameOrId) return null;
  
  // Simple normalization - just return the name for now
  // In production, you'd want to match against your players table
  return nameOrId.trim().replace(/\s+/g, '_').toUpperCase();
}

export function mapWithDiagnostics(odds: any[]): { mapped: any[]; stats: any } {
  const stats = {
    missingPlayerId: 0,
    unmappedMarket: 0,
    incompleteOdd: 0,
    success: 0,
    total: odds.length
  };

  const mapped = odds
    .map((odd, index) => {
      console.log(`🔍 Processing odd ${index + 1}/${odds.length}:`, {
        playerName: odd.playerName,
        marketName: odd.marketName,
        line: odd.line,
        odds: odd.odds,
        sportsbook: odd.sportsbook,
        league: odd.league
      });

      const playerId = normalizePlayerId(odd.playerName) || normalizePlayerId(odd.playerId);

      if (!playerId) {
        console.log(`❌ Missing player ID for:`, odd.playerName);
        stats.missingPlayerId++;
        return null;
      }

      // Try multiple market name variations
      let propType = MARKET_MAP[odd.marketName];
      if (!propType) {
        // Try lowercase
        propType = MARKET_MAP[odd.marketName?.toLowerCase()];
      }
      if (!propType) {
        // Try extracting key words
        const marketWords = odd.marketName?.toLowerCase().split(' ') || [];
        for (const word of marketWords) {
          if (MARKET_MAP[word]) {
            propType = MARKET_MAP[word];
            break;
          }
        }
      }
      
      if (!propType) {
        console.log(`❌ Unmapped market:`, odd.marketName);
        stats.unmappedMarket++;
        return null;
      }

      // Check for required fields
      if (!odd.eventStartUtc || !odd.sportsbook) {
        console.log(`❌ Incomplete odd data:`, { 
          eventStartUtc: odd.eventStartUtc, 
          sportsbook: odd.sportsbook,
          line: odd.line 
        });
        stats.incompleteOdd++;
        return null;
      }

      // Extract date from eventStartUtc
      const date = odd.eventStartUtc.split('T')[0];
      const season = new Date(date).getFullYear();
      
      const mappedProp = {
        player_id: playerId,
        player_name: odd.playerName,
        team: odd.team || 'UNK',
        opponent: odd.opponent || 'UNK',
        date: date,
        prop_type: propType,
        sportsbook: odd.sportsbook,
        line: odd.line || 0, // Default to 0 for Yes/No bets
        over_odds: odd.overUnder === 'over' || odd.overUnder === 'yes' ? odd.odds : null,
        under_odds: odd.overUnder === 'under' || odd.overUnder === 'no' ? odd.odds : null,
        league: (odd.league || 'UNKNOWN').toLowerCase(),
        season: season,
        game_id: odd.eventId || `${playerId}-${date}`,
        conflict_key: `${playerId}|${date}|${propType}|${odd.sportsbook}|${odd.league?.toLowerCase() || 'UNK'}|${season}`
      };

      console.log(`✅ Successfully mapped prop:`, {
        player_id: mappedProp.player_id,
        prop_type: mappedProp.prop_type,
        line: mappedProp.line,
        league: mappedProp.league
      });

      stats.success++;
      return mappedProp;
    })
    .filter(Boolean);

  console.log("🔍 Mapping diagnostics summary:", stats);
  return { mapped, stats };
}
