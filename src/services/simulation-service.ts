// Simulation Service for Moneyline Props and Predictions
// Runs thousands of simulations and backtests to predict final scores

export interface GameData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  season: string;
  date: string;
  homeScore: number;
  awayScore: number;
  homeWin: boolean;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  weather?: string;
  venue?: string;
  homeForm: number[];
  awayForm: number[];
  headToHead: {
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  injuries: {
    home: string[];
    away: string[];
  };
  restDays: {
    home: number;
    away: number;
  };
  homeAdvantage: number;
  awayAdvantage: number;
}

export interface SimulationResult {
  homeScore: number;
  awayScore: number;
  homeWin: boolean;
  draw: boolean;
  confidence: number;
  factors: {
    form: number;
    h2h: number;
    rest: number;
    injuries: number;
    venue: number;
    weather: number;
  };
}

export interface BacktestResult {
  totalGames: number;
  correctPredictions: number;
  accuracy: number;
  profitLoss: number;
  roi: number;
  avgConfidence: number;
  bestFactors: string[];
  worstFactors: string[];
  monthlyBreakdown: {
    month: string;
    games: number;
    accuracy: number;
    profit: number;
  }[];
}

export interface PredictionAnalysis {
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  homeWinProbability: number;
  awayWinProbability: number;
  drawProbability: number;
  confidence: number;
  recommendedBet: 'home' | 'away' | 'draw' | 'none';
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: {
    form: number;
    h2h: number;
    rest: number;
    injuries: number;
    venue: number;
    weather: number;
  };
  simulationResults: SimulationResult[];
  backtestData: BacktestResult;
}

class SimulationService {
  private gameData: GameData[] = [];
  private readonly SIMULATION_COUNT = 10000;
  private readonly BACKTEST_YEARS = 3;

  constructor() {
    this.loadHistoricalData();
  }

  // Load historical game data for backtesting
  private async loadHistoricalData(): Promise<void> {
    try {
      // In a real implementation, this would load from a database
      // For now, we'll generate realistic mock data
      this.gameData = this.generateMockHistoricalData();
    } catch (error) {
      console.error('Failed to load historical data:', error);
      this.gameData = [];
    }
  }

  // Generate realistic mock historical data
  private generateMockHistoricalData(): GameData[] {
    const sports = ['nba', 'nfl', 'mlb', 'nhl', 'soccer'];
    const teams = {
      nba: ['LAL', 'GSW', 'BOS', 'MIA', 'PHX', 'MIL', 'DEN', 'PHI'],
      nfl: ['KC', 'BUF', 'TB', 'GB', 'DAL', 'SF', 'CIN', 'LAR'],
      mlb: ['NYY', 'LAD', 'HOU', 'ATL', 'TB', 'SD', 'TOR', 'CWS'],
      nhl: ['COL', 'FLA', 'EDM', 'NYR', 'CAR', 'VGK', 'TOR', 'BOS'],
      soccer: ['MCI', 'ARS', 'LIV', 'CHE', 'TOT', 'MUN', 'NEW', 'AVL']
    };

    const data: GameData[] = [];
    const currentDate = new Date();
    
    // Generate 3 years of historical data
    for (let year = 0; year < this.BACKTEST_YEARS; year++) {
      const yearDate = new Date(currentDate.getFullYear() - year, 0, 1);
      
      for (const sport of sports) {
        const sportTeams = teams[sport as keyof typeof teams];
        
        // Generate games for each season
        for (let month = 0; month < 12; month++) {
          const gamesPerMonth = this.getGamesPerMonth(sport, month);
          
          for (let game = 0; game < gamesPerMonth; game++) {
            const homeTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
            let awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
            
            // Ensure different teams
            while (awayTeam === homeTeam) {
              awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
            }

            const gameDate = new Date(yearDate.getFullYear(), month, Math.floor(Math.random() * 30) + 1);
            const homeScore = this.generateScore(sport, 'home');
            const awayScore = this.generateScore(sport, 'away');
            const homeWin = homeScore > awayScore;
            
            data.push({
              id: `${sport}_${year}_${month}_${game}`,
              homeTeam,
              awayTeam,
              sport,
              season: `${yearDate.getFullYear()}`,
              date: gameDate.toISOString(),
              homeScore,
              awayScore,
              homeWin,
              homeOdds: this.generateOdds(homeWin, sport),
              awayOdds: this.generateOdds(!homeWin, sport),
              drawOdds: sport === 'soccer' ? this.generateOdds(false, sport) : undefined,
              weather: this.generateWeather(),
              venue: `${homeTeam} Arena`,
              homeForm: this.generateFormArray(10),
              awayForm: this.generateFormArray(10),
              headToHead: {
                homeWins: Math.floor(Math.random() * 5),
                awayWins: Math.floor(Math.random() * 5),
                draws: sport === 'soccer' ? Math.floor(Math.random() * 3) : 0
              },
              injuries: {
                home: this.generateInjuries(),
                away: this.generateInjuries()
              },
              restDays: {
                home: Math.floor(Math.random() * 7) + 1,
                away: Math.floor(Math.random() * 7) + 1
              },
              homeAdvantage: this.calculateHomeAdvantage(sport),
              awayAdvantage: this.calculateAwayAdvantage(sport)
            });
          }
        }
      }
    }

    return data;
  }

  private getGamesPerMonth(sport: string, month: number): number {
    const gamesPerMonth = {
      nba: [15, 15, 15, 15, 15, 15, 0, 0, 0, 15, 15, 15], // Regular season months
      nfl: [4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0], // Regular season
      mlb: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25], // Full season
      nhl: [15, 15, 15, 15, 15, 15, 0, 0, 0, 15, 15, 15], // Regular season
      soccer: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8] // Year-round
    };
    return gamesPerMonth[sport as keyof typeof gamesPerMonth][month] || 0;
  }

  private generateScore(sport: string, team: 'home' | 'away'): number {
    const baseScores = {
      nba: { min: 80, max: 140, avg: 110 },
      nfl: { min: 10, max: 45, avg: 24 },
      mlb: { min: 0, max: 15, avg: 5 },
      nhl: { min: 0, max: 8, avg: 3 },
      soccer: { min: 0, max: 5, avg: 1.5 }
    };

    const config = baseScores[sport as keyof typeof baseScores];
    const homeAdvantage = team === 'home' ? 1.1 : 0.9;
    
    return Math.round((Math.random() * (config.max - config.min) + config.min) * homeAdvantage);
  }

  private generateOdds(isFavorite: boolean, sport: string): number {
    const baseOdds = isFavorite ? 
      (Math.random() * 50 + 100) : // -100 to -150
      (Math.random() * 200 + 100); // +100 to +300
    
    return Math.round(baseOdds);
  }

  private generateWeather(): string {
    const conditions = ['clear', 'cloudy', 'rainy', 'snowy', 'windy'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  private generateFormArray(length: number): number[] {
    return Array.from({ length }, () => Math.random() * 2 - 1); // -1 to 1
  }

  private generateInjuries(): string[] {
    const injuries = ['knee', 'ankle', 'shoulder', 'back', 'hamstring'];
    const count = Math.floor(Math.random() * 3);
    return Array.from({ length: count }, () => 
      injuries[Math.floor(Math.random() * injuries.length)]
    );
  }

  private calculateHomeAdvantage(sport: string): number {
    const advantages = {
      nba: 0.03,
      nfl: 0.02,
      mlb: 0.01,
      nhl: 0.02,
      soccer: 0.05
    };
    return advantages[sport as keyof typeof advantages] || 0.02;
  }

  private calculateAwayAdvantage(sport: string): number {
    return -this.calculateHomeAdvantage(sport);
  }

  // Run Monte Carlo simulation for a specific game
  public async runSimulation(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    homeForm: number[],
    awayForm: number[],
    h2hData: { homeWins: number; awayWins: number; draws: number },
    injuries: { home: string[]; away: string[] },
    restDays: { home: number; away: number },
    weather: string = 'clear',
    venue: string = 'neutral'
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];

    for (let i = 0; i < this.SIMULATION_COUNT; i++) {
      const factors = this.calculateFactors(
        homeForm, awayForm, h2hData, injuries, restDays, weather, venue
      );

      const homeScore = this.simulateScore(sport, 'home', factors);
      const awayScore = this.simulateScore(sport, 'away', factors);
      const homeWin = homeScore > awayScore;
      const draw = homeScore === awayScore;

      const confidence = this.calculateConfidence(factors, homeScore, awayScore);

      results.push({
        homeScore,
        awayScore,
        homeWin,
        draw,
        confidence,
        factors
      });
    }

    return results;
  }

  private calculateFactors(
    homeForm: number[],
    awayForm: number[],
    h2hData: { homeWins: number; awayWins: number; draws: number },
    injuries: { home: string[]; away: string[] },
    restDays: { home: number; away: number },
    weather: string,
    venue: string
  ) {
    // Form factor (recent performance)
    const homeFormAvg = homeForm.reduce((a, b) => a + b, 0) / homeForm.length;
    const awayFormAvg = awayForm.reduce((a, b) => a + b, 0) / awayForm.length;
    const formFactor = (homeFormAvg - awayFormAvg) * 0.3;

    // Head-to-head factor
    const totalH2H = h2hData.homeWins + h2hData.awayWins + h2hData.draws;
    const h2hFactor = totalH2H > 0 ? 
      ((h2hData.homeWins - h2hData.awayWins) / totalH2H) * 0.2 : 0;

    // Rest factor (more rest = better performance)
    const restFactor = (restDays.home - restDays.away) * 0.05;

    // Injury factor
    const injuryFactor = (injuries.away.length - injuries.home.length) * 0.1;

    // Venue factor
    const venueFactor = venue.includes('home') ? 0.1 : 0;

    // Weather factor
    const weatherFactor = this.getWeatherImpact(weather) * 0.05;

    return {
      form: formFactor,
      h2h: h2hFactor,
      rest: restFactor,
      injuries: injuryFactor,
      venue: venueFactor,
      weather: weatherFactor
    };
  }

  private simulateScore(sport: string, team: 'home' | 'away', factors: any): number {
    const baseScores = {
      nba: { min: 80, max: 140, avg: 110 },
      nfl: { min: 10, max: 45, avg: 24 },
      mlb: { min: 0, max: 15, avg: 5 },
      nhl: { min: 0, max: 8, avg: 3 },
      soccer: { min: 0, max: 5, avg: 1.5 }
    };

    const config = baseScores[sport as keyof typeof baseScores];
    const totalFactor = Object.values(factors).reduce((sum: number, factor: number) => sum + factor, 0);
    
    const adjustedAvg = config.avg * (1 + totalFactor);
    const variance = (config.max - config.min) * 0.1;
    
    const score = adjustedAvg + (Math.random() - 0.5) * variance;
    return Math.max(0, Math.round(score));
  }

  private calculateConfidence(factors: any, homeScore: number, awayScore: number): number {
    const factorVariance = Object.values(factors).reduce((sum: number, factor: number) => 
      sum + Math.abs(factor), 0
    );
    
    const scoreDifference = Math.abs(homeScore - awayScore);
    const maxScore = Math.max(homeScore, awayScore);
    const scoreConfidence = scoreDifference / maxScore;

    return Math.min(0.95, (factorVariance + scoreConfidence) / 2);
  }

  private getWeatherImpact(weather: string): number {
    const impacts = {
      clear: 0,
      cloudy: -0.1,
      rainy: -0.2,
      snowy: -0.3,
      windy: -0.15
    };
    return impacts[weather as keyof typeof impacts] || 0;
  }

  // Run backtest on historical data
  public async runBacktest(
    sport: string,
    startDate?: string,
    endDate?: string
  ): Promise<BacktestResult> {
    const filteredData = this.gameData.filter(game => {
      if (game.sport !== sport) return false;
      if (startDate && game.date < startDate) return false;
      if (endDate && game.date > endDate) return false;
      return true;
    });

    let correctPredictions = 0;
    let totalProfitLoss = 0;
    let totalConfidence = 0;
    const monthlyData: { [key: string]: { games: number; correct: number; profit: number } } = {};

    for (const game of filteredData) {
      const simulation = await this.runSimulation(
        game.homeTeam,
        game.awayTeam,
        game.sport,
        game.homeForm,
        game.awayForm,
        game.headToHead,
        game.injuries,
        game.restDays,
        game.weather,
        game.venue
      );

      const avgResult = this.averageSimulationResults(simulation);
      const predictedHomeWin = avgResult.homeWin;
      const actualHomeWin = game.homeWin;
      
      if (predictedHomeWin === actualHomeWin) {
        correctPredictions++;
      }

      // Calculate profit/loss based on odds
      const betAmount = 100; // $100 per bet
      const odds = actualHomeWin ? game.homeOdds : game.awayOdds;
      const profit = actualHomeWin === predictedHomeWin ? 
        (odds > 0 ? odds : 100 / Math.abs(odds)) : -betAmount;
      
      totalProfitLoss += profit;
      totalConfidence += avgResult.confidence;

      // Track monthly data
      const month = new Date(game.date).toISOString().substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { games: 0, correct: 0, profit: 0 };
      }
      monthlyData[month].games++;
      if (predictedHomeWin === actualHomeWin) {
        monthlyData[month].correct++;
      }
      monthlyData[month].profit += profit;
    }

    const accuracy = correctPredictions / filteredData.length;
    const roi = (totalProfitLoss / (filteredData.length * 100)) * 100;
    const avgConfidence = totalConfidence / filteredData.length;

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      games: data.games,
      accuracy: data.correct / data.games,
      profit: data.profit
    }));

    return {
      totalGames: filteredData.length,
      correctPredictions,
      accuracy,
      profitLoss: totalProfitLoss,
      roi,
      avgConfidence,
      bestFactors: ['form', 'h2h', 'rest'], // Would be calculated from analysis
      worstFactors: ['weather', 'venue'], // Would be calculated from analysis
      monthlyBreakdown
    };
  }

  private averageSimulationResults(results: SimulationResult[]): SimulationResult {
    const avgHomeScore = results.reduce((sum, r) => sum + r.homeScore, 0) / results.length;
    const avgAwayScore = results.reduce((sum, r) => sum + r.awayScore, 0) / results.length;
    const homeWinCount = results.filter(r => r.homeWin).length;
    const drawCount = results.filter(r => r.draw).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      homeScore: Math.round(avgHomeScore),
      awayScore: Math.round(avgAwayScore),
      homeWin: homeWinCount > results.length / 2,
      draw: drawCount > results.length / 3,
      confidence: avgConfidence,
      factors: results[0].factors // Use first result's factors as representative
    };
  }

  // Generate prediction analysis for a specific game
  public async generatePredictionAnalysis(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    homeForm: number[],
    awayForm: number[],
    h2hData: { homeWins: number; awayWins: number; draws: number },
    injuries: { home: string[]; away: string[] },
    restDays: { home: number; away: number },
    weather: string = 'clear',
    venue: string = 'neutral',
    homeOdds: number,
    awayOdds: number,
    drawOdds?: number
  ): Promise<PredictionAnalysis> {
    const simulation = await this.runSimulation(
      homeTeam, awayTeam, sport, homeForm, awayForm, h2hData, injuries, restDays, weather, venue
    );

    const avgResult = this.averageSimulationResults(simulation);
    const backtestData = await this.runBacktest(sport);

    // Calculate win probabilities
    const homeWinCount = simulation.filter(r => r.homeWin).length;
    const awayWinCount = simulation.filter(r => !r.homeWin && !r.draw).length;
    const drawCount = simulation.filter(r => r.draw).length;

    const homeWinProbability = homeWinCount / simulation.length;
    const awayWinProbability = awayWinCount / simulation.length;
    const drawProbability = drawCount / simulation.length;

    // Calculate expected value
    const homeEV = (homeWinProbability * (homeOdds > 0 ? homeOdds : 100 / Math.abs(homeOdds))) - 
                   ((1 - homeWinProbability) * 100);
    const awayEV = (awayWinProbability * (awayOdds > 0 ? awayOdds : 100 / Math.abs(awayOdds))) - 
                   ((1 - awayWinProbability) * 100);
    const drawEV = drawOdds ? 
      (drawProbability * (drawOdds > 0 ? drawOdds : 100 / Math.abs(drawOdds))) - 
      ((1 - drawProbability) * 100) : 0;

    const maxEV = Math.max(homeEV, awayEV, drawEV);
    const recommendedBet = maxEV > 0 ? 
      (maxEV === homeEV ? 'home' : maxEV === awayEV ? 'away' : 'draw') : 'none';

    const riskLevel = avgResult.confidence > 0.8 ? 'low' : 
                     avgResult.confidence > 0.6 ? 'medium' : 'high';

    return {
      homeTeam,
      awayTeam,
      predictedHomeScore: avgResult.homeScore,
      predictedAwayScore: avgResult.awayScore,
      homeWinProbability,
      awayWinProbability,
      drawProbability,
      confidence: avgResult.confidence,
      recommendedBet,
      expectedValue: maxEV,
      riskLevel,
      factors: avgResult.factors,
      simulationResults: simulation.slice(0, 100), // Return sample of simulations
      backtestData
    };
  }
}

export const simulationService = new SimulationService();
