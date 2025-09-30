// Free Sports Data API Service
// Uses multiple free APIs to get real sports data

export interface FreeGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  date: string;
  time: string;
  venue: string;
  status: 'scheduled' | 'live' | 'finished';
  homeOdds?: number;
  awayOdds?: number;
  homeRecord?: string;
  awayRecord?: string;
  homeScore?: number;
  awayScore?: number;
}

export interface FreePlayerProp {
  id: string;
  sport: string;
  playerName: string;
  team: string;
  opponent: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  venue: string;
}

class FreeSportsAPIService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 2 * 60 * 1000; // 2 minutes

  // ESPN API base endpoints (free, no auth required)
  private espnBaseEndpoints = {
    nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
    ncaaf: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
    ncaab: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard'
  };

  // Get ESPN endpoint with dynamic date range for current week's upcoming games
  private getESPNEndpoint(sport: string): string {
    const baseEndpoint = this.espnBaseEndpoints[sport.toLowerCase() as keyof typeof this.espnBaseEndpoints];
    if (!baseEndpoint) {
      throw new Error(`Unsupported sport: ${sport}`);
    }

    // Calculate date range: today to 14 days from now to get current and next week's games
    const today = new Date();
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const startDate = today.toISOString().split('T')[0].replace(/-/g, '');
    const endDate = twoWeeksFromNow.toISOString().split('T')[0].replace(/-/g, '');
    
    return `${baseEndpoint}?dates=${startDate}-${endDate}`;
  }

  // The Odds API (free tier - 500 requests/month)
  private oddsAPIKey = import.meta.env.VITE_THE_ODDS_API_KEY || 'free';
  private oddsAPIBase = 'https://api.the-odds-api.com/v4';

  private async getCachedData<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  // Get current week games from ESPN API
  async getCurrentWeekGames(sport: string): Promise<FreeGame[]> {
    const endpoint = this.getESPNEndpoint(sport);

    return this.getCachedData(`games_${sport}`, async () => {
      try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`ESPN API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const games = this.parseESPNGames(data.events || [], sport);
        
        if (games.length === 0) {
          throw new Error(`No games available for ${sport} from ESPN API`);
        }

        return games;
      } catch (error) {
        console.error(`ESPN API failed for ${sport}:`, error);
        throw error;
      }
    });
  }

  // Parse ESPN games data
  private parseESPNGames(events: any[], sport: string): FreeGame[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    return events
      .filter(event => {
        const eventDate = new Date(event.date);
        
        // Include only upcoming and live games from today onwards
        const isInDateRange = eventDate >= today && eventDate <= twoWeeksFromNow;
        const isRelevantStatus = ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS'].includes(event.status.type.name);
        
        return isInDateRange && isRelevantStatus;
      })
      .map(event => {
        const homeTeam = event.competitions[0]?.competitors?.find((c: any) => c.homeAway === 'home');
        const awayTeam = event.competitions[0]?.competitors?.find((c: any) => c.homeAway === 'away');

        return {
          id: event.id,
          sport: sport.toUpperCase(),
          homeTeam: homeTeam?.team?.displayName || 'Home Team',
          awayTeam: awayTeam?.team?.displayName || 'Away Team',
          homeTeamAbbr: homeTeam?.team?.abbreviation || 'HOME',
          awayTeamAbbr: awayTeam?.team?.abbreviation || 'AWAY',
          date: event.date,
          time: event.status.type.name === 'STATUS_SCHEDULED' ? 
            new Date(event.date).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              timeZoneName: 'short'
            }) : 'Live',
          venue: event.competitions[0]?.venue?.fullName || 'TBD',
          status: this.mapESPNStatus(event.status.type.name),
          homeOdds: this.extractOdds(homeTeam?.odds),
          awayOdds: this.extractOdds(awayTeam?.odds),
          homeRecord: homeTeam?.records?.[0]?.summary || '0-0',
          awayRecord: awayTeam?.records?.[0]?.summary || '0-0',
          homeScore: homeTeam?.score ? parseInt(homeTeam.score) : undefined,
          awayScore: awayTeam?.score ? parseInt(awayTeam.score) : undefined
        };
      });
  }

  // Map ESPN status to our status
  private mapESPNStatus(espnStatus: string): 'scheduled' | 'live' | 'finished' {
    switch (espnStatus) {
      case 'STATUS_SCHEDULED':
        return 'scheduled';
      case 'STATUS_IN_PROGRESS':
      case 'STATUS_HALFTIME':
        return 'live';
      case 'STATUS_FINAL':
        return 'finished';
      default:
        return 'scheduled';
    }
  }

  // Extract odds from ESPN data
  private extractOdds(odds: any): number | undefined {
    if (!odds || !odds.value) return undefined;
    return parseInt(odds.value);
  }

  // Get player props from The Odds API (free tier)
  async getPlayerProps(sport: string): Promise<FreePlayerProp[]> {
    if (this.oddsAPIKey === 'free') {
      // If no API key, generate some basic props from games
      console.warn('No Odds API key provided, generating basic props from games');
      return this.generateBasicProps(sport);
    }

    const sportMap: { [key: string]: string } = {
      'nfl': 'americanfootball_nfl',
      'nba': 'basketball_nba',
      'mlb': 'baseball_mlb',
      'nhl': 'icehockey_nhl'
    };

    const oddsSport = sportMap[sport.toLowerCase()];
    if (!oddsSport) {
      throw new Error(`Unsupported sport for odds: ${sport}`);
    }

    return this.getCachedData(`props_${sport}`, async () => {
      try {
        const response = await fetch(
          `${this.oddsAPIBase}/sports/${oddsSport}/odds/?apiKey=${this.oddsAPIKey}&regions=us&markets=player_pass_tds,player_pass_yds,player_pass_completions,player_rush_yds,player_rush_att,player_receptions,player_receiving_yds,player_receiving_rec&oddsFormat=american`
        );

        if (!response.ok) {
          throw new Error(`Odds API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseOddsAPIProps(data, sport);
      } catch (error) {
        console.error(`Odds API failed for ${sport}:`, error);
        throw error;
      }
    });
  }

  // Parse The Odds API player props
  private parseOddsAPIProps(data: any[], sport: string): FreePlayerProp[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return data
      .filter(game => {
        const gameDate = new Date(game.commence_time);
        return gameDate >= today;
      })
      .flatMap(game => {
        const homeTeam = game.home_team;
        const awayTeam = game.away_team;
        const gameDate = game.commence_time;
        const gameTime = new Date(gameDate).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZoneName: 'short'
        });

        return game.bookmakers
          ?.flatMap(bookmaker => 
            bookmaker.markets?.flatMap(market => 
              market.outcomes?.map(outcome => ({
                id: `${game.id}_${outcome.name}_${market.key}`,
                sport: sport.toUpperCase(),
                playerName: outcome.name,
                team: this.extractTeamFromPlayer(outcome.name, homeTeam, awayTeam),
                opponent: this.extractTeamFromPlayer(outcome.name, homeTeam, awayTeam) === homeTeam ? awayTeam : homeTeam,
                propType: this.mapMarketToPropType(market.key),
                line: outcome.point || 0,
                overOdds: outcome.name.includes('Over') ? outcome.price : 0,
                underOdds: outcome.name.includes('Under') ? outcome.price : 0,
                gameDate: gameDate,
                gameTime: gameTime,
                venue: 'TBD'
              }))
            ) || []
          ) || []
      });
  }

  // Extract team from player name
  private extractTeamFromPlayer(playerName: string, homeTeam: string, awayTeam: string): string {
    // This is a simplified extraction - in reality, you'd need more sophisticated logic
    // For now, we'll just return home team as default
    return homeTeam;
  }

  // Map market key to prop type
  private mapMarketToPropType(marketKey: string): string {
    const mapping: { [key: string]: string } = {
      'player_pass_tds': 'Passing TDs',
      'player_pass_yds': 'Passing Yards',
      'player_pass_completions': 'Pass Completions',
      'player_rush_yds': 'Rushing Yards',
      'player_rush_att': 'Rush Attempts',
      'player_receptions': 'Receptions',
      'player_receiving_yds': 'Receiving Yards',
      'player_receiving_rec': 'Receiving Receptions'
    };
    return mapping[marketKey] || 'Unknown';
  }

  // Get season info
  async getSeasonInfo(sport: string): Promise<{ isInSeason: boolean; seasonType: string }> {
    try {
      const games = await this.getCurrentWeekGames(sport);
      return {
        isInSeason: games.length > 0,
        seasonType: games.length > 0 ? 'regular' : 'offseason'
      };
    } catch (error) {
      console.error(`Error getting season info for ${sport}:`, error);
      return {
        isInSeason: false,
        seasonType: 'offseason'
      };
    }
  }

  // Generate basic props from games when no API key is available
  private async generateBasicProps(sport: string): Promise<FreePlayerProp[]> {
    try {
      const games = await this.getCurrentWeekGames(sport);
      const props: FreePlayerProp[] = [];
      
      games.forEach(game => {
        // Generate some basic props for each game
        const propTypes = this.getPropTypesForSport(sport);
        
        propTypes.forEach(propType => {
          props.push({
            id: `${game.id}_${propType}_over`,
            sport: sport.toUpperCase(),
            playerName: `${game.homeTeam} Player`,
            team: game.homeTeam,
            opponent: game.awayTeam,
            propType: propType,
            line: this.getDefaultLineForProp(propType),
            overOdds: -110,
            underOdds: -110,
            gameDate: game.date,
            gameTime: game.time,
            venue: game.venue
          });
          
          props.push({
            id: `${game.id}_${propType}_under`,
            sport: sport.toUpperCase(),
            playerName: `${game.awayTeam} Player`,
            team: game.awayTeam,
            opponent: game.homeTeam,
            propType: propType,
            line: this.getDefaultLineForProp(propType),
            overOdds: -110,
            underOdds: -110,
            gameDate: game.date,
            gameTime: game.time,
            venue: game.venue
          });
        });
      });
      
      return props;
    } catch (error) {
      console.error('Error generating basic props:', error);
      return [];
    }
  }

  // Get prop types for each sport
  private getPropTypesForSport(sport: string): string[] {
    const propTypes: { [key: string]: string[] } = {
      'nfl': ['Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Passing TDs', 'Rushing TDs'],
      'nba': ['Points', 'Rebounds', 'Assists', '3-Pointers Made', 'Steals'],
      'mlb': ['Hits', 'Runs', 'Strikeouts', 'Home Runs', 'RBIs'],
      'nhl': ['Goals', 'Assists', 'Shots on Goal', 'Saves', 'Points']
    };
    return propTypes[sport.toLowerCase()] || ['Points', 'Goals', 'Yards'];
  }

  // Get default line for prop type
  private getDefaultLineForProp(propType: string): number {
    const defaultLines: { [key: string]: number } = {
      'Passing Yards': 250.5,
      'Rushing Yards': 75.5,
      'Receiving Yards': 60.5,
      'Passing TDs': 1.5,
      'Rushing TDs': 0.5,
      'Points': 20.5,
      'Rebounds': 8.5,
      'Assists': 5.5,
      '3-Pointers Made': 2.5,
      'Steals': 1.5,
      'Hits': 1.5,
      'Runs': 0.5,
      'Strikeouts': 5.5,
      'Home Runs': 0.5,
      'RBIs': 0.5,
      'Goals': 0.5,
      'Shots on Goal': 3.5,
      'Saves': 25.5
    };
    return defaultLines[propType] || 1.5;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

export const freeSportsAPIService = new FreeSportsAPIService();
