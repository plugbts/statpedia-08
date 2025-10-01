/**
 * Mock Player Props Service - Realistic Data Based on Historical Performance
 * Provides realistic player prop lines and odds based on actual player performance data
 * This service is used when real API data is not available or incomplete
 */

interface HistoricalPlayerData {
  name: string;
  position: string;
  team: string;
  props: {
    [propType: string]: {
      average: number;
      median: number;
      stdDev: number;
      hitRate: number;
      recentTrend: number; // -1 to 1, negative means underperforming
      typicalLine: number;
      typicalOverOdds: number;
      typicalUnderOdds: number;
      lastSeasonAverage: number;
      careerHigh: number;
      careerLow: number;
    };
  };
}

interface MockPlayerProp {
  id: string;
  playerId: number;
  playerName: string;
  team: string;
  teamAbbr: string;
  opponent: string;
  opponentAbbr: string;
  gameId: string;
  sport: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  gameDate: string;
  gameTime: string;
  confidence?: number;
  expectedValue?: number;
  recentForm?: string;
  last5Games?: number[];
  seasonStats?: {
    average: number;
    median: number;
    gamesPlayed: number;
    hitRate: number;
    last5Games: number[];
    seasonHigh: number;
    seasonLow: number;
  };
  aiPrediction?: {
    recommended: 'over' | 'under';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
}

class MockPlayerPropsService {
  private historicalData: { [sport: string]: HistoricalPlayerData[] } = {};
  private teamAbbreviations: { [sport: string]: { [team: string]: string } } = {};

  constructor() {
    this.initializeHistoricalData();
    this.initializeTeamAbbreviations();
  }

  private initializeTeamAbbreviations() {
    this.teamAbbreviations = {
      nfl: {
        'Buffalo Bills': 'BUF',
        'Miami Dolphins': 'MIA',
        'New England Patriots': 'NE',
        'New York Jets': 'NYJ',
        'Baltimore Ravens': 'BAL',
        'Cincinnati Bengals': 'CIN',
        'Cleveland Browns': 'CLE',
        'Pittsburgh Steelers': 'PIT',
        'Houston Texans': 'HOU',
        'Indianapolis Colts': 'IND',
        'Jacksonville Jaguars': 'JAX',
        'Tennessee Titans': 'TEN',
        'Denver Broncos': 'DEN',
        'Kansas City Chiefs': 'KC',
        'Las Vegas Raiders': 'LV',
        'Los Angeles Chargers': 'LAC',
        'Dallas Cowboys': 'DAL',
        'New York Giants': 'NYG',
        'Philadelphia Eagles': 'PHI',
        'Washington Commanders': 'WAS',
        'Chicago Bears': 'CHI',
        'Detroit Lions': 'DET',
        'Green Bay Packers': 'GB',
        'Minnesota Vikings': 'MIN',
        'Atlanta Falcons': 'ATL',
        'Carolina Panthers': 'CAR',
        'New Orleans Saints': 'NO',
        'Tampa Bay Buccaneers': 'TB',
        'Arizona Cardinals': 'ARI',
        'Los Angeles Rams': 'LAR',
        'San Francisco 49ers': 'SF',
        'Seattle Seahawks': 'SEA'
      },
      mlb: {
        'Arizona Diamondbacks': 'ARI',
        'Atlanta Braves': 'ATL',
        'Baltimore Orioles': 'BAL',
        'Boston Red Sox': 'BOS',
        'Chicago Cubs': 'CHC',
        'Chicago White Sox': 'CWS',
        'Cincinnati Reds': 'CIN',
        'Cleveland Guardians': 'CLE',
        'Colorado Rockies': 'COL',
        'Detroit Tigers': 'DET',
        'Houston Astros': 'HOU',
        'Kansas City Royals': 'KC',
        'Los Angeles Angels': 'LAA',
        'Los Angeles Dodgers': 'LAD',
        'Miami Marlins': 'MIA',
        'Milwaukee Brewers': 'MIL',
        'Minnesota Twins': 'MIN',
        'New York Mets': 'NYM',
        'New York Yankees': 'NYY',
        'Oakland Athletics': 'OAK',
        'Philadelphia Phillies': 'PHI',
        'Pittsburgh Pirates': 'PIT',
        'San Diego Padres': 'SD',
        'San Francisco Giants': 'SF',
        'Seattle Mariners': 'SEA',
        'St. Louis Cardinals': 'STL',
        'Tampa Bay Rays': 'TB',
        'Texas Rangers': 'TEX',
        'Toronto Blue Jays': 'TOR',
        'Washington Nationals': 'WSH'
      },
      nba: {
        'Boston Celtics': 'BOS',
        'Brooklyn Nets': 'BKN',
        'New York Knicks': 'NYK',
        'Philadelphia 76ers': 'PHI',
        'Toronto Raptors': 'TOR',
        'Chicago Bulls': 'CHI',
        'Cleveland Cavaliers': 'CLE',
        'Detroit Pistons': 'DET',
        'Indiana Pacers': 'IND',
        'Milwaukee Bucks': 'MIL',
        'Atlanta Hawks': 'ATL',
        'Charlotte Hornets': 'CHA',
        'Miami Heat': 'MIA',
        'Orlando Magic': 'ORL',
        'Washington Wizards': 'WAS',
        'Denver Nuggets': 'DEN',
        'Minnesota Timberwolves': 'MIN',
        'Oklahoma City Thunder': 'OKC',
        'Portland Trail Blazers': 'POR',
        'Utah Jazz': 'UTA',
        'Golden State Warriors': 'GSW',
        'LA Clippers': 'LAC',
        'Los Angeles Lakers': 'LAL',
        'Phoenix Suns': 'PHX',
        'Sacramento Kings': 'SAC',
        'Dallas Mavericks': 'DAL',
        'Houston Rockets': 'HOU',
        'Memphis Grizzlies': 'MEM',
        'New Orleans Pelicans': 'NOP',
        'San Antonio Spurs': 'SAS'
      }
    };
  }

  private initializeHistoricalData() {
    // NFL Historical Data - Based on real player performance
    this.historicalData.nfl = [
      // Quarterbacks
      {
        name: 'Josh Allen',
        position: 'QB',
        team: 'Buffalo Bills',
        props: {
          'Passing Yards': {
            average: 285.2,
            median: 280,
            stdDev: 45.3,
            hitRate: 0.68,
            recentTrend: 0.1,
            typicalLine: 280.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 275.8,
            careerHigh: 415,
            careerLow: 120
          },
          'Passing TDs': {
            average: 2.1,
            median: 2,
            stdDev: 0.8,
            hitRate: 0.72,
            recentTrend: 0.05,
            typicalLine: 2.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 2.0,
            careerHigh: 5,
            careerLow: 0
          },
          'Rushing Yards': {
            average: 45.2,
            median: 42,
            stdDev: 18.7,
            hitRate: 0.61,
            recentTrend: -0.05,
            typicalLine: 42.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 48.1,
            careerHigh: 109,
            careerLow: 8
          },
          'Rushing TDs': {
            average: 0.6,
            median: 0.5,
            stdDev: 0.7,
            hitRate: 0.58,
            recentTrend: 0.02,
            typicalLine: 0.5,
            typicalOverOdds: -120,
            typicalUnderOdds: -100,
            lastSeasonAverage: 0.7,
            careerHigh: 3,
            careerLow: 0
          }
        }
      },
      {
        name: 'Patrick Mahomes',
        position: 'QB',
        team: 'Kansas City Chiefs',
        props: {
          'Passing Yards': {
            average: 295.8,
            median: 290,
            stdDev: 52.1,
            hitRate: 0.71,
            recentTrend: 0.08,
            typicalLine: 290.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 288.3,
            careerHigh: 478,
            careerLow: 148
          },
          'Passing TDs': {
            average: 2.4,
            median: 2.5,
            stdDev: 0.9,
            hitRate: 0.69,
            recentTrend: 0.12,
            typicalLine: 2.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 2.3,
            careerHigh: 6,
            careerLow: 0
          }
        }
      },
      {
        name: 'Lamar Jackson',
        position: 'QB',
        team: 'Baltimore Ravens',
        props: {
          'Passing Yards': {
            average: 215.6,
            median: 210,
            stdDev: 38.4,
            hitRate: 0.65,
            recentTrend: 0.15,
            typicalLine: 215.5,
            typicalOverOdds: -105,
            typicalUnderOdds: -115,
            lastSeasonAverage: 208.2,
            careerHigh: 442,
            careerLow: 97
          },
          'Rushing Yards': {
            average: 67.3,
            median: 65,
            stdDev: 22.1,
            hitRate: 0.74,
            recentTrend: 0.08,
            typicalLine: 65.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 69.8,
            careerHigh: 152,
            careerLow: 15
          }
        }
      },
      // Running Backs
      {
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'San Francisco 49ers',
        props: {
          'Rushing Yards': {
            average: 85.4,
            median: 82,
            stdDev: 28.7,
            hitRate: 0.69,
            recentTrend: 0.12,
            typicalLine: 85.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 78.9,
            careerHigh: 193,
            careerLow: 22
          },
          'Receiving Yards': {
            average: 52.8,
            median: 48,
            stdDev: 18.9,
            hitRate: 0.71,
            recentTrend: 0.06,
            typicalLine: 52.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 49.2,
            careerHigh: 119,
            careerLow: 12
          },
          'Rushing TDs': {
            average: 0.8,
            median: 0.5,
            stdDev: 0.8,
            hitRate: 0.62,
            recentTrend: 0.09,
            typicalLine: 0.5,
            typicalOverOdds: -120,
            typicalUnderOdds: -100,
            lastSeasonAverage: 0.7,
            careerHigh: 4,
            careerLow: 0
          }
        }
      },
      {
        name: 'Derrick Henry',
        position: 'RB',
        team: 'Tennessee Titans',
        props: {
          'Rushing Yards': {
            average: 95.2,
            median: 92,
            stdDev: 32.4,
            hitRate: 0.73,
            recentTrend: -0.08,
            typicalLine: 95.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 98.1,
            careerHigh: 238,
            careerLow: 28
          },
          'Rushing TDs': {
            average: 0.9,
            median: 1,
            stdDev: 0.9,
            hitRate: 0.68,
            recentTrend: -0.05,
            typicalLine: 0.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 1.0,
            careerHigh: 5,
            careerLow: 0
          }
        }
      },
      // Wide Receivers
      {
        name: 'Tyreek Hill',
        position: 'WR',
        team: 'Miami Dolphins',
        props: {
          'Receiving Yards': {
            average: 78.4,
            median: 75,
            stdDev: 24.6,
            hitRate: 0.72,
            recentTrend: 0.14,
            typicalLine: 78.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 72.1,
            careerHigh: 177,
            careerLow: 18
          },
          'Receptions': {
            average: 5.8,
            median: 6,
            stdDev: 2.1,
            hitRate: 0.69,
            recentTrend: 0.11,
            typicalLine: 5.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 5.4,
            careerHigh: 11,
            careerLow: 1
          },
          'Receiving TDs': {
            average: 0.7,
            median: 0.5,
            stdDev: 0.8,
            hitRate: 0.64,
            recentTrend: 0.13,
            typicalLine: 0.5,
            typicalOverOdds: -120,
            typicalUnderOdds: -100,
            lastSeasonAverage: 0.6,
            careerHigh: 4,
            careerLow: 0
          }
        }
      },
      {
        name: 'Davante Adams',
        position: 'WR',
        team: 'Las Vegas Raiders',
        props: {
          'Receiving Yards': {
            average: 82.1,
            median: 78,
            stdDev: 26.3,
            hitRate: 0.75,
            recentTrend: 0.07,
            typicalLine: 82.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 79.8,
            careerHigh: 206,
            careerLow: 20
          },
          'Receptions': {
            average: 6.2,
            median: 6,
            stdDev: 2.3,
            hitRate: 0.71,
            recentTrend: 0.04,
            typicalLine: 6.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 6.0,
            careerHigh: 13,
            careerLow: 2
          }
        }
      }
    ];

    // NBA Historical Data
    this.historicalData.nba = [
      {
        name: 'LeBron James',
        position: 'SF',
        team: 'Los Angeles Lakers',
        props: {
          'Points': {
            average: 25.8,
            median: 26,
            stdDev: 6.2,
            hitRate: 0.68,
            recentTrend: -0.05,
            typicalLine: 25.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 28.9,
            careerHigh: 61,
            careerLow: 8
          },
          'Rebounds': {
            average: 7.2,
            median: 7,
            stdDev: 2.8,
            hitRate: 0.65,
            recentTrend: -0.08,
            typicalLine: 7.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 8.3,
            careerHigh: 19,
            careerLow: 1
          },
          'Assists': {
            average: 6.9,
            median: 7,
            stdDev: 2.9,
            hitRate: 0.71,
            recentTrend: 0.02,
            typicalLine: 6.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 6.8,
            careerHigh: 19,
            careerLow: 0
          }
        }
      },
      {
        name: 'Stephen Curry',
        position: 'PG',
        team: 'Golden State Warriors',
        props: {
          'Points': {
            average: 29.4,
            median: 29,
            stdDev: 7.8,
            hitRate: 0.73,
            recentTrend: 0.12,
            typicalLine: 29.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 26.4,
            careerHigh: 62,
            careerLow: 9
          },
          '3-Pointers Made': {
            average: 4.8,
            median: 5,
            stdDev: 2.1,
            hitRate: 0.69,
            recentTrend: 0.15,
            typicalLine: 4.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 4.2,
            careerHigh: 13,
            careerLow: 0
          }
        }
      },
      {
        name: 'Giannis Antetokounmpo',
        position: 'PF',
        team: 'Milwaukee Bucks',
        props: {
          'Points': {
            average: 31.1,
            median: 31,
            stdDev: 8.4,
            hitRate: 0.76,
            recentTrend: 0.08,
            typicalLine: 31.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 29.9,
            careerHigh: 55,
            careerLow: 8
          },
          'Rebounds': {
            average: 11.8,
            median: 12,
            stdDev: 3.2,
            hitRate: 0.72,
            recentTrend: 0.06,
            typicalLine: 11.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 11.6,
            careerHigh: 24,
            careerLow: 3
          },
          'Assists': {
            average: 5.7,
            median: 6,
            stdDev: 2.4,
            hitRate: 0.68,
            recentTrend: 0.04,
            typicalLine: 5.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 5.8,
            careerHigh: 15,
            careerLow: 1
          }
        }
      }
    ];

    // MLB Historical Data
    this.historicalData.mlb = [
      {
        name: 'Ronald Acuña Jr.',
        position: 'OF',
        team: 'Atlanta Braves',
        props: {
          'Hits': {
            average: 1.3,
            median: 1,
            stdDev: 0.8,
            hitRate: 0.72,
            recentTrend: 0.15,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 1.2,
            careerHigh: 4,
            careerLow: 0
          },
          'Home Runs': {
            average: 0.2,
            median: 0,
            stdDev: 0.5,
            hitRate: 0.18,
            recentTrend: 0.08,
            typicalLine: 0.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 0.19,
            careerHigh: 2,
            careerLow: 0
          },
          'RBI': {
            average: 0.8,
            median: 0,
            stdDev: 1.1,
            hitRate: 0.45,
            recentTrend: 0.12,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 0.75,
            careerHigh: 6,
            careerLow: 0
          }
        }
      },
      {
        name: 'Shohei Ohtani',
        position: 'DH/SP',
        team: 'Los Angeles Dodgers',
        props: {
          'Hits': {
            average: 1.1,
            median: 1,
            stdDev: 0.7,
            hitRate: 0.68,
            recentTrend: 0.05,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 1.0,
            careerHigh: 3,
            careerLow: 0
          },
          'Home Runs': {
            average: 0.25,
            median: 0,
            stdDev: 0.6,
            hitRate: 0.22,
            recentTrend: 0.10,
            typicalLine: 0.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 0.23,
            careerHigh: 2,
            careerLow: 0
          },
          'Strikeouts': {
            average: 6.8,
            median: 6,
            stdDev: 3.2,
            hitRate: 0.65,
            recentTrend: -0.05,
            typicalLine: 7.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 7.1,
            careerHigh: 14,
            careerLow: 2
          }
        }
      },
      {
        name: 'Aaron Judge',
        position: 'OF',
        team: 'New York Yankees',
        props: {
          'Hits': {
            average: 1.0,
            median: 1,
            stdDev: 0.6,
            hitRate: 0.62,
            recentTrend: 0.08,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 0.95,
            careerHigh: 3,
            careerLow: 0
          },
          'Home Runs': {
            average: 0.28,
            median: 0,
            stdDev: 0.6,
            hitRate: 0.25,
            recentTrend: 0.12,
            typicalLine: 0.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 0.26,
            careerHigh: 2,
            careerLow: 0
          },
          'RBI': {
            average: 0.9,
            median: 0,
            stdDev: 1.2,
            hitRate: 0.48,
            recentTrend: 0.15,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 0.85,
            careerHigh: 6,
            careerLow: 0
          }
        }
      },
      {
        name: 'Mookie Betts',
        position: 'OF',
        team: 'Los Angeles Dodgers',
        props: {
          'Hits': {
            average: 1.2,
            median: 1,
            stdDev: 0.7,
            hitRate: 0.70,
            recentTrend: 0.03,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 1.15,
            careerHigh: 3,
            careerLow: 0
          },
          'Runs': {
            average: 0.7,
            median: 0,
            stdDev: 0.8,
            hitRate: 0.42,
            recentTrend: 0.06,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 0.68,
            careerHigh: 4,
            careerLow: 0
          },
          'Total Bases': {
            average: 2.1,
            median: 2,
            stdDev: 1.3,
            hitRate: 0.58,
            recentTrend: 0.04,
            typicalLine: 2.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 2.05,
            careerHigh: 8,
            careerLow: 0
          }
        }
      },
      {
        name: 'Mike Trout',
        position: 'OF',
        team: 'Los Angeles Angels',
        props: {
          'Hits': {
            average: 1.1,
            median: 1,
            stdDev: 0.6,
            hitRate: 0.66,
            recentTrend: -0.02,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 1.12,
            careerHigh: 3,
            careerLow: 0
          },
          'Home Runs': {
            average: 0.22,
            median: 0,
            stdDev: 0.5,
            hitRate: 0.20,
            recentTrend: -0.05,
            typicalLine: 0.5,
            typicalOverOdds: -115,
            typicalUnderOdds: -105,
            lastSeasonAverage: 0.24,
            careerHigh: 2,
            careerLow: 0
          },
          'RBI': {
            average: 0.8,
            median: 0,
            stdDev: 1.0,
            hitRate: 0.44,
            recentTrend: -0.08,
            typicalLine: 1.5,
            typicalOverOdds: -110,
            typicalUnderOdds: -110,
            lastSeasonAverage: 0.85,
            careerHigh: 5,
            careerLow: 0
          }
        }
      }
    ];
  }

  private getTeamAbbreviation(sport: string, team: string): string {
    return this.teamAbbreviations[sport]?.[team] || team.substring(0, 3).toUpperCase();
  }

  private generateOpponent(sport: string): string {
    const teams = Object.keys(this.teamAbbreviations[sport] || {});
    return teams[Math.floor(Math.random() * teams.length)];
  }

  private calculateRealisticLine(historicalData: HistoricalPlayerData, propType: string): number {
    const prop = historicalData.props[propType];
    if (!prop) return 0;

    // Start with typical line and add some variation
    let line = prop.typicalLine;
    
    // Add recent trend influence
    line += prop.recentTrend * prop.stdDev * 0.3;
    
    // Add some random variation
    const randomVariation = (Math.random() - 0.5) * prop.stdDev * 0.2;
    line += randomVariation;
    
    // Round to nearest 0.5
    return Math.round(line * 2) / 2;
  }

  private calculateRealisticOdds(historicalData: HistoricalPlayerData, propType: string, line: number): { overOdds: number; underOdds: number } {
    const prop = historicalData.props[propType];
    if (!prop) return { overOdds: -110, underOdds: -110 };

    // Base odds on hit rate and recent trend
    let overOdds = prop.typicalOverOdds;
    let underOdds = prop.typicalUnderOdds;

    // Adjust based on recent trend
    if (prop.recentTrend > 0.1) {
      overOdds -= 5;
      underOdds += 5;
    } else if (prop.recentTrend < -0.1) {
      overOdds += 5;
      underOdds -= 5;
    }

    // Add some random variation
    const variation = Math.floor((Math.random() - 0.5) * 20);
    overOdds += variation;
    underOdds -= variation;

    // Ensure odds stay within reasonable bounds
    overOdds = Math.max(-150, Math.min(-105, overOdds));
    underOdds = Math.max(-150, Math.min(-105, underOdds));

    return { overOdds, underOdds };
  }

  private generateLast5Games(historicalData: HistoricalPlayerData, propType: string, line: number): number[] {
    const prop = historicalData.props[propType];
    if (!prop) return [];

    return Array.from({ length: 5 }, () => {
      const variation = (Math.random() - 0.5) * prop.stdDev * 0.8;
      const value = Math.max(0, line + variation);
      return Math.round(value * 2) / 2;
    });
  }

  private generateSeasonStats(historicalData: HistoricalPlayerData, propType: string, line: number): any {
    const prop = historicalData.props[propType];
    if (!prop) return null;

    const gamesPlayed = 10 + Math.floor(Math.random() * 6);
    const hitRate = prop.hitRate + (Math.random() - 0.5) * 0.1;
    const average = prop.average + (Math.random() - 0.5) * prop.stdDev * 0.3;

    return {
      average: Math.round(average * 2) / 2,
      median: prop.median,
      gamesPlayed,
      hitRate: Math.max(0, Math.min(1, hitRate)),
      last5Games: this.generateLast5Games(historicalData, propType, line),
      seasonHigh: prop.careerHigh,
      seasonLow: prop.careerLow
    };
  }

  private generateAIPrediction(historicalData: HistoricalPlayerData, propType: string, line: number, overOdds: number, underOdds: number): any {
    const prop = historicalData.props[propType];
    if (!prop) return null;

    // Determine recommendation based on odds and recent trend
    let recommended: 'over' | 'under';
    let confidence: number;

    if (overOdds < underOdds && prop.recentTrend > 0) {
      recommended = 'over';
      confidence = 0.6 + prop.hitRate * 0.3;
    } else if (underOdds < overOdds && prop.recentTrend < 0) {
      recommended = 'under';
      confidence = 0.6 + prop.hitRate * 0.3;
    } else {
      recommended = Math.random() > 0.5 ? 'over' : 'under';
      confidence = 0.5 + prop.hitRate * 0.2;
    }

    const reasoning = this.generateReasoning(historicalData.name, propType, recommended);
    const factors = this.generateFactors(propType, historicalData.team);

    return {
      recommended,
      confidence: Math.min(0.95, confidence),
      reasoning,
      factors
    };
  }

  private generateReasoning(playerName: string, propType: string, recommendation: 'over' | 'under'): string {
    const reasons = {
      over: [
        `${playerName} has been exceeding expectations in ${propType} recently.`,
        `The matchup favors ${playerName} to go over this ${propType} line.`,
        `${playerName}'s recent form suggests they'll surpass this ${propType} total.`,
        `Historical performance against this opponent supports the over.`,
        `${playerName} has been trending upward in ${propType} this season.`
      ],
      under: [
        `${playerName} has been struggling to reach ${propType} expectations recently.`,
        `The defensive matchup suggests ${playerName} will fall short of this ${propType} line.`,
        `${playerName}'s recent decline in ${propType} performance supports the under.`,
        `Historical struggles against this opponent favor the under.`,
        `${playerName} has been trending downward in ${propType} this season.`
      ]
    };

    const reasonList = reasons[recommendation];
    return reasonList[Math.floor(Math.random() * reasonList.length)];
  }

  private generateFactors(propType: string, team: string): string[] {
    const commonFactors = ['Recent Form', 'Matchup Analysis', 'Weather Conditions'];
    
    const propSpecificFactors: { [key: string]: string[] } = {
      'Passing Yards': ['Defensive Pass Rating', 'Game Script', 'Weather'],
      'Rushing Yards': ['Defensive Rush Rating', 'Game Script', 'Field Conditions'],
      'Receiving Yards': ['Target Share', 'Defensive Coverage', 'Red Zone Usage'],
      'Points': ['Usage Rate', 'Defensive Matchup', 'Rest Days'],
      'Rebounds': ['Pace of Play', 'Opponent Rebounding', 'Minutes Played'],
      'Assists': ['Teammate Shooting', 'Ball Movement', 'Usage Rate']
    };

    return [...commonFactors, ...(propSpecificFactors[propType] || [])];
  }

  private calculateExpectedValue(overOdds: number, underOdds: number, confidence: number): number {
    // Simple EV calculation
    const overProb = confidence;
    const underProb = 1 - confidence;
    
    const overEV = overProb * (overOdds > 0 ? overOdds / 100 : 100 / Math.abs(overOdds)) - underProb;
    const underEV = underProb * (underOdds > 0 ? underOdds / 100 : 100 / Math.abs(underOdds)) - overProb;
    
    return Math.max(overEV, underEV) * 0.1; // Scale down for display
  }

  private determineRecentForm(historicalData: HistoricalPlayerData, propType: string): string {
    const prop = historicalData.props[propType];
    if (!prop) return 'Neutral';

    if (prop.recentTrend > 0.1) return 'Hot';
    if (prop.recentTrend < -0.1) return 'Cold';
    return 'Neutral';
  }

  public generateMockPlayerProps(sport: string, count: number = 20): MockPlayerProp[] {
    const historicalPlayers = this.historicalData[sport] || [];
    if (historicalPlayers.length === 0) return [];

    const props: MockPlayerProp[] = [];
    const usedCombinations = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Select random player
      const player = historicalPlayers[Math.floor(Math.random() * historicalPlayers.length)];
      
      // Select random prop type for this player
      const propTypes = Object.keys(player.props);
      const propType = propTypes[Math.floor(Math.random() * propTypes.length)];
      
      // Avoid duplicates
      const combinationKey = `${player.name}_${propType}`;
      if (usedCombinations.has(combinationKey)) continue;
      usedCombinations.add(combinationKey);

      const historicalProp = player.props[propType];
      const line = this.calculateRealisticLine(player, propType);
      const { overOdds, underOdds } = this.calculateRealisticOdds(player, propType, line);
      
      const opponent = this.generateOpponent(sport);
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() + Math.floor(Math.random() * 7)); // Next 7 days

      const aiPrediction = this.generateAIPrediction(player, propType, line, overOdds, underOdds);
      const confidence = aiPrediction?.confidence || 0.5;
      const expectedValue = this.calculateExpectedValue(overOdds, underOdds, confidence);

      const prop: MockPlayerProp = {
        id: `${player.name.replace(/\s+/g, '_')}_${propType.replace(/\s+/g, '_')}_${Date.now()}`,
        playerId: Math.floor(Math.random() * 10000) + 1000,
        playerName: player.name,
        team: player.team,
        teamAbbr: this.getTeamAbbreviation(sport, player.team),
        opponent,
        opponentAbbr: this.getTeamAbbreviation(sport, opponent),
        gameId: `game_${Date.now()}_${i}`,
        sport: sport.toUpperCase(),
        propType,
        line,
        overOdds,
        underOdds,
        gameDate: gameDate.toISOString(),
        gameTime: gameDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          timeZoneName: 'short' 
        }),
        confidence,
        expectedValue,
        recentForm: this.determineRecentForm(player, propType),
        last5Games: this.generateLast5Games(player, propType, line),
        seasonStats: this.generateSeasonStats(player, propType, line),
        aiPrediction
      };

      props.push(prop);
    }

    return props;
  }

  public getHistoricalPlayerData(sport: string, playerName: string): HistoricalPlayerData | null {
    const players = this.historicalData[sport] || [];
    return players.find(p => p.name.toLowerCase() === playerName.toLowerCase()) || null;
  }

  public getAllPlayersForSport(sport: string): HistoricalPlayerData[] {
    return this.historicalData[sport] || [];
  }
}

// Export singleton instance
export const mockPlayerPropsService = new MockPlayerPropsService();
export type { MockPlayerProp, HistoricalPlayerData };
