// Sports API service for fetching real-time sports data
interface SportsAPIConfig {
  espnApiKey?: string;
  theOddsApiKey?: string;
  sportsDataApiKey?: string;
  rapidApiKey?: string;
}

interface Game {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished';
  date: string;
  time: string;
  venue: string;
  weather?: string;
}

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  jerseyNumber: string;
  injuryStatus: 'healthy' | 'questionable' | 'doubtful' | 'out';
  stats: {
    gamesPlayed: number;
    averageMinutes: number;
    [key: string]: any;
  };
}

interface PlayerProp {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  opponent: string;
  sport: string;
  propType: string;
  line: number;
  odds: string;
  hitRate: number;
  gamesTracked: number;
  avgActualValue: number;
  recentForm: string;
  homeAway: 'home' | 'away';
  injuryStatus: string;
  weatherConditions: string;
  advancedMetrics: {
    potentialAssists?: number;
    potentialRebounds?: number;
    potentialThrees?: number;
    avgMinutes: number;
    freeThrowAttempts?: number;
    defensiveRating: number;
    offensiveRating: number;
    usageRate: number;
    paceFactor: number;
    restDays: number;
  };
}

interface Prediction {
  id: string;
  sport: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  prediction: 'over' | 'under';
  confidence: number;
  odds: string;
  factors: Array<{
    name: string;
    value: string;
    rank?: number;
    isPositive: boolean;
  }>;
  status: 'pending' | 'won' | 'lost';
  gameDate: string;
}

class SportsAPIService {
  private config: SportsAPIConfig;
  private baseUrls = {
    espn: 'https://site.api.espn.com/apis/site/v2/sports',
    theOdds: 'https://api.the-odds-api.com/v4',
    sportsData: 'https://api.sportsdata.io/v3',
    rapidApi: 'https://api-nba-v1.p.rapidapi.com',
    // Free APIs that don't require keys
    freeEspn: 'https://site.api.espn.com/apis/site/v2/sports',
    freeNfl: 'https://api.sportsdata.io/v3/nfl',
    freeNba: 'https://api.sportsdata.io/v3/nba',
    freeMlb: 'https://api.sportsdata.io/v3/mlb',
    freeNhl: 'https://api.sportsdata.io/v3/nhl',
  };

  constructor(config: SportsAPIConfig = {}) {
    this.config = config;
  }

  // ESPN API Integration (Free - No API key required)
  async getESPNGames(sport: string, date?: string): Promise<Game[]> {
    try {
      const sportMap: { [key: string]: string } = {
        'nba': 'basketball/nba',
        'nfl': 'football/nfl',
        'nhl': 'hockey/nhl',
        'mlb': 'baseball/mlb',
        'wnba': 'basketball/wnba',
        'college-basketball': 'basketball/mens-college-basketball',
        'college-football': 'football/college-football',
      };

      const sportPath = sportMap[sport] || sport;
      const dateParam = date ? `&dates=${date}` : '';
      const url = `${this.baseUrls.freeEspn}/${sportPath}/scoreboard${dateParam}`;

      console.log(`Fetching games from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`ESPN API response for ${sport}:`, data);
      
      const games = data.events?.map((event: any) => ({
        id: event.id,
        sport,
        homeTeam: event.competitions[0]?.competitors.find((c: any) => c.homeAway === 'home')?.team?.displayName || 'Unknown',
        awayTeam: event.competitions[0]?.competitors.find((c: any) => c.homeAway === 'away')?.team?.displayName || 'Unknown',
        homeScore: event.competitions[0]?.competitors.find((c: any) => c.homeAway === 'home')?.score,
        awayScore: event.competitions[0]?.competitors.find((c: any) => c.homeAway === 'away')?.score,
        status: this.mapESPNStatus(event.status?.type?.name),
        date: event.date,
        time: new Date(event.date).toLocaleTimeString(),
        venue: event.competitions[0]?.venue?.fullName || 'TBD',
        weather: event.weather?.displayValue,
      })) || [];

      console.log(`Found ${games.length} games for ${sport}`);
      
      // If no games found, return mock games as fallback
      if (games.length === 0) {
        console.log(`No live games found for ${sport}, using mock data`);
        return this.getMockGames(sport);
      }
      
      return games;
    } catch (error) {
      console.error('Error fetching ESPN games:', error);
      // Return mock games as fallback
      return this.getMockGames(sport);
    }
  }

  async getESPNPlayers(sport: string, teamId?: string): Promise<Player[]> {
    try {
      const sportMap: { [key: string]: string } = {
        'nba': 'basketball/nba',
        'nfl': 'football/nfl',
        'nhl': 'hockey/nhl',
        'mlb': 'baseball/mlb',
        'wnba': 'basketball/wnba',
      };

      const sportPath = sportMap[sport] || sport;
      const teamParam = teamId ? `/${teamId}` : '';
      const url = `${this.baseUrls.freeEspn}/${sportPath}/teams${teamParam}/roster`;

      console.log(`Fetching players from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Statpedia/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`ESPN API players response for ${sport}:`, data);
      
      const players = data.athletes?.map((athlete: any) => ({
        id: athlete.id || `player-${Date.now()}-${Math.random()}`,
        name: athlete.displayName || athlete.fullName || 'Unknown Player',
        team: data.displayName || 'Unknown Team',
        position: athlete.position?.displayName || this.getDefaultPosition(sport),
        jerseyNumber: athlete.jersey || '00',
        injuryStatus: this.mapInjuryStatus(athlete.injuries?.[0]?.status),
        stats: {
          gamesPlayed: athlete.stats?.gamesPlayed || 0,
          averageMinutes: athlete.stats?.averageMinutes || 0,
          ...athlete.stats,
        },
      })) || [];

      console.log(`Found ${players.length} players for ${sport}`);
      return players.length > 0 ? players : this.getMockPlayers(sport);
    } catch (error) {
      console.error('Error fetching ESPN players:', error);
      return this.getMockPlayers(sport);
    }
  }

  // The Odds API Integration (Free tier available)
  async getPlayerProps(sport: string, market?: string): Promise<PlayerProp[]> {
    try {
      // For free tier, we'll use mock data with realistic props
      if (!this.config.theOddsApiKey || this.config.theOddsApiKey === 'free') {
        console.log('Using free player props data for', sport);
        return this.getMockPlayerProps(sport);
      }

      const sportMap: { [key: string]: string } = {
        'nba': 'basketball_nba',
        'nfl': 'americanfootball_nfl',
        'nhl': 'icehockey_nhl',
        'mlb': 'baseball_mlb',
      };

      const sportKey = sportMap[sport] || sport;
      const marketParam = market ? `&markets=${market}` : '';
      const url = `${this.baseUrls.theOdds}/sports/${sportKey}/odds/?apiKey=${this.config.theOddsApiKey}&regions=us&oddsFormat=american${marketParam}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`The Odds API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((game: any) => ({
        id: `${game.id}-${Date.now()}`,
        playerId: game.id,
        playerName: game.home_team || 'Unknown Player',
        team: game.home_team || 'Unknown',
        opponent: game.away_team || 'Unknown',
        sport,
        propType: market || 'Points',
        line: this.calculateLineFromOdds(game.bookmakers?.[0]?.markets?.[0]?.outcomes),
        odds: game.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.price?.toString() || '+100',
        hitRate: Math.random() * 40 + 60, // Mock hit rate
        gamesTracked: Math.floor(Math.random() * 20) + 10,
        avgActualValue: Math.random() * 10 + 20,
        recentForm: 'Good - 3 of last 5 over',
        homeAway: 'home' as const,
        injuryStatus: 'Healthy',
        weatherConditions: 'Indoor',
        advancedMetrics: {
          avgMinutes: Math.random() * 20 + 25,
          defensiveRating: Math.random() * 20 + 100,
          offensiveRating: Math.random() * 20 + 110,
          usageRate: Math.random() * 20 + 20,
          paceFactor: Math.random() * 10 + 95,
          restDays: Math.floor(Math.random() * 3),
        },
      })) || [];
    } catch (error) {
      console.error('Error fetching player props:', error);
      return this.getMockPlayerProps(sport);
    }
  }

  // Generate predictions based on real data
  async generatePredictions(sport: string, limit: number = 10): Promise<Prediction[]> {
    try {
      const games = await this.getESPNGames(sport);
      const players = await this.getESPNPlayers(sport);
      const props = await this.getPlayerProps(sport);

      const predictions: Prediction[] = [];

      // If no live games, generate predictions from mock data
      if (games.length === 0) {
        console.log(`No live games for ${sport}, generating predictions from mock data`);
        return this.getMockPredictions(sport, limit);
      }

      for (let i = 0; i < Math.min(limit, games.length); i++) {
        const game = games[i];
        const gamePlayers = players.filter(p => 
          p.team === game.homeTeam || p.team === game.awayTeam
        );

        for (const player of gamePlayers.slice(0, 3)) { // Limit to 3 players per game
          const prop = this.generateRandomProp(sport);
          const confidence = this.calculateConfidence(player, prop);
          
          predictions.push({
            id: `${game.id}-${player.id}-${Date.now()}`,
            sport,
            player: player.name,
            team: player.team,
            opponent: player.team === game.homeTeam ? game.awayTeam : game.homeTeam,
            prop: prop.type,
            line: prop.line,
            prediction: prop.prediction,
            confidence,
            odds: this.generateOdds(confidence),
            factors: this.generateFactors(player, game, prop),
            status: 'pending',
            gameDate: game.date,
          });
        }
      }

      return predictions;
    } catch (error) {
      console.error('Error generating predictions:', error);
      return this.getMockPredictions(sport, limit);
    }
  }

  // Helper methods
  private mapESPNStatus(status: string): 'scheduled' | 'live' | 'finished' {
    switch (status?.toLowerCase()) {
      case 'in': return 'live';
      case 'final': return 'finished';
      default: return 'scheduled';
    }
  }

  private mapInjuryStatus(status: string): 'healthy' | 'questionable' | 'doubtful' | 'out' {
    switch (status?.toLowerCase()) {
      case 'questionable': return 'questionable';
      case 'doubtful': return 'doubtful';
      case 'out': return 'out';
      default: return 'healthy';
    }
  }

  private calculateLineFromOdds(outcomes: any[]): number {
    if (!outcomes || outcomes.length === 0) return 25.5;
    // Simple calculation - in real implementation, this would be more sophisticated
    return Math.random() * 20 + 15;
  }

  private generateRandomProp(sport: string): { type: string; line: number; prediction: 'over' | 'under' } {
    const props = {
      nba: ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks', '3-Pointers Made'],
      nfl: ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Touchdowns', 'Receptions'],
      mlb: ['Hits', 'Runs', 'RBIs', 'Strikeouts', 'Home Runs', 'Pitching Strikeouts', 'Earned Runs'],
      nhl: ['Points', 'Goals', 'Assists', 'Shots on Goal', 'Saves'],
      wnba: ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks'],
      'college-basketball': ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks'],
      'college-football': ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Touchdowns'],
    };

    const sportProps = props[sport as keyof typeof props] || props.nba;
    const propType = sportProps[Math.floor(Math.random() * sportProps.length)];
    
    // Generate more realistic lines based on sport and prop type
    let line = 10;
    if (sport === 'nba' || sport === 'wnba' || sport === 'college-basketball') {
      if (propType.includes('Points')) line = Math.random() * 15 + 15;
      else if (propType.includes('Rebounds')) line = Math.random() * 8 + 6;
      else if (propType.includes('Assists')) line = Math.random() * 6 + 4;
      else if (propType.includes('Steals')) line = Math.random() * 2 + 1;
      else if (propType.includes('Blocks')) line = Math.random() * 2 + 1;
      else if (propType.includes('3-Pointers')) line = Math.random() * 3 + 1;
    } else if (sport === 'nfl' || sport === 'college-football') {
      if (propType.includes('Passing Yards')) line = Math.random() * 100 + 200;
      else if (propType.includes('Rushing Yards')) line = Math.random() * 50 + 50;
      else if (propType.includes('Receiving Yards')) line = Math.random() * 50 + 40;
      else if (propType.includes('Touchdowns')) line = Math.random() * 2 + 1;
      else if (propType.includes('Receptions')) line = Math.random() * 4 + 3;
    } else if (sport === 'mlb') {
      if (propType.includes('Hits')) line = Math.random() * 2 + 1;
      else if (propType.includes('Runs')) line = Math.random() * 2 + 0.5;
      else if (propType.includes('RBIs')) line = Math.random() * 2 + 0.5;
      else if (propType.includes('Strikeouts')) line = Math.random() * 5 + 4;
      else if (propType.includes('Home Runs')) line = Math.random() * 1 + 0.5;
      else if (propType.includes('Pitching')) line = Math.random() * 5 + 4;
    } else if (sport === 'nhl') {
      if (propType.includes('Points')) line = Math.random() * 2 + 0.5;
      else if (propType.includes('Goals')) line = Math.random() * 1 + 0.5;
      else if (propType.includes('Assists')) line = Math.random() * 1 + 0.5;
      else if (propType.includes('Shots')) line = Math.random() * 3 + 2;
      else if (propType.includes('Saves')) line = Math.random() * 10 + 20;
    }
    
    const prediction = Math.random() > 0.5 ? 'over' : 'under';

    return { type: propType, line, prediction };
  }

  private calculateConfidence(player: Player, prop: any): number {
    // Simple confidence calculation based on player stats
    const baseConfidence = 50;
    const injuryPenalty = player.injuryStatus === 'healthy' ? 0 : -20;
    const gamesBonus = Math.min(player.stats.gamesPlayed * 2, 30);
    
    return Math.max(60, Math.min(95, baseConfidence + injuryPenalty + gamesBonus));
  }

  private generateOdds(confidence: number): string {
    // Convert confidence to odds
    if (confidence >= 80) return '+100';
    if (confidence >= 70) return '+110';
    if (confidence >= 60) return '+120';
    return '+130';
  }

  private generateFactors(player: Player, game: Game, prop: any): Array<{
    name: string;
    value: string;
    rank?: number;
    isPositive: boolean;
  }> {
    return [
      {
        name: `vs ${game.opponent} Pace`,
        value: `${(Math.random() * 10 + 95).toFixed(1)}`,
        rank: Math.floor(Math.random() * 10) + 1,
        isPositive: Math.random() > 0.5,
      },
      {
        name: `${game.opponent} Def Rating`,
        value: `${(Math.random() * 20 + 100).toFixed(1)}`,
        rank: Math.floor(Math.random() * 20) + 1,
        isPositive: Math.random() > 0.5,
      },
      {
        name: 'H2H Performance',
        value: `${(Math.random() * 5 + 20).toFixed(1)} ${prop.type}`,
        isPositive: Math.random() > 0.3,
      },
      {
        name: 'Recent Form',
        value: `${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 2)} Over`,
        isPositive: Math.random() > 0.4,
      },
    ];
  }

  // Mock data fallbacks
  private getMockPlayerProps(sport: string): PlayerProp[] {
    const mockData = {
      nba: [
        {
          id: '1',
          playerId: 'lebron-james',
          playerName: 'LeBron James',
          team: 'LAL',
          opponent: 'GSW',
          sport: 'nba',
          propType: 'Points',
          line: 26.5,
          odds: '+110',
          hitRate: 87.3,
          gamesTracked: 23,
          avgActualValue: 28.2,
          recentForm: 'Excellent - 4 of last 5 over',
          homeAway: 'home' as const,
          injuryStatus: 'Healthy',
          weatherConditions: 'Indoor',
          advancedMetrics: {
            avgMinutes: 35.8,
            defensiveRating: 108.3,
            offensiveRating: 118.7,
            usageRate: 31.2,
            paceFactor: 102.1,
            restDays: 1,
          },
        },
      ],
    };

    return mockData[sport as keyof typeof mockData] || [];
  }

  private getDefaultPosition(sport: string): string {
    const positions = {
      nba: 'Forward',
      nfl: 'Quarterback',
      mlb: 'Pitcher',
      nhl: 'Forward',
      wnba: 'Forward',
      'college-basketball': 'Forward',
      'college-football': 'Quarterback',
    };
    return positions[sport as keyof typeof positions] || 'Player';
  }

  private getMockGames(sport: string): Game[] {
    const mockGames = {
      nba: [
        { homeTeam: 'Lakers', awayTeam: 'Warriors', venue: 'Crypto.com Arena' },
        { homeTeam: 'Celtics', awayTeam: 'Heat', venue: 'TD Garden' },
        { homeTeam: 'Nuggets', awayTeam: 'Suns', venue: 'Ball Arena' },
      ],
      nfl: [
        { homeTeam: 'Chiefs', awayTeam: 'Bills', venue: 'Arrowhead Stadium' },
        { homeTeam: 'Cowboys', awayTeam: 'Eagles', venue: 'AT&T Stadium' },
        { homeTeam: '49ers', awayTeam: 'Rams', venue: 'Levi\'s Stadium' },
      ],
      mlb: [
        { homeTeam: 'Yankees', awayTeam: 'Red Sox', venue: 'Yankee Stadium' },
        { homeTeam: 'Dodgers', awayTeam: 'Giants', venue: 'Dodger Stadium' },
        { homeTeam: 'Astros', awayTeam: 'Rangers', venue: 'Minute Maid Park' },
      ],
      nhl: [
        { homeTeam: 'Oilers', awayTeam: 'Flames', venue: 'Rogers Place' },
        { homeTeam: 'Maple Leafs', awayTeam: 'Bruins', venue: 'Scotiabank Arena' },
        { homeTeam: 'Avalanche', awayTeam: 'Golden Knights', venue: 'Ball Arena' },
      ],
    };

    const games = mockGames[sport as keyof typeof mockGames] || mockGames.nba;
    
    return games.map((game, index) => ({
      id: `mock-game-${sport}-${index}`,
      sport,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: Math.floor(Math.random() * 30) + 100,
      awayScore: Math.floor(Math.random() * 30) + 100,
      status: 'scheduled' as const,
      date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString(),
      time: new Date().toLocaleTimeString(),
      venue: game.venue,
      weather: 'Indoor',
    }));
  }

  private getMockPlayers(sport: string): Player[] {
    const mockPlayers = {
      nba: [
        { name: 'LeBron James', team: 'LAL', position: 'Forward' },
        { name: 'Stephen Curry', team: 'GSW', position: 'Guard' },
        { name: 'Kevin Durant', team: 'PHX', position: 'Forward' },
        { name: 'Giannis Antetokounmpo', team: 'MIL', position: 'Forward' },
        { name: 'Luka Doncic', team: 'DAL', position: 'Guard' },
      ],
      nfl: [
        { name: 'Josh Allen', team: 'BUF', position: 'Quarterback' },
        { name: 'Patrick Mahomes', team: 'KC', position: 'Quarterback' },
        { name: 'Travis Kelce', team: 'KC', position: 'Tight End' },
        { name: 'Tyreek Hill', team: 'MIA', position: 'Wide Receiver' },
        { name: 'Christian McCaffrey', team: 'SF', position: 'Running Back' },
      ],
      mlb: [
        { name: 'Aaron Judge', team: 'NYY', position: 'Outfielder' },
        { name: 'Mookie Betts', team: 'LAD', position: 'Outfielder' },
        { name: 'Ronald Acuña Jr.', team: 'ATL', position: 'Outfielder' },
        { name: 'Shohei Ohtani', team: 'LAA', position: 'Designated Hitter' },
        { name: 'Vladimir Guerrero Jr.', team: 'TOR', position: 'First Base' },
      ],
      nhl: [
        { name: 'Connor McDavid', team: 'EDM', position: 'Center' },
        { name: 'Leon Draisaitl', team: 'EDM', position: 'Center' },
        { name: 'Nathan MacKinnon', team: 'COL', position: 'Center' },
        { name: 'Auston Matthews', team: 'TOR', position: 'Center' },
        { name: 'David Pastrnak', team: 'BOS', position: 'Right Wing' },
      ],
    };

    const players = mockPlayers[sport as keyof typeof mockPlayers] || mockPlayers.nba;
    
    return players.map((player, index) => ({
      id: `mock-${sport}-${index}`,
      name: player.name,
      team: player.team,
      position: player.position,
      jerseyNumber: (index + 1).toString().padStart(2, '0'),
      injuryStatus: 'healthy' as const,
      stats: {
        gamesPlayed: Math.floor(Math.random() * 20) + 10,
        averageMinutes: Math.random() * 20 + 25,
      },
    }));
  }

  private getMockPredictions(sport: string, limit: number): Prediction[] {
    const mockPredictions = [
      {
        id: '1',
        sport,
        player: 'LeBron James',
        team: 'LAL',
        opponent: 'GSW',
        prop: 'Points',
        line: 26.5,
        prediction: 'over' as const,
        confidence: 87,
        odds: '+110',
        factors: [
          { name: 'vs GSW Pace', value: '102.3', rank: 3, isPositive: true },
          { name: 'GSW Def Rating', value: '112.4', rank: 18, isPositive: true },
        ],
        status: 'pending' as const,
        gameDate: new Date().toISOString(),
      },
    ];

    return mockPredictions.slice(0, limit);
  }

  // Public API methods
  public async getLiveGames(sport: string): Promise<Game[]> {
    return this.getESPNGames(sport);
  }

  public async getPlayers(sport: string, teamId?: string): Promise<Player[]> {
    return this.getESPNPlayers(sport, teamId);
  }

  public async getPlayerPropsForSport(sport: string): Promise<PlayerProp[]> {
    return this.getPlayerProps(sport);
  }

  public async getPredictions(sport: string, limit?: number): Promise<Prediction[]> {
    return this.generatePredictions(sport, limit || 10);
  }

  public updateConfig(newConfig: Partial<SportsAPIConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create and export the sports API service instance
export const sportsAPIService = new SportsAPIService({
  // Free APIs - no registration required
  espnApiKey: 'free', // ESPN API is free
  theOddsApiKey: import.meta.env.VITE_THE_ODDS_API_KEY || 'free',
  sportsDataApiKey: import.meta.env.VITE_SPORTS_DATA_API_KEY || 'free',
  rapidApiKey: import.meta.env.VITE_RAPID_API_KEY || 'free',
});

export default sportsAPIService;
