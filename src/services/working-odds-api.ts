// Working Odds API Service using Supabase Edge Function
// This service uses the working Supabase Edge Function that connects to The Odds API

import { supabase } from '@/integrations/supabase/client';

export interface WorkingGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  gameTime: string;
  status: string;
  league: string;
}

export interface WorkingPlayerProp {
  id: string;
  playerName: string;
  team: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
}

class WorkingOddsAPI {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  // Get games for a specific sport using the working Supabase Edge Function
  async getGames(sport: string): Promise<WorkingGame[]> {
    const cacheKey = `games_${sport}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      console.log(`📦 [WorkingOddsAPI] Using cached games for ${sport}`);
      return cached.data;
    }

    try {
      console.log(`🎯 [WorkingOddsAPI] Fetching games for ${sport}...`);
      
      // Map sport names to The Odds API format
      const sportKey = this.mapSportToOddsAPI(sport);
      if (!sportKey) {
        console.warn(`⚠️ [WorkingOddsAPI] No sport key found for ${sport}`);
        return [];
      }

      const { data, error } = await supabase.functions.invoke('fetch-odds', {
        body: { endpoint: 'events', sport: sportKey }
      });

      if (error) {
        console.error(`❌ [WorkingOddsAPI] Supabase error:`, error);
        return [];
      }

      if (!data.success) {
        console.error(`❌ [WorkingOddsAPI] API error:`, data.error);
        return [];
      }

      const games: WorkingGame[] = data.data.map((game: any) => ({
        id: game.id,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        sport: sport.toUpperCase(),
        gameTime: game.commence_time,
        status: 'scheduled',
        league: game.sport_title || 'Unknown'
      }));

      this.cache.set(cacheKey, { data: games, timestamp: now });
      
      console.log(`✅ [WorkingOddsAPI] Retrieved ${games.length} games for ${sport}`);
      return games;
      
    } catch (error) {
      console.error(`❌ [WorkingOddsAPI] Failed to get games for ${sport}:`, error);
      return [];
    }
  }

  // Get player props for a specific sport (mock for now since player props API needs more work)
  async getPlayerProps(sport: string): Promise<WorkingPlayerProp[]> {
    const cacheKey = `player_props_${sport}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      console.log(`📦 [WorkingOddsAPI] Using cached player props for ${sport}`);
      return cached.data;
    }

    try {
      console.log(`👤 [WorkingOddsAPI] Fetching player props for ${sport}...`);
      
      // For now, generate realistic player props based on current games
      const games = await this.getGames(sport);
      if (games.length === 0) {
        console.log(`⚠️ [WorkingOddsAPI] No games found for ${sport}, cannot generate player props`);
        return [];
      }

      const playerProps: WorkingPlayerProp[] = [];
      
      // Generate realistic player props for each game
      games.forEach(game => {
        // Generate props for key players from each team
        const homePlayers = this.getKeyPlayers(game.homeTeam, sport);
        const awayPlayers = this.getKeyPlayers(game.awayTeam, sport);
        
        [...homePlayers, ...awayPlayers].forEach(player => {
          const props = this.generatePlayerProps(player, game, sport);
          playerProps.push(...props);
        });
      });

      this.cache.set(cacheKey, { data: playerProps, timestamp: now });
      
      console.log(`✅ [WorkingOddsAPI] Generated ${playerProps.length} player props for ${sport}`);
      return playerProps;
      
    } catch (error) {
      console.error(`❌ [WorkingOddsAPI] Failed to get player props for ${sport}:`, error);
      return [];
    }
  }

  // Map sport names to The Odds API format
  private mapSportToOddsAPI(sport: string): string | null {
    const sportMap: { [key: string]: string } = {
      'nfl': 'americanfootball_nfl',
      'nba': 'basketball_nba',
      'mlb': 'baseball_mlb',
      'nhl': 'icehockey_nhl',
      'soccer': 'soccer_epl',
      'tennis': 'tennis_atp_shanghai_masters',
      'mma': 'mma_mixed_martial_arts'
    };
    return sportMap[sport.toLowerCase()] || null;
  }

  // Get key players for a team (realistic data)
  private getKeyPlayers(team: string, sport: string): string[] {
    const teamPlayers: { [key: string]: string[] } = {
      // NFL Teams
      'Cleveland Browns': ['Deshaun Watson', 'Nick Chubb', 'Amari Cooper'],
      'Minnesota Vikings': ['Kirk Cousins', 'Justin Jefferson', 'Dalvin Cook'],
      'Baltimore Ravens': ['Lamar Jackson', 'Mark Andrews', 'J.K. Dobbins'],
      'Houston Texans': ['C.J. Stroud', 'Nico Collins', 'Dameon Pierce'],
      'Carolina Panthers': ['Bryce Young', 'Adam Thielen', 'Miles Sanders'],
      'Miami Dolphins': ['Tua Tagovailoa', 'Tyreek Hill', 'Raheem Mostert'],
      'New York Jets': ['Aaron Rodgers', 'Garrett Wilson', 'Breece Hall'],
      'Dallas Cowboys': ['Dak Prescott', 'CeeDee Lamb', 'Tony Pollard'],
      'Philadelphia Eagles': ['Jalen Hurts', 'A.J. Brown', 'D\'Andre Swift'],
      'Denver Broncos': ['Russell Wilson', 'Courtland Sutton', 'Javonte Williams'],
      'Indianapolis Colts': ['Anthony Richardson', 'Michael Pittman Jr.', 'Jonathan Taylor'],
      'Las Vegas Raiders': ['Jimmy Garoppolo', 'Davante Adams', 'Josh Jacobs'],
      'New Orleans Saints': ['Derek Carr', 'Chris Olave', 'Alvin Kamara'],
      'New York Giants': ['Daniel Jones', 'Saquon Barkley', 'Darius Slayton'],
      'Arizona Cardinals': ['Kyler Murray', 'Marquise Brown', 'James Conner'],
      'Tennessee Titans': ['Ryan Tannehill', 'Derrick Henry', 'DeAndre Hopkins'],
      'Seattle Seahawks': ['Geno Smith', 'DK Metcalf', 'Kenneth Walker III'],
      'Tampa Bay Buccaneers': ['Baker Mayfield', 'Mike Evans', 'Rachaad White'],
      'Cincinnati Bengals': ['Joe Burrow', 'Ja\'Marr Chase', 'Joe Mixon'],
      'Detroit Lions': ['Jared Goff', 'Amon-Ra St. Brown', 'Jahmyr Gibbs'],
      'Los Angeles Chargers': ['Justin Herbert', 'Keenan Allen', 'Austin Ekeler'],
      'Washington Commanders': ['Sam Howell', 'Terry McLaurin', 'Antonio Gibson'],
      'Buffalo Bills': ['Josh Allen', 'Stefon Diggs', 'James Cook'],
      'New England Patriots': ['Mac Jones', 'Rhamondre Stevenson', 'Hunter Henry'],
      'Jacksonville Jaguars': ['Trevor Lawrence', 'Calvin Ridley', 'Travis Etienne'],
      'Kansas City Chiefs': ['Patrick Mahomes', 'Travis Kelce', 'Isiah Pacheco']
    };

    return teamPlayers[team] || [`${team} Player 1`, `${team} Player 2`, `${team} Player 3`];
  }

  // Generate realistic player props
  private generatePlayerProps(player: string, game: WorkingGame, sport: string): WorkingPlayerProp[] {
    const props: WorkingPlayerProp[] = [];
    
    if (sport.toLowerCase() === 'nfl') {
      // NFL-specific props
      const propTypes = [
        { type: 'Passing Yards', line: Math.floor(Math.random() * 100) + 200, overOdds: -110, underOdds: -110 },
        { type: 'Passing TDs', line: Math.floor(Math.random() * 2) + 1, overOdds: -110, underOdds: -110 },
        { type: 'Rushing Yards', line: Math.floor(Math.random() * 50) + 50, overOdds: -110, underOdds: -110 },
        { type: 'Receiving Yards', line: Math.floor(Math.random() * 50) + 50, overOdds: -110, underOdds: -110 },
        { type: 'Receptions', line: Math.floor(Math.random() * 3) + 4, overOdds: -110, underOdds: -110 }
      ];

      propTypes.forEach(prop => {
        props.push({
          id: `${player}_${prop.type}_${game.id}`,
          playerName: player,
          team: game.homeTeam.includes(player.split(' ')[0]) ? game.homeTeam : game.awayTeam,
          sport: sport.toUpperCase(),
          propType: prop.type,
          line: prop.line,
          overOdds: prop.overOdds,
          underOdds: prop.underOdds,
          gameTime: game.gameTime,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam
        });
      });
    }

    return props;
  }
}

export const workingOddsAPI = new WorkingOddsAPI();
