// Prop type formatting utility for consistent display across components

export const formatPropType = (propType: string): string => {
  if (!propType) return 'Unknown Prop';
  
  // Remove player name if it appears in prop type - MORE AGGRESSIVE CLEANING
  let cleanPropType = propType
    .replace(/^[A-Za-z\s]+(?:'s)?\s+/, '') // Remove player name prefix like "Josh Allen's" or "Josh Allen"
    .replace(/^[A-Za-z\s]+(?:\s+[A-Za-z]+)?\s+/, '') // Remove any two-word player names
    .replace(/^(Passing|Rushing|Receiving|Defense|Kicking|Field Goal|Extra Point)\s+/, '') // Remove redundant prefixes
    .replace(/^[A-Z][a-z]+\s+[A-Z][a-z]+\s+/, '') // Remove any remaining two-word names at start
    .replace(/^[A-Z][a-z]+\s+/, '') // Remove any remaining single word names at start
  
  // Convert snake_case to Title Case
  let formatted = cleanPropType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Handle specific prop type mappings for cleaner display
  const propMappings: Record<string, string> = {
    'passing yards': 'Passing Yards',
    'passing touchdowns': 'Passing TDs',
    'passing attempts': 'Pass Attempts',
    'passing completions': 'Pass Completions',
    'passing interceptions': 'Pass INTs',
    'rushing yards': 'Rushing Yards',
    'rushing touchdowns': 'Rushing TDs',
    'rushing attempts': 'Rush Attempts',
    'receiving yards': 'Receiving Yards',
    'receiving touchdowns': 'Receiving TDs',
    'receiving receptions': 'Receptions',
    'receivingeptions': 'Receptions', // Fix typo
    'longest completion': 'Longest Completion',
    'longest reception': 'Longest Reception',
    'longest rush': 'Longest Rush',
    'passing + rushing yards': 'Pass + Rush Yards',
    'rushing + receiving yards': 'Rush + Rec Yards',
    'passing + rushing + receiving yards': 'Total Yards',
    'defense sacks': 'Sacks',
    'defense interceptions': 'Interceptions',
    'defense tackles': 'Tackles',
    'defense combined tackles': 'Combined Tackles',
    'field goals made': 'Field Goals Made',
    'field goal attempts': 'Field Goal Attempts',
    'extra points made': 'Extra Points Made',
    'kicking total points': 'Kicker Points'
  };
  
  // Apply mappings
  const lowerFormatted = formatted.toLowerCase();
  for (const [key, value] of Object.entries(propMappings)) {
    if (lowerFormatted.includes(key)) {
      return value;
    }
  }
  
  // Fallback formatting
  return formatted
    .replace(/Rec/g, 'Receiving')
    .replace(/Rush/g, 'Rushing')
    .replace(/Pass/g, 'Passing')
    .replace(/Td/g, 'Touchdown')
    .replace(/Yd/g, 'Yard')
    .replace(/Yds/g, 'Yards')
    .replace(/Int/g, 'Interception')
    .replace(/Sack/g, 'Sack')
    .replace(/Tackle/g, 'Tackle')
    .replace(/Fumble/g, 'Fumble')
    .replace(/Block/g, 'Block')
    .replace(/Safety/g, 'Safety')
    .replace(/Punt/g, 'Punt')
    .replace(/Kick/g, 'Kick')
    .replace(/Field Goal/g, 'Field Goal')
    .replace(/Extra Point/g, 'Extra Point')
    .replace(/Two Point/g, 'Two Point')
    .replace(/First/g, 'First')
    .replace(/Last/g, 'Last')
    .replace(/Anytime/g, 'Anytime')
    .replace(/Longest/g, 'Longest')
    .replace(/Shortest/g, 'Shortest')
    .replace(/Total/g, 'Total')
    .replace(/Combined/g, 'Combined')
    .replace(/Alt/g, 'Alt')
    .replace(/Line/g, 'Line')
    .replace(/Spread/g, 'Spread')
    .replace(/Moneyline/g, 'Moneyline')
    .replace(/Over/g, 'Over')
    .replace(/Under/g, 'Under');
};

// Helper function for ordinal suffixes
export const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
};

// Team abbreviation mapping for common team name variations
export const teamAbbrMap: Record<string, string> = {
  // NFL teams
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS'
};

// Get team abbreviation with fallback logic
export const getTeamAbbreviation = (team: string, teamAbbr: string): string => {
  if (teamAbbr && teamAbbr !== '—' && teamAbbr !== 'UNK' && teamAbbr !== 'Unknown') {
    return teamAbbr.toUpperCase();
  }
  
  // Try to map from team name
  if (team && team !== '—' && team !== 'UNK' && team !== 'Unknown') {
    const mappedAbbr = teamAbbrMap[team];
    if (mappedAbbr) {
      return mappedAbbr;
    }
    
    // Try to extract abbreviation from team name
    const words = team.split(' ');
    if (words.length >= 2) {
      // Take first letter of each word for multi-word team names
      return words.map(word => word.charAt(0)).join('').toUpperCase();
    } else if (words.length === 1) {
      // For single word teams, take first 3 letters
      return words[0].substring(0, 3).toUpperCase();
    }
  }
  
  return 'UNK';
};
