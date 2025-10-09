// Clean diagnostic mapping function without duplicate keys
// This replaces the complex createPlayerPropsFromOdd function with a simpler, more transparent approach

// Expanded MARKET_MAP based on diagnostic analysis - NO DUPLICATE KEYS
const MARKET_MAP: Record<string, string> = {
  // Core markets
  "Passing Yards": "Passing Yards",
  "Rushing Yards": "Rushing Yards", 
  "Receiving Yards": "Receiving Yards",
  "Completions": "Completions",
  "Receptions": "Receptions",
  "3PT Made": "3PT Made",
  "Points": "Points",
  "Assists": "Assists",
  "Rebounds": "Rebounds",
  
  // NFL specific - common abbreviations and variations
  "Pass Yards": "Passing Yards",
  "passing yards": "Passing Yards",
  "pass yards": "Passing Yards",
  "passing yds": "Passing Yards",
  "pass yds": "Passing Yards",
  
  "Pass Attempts": "Pass Attempts",
  "Passing Attempts": "Pass Attempts",
  "pass attempts": "Pass Attempts",
  "passing attempts": "Pass Attempts",
  
  "Pass Completions": "Completions",
  "Passing Completions": "Completions",
  "pass completions": "Completions",
  "passing completions": "Completions",
  "completions": "Completions",
  
  "Pass TDs": "Passing Touchdowns",
  "Passing TDs": "Passing Touchdowns",
  "passing touchdowns": "Passing Touchdowns",
  "pass tds": "Passing Touchdowns",
  
  "Interceptions": "Interceptions",
  "Pass Interceptions": "Interceptions",
  "interceptions": "Interceptions",
  "pass interceptions": "Interceptions",
  "pass int": "Interceptions",
  
  "Rush Yards": "Rushing Yards",
  "rushing yards": "Rushing Yards",
  "rush yards": "Rushing Yards",
  "rushing yds": "Rushing Yards",
  "rush yds": "Rushing Yards",
  
  "Rush Attempts": "Carries",
  "Rushing Attempts": "Carries",
  "Carries": "Carries",
  "rush attempts": "Carries",
  "rushing attempts": "Carries",
  "carries": "Carries",
  
  "Rush TDs": "Rushing Touchdowns",
  "Rushing TDs": "Rushing Touchdowns",
  "rushing touchdowns": "Rushing Touchdowns",
  "rush tds": "Rushing Touchdowns",
  
  "Longest Rush": "Longest Rush",
  "longest rush": "Longest Rush",
  
  "Rec Yards": "Receiving Yards",
  "receiving yards": "Receiving Yards",
  "rec yards": "Receiving Yards",
  "receiving yds": "Receiving Yards",
  "rec yds": "Receiving Yards",
  
  "receptions": "Receptions",
  
  "Longest Reception": "Longest Reception",
  "longest reception": "Longest Reception",
  
  "Rec TDs": "Receiving Touchdowns",
  "Receiving TDs": "Receiving Touchdowns",
  "receiving touchdowns": "Receiving Touchdowns",
  "rec tds": "Receiving Touchdowns",
  
  // NFL Over/Under patterns
  "passing yards over/under": "Passing Yards",
  "rushing yards over/under": "Rushing Yards",
  "receiving yards over/under": "Receiving Yards",
  "receptions over/under": "Receptions",
  "passing touchdowns over/under": "Passing Touchdowns",
  "rushing touchdowns over/under": "Rushing Touchdowns",
  "receiving touchdowns over/under": "Receiving Touchdowns",
  "interceptions over/under": "Interceptions",
  
  // NFL Yes/No patterns
  "to record first touchdown yes/no": "First Touchdown",
  "any touchdowns yes/no": "Anytime Touchdown",
  "anytime touchdown yes/no": "Anytime Touchdown",
  "first touchdown": "First Touchdown",
  "anytime touchdown": "Anytime Touchdown",
  "to record first touchdown": "First Touchdown",
  "to record anytime touchdown": "Anytime Touchdown",
  "to score": "Anytime Touchdown",
  
  // NBA specific
  "points": "Points",
  "assists": "Assists",
  "rebounds": "Rebounds",
  "threes made": "3PT Made",
  "3pt made": "3PT Made",
  "steals": "Steals",
  "blocks": "Blocks",
  "points over/under": "Points",
  "assists over/under": "Assists",
  "rebounds over/under": "Rebounds",
  "threes made over/under": "3PT Made",
  "steals over/under": "Steals",
  "blocks over/under": "Blocks",
  
  // MLB specific - expanded based on diagnostic analysis
  "Hits": "Hits",
  "hits": "Hits",
  
  "Runs": "Runs",
  "runs": "Runs",
  
  "RBIs": "RBIs",
  "rbis": "RBIs",
  
  "Total Bases": "Total Bases",
  "total bases": "Total Bases",
  
  "Strikeouts": "Strikeouts",
  "strikeouts": "Strikeouts",
  
  "Walks": "Walks",
  "walks": "Walks",
  
  "Singles": "Singles",
  "singles": "Singles",
  
  "Doubles": "Doubles",
  "doubles": "Doubles",
  
  "Triples": "Triples",
  "triples": "Triples",
  
  "Home Runs": "Home Runs",
  "home runs": "Home Runs",
  
  "Fantasy Score": "Fantasy Score",
  "fantasy score": "Fantasy Score",
  
  // Additional MLB markets from diagnostic analysis
  "Pitching Outs": "Pitching Outs",
  "pitching outs": "Pitching Outs",
  
  "Earned Runs": "Earned Runs",
  "earned runs": "Earned Runs",
  
  "Stolen Bases": "Stolen Bases",
  "stolen bases": "Stolen Bases",
  
  "Hits + Runs + RBIs": "Hits + Runs + RBIs",
  "hits + runs + rbis": "Hits + Runs + RBIs",
  
  // MLB Over/Under patterns
  "hits over/under": "Hits",
  "runs over/under": "Runs",
  "rbis over/under": "RBIs",
  "total bases over/under": "Total Bases",
  "strikeouts over/under": "Strikeouts",
  "walks over/under": "Walks",
  "singles over/under": "Singles",
  "doubles over/under": "Doubles",
  "triples over/under": "Triples",
  "home runs over/under": "Home Runs",
  "fantasy score over/under": "Fantasy Score",
  
  // NHL specific
  "shots on goal": "Shots on Goal",
  "goals": "Goals",
  "saves": "Saves",
  "shots on goal over/under": "Shots on Goal",
  "goals over/under": "Goals",
  "saves over/under": "Saves",
  
  // Common patterns that might appear in any league
  "over/under": "Over/Under",
  "yes/no": "Yes/No"
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
      // Reduced logging to prevent log size limit exceeded
      if (index % 100 === 0) {
        console.log(`🔍 Processing odd ${index + 1}/${odds.length}:`, {
          playerName: odd.playerName,
          marketName: odd.marketName,
          line: odd.line,
          odds: odd.odds,
          sportsbook: odd.sportsbook,
          league: odd.league
        });
      }

      const playerId = normalizePlayerId(odd.playerName) || normalizePlayerId(odd.playerId);

      if (!playerId) {
        // console.log(`❌ Missing player ID for:`, odd.playerName); // Reduced logging
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
        // console.log(`❌ Unmapped market:`, odd.marketName); // Reduced logging
        stats.unmappedMarket++;
        return null;
      }

      // Check for required fields
      if (!odd.eventStartUtc || !odd.sportsbook) {
        // console.log(`❌ Incomplete odd data:`, { // Reduced logging
        //   eventStartUtc: odd.eventStartUtc, 
        //   sportsbook: odd.sportsbook,
        //   line: odd.line 
        // });
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
        over_odds: odd.overUnder === 'over' || odd.overUnder === 'yes' ? odd.odds : (odd.overUnder === 'under' || odd.overUnder === 'no' ? null : odd.odds),
        under_odds: odd.overUnder === 'under' || odd.overUnder === 'no' ? odd.odds : (odd.overUnder === 'over' || odd.overUnder === 'yes' ? null : null),
        league: (odd.league || 'UNKNOWN').toLowerCase(),
        season: season,
        game_id: odd.eventId || `${playerId}-${date}`,
        conflict_key: `${playerId}|${date}|${propType}|${odd.sportsbook}|${odd.league?.toLowerCase() || 'UNK'}|${season}`
      };

      // Reduced logging to prevent log size limit exceeded
      if (index % 100 === 0) {
        console.log(`✅ Successfully mapped prop:`, {
          player_id: mappedProp.player_id,
          prop_type: mappedProp.prop_type,
          line: mappedProp.line,
          league: mappedProp.league
        });
      }

      stats.success++;
      return mappedProp;
    })
    .filter(Boolean);

  console.log("🔍 Mapping diagnostics summary:", stats);
  return { mapped, stats };
}
