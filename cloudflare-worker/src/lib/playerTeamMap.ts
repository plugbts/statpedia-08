// Player-to-Team mapping for NFL
// This is a fallback when SportsGameOdds API doesn't provide team info

export const NFL_PLAYER_TEAMS: Record<string, string> = {
  // Quarterbacks
  "AARON_RODGERS_1_NFL": "NYJ", // Aaron Rodgers - New York Jets
  "PATRICK_MAHOMES_1_NFL": "KC", // Patrick Mahomes - Kansas City Chiefs
  "JOSH_ALLEN_1_NFL": "BUF", // Josh Allen - Buffalo Bills
  "LAMAR_JACKSON_1_NFL": "BAL", // Lamar Jackson - Baltimore Ravens
  "JOE_BURROW_1_NFL": "CIN", // Joe Burrow - Cincinnati Bengals
  "DEREK_CARR_1_NFL": "NO", // Derek Carr - New Orleans Saints
  "DANIEL_JONES_1_NFL": "NYG", // Daniel Jones - New York Giants
  "KIRK_COUSINS_1_NFL": "ATL", // Kirk Cousins - Atlanta Falcons
  "MATTHEW_STAFFORD_1_NFL": "LAR", // Matthew Stafford - Los Angeles Rams
  "TUA_TAGOVAILOA_1_NFL": "MIA", // Tua Tagovailoa - Miami Dolphins
  
  // Running Backs
  "CHRISTIAN_MCCAFFREY_1_NFL": "SF", // Christian McCaffrey - San Francisco 49ers
  "AUSTIN_EKELER_1_NFL": "LAC", // Austin Ekeler - Los Angeles Chargers
  "DERRICK_HENRY_1_NFL": "BAL", // Derrick Henry - Baltimore Ravens
  "JOSH_JACOBS_1_NFL": "GB", // Josh Jacobs - Green Bay Packers
  "ALVIN_KAMARA_1_NFL": "NO", // Alvin Kamara - New Orleans Saints
  "SAQUON_BARKLEY_1_NFL": "PHI", // Saquon Barkley - Philadelphia Eagles
  
  // Wide Receivers
  "TRAVIS_KELCE_1_NFL": "KC", // Travis Kelce - Kansas City Chiefs
  "COOPER_KUPP_1_NFL": "LAR", // Cooper Kupp - Los Angeles Rams
  "STEFON_DIGGS_1_NFL": "HOU", // Stefon Diggs - Houston Texans
  "DEEBO_SAMUEL_1_NFL": "SF", // Deebo Samuel - San Francisco 49ers
  "TYREEK_HILL_1_NFL": "MIA", // Tyreek Hill - Miami Dolphins
  "DALVIN_COOK_1_NFL": "BAL", // Dalvin Cook - Baltimore Ravens
  
  // Kickers
  "ANDRES_BORREGALES_1_NFL": "TB", // Andres Borregales - Tampa Bay Buccaneers
  "JUSTIN_TUCKER_1_NFL": "BAL", // Justin Tucker - Baltimore Ravens
  "BRANDON_MCMANUS_1_NFL": "HOU", // Brandon McManus - Houston Texans
  
  // Add more players as needed
};

export function getPlayerTeam(playerId: string): string | null {
  return NFL_PLAYER_TEAMS[playerId] || null;
}

export function getOpponentTeam(playerTeam: string, gameId: string): string | null {
  // This is a simplified approach - in a real system, you'd need game context
  // For now, return a placeholder
  return "OPP";
}
