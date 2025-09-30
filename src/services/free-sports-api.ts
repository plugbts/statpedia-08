// Free Sports Data API Service
// Uses multiple free APIs to get real sports data

import { propFinderAPIService } from './propfinder-api';

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

  // Get current week games using PropFinder-style API
  async getCurrentWeekGames(sport: string): Promise<FreeGame[]> {
    console.log(`🏈 Using PropFinder-style API for ${sport}...`);

    return this.getCachedData(`games_${sport}`, async () => {
      try {
        // Use the new PropFinder API service
        const liveGames = await propFinderAPIService.getLiveGames(sport);
        
        // Convert to FreeGame format
        const freeGames: FreeGame[] = liveGames.map(game => ({
          id: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeTeamAbbr: game.homeTeamAbbr,
          awayTeamAbbr: game.awayTeamAbbr,
          date: game.date,
          time: game.time,
          venue: game.venue,
          status: game.status,
          homeOdds: game.homeOdds,
          awayOdds: game.awayOdds,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          homeRecord: game.homeRecord,
          awayRecord: game.awayRecord,
        }));

        console.log(`✅ PropFinder API returned ${freeGames.length} games for ${sport}`);
        return freeGames;
      } catch (error) {
        console.error(`❌ PropFinder API failed for ${sport}:`, error);
        console.log(`🔄 Falling back to ESPN API for ${sport}`);
        
        // Fallback to original ESPN implementation
        return this.getESPNGamesFallback(sport);
      }
    });
  }

  // Fallback to ESPN API
  private async getESPNGamesFallback(sport: string): Promise<FreeGame[]> {
    const endpoint = this.getESPNEndpoint(sport);
    console.log(`🔍 ESPN fallback endpoint:`, endpoint);

    try {
      const response = await fetch(endpoint);
      console.log(`📡 ESPN API response status:`, response.status);
      
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Raw ESPN data for ${sport}:`, data);
      console.log(`🎮 Events count:`, data.events?.length || 0);
      
      const games = this.parseESPNGames(data.events || [], sport);
      console.log(`✅ Parsed games for ${sport}:`, games.length, games);
      
      if (games.length === 0) {
        console.warn(`⚠️ No games found for ${sport} after parsing, generating fallback`);
        return this.generateFallbackGames(sport);
      }

      return games;
    } catch (error) {
      console.error(`❌ ESPN API failed for ${sport}:`, error);
      console.log(`🔄 Generating fallback games for ${sport}`);
      return this.generateFallbackGames(sport);
    }
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

  // Get player props using PropFinder-style API
  async getPlayerProps(sport: string): Promise<FreePlayerProp[]> {
    console.log(`🎯 Using PropFinder-style API for player props: ${sport}`);

    return this.getCachedData(`props_${sport}`, async () => {
      try {
        // Use the new PropFinder API service
        const liveProps = await propFinderAPIService.getLivePlayerProps(sport);
        
        // Convert to FreePlayerProp format
        const freeProps: FreePlayerProp[] = liveProps.map(prop => ({
          id: prop.id,
          player: prop.player,
          team: prop.team,
          prop: prop.prop,
          line: prop.line,
          overOdds: prop.overOdds,
          underOdds: prop.underOdds,
          gameDate: prop.gameDate,
          gameTime: prop.gameTime,
          sport: prop.sport,
          confidence: prop.confidence,
          expectedValue: prop.expectedValue,
          recentForm: prop.recentForm,
          last5Games: prop.last5Games,
          seasonStats: prop.seasonStats,
          aiPrediction: prop.aiPrediction
        }));

        console.log(`✅ PropFinder API returned ${freeProps.length} player props for ${sport}`);
        return freeProps;
      } catch (error) {
        console.error(`❌ PropFinder API failed for ${sport}:`, error);
        console.log(`🔄 Falling back to basic props generation for ${sport}`);
        
        // Fallback to basic props generation
        return this.generateBasicProps(sport);
      }
    });
  }

  // Legacy method for Odds API (kept as fallback)
  private async getPlayerPropsLegacy(sport: string): Promise<FreePlayerProp[]> {
    console.log(`🎯 Fetching player props for ${sport} (legacy method)`);
    
    if (this.oddsAPIKey === 'free') {
      // If no API key, generate some basic props from games
      console.warn('No Odds API key provided, generating basic props from games');
      const basicProps = this.generateBasicProps(sport);
      console.log(`📊 Generated ${basicProps.length} basic props for ${sport}`);
      return basicProps;
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
        const oddsUrl = `${this.oddsAPIBase}/sports/${oddsSport}/odds/?apiKey=${this.oddsAPIKey}&regions=us&markets=player_pass_tds,player_pass_yds,player_pass_completions,player_rush_yds,player_rush_att,player_receptions,player_receiving_yds,player_receiving_rec&oddsFormat=american`;
        console.log(`🔍 Fetching props from:`, oddsUrl);
        
        const response = await fetch(oddsUrl);
        console.log(`📡 Odds API response status:`, response.status);

        if (!response.ok) {
          throw new Error(`Odds API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📊 Raw Odds API data for ${sport}:`, data);
        
        const props = this.parseOddsAPIProps(data, sport);
        console.log(`✅ Parsed props for ${sport}:`, props.length, props);
        
        return props;
      } catch (error) {
        console.error(`❌ Odds API failed for ${sport}:`, error);
        const basicProps = this.generateBasicProps(sport);
        console.log(`🔄 Fallback to basic props:`, basicProps.length);
        return basicProps;
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

  // Generate fallback games when API fails
  private generateFallbackGames(sport: string): FreeGame[] {
    const teams = this.getTeamsForSport(sport);
    const games: FreeGame[] = [];
    const today = new Date();

    // Generate 8 games for the current week
    for (let i = 0; i < 8; i++) {
      const gameDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
      const homeTeam = teams[i % teams.length];
      const awayTeam = teams[(i + 4) % teams.length];

      games.push({
        id: `fallback_${sport}_${i}`,
        sport: sport.toUpperCase(),
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        homeTeamAbbr: homeTeam.abbr,
        awayTeamAbbr: awayTeam.abbr,
        date: gameDate.toISOString(),
        time: '1:00 PM EDT',
        venue: `${homeTeam.name} Stadium`,
        status: 'upcoming',
        homeOdds: Math.floor(Math.random() * 200) - 100,
        awayOdds: Math.floor(Math.random() * 200) - 100,
        homeScore: 0,
        awayScore: 0,
        homeRecord: '2-2',
        awayRecord: '2-2',
      });
    }

    console.log(`🔄 Generated ${games.length} fallback games for ${sport}`);
    return games;
  }

  private getTeamsForSport(sport: string): { name: string; abbr: string }[] {
    const teamData = {
      nfl: [
        { name: 'Buffalo Bills', abbr: 'BUF' },
        { name: 'Miami Dolphins', abbr: 'MIA' },
        { name: 'New England Patriots', abbr: 'NE' },
        { name: 'New York Jets', abbr: 'NYJ' },
        { name: 'Baltimore Ravens', abbr: 'BAL' },
        { name: 'Cincinnati Bengals', abbr: 'CIN' },
        { name: 'Cleveland Browns', abbr: 'CLE' },
        { name: 'Pittsburgh Steelers', abbr: 'PIT' },
        { name: 'Houston Texans', abbr: 'HOU' },
        { name: 'Indianapolis Colts', abbr: 'IND' },
        { name: 'Jacksonville Jaguars', abbr: 'JAX' },
        { name: 'Tennessee Titans', abbr: 'TEN' },
        { name: 'Denver Broncos', abbr: 'DEN' },
        { name: 'Kansas City Chiefs', abbr: 'KC' },
        { name: 'Las Vegas Raiders', abbr: 'LV' },
        { name: 'Los Angeles Chargers', abbr: 'LAC' }
      ],
      nba: [
        { name: 'Boston Celtics', abbr: 'BOS' },
        { name: 'Brooklyn Nets', abbr: 'BKN' },
        { name: 'New York Knicks', abbr: 'NYK' },
        { name: 'Philadelphia 76ers', abbr: 'PHI' },
        { name: 'Toronto Raptors', abbr: 'TOR' },
        { name: 'Chicago Bulls', abbr: 'CHI' },
        { name: 'Cleveland Cavaliers', abbr: 'CLE' },
        { name: 'Detroit Pistons', abbr: 'DET' },
        { name: 'Indiana Pacers', abbr: 'IND' },
        { name: 'Milwaukee Bucks', abbr: 'MIL' }
      ],
      mlb: [
        { name: 'New York Yankees', abbr: 'NYY' },
        { name: 'Boston Red Sox', abbr: 'BOS' },
        { name: 'Tampa Bay Rays', abbr: 'TB' },
        { name: 'Toronto Blue Jays', abbr: 'TOR' },
        { name: 'Baltimore Orioles', abbr: 'BAL' },
        { name: 'Houston Astros', abbr: 'HOU' },
        { name: 'Los Angeles Angels', abbr: 'LAA' },
        { name: 'Oakland Athletics', abbr: 'OAK' },
        { name: 'Seattle Mariners', abbr: 'SEA' },
        { name: 'Texas Rangers', abbr: 'TEX' }
      ],
      nhl: [
        { name: 'Boston Bruins', abbr: 'BOS' },
        { name: 'Buffalo Sabres', abbr: 'BUF' },
        { name: 'Detroit Red Wings', abbr: 'DET' },
        { name: 'Florida Panthers', abbr: 'FLA' },
        { name: 'Montreal Canadiens', abbr: 'MTL' },
        { name: 'Ottawa Senators', abbr: 'OTT' },
        { name: 'Tampa Bay Lightning', abbr: 'TB' },
        { name: 'Toronto Maple Leafs', abbr: 'TOR' }
      ]
    };

    return teamData[sport.toLowerCase() as keyof typeof teamData] || [];
  }
}

export const freeSportsAPIService = new FreeSportsAPIService();
