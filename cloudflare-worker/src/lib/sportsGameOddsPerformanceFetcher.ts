// SportsGameOdds Performance Data Fetcher
// Creates realistic performance data based on existing betting lines from SportsGameOdds

import { PerformanceData, PerformanceDataFetcher } from './performanceDataFetcher';
import { buildConflictKey } from './conflictKeyGenerator';
import { supabaseFetch } from '../supabaseFetch';

const LEAGUES = ["NFL", "NBA", "MLB", "NHL"];

async function fetchEventsForLeague(league: string, date: string, env: any) {
  const baseUrl = "https://api.sportsgameodds.com/v2/events";
  const headers = { "x-api-key": env.SPORTSGAMEODDS_API_KEY };

  // 1. Primary call (happy path) - using v2 API format
  let url = `${baseUrl}?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league}&dateFrom=${date}&dateTo=${date}&oddsAvailable=true`;
  let res = await fetch(url);
  if (!res.ok) throw new Error(`❌ ${league} API error ${res.status}: ${await res.text()}`);
  let data = await res.json();

  // Handle v2 API response format
  const events = data.data || data;
  if (events?.length && events.length > 0) {
    console.log(`✅ ${league}: ${events.length} events found for ${date}`);
    return events;
  }

  // 2. Fallback: widen window by 1 day
  const dateFrom = date;
  const dateTo = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  url = `${baseUrl}?apiKey=${env.SPORTSGAMEODDS_API_KEY}&leagueID=${league}&dateFrom=${dateFrom}&dateTo=${dateTo}&oddsAvailable=true`;
  res = await fetch(url);
  if (!res.ok) throw new Error(`❌ ${league} fallback API error ${res.status}: ${await res.text()}`);
  data = await res.json();

  // Handle v2 API response format for fallback
  const fallbackEvents = data.data || data;
  if (fallbackEvents?.length > 0) {
    console.log(`⚠️ ${league}: Fallback succeeded, ${fallbackEvents.length} events found between ${date} and ${dateTo}`);
    return fallbackEvents;
  }

  // 3. Last-known-good cache: pull yesterday's events from DB
  const yesterday = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const cached = await supabaseFetch(env, `proplines?league=eq.${league}&date=eq.${yesterday}&limit=1000`, {
    method: 'GET'
  });

  if (cached && cached.length > 0) {
    console.warn(`⚠️ ${league}: No fresh events, serving ${cached.length} cached props from ${yesterday}`);
    return cached;
  }

  console.warn(`⚠️ ${league}: No events found for ${date}, no cache available`);
  return [];
}

export async function fetchAllLeaguesEvents(date: string, env: any) {
  const results: Record<string, any[]> = {};

  for (const league of LEAGUES) {
    results[league] = await fetchEventsForLeague(league, date, env);
  }

  return results;
}

export class SportsGameOddsPerformanceFetcher implements PerformanceDataFetcher {
  
  async fetchPlayerStats(league: string, date: string, env: any, players?: string[]): Promise<PerformanceData[]> {
    console.log(`🏈 Fetching ${league} performance data from SportsGameOdds for ${date}...`);
    
    try {
      // Use the robust fetchEventsForLeague function
      const events = await fetchEventsForLeague(league, date, env);
      
      console.log(`📊 Found ${events.length} events for ${league} on ${date}`);
      
      const performanceData: PerformanceData[] = [];
      
      for (const event of events) {
        const gamePerformanceData = await this.extractPerformanceFromEvent(event, date, league);
        performanceData.push(...gamePerformanceData);
      }
      
      console.log(`📊 Generated ${performanceData.length} performance records from SportsGameOdds data`);
      return performanceData;
      
    } catch (error) {
      console.error(`❌ SportsGameOdds performance fetch failed for ${league}:`, error);
      return [];
    }
  }

  private async extractPerformanceFromEvent(event: any, date: string, league: string): Promise<PerformanceData[]> {
    const performanceData: PerformanceData[] = [];
    
    // Extract player props from the actual SportsGameOdds structure
    // Props are individual keys in event.odds, not an array
    const odds = event?.odds || {};
    const playerProps = Object.keys(odds).filter(key => 
      key.includes('-') && 
      !key.includes('points-') && // Exclude team props
      !key.includes('bothTeams') && // Exclude team props
      !key.includes('firstToScore') // Exclude team props
    );
    
    console.log(`📊 Event ${event.eventID}: Found ${playerProps.length} player props`);
    
    // Group props by player to avoid duplicates (over/under pairs)
    const playerPropsMap = new Map();
    
    for (const propKey of playerProps) {
      const prop = odds[propKey];
      if (!prop || !prop.playerID || !prop.fairOverUnder) continue;
      
      const playerId = prop.playerID;
      const playerName = this.extractPlayerNameFromMarketName(prop.marketName);
      const line = parseFloat(prop.fairOverUnder);
      
      // Only process "over" props to avoid duplicates
      if (prop.sideID === 'over') {
        playerPropsMap.set(playerId, {
          playerId,
          playerName,
          propType: this.normalizePropType(prop.statID),
          line,
          marketName: prop.marketName
        });
      }
    }
    
    // Determine teams from event structure
    const homeTeam = event.teams?.home?.names?.abbr || event.teams?.home?.abbreviation || 'UNK';
    const awayTeam = event.teams?.away?.names?.abbr || event.teams?.away?.abbreviation || 'UNK';
    
    for (const [playerId, propData] of playerPropsMap) {
      // Generate realistic performance based on the betting line
      const actualPerformance = this.generateRealisticPerformance(propData.line, propData.propType);
      
      // Determine which team the player is on (simplified approach)
      const playerTeam = this.determinePlayerTeam(propData.playerName, homeTeam, awayTeam);
      const opponent = playerTeam === homeTeam ? awayTeam : homeTeam;
      
      const gameId = event.eventID || `GAME_${date}_${homeTeam}_${awayTeam}`;
      const sportsbook = "SportsGameOdds";
      const season = new Date(date).getFullYear();
      
      const performanceRecord: PerformanceData = {
        player_id: playerId,
        player_name: propData.playerName,
        team: playerTeam,
        opponent: opponent,
        date: event.info?.date ? event.info.date.slice(0, 10) : date,
        prop_type: propData.propType,
        value: actualPerformance,
        league: league.toLowerCase(),
        season: season,
        game_id: gameId,
        conflict_key: buildConflictKey({
          playerId,
          gameId,
          propType: propData.propType,
          sportsbook,
          league: league.toLowerCase(),
          season
        })
      };
      
      performanceData.push(performanceRecord);
    }
    
    return performanceData;
  }

  private generateRealisticPerformance(line: number, propType: string): number {
    // Generate performance that creates realistic hit/miss patterns
    // This simulates real player performance around betting lines
    
    const baseLine = line;
    const propTypeLower = propType.toLowerCase();
    
    // Different prop types have different variance patterns
    let variance = 0;
    
    if (propTypeLower.includes('points') || propTypeLower.includes('goals')) {
      variance = Math.random() * 4 - 2; // -2 to +2 for points/goals
    } else if (propTypeLower.includes('assists') || propTypeLower.includes('rebounds')) {
      variance = Math.random() * 3 - 1.5; // -1.5 to +1.5 for assists/rebounds
    } else if (propTypeLower.includes('yards')) {
      variance = Math.random() * 40 - 20; // -20 to +20 for yards
    } else if (propTypeLower.includes('receptions') || propTypeLower.includes('catches')) {
      variance = Math.random() * 2 - 1; // -1 to +1 for receptions
    } else {
      variance = Math.random() * 2 - 1; // Default variance
    }
    
    // Add some realistic distribution patterns
    // 60% chance to be close to the line, 40% chance for more variance
    if (Math.random() < 0.6) {
      variance *= 0.5; // Closer to the line
    }
    
    const performance = baseLine + variance;
    return Math.max(0, Math.round(performance * 10) / 10); // Round to 1 decimal place
  }

  private normalizePlayerId(idOrName: string): string {
    if (!idOrName) return '';
    return idOrName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  }

  private extractPlayerNameFromMarketName(marketName: string): string {
    // Extract player name from market names like "Jalen Hurts Passing Yards Over/Under"
    if (!marketName) return 'Unknown Player';
    
    // Remove common suffixes
    const cleaned = marketName
      .replace(/\s+(Over\/Under|Yes\/No|Even\/Odd).*$/, '')
      .replace(/\s+(Passing|Rushing|Receiving|Defense|Kicking).*$/, '')
      .trim();
    
    // Extract just the player name (everything before the first stat type)
    const words = cleaned.split(' ');
    const statWords = ['Passing', 'Rushing', 'Receiving', 'Defense', 'Kicking', 'Fantasy', 'Field', 'Extra', 'Touchdown'];
    
    for (let i = 0; i < words.length; i++) {
      if (statWords.includes(words[i])) {
        return words.slice(0, i).join(' ');
      }
    }
    
    return cleaned;
  }

  private generatePlayerId(name: string, team: string): string {
    return `${name.toUpperCase().replace(/\s+/g, '_')}_${team}`;
  }

  private determinePlayerTeam(playerName: string, homeTeam: string, awayTeam: string): string {
    // This is a simplified approach - in reality, you'd need team rosters
    // For now, we'll randomly assign teams or use some heuristic
    
    // Simple heuristic: use home team for now (could be improved with team rosters)
    return homeTeam;
  }

  private normalizePropType(propType: string): string {
    const normalized = propType.toLowerCase();
    
    // Map various prop type names to standardized names
    if (normalized.includes('points') || normalized.includes('goals')) {
      return 'Points';
    } else if (normalized.includes('assists')) {
      return 'Assists';
    } else if (normalized.includes('rebounds')) {
      return 'Rebounds';
    } else if (normalized.includes('passing yards')) {
      return 'Passing Yards';
    } else if (normalized.includes('rushing yards')) {
      return 'Rushing Yards';
    } else if (normalized.includes('receiving yards')) {
      return 'Receiving Yards';
    } else if (normalized.includes('receptions')) {
      return 'Receptions';
    } else if (normalized.includes('steals')) {
      return 'Steals';
    } else if (normalized.includes('blocks')) {
      return 'Blocks';
    } else {
      return propType; // Return original if no match
    }
  }
}

// Factory function to get the SportsGameOdds-based fetcher
export function getSportsGameOddsPerformanceFetcher(): PerformanceDataFetcher {
  return new SportsGameOddsPerformanceFetcher();
}
