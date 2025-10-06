export function normalizeOpponent(team: string): string {
  if (!team) return "";
  const map: Record<string, string> = {
    "Kansas City Chiefs": "KC",
    "Jacksonville Jaguars": "JAX",
    "Philadelphia Eagles": "PHI",
    "Dallas Cowboys": "DAL",
    "Buffalo Bills": "BUF",
    "Miami Dolphins": "MIA",
    "New England Patriots": "NE",
    "New York Jets": "NYJ",
    "Baltimore Ravens": "BAL",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Pittsburgh Steelers": "PIT",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Tennessee Titans": "TEN",
    "Denver Broncos": "DEN",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "New York Giants": "NYG",
    "Washington Commanders": "WSH",
    "Chicago Bears": "CHI",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Minnesota Vikings": "MIN",
    "Atlanta Falcons": "ATL",
    "Carolina Panthers": "CAR",
    "New Orleans Saints": "NO",
    "Tampa Bay Buccaneers": "TB",
    "Arizona Cardinals": "ARI",
    "Los Angeles Rams": "LAR",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
  };
  if (team.length <= 3) return team.toUpperCase();
  return map[team] || team;
}

export function normalizeMarketType(market: string): string {
  if (!market) return "";
  const lower = market.toLowerCase();
  if (lower.includes("pass comp")) return "Passing Completions";
  if (lower.includes("pass yard")) return "Passing Yards";
  if (lower.includes("rush yard")) return "Rushing Yards";
  if (lower.includes("rush att")) return "Rushing Attempts";
  if (lower.includes("longest rush")) return "Longest Rush";
  if (lower.includes("rec yard")) return "Receiving Yards";
  if (lower.includes("rec")) return "Receptions";
  if (lower.includes("td")) return "Touchdowns";
  if (lower.includes("interception")) return "Interceptions";
  if (lower.includes("pass td")) return "Passing Touchdowns";
  if (lower.includes("rush td")) return "Rushing Touchdowns";
  if (lower.includes("rec td")) return "Receiving Touchdowns";
  if (lower.includes("fumble")) return "Fumbles";
  if (lower.includes("sack")) return "Sacks";
  if (lower.includes("tackle")) return "Tackles";
  if (lower.includes("assist")) return "Assists";
  if (lower.includes("int")) return "Interceptions";
  if (lower.includes("fg")) return "Field Goals";
  if (lower.includes("pat")) return "Extra Points";
  return market;
}

export function normalizePosition(pos: string): string {
  if (!pos) return "";
  const map: Record<string, string> = {
    "QB": "QB", "Quarterback": "QB",
    "RB": "RB", "Running Back": "RB",
    "WR": "WR", "Wide Receiver": "WR",
    "TE": "TE", "Tight End": "TE",
    "K": "K", "Kicker": "K",
    "DEF": "DEF", "Defense": "DEF",
    "DST": "DEF", "Defense/Special Teams": "DEF",
    "OL": "OL", "Offensive Line": "OL",
    "DL": "DL", "Defensive Line": "DL",
    "LB": "LB", "Linebacker": "LB",
    "DB": "DB", "Defensive Back": "DB",
    "CB": "CB", "Cornerback": "CB",
    "S": "S", "Safety": "S",
  };
  return map[pos] || pos;
}

export function normalizeTeam(team: string): string {
  if (!team) return "";
  const map: Record<string, string> = {
    "Kansas City Chiefs": "KC",
    "Jacksonville Jaguars": "JAX",
    "Philadelphia Eagles": "PHI",
    "Dallas Cowboys": "DAL",
    "Buffalo Bills": "BUF",
    "Miami Dolphins": "MIA",
    "New England Patriots": "NE",
    "New York Jets": "NYJ",
    "Baltimore Ravens": "BAL",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Pittsburgh Steelers": "PIT",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Tennessee Titans": "TEN",
    "Denver Broncos": "DEN",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "New York Giants": "NYG",
    "Washington Commanders": "WSH",
    "Chicago Bears": "CHI",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Minnesota Vikings": "MIN",
    "Atlanta Falcons": "ATL",
    "Carolina Panthers": "CAR",
    "New Orleans Saints": "NO",
    "Tampa Bay Buccaneers": "TB",
    "Arizona Cardinals": "ARI",
    "Los Angeles Rams": "LAR",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
  };
  if (team.length <= 3) return team.toUpperCase();
  return map[team] || team;
}
