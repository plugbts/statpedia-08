// Team name normalization and abbreviation resolution
// Handles team name variations, abbreviations, and logo mapping

export type RawRow = {
  league?: string | null;
  team?: string | null;          // raw text from player_game_logs
  opponent?: string | null;      // raw text from player_game_logs
  sportsbook?: string | null;
  game_id?: string | null;
  date?: string | null;
  prop_date?: string | null;
  // Additional fields that might come from player name cleaning
  player_id?: string | null;
  prop_type?: string | null;
  [key: string]: any; // Allow additional properties
};

export type TeamInfo = {
  name: string;          // canonical full name (e.g., "Green Bay Packers")
  abbr: string;          // abbreviation (e.g., "GB")
  logo: string | null;   // URL or key to logo
  aliases?: string[];    // acceptable alternate names
};

// NFL Team mappings
const TEAM_MAP_NFL: Record<string, TeamInfo> = {
  "arizona cardinals": { name: "Arizona Cardinals", abbr: "ARI", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png", aliases: ["cardinals", "ari", "az"] },
  "atlanta falcons": { name: "Atlanta Falcons", abbr: "ATL", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png", aliases: ["falcons", "atl"] },
  "baltimore ravens": { name: "Baltimore Ravens", abbr: "BAL", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png", aliases: ["ravens", "bal"] },
  "buffalo bills": { name: "Buffalo Bills", abbr: "BUF", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png", aliases: ["bills", "buf"] },
  "carolina panthers": { name: "Carolina Panthers", abbr: "CAR", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/car.png", aliases: ["panthers", "car"] },
  "chicago bears": { name: "Chicago Bears", abbr: "CHI", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png", aliases: ["bears", "chi"] },
  "cincinnati bengals": { name: "Cincinnati Bengals", abbr: "CIN", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png", aliases: ["bengals", "cin"] },
  "cleveland browns": { name: "Cleveland Browns", abbr: "CLE", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png", aliases: ["browns", "cle"] },
  "dallas cowboys": { name: "Dallas Cowboys", abbr: "DAL", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png", aliases: ["cowboys", "dal"] },
  "denver broncos": { name: "Denver Broncos", abbr: "DEN", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/den.png", aliases: ["broncos", "den"] },
  "detroit lions": { name: "Detroit Lions", abbr: "DET", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png", aliases: ["lions", "det"] },
  "green bay packers": { name: "Green Bay Packers", abbr: "GB", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png", aliases: ["packers", "green bay", "gb"] },
  "houston texans": { name: "Houston Texans", abbr: "HOU", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png", aliases: ["texans", "hou"] },
  "indianapolis colts": { name: "Indianapolis Colts", abbr: "IND", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png", aliases: ["colts", "ind"] },
  "jacksonville jaguars": { name: "Jacksonville Jaguars", abbr: "JAX", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png", aliases: ["jaguars", "jax"] },
  "kansas city chiefs": { name: "Kansas City Chiefs", abbr: "KC", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png", aliases: ["chiefs", "kc"] },
  "las vegas raiders": { name: "Las Vegas Raiders", abbr: "LV", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png", aliases: ["raiders", "lv", "oakland raiders"] },
  "los angeles chargers": { name: "Los Angeles Chargers", abbr: "LAC", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png", aliases: ["chargers", "lac"] },
  "los angeles rams": { name: "Los Angeles Rams", abbr: "LAR", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png", aliases: ["rams", "lar"] },
  "miami dolphins": { name: "Miami Dolphins", abbr: "MIA", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png", aliases: ["dolphins", "mia"] },
  "minnesota vikings": { name: "Minnesota Vikings", abbr: "MIN", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/min.png", aliases: ["vikings", "min"] },
  "new england patriots": { name: "New England Patriots", abbr: "NE", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png", aliases: ["patriots", "ne", "patriots"] },
  "new orleans saints": { name: "New Orleans Saints", abbr: "NO", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/no.png", aliases: ["saints", "nola saints", "no"] },
  "new york giants": { name: "New York Giants", abbr: "NYG", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png", aliases: ["giants", "nyg", "ny giants"] },
  "new york jets": { name: "New York Jets", abbr: "NYJ", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png", aliases: ["jets", "ny jets", "nyj"] },
  "philadelphia eagles": { name: "Philadelphia Eagles", abbr: "PHI", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png", aliases: ["eagles", "phi"] },
  "pittsburgh steelers": { name: "Pittsburgh Steelers", abbr: "PIT", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png", aliases: ["steelers", "pit"] },
  "san francisco 49ers": { name: "San Francisco 49ers", abbr: "SF", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png", aliases: ["49ers", "sf"] },
  "seattle seahawks": { name: "Seattle Seahawks", abbr: "SEA", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png", aliases: ["seahawks", "sea"] },
  "tampa bay buccaneers": { name: "Tampa Bay Buccaneers", abbr: "TB", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png", aliases: ["buccaneers", "tb", "bucs"] },
  "tennessee titans": { name: "Tennessee Titans", abbr: "TEN", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png", aliases: ["titans", "ten"] },
  "washington commanders": { name: "Washington Commanders", abbr: "WAS", logo: "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png", aliases: ["commanders", "was", "washington football team", "redskins"] }
};

// NBA Team mappings
const TEAM_MAP_NBA: Record<string, TeamInfo> = {
  "atlanta hawks": { name: "Atlanta Hawks", abbr: "ATL", logo: "https://a.espncdn.com/i/teamlogos/nba/500/atl.png", aliases: ["hawks", "atl"] },
  "boston celtics": { name: "Boston Celtics", abbr: "BOS", logo: "https://a.espncdn.com/i/teamlogos/nba/500/bos.png", aliases: ["celtics", "bos"] },
  "brooklyn nets": { name: "Brooklyn Nets", abbr: "BKN", logo: "https://a.espncdn.com/i/teamlogos/nba/500/bkn.png", aliases: ["nets", "bkn"] },
  "charlotte hornets": { name: "Charlotte Hornets", abbr: "CHA", logo: "https://a.espncdn.com/i/teamlogos/nba/500/cha.png", aliases: ["hornets", "cha"] },
  "chicago bulls": { name: "Chicago Bulls", abbr: "CHI", logo: "https://a.espncdn.com/i/teamlogos/nba/500/chi.png", aliases: ["bulls", "chi"] },
  "cleveland cavaliers": { name: "Cleveland Cavaliers", abbr: "CLE", logo: "https://a.espncdn.com/i/teamlogos/nba/500/cle.png", aliases: ["cavaliers", "cavs", "cle"] },
  "dallas mavericks": { name: "Dallas Mavericks", abbr: "DAL", logo: "https://a.espncdn.com/i/teamlogos/nba/500/dal.png", aliases: ["mavericks", "mavs", "dal"] },
  "denver nuggets": { name: "Denver Nuggets", abbr: "DEN", logo: "https://a.espncdn.com/i/teamlogos/nba/500/den.png", aliases: ["nuggets", "den"] },
  "detroit pistons": { name: "Detroit Pistons", abbr: "DET", logo: "https://a.espncdn.com/i/teamlogos/nba/500/det.png", aliases: ["pistons", "det"] },
  "golden state warriors": { name: "Golden State Warriors", abbr: "GS", logo: "https://a.espncdn.com/i/teamlogos/nba/500/gs.png", aliases: ["warriors", "gs", "golden state"] },
  "houston rockets": { name: "Houston Rockets", abbr: "HOU", logo: "https://a.espncdn.com/i/teamlogos/nba/500/hou.png", aliases: ["rockets", "hou"] },
  "indiana pacers": { name: "Indiana Pacers", abbr: "IND", logo: "https://a.espncdn.com/i/teamlogos/nba/500/ind.png", aliases: ["pacers", "ind"] },
  "los angeles clippers": { name: "Los Angeles Clippers", abbr: "LAC", logo: "https://a.espncdn.com/i/teamlogos/nba/500/lac.png", aliases: ["clippers", "lac"] },
  "los angeles lakers": { name: "Los Angeles Lakers", abbr: "LAL", logo: "https://a.espncdn.com/i/teamlogos/nba/500/lal.png", aliases: ["lakers", "lal"] },
  "memphis grizzlies": { name: "Memphis Grizzlies", abbr: "MEM", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mem.png", aliases: ["grizzlies", "mem"] },
  "miami heat": { name: "Miami Heat", abbr: "MIA", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mia.png", aliases: ["heat", "mia"] },
  "milwaukee bucks": { name: "Milwaukee Bucks", abbr: "MIL", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mil.png", aliases: ["bucks", "mil"] },
  "minnesota timberwolves": { name: "Minnesota Timberwolves", abbr: "MIN", logo: "https://a.espncdn.com/i/teamlogos/nba/500/min.png", aliases: ["timberwolves", "wolves", "min"] },
  "new orleans pelicans": { name: "New Orleans Pelicans", abbr: "NO", logo: "https://a.espncdn.com/i/teamlogos/nba/500/no.png", aliases: ["pelicans", "no"] },
  "new york knicks": { name: "New York Knicks", abbr: "NY", logo: "https://a.espncdn.com/i/teamlogos/nba/500/ny.png", aliases: ["knicks", "ny"] },
  "oklahoma city thunder": { name: "Oklahoma City Thunder", abbr: "OKC", logo: "https://a.espncdn.com/i/teamlogos/nba/500/okc.png", aliases: ["thunder", "okc"] },
  "orlando magic": { name: "Orlando Magic", abbr: "ORL", logo: "https://a.espncdn.com/i/teamlogos/nba/500/orl.png", aliases: ["magic", "orl"] },
  "philadelphia 76ers": { name: "Philadelphia 76ers", abbr: "PHI", logo: "https://a.espncdn.com/i/teamlogos/nba/500/phi.png", aliases: ["76ers", "sixers", "phi"] },
  "phoenix suns": { name: "Phoenix Suns", abbr: "PHX", logo: "https://a.espncdn.com/i/teamlogos/nba/500/phx.png", aliases: ["suns", "phx"] },
  "portland trail blazers": { name: "Portland Trail Blazers", abbr: "POR", logo: "https://a.espncdn.com/i/teamlogos/nba/500/por.png", aliases: ["trail blazers", "blazers", "por"] },
  "sacramento kings": { name: "Sacramento Kings", abbr: "SAC", logo: "https://a.espncdn.com/i/teamlogos/nba/500/sac.png", aliases: ["kings", "sac"] },
  "san antonio spurs": { name: "San Antonio Spurs", abbr: "SA", logo: "https://a.espncdn.com/i/teamlogos/nba/500/sa.png", aliases: ["spurs", "sa"] },
  "toronto raptors": { name: "Toronto Raptors", abbr: "TOR", logo: "https://a.espncdn.com/i/teamlogos/nba/500/tor.png", aliases: ["raptors", "tor"] },
  "utah jazz": { name: "Utah Jazz", abbr: "UTA", logo: "https://a.espncdn.com/i/teamlogos/nba/500/uta.png", aliases: ["jazz", "uta"] },
  "washington wizards": { name: "Washington Wizards", abbr: "WAS", logo: "https://a.espncdn.com/i/teamlogos/nba/500/wsh.png", aliases: ["wizards", "was"] }
};

// MLB Team mappings
const TEAM_MAP_MLB: Record<string, TeamInfo> = {
  "arizona diamondbacks": { name: "Arizona Diamondbacks", abbr: "ARI", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/ari.png", aliases: ["diamondbacks", "ari"] },
  "atlanta braves": { name: "Atlanta Braves", abbr: "ATL", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/atl.png", aliases: ["braves", "atl"] },
  "baltimore orioles": { name: "Baltimore Orioles", abbr: "BAL", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/bal.png", aliases: ["orioles", "bal"] },
  "boston red sox": { name: "Boston Red Sox", abbr: "BOS", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/bos.png", aliases: ["red sox", "bos"] },
  "chicago cubs": { name: "Chicago Cubs", abbr: "CHC", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/chc.png", aliases: ["cubs", "chc"] },
  "chicago white sox": { name: "Chicago White Sox", abbr: "CWS", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/cws.png", aliases: ["white sox", "cws"] },
  "cincinnati reds": { name: "Cincinnati Reds", abbr: "CIN", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/cin.png", aliases: ["reds", "cin"] },
  "cleveland guardians": { name: "Cleveland Guardians", abbr: "CLE", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/cle.png", aliases: ["guardians", "cle", "indians"] },
  "colorado rockies": { name: "Colorado Rockies", abbr: "COL", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/col.png", aliases: ["rockies", "col"] },
  "detroit tigers": { name: "Detroit Tigers", abbr: "DET", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/det.png", aliases: ["tigers", "det"] },
  "houston astros": { name: "Houston Astros", abbr: "HOU", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/hou.png", aliases: ["astros", "hou"] },
  "kansas city royals": { name: "Kansas City Royals", abbr: "KC", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/kc.png", aliases: ["royals", "kc"] },
  "los angeles angels": { name: "Los Angeles Angels", abbr: "LAA", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/laa.png", aliases: ["angels", "laa", "anaheim angels"] },
  "los angeles dodgers": { name: "Los Angeles Dodgers", abbr: "LAD", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/lad.png", aliases: ["dodgers", "lad"] },
  "miami marlins": { name: "Miami Marlins", abbr: "MIA", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/mia.png", aliases: ["marlins", "mia", "florida marlins"] },
  "milwaukee brewers": { name: "Milwaukee Brewers", abbr: "MIL", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/mil.png", aliases: ["brewers", "mil"] },
  "minnesota twins": { name: "Minnesota Twins", abbr: "MIN", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/min.png", aliases: ["twins", "min"] },
  "new york mets": { name: "New York Mets", abbr: "NYM", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/nym.png", aliases: ["mets", "nym"] },
  "new york yankees": { name: "New York Yankees", abbr: "NYY", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png", aliases: ["yankees", "nyy"] },
  "oakland athletics": { name: "Oakland Athletics", abbr: "OAK", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/oak.png", aliases: ["athletics", "a's", "oak"] },
  "philadelphia phillies": { name: "Philadelphia Phillies", abbr: "PHI", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/phi.png", aliases: ["phillies", "phi"] },
  "pittsburgh pirates": { name: "Pittsburgh Pirates", abbr: "PIT", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/pit.png", aliases: ["pirates", "pit"] },
  "san diego padres": { name: "San Diego Padres", abbr: "SD", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/sd.png", aliases: ["padres", "sd"] },
  "san francisco giants": { name: "San Francisco Giants", abbr: "SF", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/sf.png", aliases: ["giants", "sf"] },
  "seattle mariners": { name: "Seattle Mariners", abbr: "SEA", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/sea.png", aliases: ["mariners", "sea"] },
  "st louis cardinals": { name: "St. Louis Cardinals", abbr: "STL", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/stl.png", aliases: ["cardinals", "stl"] },
  "tampa bay rays": { name: "Tampa Bay Rays", abbr: "TB", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/tb.png", aliases: ["rays", "tb", "devil rays"] },
  "texas rangers": { name: "Texas Rangers", abbr: "TEX", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/tex.png", aliases: ["rangers", "tex"] },
  "toronto blue jays": { name: "Toronto Blue Jays", abbr: "TOR", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/tor.png", aliases: ["blue jays", "tor"] },
  "washington nationals": { name: "Washington Nationals", abbr: "WSH", logo: "https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png", aliases: ["nationals", "wsh", "expos"] }
};

// NHL Team mappings
const TEAM_MAP_NHL: Record<string, TeamInfo> = {
  "anaheim ducks": { name: "Anaheim Ducks", abbr: "ANA", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/ana.png", aliases: ["ducks", "ana"] },
  "arizona coyotes": { name: "Arizona Coyotes", abbr: "ARI", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/ari.png", aliases: ["coyotes", "ari"] },
  "boston bruins": { name: "Boston Bruins", abbr: "BOS", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/bos.png", aliases: ["bruins", "bos"] },
  "buffalo sabres": { name: "Buffalo Sabres", abbr: "BUF", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/buf.png", aliases: ["sabres", "buf"] },
  "calgary flames": { name: "Calgary Flames", abbr: "CGY", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/cgy.png", aliases: ["flames", "cgy"] },
  "carolina hurricanes": { name: "Carolina Hurricanes", abbr: "CAR", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/car.png", aliases: ["hurricanes", "car"] },
  "chicago blackhawks": { name: "Chicago Blackhawks", abbr: "CHI", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/chi.png", aliases: ["blackhawks", "chi"] },
  "colorado avalanche": { name: "Colorado Avalanche", abbr: "COL", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/col.png", aliases: ["avalanche", "col"] },
  "columbus blue jackets": { name: "Columbus Blue Jackets", abbr: "CBJ", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/cbj.png", aliases: ["blue jackets", "cbj"] },
  "dallas stars": { name: "Dallas Stars", abbr: "DAL", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/dal.png", aliases: ["stars", "dal"] },
  "detroit red wings": { name: "Detroit Red Wings", abbr: "DET", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/det.png", aliases: ["red wings", "det"] },
  "edmonton oilers": { name: "Edmonton Oilers", abbr: "EDM", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/edm.png", aliases: ["oilers", "edm"] },
  "florida panthers": { name: "Florida Panthers", abbr: "FLA", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/fla.png", aliases: ["panthers", "fla"] },
  "los angeles kings": { name: "Los Angeles Kings", abbr: "LAK", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/lak.png", aliases: ["kings", "lak"] },
  "minnesota wild": { name: "Minnesota Wild", abbr: "MIN", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/min.png", aliases: ["wild", "min"] },
  "montreal canadiens": { name: "Montreal Canadiens", abbr: "MTL", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/mtl.png", aliases: ["canadiens", "mtl"] },
  "nashville predators": { name: "Nashville Predators", abbr: "NSH", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/nsh.png", aliases: ["predators", "nsh"] },
  "new jersey devils": { name: "New Jersey Devils", abbr: "NJD", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/njd.png", aliases: ["devils", "njd"] },
  "new york islanders": { name: "New York Islanders", abbr: "NYI", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/nyi.png", aliases: ["islanders", "nyi"] },
  "new york rangers": { name: "New York Rangers", abbr: "NYR", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/nyr.png", aliases: ["rangers", "nyr"] },
  "ottawa senators": { name: "Ottawa Senators", abbr: "OTT", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/ott.png", aliases: ["senators", "ott"] },
  "philadelphia flyers": { name: "Philadelphia Flyers", abbr: "PHI", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/phi.png", aliases: ["flyers", "phi"] },
  "pittsburgh penguins": { name: "Pittsburgh Penguins", abbr: "PIT", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/pit.png", aliases: ["penguins", "pit"] },
  "san jose sharks": { name: "San Jose Sharks", abbr: "SJ", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/sj.png", aliases: ["sharks", "sj"] },
  "seattle kraken": { name: "Seattle Kraken", abbr: "SEA", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/sea.png", aliases: ["kraken", "sea"] },
  "st louis blues": { name: "St. Louis Blues", abbr: "STL", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/stl.png", aliases: ["blues", "stl"] },
  "tampa bay lightning": { name: "Tampa Bay Lightning", abbr: "TB", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/tb.png", aliases: ["lightning", "tb"] },
  "toronto maple leafs": { name: "Toronto Maple Leafs", abbr: "TOR", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/tor.png", aliases: ["maple leafs", "tor"] },
  "vancouver canucks": { name: "Vancouver Canucks", abbr: "VAN", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/van.png", aliases: ["canucks", "van"] },
  "vegas golden knights": { name: "Vegas Golden Knights", abbr: "VGK", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png", aliases: ["golden knights", "vgk"] },
  "washington capitals": { name: "Washington Capitals", abbr: "WSH", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/wsh.png", aliases: ["capitals", "wsh"] },
  "winnipeg jets": { name: "Winnipeg Jets", abbr: "WPG", logo: "https://a.espncdn.com/i/teamlogos/nhl/500/wpg.png", aliases: ["jets", "wpg"] }
};

// Per-league registry
const LEAGUE_TEAM_MAP: Record<string, Record<string, TeamInfo>> = {
  nfl: TEAM_MAP_NFL,
  nba: TEAM_MAP_NBA,
  mlb: TEAM_MAP_MLB,
  nhl: TEAM_MAP_NHL
};

function norm(s?: string | null): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Try exact -> alias -> abbreviation heuristics
function resolveTeam(league: string | null | undefined, raw: string | null | undefined): TeamInfo | null {
  const lg = norm(league);
  const map = LEAGUE_TEAM_MAP[lg];
  if (!map) return null;

  const value = norm(raw);
  if (!value) return null;

  // Exact canonical match
  if (map[value]) return map[value];

  // Alias match
  for (const [key, info] of Object.entries(map)) {
    const aliases = info.aliases ?? [];
    if (aliases.some(a => norm(a) === value)) return info;
  }

  // Abbreviation heuristic: match by abbr (e.g., "gb")
  for (const info of Object.values(map)) {
    if (norm(info.abbr) === value) return info;
  }

  // City-only heuristic (e.g., "green bay" → "green bay packers")
  for (const [key, info] of Object.entries(map)) {
    const city = norm(info.name.split(" ").slice(0, 2).join(" ")); // crude city prefix
    if (city && city === value) return info;
  }

  return null;
}

export type CleanTeamRow = RawRow & {
  team_abbr: string;          // "GB" or "UNK"
  team_logo: string | null;   // logo URL or null
  team_name: string;          // canonical full name or original
  opponent_abbr: string;      // opponent abbreviation
  opponent_logo: string | null;
  opponent_name: string;
  debug_team: {
    league: string;
    raw_team: string | null;
    raw_opponent: string | null;
    team_resolved: boolean;
    opponent_resolved: boolean;
    team_strategy: "exact" | "alias" | "abbr" | "city" | "fallback";
    opp_strategy:  "exact" | "alias" | "abbr" | "city" | "fallback";
  };
};

export function normalizeTeams(rows: RawRow[], logPrefix = "[worker:teams]"): CleanTeamRow[] {
  const out: CleanTeamRow[] = [];

  let total = 0;
  let teamResolved = 0;
  let oppResolved = 0;
  const strategyCounts = {
    team_exact: 0, team_alias: 0, team_abbr: 0, team_city: 0, team_fallback: 0,
    opp_exact: 0, opp_alias: 0, opp_abbr: 0, opp_city: 0, opp_fallback: 0,
  };

  console.log(`${logPrefix} input_rows=${rows.length}`);

  rows.forEach((row, idx) => {
    total++;

    const lg = norm(row.league);
    const rawTeam = row.team ?? null;
    const rawOpp = row.opponent ?? null;

    const resolvedTeam = resolveTeam(lg, rawTeam);
    const resolvedOpp = resolveTeam(lg, rawOpp);

    let teamStrategy: CleanTeamRow["debug_team"]["team_strategy"] = "fallback";
    let oppStrategy: CleanTeamRow["debug_team"]["opp_strategy"] = "fallback";

    const team_abbr = resolvedTeam?.abbr ?? "UNK";
    const team_logo = resolvedTeam?.logo ?? null;
    const team_name = resolvedTeam?.name ?? (rawTeam ?? "Unknown Team");

    const opponent_abbr = resolvedOpp?.abbr ?? "UNK";
    const opponent_logo = resolvedOpp?.logo ?? null;
    const opponent_name = resolvedOpp?.name ?? (rawOpp ?? "Unknown Opponent");

    // Determine strategies by re-running the checks in order (for counters)
    if (resolvedTeam) {
      // Exact check
      if (LEAGUE_TEAM_MAP[lg]?.[norm(rawTeam)]) {
        teamStrategy = "exact"; strategyCounts.team_exact++;
      } else if (Object.values(LEAGUE_TEAM_MAP[lg] ?? {}).some(t => (t.aliases ?? []).some(a => norm(a) === norm(rawTeam)))) {
        teamStrategy = "alias"; strategyCounts.team_alias++;
      } else if (Object.values(LEAGUE_TEAM_MAP[lg] ?? {}).some(t => norm(t.abbr) === norm(rawTeam))) {
        teamStrategy = "abbr"; strategyCounts.team_abbr++;
      } else {
        teamStrategy = "city"; strategyCounts.team_city++;
      }
      teamResolved++;
    } else {
      strategyCounts.team_fallback++;
      // Emit a precise warning for triage
      console.warn(
        `${logPrefix} unresolved_team idx=${idx} league=${lg} raw="${rawTeam ?? ""}" ` +
        `date=${row.prop_date ?? row.date ?? "?"} game=${row.game_id ?? "?"}`
      );
    }

    if (resolvedOpp) {
      if (LEAGUE_TEAM_MAP[lg]?.[norm(rawOpp)]) {
        oppStrategy = "exact"; strategyCounts.opp_exact++;
      } else if (Object.values(LEAGUE_TEAM_MAP[lg] ?? {}).some(t => (t.aliases ?? []).some(a => norm(a) === norm(rawOpp)))) {
        oppStrategy = "alias"; strategyCounts.opp_alias++;
      } else if (Object.values(LEAGUE_TEAM_MAP[lg] ?? {}).some(t => norm(t.abbr) === norm(rawOpp))) {
        oppStrategy = "abbr"; strategyCounts.opp_abbr++;
      } else {
        oppStrategy = "city"; strategyCounts.opp_city++;
      }
      oppResolved++;
    } else {
      strategyCounts.opp_fallback++;
      console.warn(
        `${logPrefix} unresolved_opponent idx=${idx} league=${lg} raw="${rawOpp ?? ""}" ` +
        `date=${row.prop_date ?? row.date ?? "?"} game=${row.game_id ?? "?"}`
      );
    }

    out.push({
      ...row,
      team_abbr,
      team_logo,
      team_name,
      opponent_abbr,
      opponent_logo,
      opponent_name,
      debug_team: {
        league: lg,
        raw_team: rawTeam,
        raw_opponent: rawOpp,
        team_resolved: !!resolvedTeam,
        opponent_resolved: !!resolvedOpp,
        team_strategy: teamStrategy,
        opp_strategy: oppStrategy,
      },
    });
  });

  // Aggregate summary for dashboards/logs
  console.log(
    `${logPrefix} summary total=${total} ` +
    `team_resolved=${teamResolved} opp_resolved=${oppResolved} ` +
    `strategies=${JSON.stringify(strategyCounts)}`
  );

  return out;
}

// Export types for use in other modules
export type { RawRow, TeamInfo };
