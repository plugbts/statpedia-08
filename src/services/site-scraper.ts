/**
 * Real Site Scraper Service
 * Scrapes live data from propfinder.app and outlier.bet
 * NO MOCK DATA - Only real scraped data
 */

interface ScrapedGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  date: string;
  time: string;
  venue: string;
  status: 'upcoming' | 'live' | 'finished';
  homeOdds: number;
  awayOdds: number;
  homeScore?: number;
  awayScore?: number;
  homeRecord: string;
  awayRecord: string;
  spread?: number;
  total?: number;
  moneyline?: {
    home: number;
    away: number;
  };
}

interface ScrapedProp {
  id: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameId: string;
  gameDate: string;
  gameTime: string;
  sport: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
}

class SiteScraperService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 1 * 60 * 1000; // 1 minute for real-time data
  private refreshInterval: NodeJS.Timeout | null = null;

  // Multiple CORS proxies for reliability
  private corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
  ];
  
  // Target sites
  private targetSites = {
    propfinder: 'https://propfinder.app',
    outlier: 'https://app.outlier.bet'
  };

  constructor() {
    this.startAutoRefresh();
  }

  private startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.clearCache();
    }, this.cacheTimeout);
  }

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

  // Real scraping from propfinder.app
  async getGamesFromPropFinder(sport: string): Promise<ScrapedGame[]> {
    console.log(`🔍 Real scraping games from propfinder.app for ${sport}...`);

    return this.getCachedData(`propfinder_games_${sport}`, async () => {
      try {
        const games = await this.scrapePropFinderGames(sport);
        console.log(`✅ Real scraped ${games.length} games from propfinder.app`);
        return games;
      } catch (error) {
        console.error(`❌ Failed to scrape propfinder.app:`, error);
        throw new Error(`Failed to get real data from propfinder.app: ${error}`);
      }
    });
  }

  // Real scraping from outlier.bet
  async getPropsFromOutlier(sport: string): Promise<ScrapedProp[]> {
    console.log(`🎯 Real scraping props from outlier.bet for ${sport}...`);

    return this.getCachedData(`outlier_props_${sport}`, async () => {
      try {
        const props = await this.scrapeOutlierProps(sport);
        console.log(`✅ Real scraped ${props.length} props from outlier.bet`);
        return props;
      } catch (error) {
        console.error(`❌ Failed to scrape outlier.bet:`, error);
        throw new Error(`Failed to get real data from outlier.bet: ${error}`);
      }
    });
  }

  // Real scraping implementation
  private async scrapePropFinderGames(sport: string): Promise<ScrapedGame[]> {
    const games: ScrapedGame[] = [];
    
    for (const proxy of this.corsProxies) {
      try {
        const url = `${proxy}${this.targetSites.propfinder}/api/games?league=${sport.toUpperCase()}`;
        console.log(`🌐 Attempting to scrape: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📊 Raw propfinder data:`, data);
        
        // Parse the real data structure from propfinder.app
        if (data.games && Array.isArray(data.games)) {
          games.push(...this.parsePropFinderGames(data.games, sport));
        } else if (data.events && Array.isArray(data.events)) {
          games.push(...this.parsePropFinderEvents(data.events, sport));
        } else if (Array.isArray(data)) {
          games.push(...this.parsePropFinderGames(data, sport));
        }

        if (games.length > 0) {
          console.log(`✅ Successfully scraped ${games.length} games from propfinder.app`);
          return games;
        }
      } catch (error) {
        console.warn(`⚠️ Proxy ${proxy} failed:`, error);
        continue;
      }
    }

    // If all proxies fail, try direct API calls
    try {
      const directGames = await this.tryDirectAPICalls(sport);
      if (directGames.length > 0) {
        return directGames;
      }
    } catch (error) {
      console.warn(`⚠️ Direct API calls failed:`, error);
    }

    throw new Error(`All scraping methods failed for ${sport} games`);
  }

  private async scrapeOutlierProps(sport: string): Promise<ScrapedProp[]> {
    const props: ScrapedProp[] = [];
    
    for (const proxy of this.corsProxies) {
      try {
        const url = `${proxy}${this.targetSites.outlier}/api/props?league=${sport.toUpperCase()}`;
        console.log(`🌐 Attempting to scrape: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📊 Raw outlier data:`, data);
        
        // Parse the real data structure from outlier.bet
        if (data.props && Array.isArray(data.props)) {
          props.push(...this.parseOutlierProps(data.props, sport));
        } else if (data.playerProps && Array.isArray(data.playerProps)) {
          props.push(...this.parseOutlierProps(data.playerProps, sport));
        } else if (Array.isArray(data)) {
          props.push(...this.parseOutlierProps(data, sport));
        }

        if (props.length > 0) {
          console.log(`✅ Successfully scraped ${props.length} props from outlier.bet`);
          return props;
        }
      } catch (error) {
        console.warn(`⚠️ Proxy ${proxy} failed:`, error);
        continue;
      }
    }

    throw new Error(`All scraping methods failed for ${sport} props`);
  }

  // Parse real propfinder games data
  private parsePropFinderGames(games: any[], sport: string): ScrapedGame[] {
    return games.map((game, index) => ({
      id: game.id || `propfinder_${sport}_${index}`,
      sport: sport.toUpperCase(),
      homeTeam: game.homeTeam || game.home_team || game.home?.name || 'Unknown',
      awayTeam: game.awayTeam || game.away_team || game.away?.name || 'Unknown',
      homeTeamAbbr: game.homeTeamAbbr || game.home_team_abbr || game.home?.abbr || 'UNK',
      awayTeamAbbr: game.awayTeamAbbr || game.away_team_abbr || game.away?.abbr || 'UNK',
      date: game.date || game.gameDate || game.start_time || new Date().toISOString(),
      time: game.time || game.gameTime || this.formatTime(game.start_time),
      venue: game.venue || game.stadium || 'TBD',
      status: this.parseGameStatus(game.status || game.game_status),
      homeOdds: this.parseOdds(game.homeOdds || game.home_odds || game.home?.odds),
      awayOdds: this.parseOdds(game.awayOdds || game.away_odds || game.away?.odds),
      homeScore: game.homeScore || game.home_score || game.home?.score,
      awayScore: game.awayScore || game.away_score || game.away?.score,
      homeRecord: game.homeRecord || game.home_record || '0-0',
      awayRecord: game.awayRecord || game.away_record || '0-0',
      spread: this.parseSpread(game.spread),
      total: this.parseTotal(game.total || game.over_under),
      moneyline: {
        home: this.parseOdds(game.moneyline?.home || game.home_moneyline),
        away: this.parseOdds(game.moneyline?.away || game.away_moneyline)
      }
    }));
  }

  private parsePropFinderEvents(events: any[], sport: string): ScrapedGame[] {
    return events.map((event, index) => ({
      id: event.id || `propfinder_event_${sport}_${index}`,
      sport: sport.toUpperCase(),
      homeTeam: event.competitions?.[0]?.competitors?.[0]?.team?.name || 'Unknown',
      awayTeam: event.competitions?.[0]?.competitors?.[1]?.team?.name || 'Unknown',
      homeTeamAbbr: event.competitions?.[0]?.competitors?.[0]?.team?.abbreviation || 'UNK',
      awayTeamAbbr: event.competitions?.[0]?.competitors?.[1]?.team?.abbreviation || 'UNK',
      date: event.date || event.startDate || new Date().toISOString(),
      time: this.formatTime(event.date || event.startDate),
      venue: event.competitions?.[0]?.venue?.fullName || 'TBD',
      status: this.parseGameStatus(event.status?.type),
      homeOdds: this.parseOdds(event.competitions?.[0]?.competitors?.[0]?.odds),
      awayOdds: this.parseOdds(event.competitions?.[0]?.competitors?.[1]?.odds),
      homeScore: event.competitions?.[0]?.competitors?.[0]?.score,
      awayScore: event.competitions?.[0]?.competitors?.[1]?.score,
      homeRecord: event.competitions?.[0]?.competitors?.[0]?.records?.[0]?.summary || '0-0',
      awayRecord: event.competitions?.[0]?.competitors?.[1]?.records?.[0]?.summary || '0-0'
    }));
  }

  // Parse real outlier props data
  private parseOutlierProps(props: any[], sport: string): ScrapedProp[] {
    return props.map((prop, index) => ({
      id: prop.id || `outlier_${sport}_${index}`,
      player: prop.player || prop.playerName || prop.name || 'Unknown Player',
      team: prop.team || prop.teamName || 'Unknown',
      opponent: prop.opponent || prop.opponentTeam || 'Unknown',
      prop: prop.prop || prop.propType || prop.market || 'Unknown Prop',
      line: this.parseLine(prop.line || prop.spread || prop.total),
      overOdds: this.parseOdds(prop.overOdds || prop.over_odds || prop.over),
      underOdds: this.parseOdds(prop.underOdds || prop.under_odds || prop.under),
      gameId: prop.gameId || prop.game_id || prop.matchId || '',
      gameDate: prop.gameDate || prop.game_date || prop.date || new Date().toISOString(),
      gameTime: prop.gameTime || prop.game_time || prop.time || 'TBD',
      sport: sport.toUpperCase(),
      confidence: this.parseConfidence(prop.confidence || prop.ai_confidence),
      expectedValue: this.parseExpectedValue(prop.expectedValue || prop.ev || prop.expected_value),
      recentForm: prop.recentForm || prop.form || prop.trend || 'Average',
      last5Games: this.parseLast5Games(prop.last5Games || prop.last_5_games || prop.recent_games),
      seasonStats: this.parseSeasonStats(prop.seasonStats || prop.season_stats || prop.stats),
      aiPrediction: this.parseAIPrediction(prop.aiPrediction || prop.ai_prediction || prop.prediction)
    }));
  }

  // Helper methods for parsing
  private parseGameStatus(status: any): 'upcoming' | 'live' | 'finished' {
    if (!status) return 'upcoming';
    const statusStr = status.toString().toLowerCase();
    if (statusStr.includes('live') || statusStr.includes('in_progress') || statusStr.includes('active')) {
      return 'live';
    }
    if (statusStr.includes('final') || statusStr.includes('completed') || statusStr.includes('finished')) {
      return 'finished';
    }
    return 'upcoming';
  }

  private parseOdds(odds: any): number {
    if (typeof odds === 'number') return odds;
    if (typeof odds === 'string') {
      const parsed = parseFloat(odds);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private parseLine(line: any): number {
    if (typeof line === 'number') return line;
    if (typeof line === 'string') {
      const parsed = parseFloat(line);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private parseSpread(spread: any): number | undefined {
    if (spread === null || spread === undefined) return undefined;
    const parsed = parseFloat(spread);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parseTotal(total: any): number | undefined {
    if (total === null || total === undefined) return undefined;
    const parsed = parseFloat(total);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parseConfidence(confidence: any): number | undefined {
    if (confidence === null || confidence === undefined) return undefined;
    const parsed = parseFloat(confidence);
    return isNaN(parsed) ? undefined : Math.min(Math.max(parsed, 0), 1);
  }

  private parseExpectedValue(ev: any): number | undefined {
    if (ev === null || ev === undefined) return undefined;
    const parsed = parseFloat(ev);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parseLast5Games(games: any): number[] | undefined {
    if (!Array.isArray(games)) return undefined;
    return games.map(game => {
      const parsed = parseFloat(game);
      return isNaN(parsed) ? 0 : parsed;
    });
  }

  private parseSeasonStats(stats: any): any {
    if (!stats || typeof stats !== 'object') return undefined;
    return {
      average: this.parseLine(stats.average || stats.avg),
      median: this.parseLine(stats.median),
      gamesPlayed: parseInt(stats.gamesPlayed || stats.games_played || stats.gp || '0'),
      hitRate: this.parseConfidence(stats.hitRate || stats.hit_rate || stats.rate)
    };
  }

  private parseAIPrediction(prediction: any): any {
    if (!prediction || typeof prediction !== 'object') return undefined;
    return {
      recommended: prediction.recommended || prediction.pick || 'over',
      confidence: this.parseConfidence(prediction.confidence),
      reasoning: prediction.reasoning || prediction.analysis || prediction.reason || 'AI analysis',
      factors: Array.isArray(prediction.factors) ? prediction.factors : []
    };
  }

  private formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return 'TBD';
    }
  }

  // Try direct API calls as fallback
  private async tryDirectAPICalls(sport: string): Promise<ScrapedGame[]> {
    // This would be implemented with direct API calls to known endpoints
    // For now, we'll throw an error to maintain the no-mock-data policy
    throw new Error('Direct API calls not implemented - all scraping methods failed');
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Stop auto-refresh
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

export const siteScraperService = new SiteScraperService();
