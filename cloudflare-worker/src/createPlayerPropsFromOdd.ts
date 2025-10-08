import { toYmd } from "./helpers";

export function createPlayerPropsFromOdd(odd: any, oddId: string, event: any, league: string, season: string, week?: string): any[] {
  const props: any[] = [];
  
  // Extract player information
  const playerName = odd.player?.name;
  const team = odd.player?.team;
  
  if (!playerName || !team) {
    console.log(`Skipping odd ${oddId}: missing player name or team`);
    return props;
  }

  // Generate player ID
  const playerID = `${playerName.toUpperCase().replace(/\s+/g, '_')}_1_${league}`;
  
  if (!playerID || playerID.includes('_1_')) {
    console.error("Missing player_id mapping", { 
      playerName, 
      team, 
      league, 
      generatedId: playerID 
    });
  }
  
  // Extract game date - use event date, not ingestion date
  const gameDate = event.date ? event.date.split('T')[0] : new Date().toISOString().split('T')[0];
  
  // Extract prop information
  const propType = odd.prop?.name;
  const line = odd.line;
  const overOdds = odd.overOdds;
  const underOdds = odd.underOdds;
  const sportsbook = mapBookmakerIdToName(odd.bookmaker?.id || 'unknown') || 'Consensus';
  
  if (!propType || line == null) {
    console.log(`Skipping odd ${oddId}: missing prop type or line`);
    return props;
  }

  // Create the prop record
  const prop = {
    player_id: playerID,
    player_name: playerName,
    team: team,
    opponent: event.teams?.find((t: any) => t !== team) || null,
    season: parseInt(season),
    date: gameDate,
    prop_type: propType,
    line: parseFloat(line),
    over_odds: overOdds ? parseInt(overOdds) : null,
    under_odds: underOdds ? parseInt(underOdds) : null,
    sportsbook: sportsbook,
    conflict_key: `${playerID}-${propType}-${line}-${sportsbook}-${gameDate}`
  };

  props.push(prop);
  return props;
}

function mapBookmakerIdToName(bookmakerId: string): string {
  const bookmakerMap: Record<string, string> = {
    'draftkings': 'DraftKings',
    'fanduel': 'FanDuel',
    'betmgm': 'BetMGM',
    'caesars': 'Caesars',
    'pointsbet': 'PointsBet',
    'betrivers': 'BetRivers',
    'unibet': 'Unibet',
    'sugarhouse': 'SugarHouse',
    'foxbet': 'FOX Bet',
    'bet365': 'Bet365',
    'williamhill': 'William Hill',
    'pinnacle': 'Pinnacle',
    'betfair': 'Betfair',
    'bovada': 'Bovada',
    'mybookie': 'MyBookie',
    'consensus': 'Consensus',
    'unknown': 'Consensus'
  };
  
  return bookmakerMap[bookmakerId.toLowerCase()] || 'Consensus';
}
