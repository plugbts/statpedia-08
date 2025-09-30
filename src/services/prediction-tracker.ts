// Service to track prediction results and calculate wins
interface PredictionResult {
  id: string;
  sport: string;
  player: string;
  team: string;
  opponent: string;
  prop: string;
  line: number;
  prediction: 'over' | 'under';
  odds: string;
  actualValue?: number;
  result?: 'win' | 'loss' | 'push';
  profit?: number;
  gameDate: string;
  status: 'pending' | 'completed' | 'cancelled';
}

interface WinStats {
  totalPredictions: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalProfit: number;
  averageOdds: number;
  bestWin: PredictionResult | null;
  worstLoss: PredictionResult | null;
}

export class PredictionTracker {
  private predictions: PredictionResult[] = [];
  private readonly STORAGE_KEY = 'statpedia_predictions';

  constructor() {
    this.loadPredictions();
  }

  // Add a new prediction
  addPrediction(prediction: Omit<PredictionResult, 'actualValue' | 'result' | 'profit'>) {
    const newPrediction: PredictionResult = {
      ...prediction,
      actualValue: undefined,
      result: undefined,
      profit: 0,
    };
    
    this.predictions.push(newPrediction);
    this.savePredictions();
    return newPrediction;
  }

  // Update prediction with actual result
  updatePredictionResult(id: string, actualValue: number) {
    const prediction = this.predictions.find(p => p.id === id);
    if (!prediction) return null;

    const { line, prediction: pred, odds } = prediction;
    const actual = actualValue;
    const lineValue = line;

    let result: 'win' | 'loss' | 'push';
    let profit = 0;

    if (actual > lineValue) {
      result = pred === 'over' ? 'win' : 'loss';
    } else if (actual < lineValue) {
      result = pred === 'under' ? 'win' : 'loss';
    } else {
      result = 'push';
    }

    // Calculate profit based on odds
    if (result === 'win') {
      const oddsValue = this.parseOdds(odds);
      profit = oddsValue > 0 ? oddsValue : 100 / Math.abs(oddsValue) * 100;
    } else if (result === 'loss') {
      profit = -100; // Standard bet amount
    }

    prediction.actualValue = actual;
    prediction.result = result;
    prediction.profit = profit;
    prediction.status = 'completed';

    this.savePredictions();
    return prediction;
  }

  // Get wins from previous day
  getPreviousDayWins(): PredictionResult[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.predictions.filter(prediction => {
      const gameDate = new Date(prediction.gameDate);
      return gameDate >= yesterday && gameDate < today && prediction.result === 'win';
    });
  }

  // Get all completed predictions from previous day
  getPreviousDayResults(): PredictionResult[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.predictions.filter(prediction => {
      const gameDate = new Date(prediction.gameDate);
      return gameDate >= yesterday && gameDate < today && prediction.status === 'completed';
    });
  }

  // Calculate win statistics for previous day
  getPreviousDayStats(): WinStats {
    const results = this.getPreviousDayResults();
    const wins = results.filter(r => r.result === 'win');
    const losses = results.filter(r => r.result === 'loss');
    const pushes = results.filter(r => r.result === 'push');

    const totalProfit = results.reduce((sum, r) => sum + (r.profit || 0), 0);
    const winRate = results.length > 0 ? (wins.length / results.length) * 100 : 0;
    
    const allOdds = results.map(r => this.parseOdds(r.odds)).filter(odds => !isNaN(odds));
    const averageOdds = allOdds.length > 0 ? allOdds.reduce((sum, odds) => sum + odds, 0) / allOdds.length : 0;

    const bestWin = wins.length > 0 ? wins.reduce((best, current) => 
      (current.profit || 0) > (best.profit || 0) ? current : best
    ) : null;

    const worstLoss = losses.length > 0 ? losses.reduce((worst, current) => 
      (current.profit || 0) < (worst.profit || 0) ? current : worst
    ) : null;

    return {
      totalPredictions: results.length,
      wins: wins.length,
      losses: losses.length,
      pushes: pushes.length,
      winRate,
      totalProfit,
      averageOdds,
      bestWin,
      worstLoss,
    };
  }

  // Get all-time statistics
  getAllTimeStats(): WinStats {
    const completed = this.predictions.filter(p => p.status === 'completed');
    const wins = completed.filter(r => r.result === 'win');
    const losses = completed.filter(r => r.result === 'loss');
    const pushes = completed.filter(r => r.result === 'push');

    const totalProfit = completed.reduce((sum, r) => sum + (r.profit || 0), 0);
    const winRate = completed.length > 0 ? (wins.length / completed.length) * 100 : 0;
    
    const allOdds = completed.map(r => this.parseOdds(r.odds)).filter(odds => !isNaN(odds));
    const averageOdds = allOdds.length > 0 ? allOdds.reduce((sum, odds) => sum + odds, 0) / allOdds.length : 0;

    const bestWin = wins.length > 0 ? wins.reduce((best, current) => 
      (current.profit || 0) > (best.profit || 0) ? current : best
    ) : null;

    const worstLoss = losses.length > 0 ? losses.reduce((worst, current) => 
      (current.profit || 0) < (worst.profit || 0) ? current : worst
    ) : null;

    return {
      totalPredictions: completed.length,
      wins: wins.length,
      losses: losses.length,
      pushes: pushes.length,
      winRate,
      totalProfit,
      averageOdds,
      bestWin,
      worstLoss,
    };
  }

  // Simulate results for demo purposes (in real app, this would come from live data)
  simulatePreviousDayResults(predictions: any[]): PredictionResult[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    return predictions.map(prediction => {
      const { line, prediction: pred, odds } = prediction;
      
      // Simulate actual value based on line and some randomness
      const baseValue = line;
      const variance = line * 0.2; // 20% variance
      const actualValue = baseValue + (Math.random() - 0.5) * variance;
      
      let result: 'win' | 'loss' | 'push';
      let profit = 0;

      if (Math.abs(actualValue - line) < 0.5) {
        result = 'push';
        profit = 0;
      } else if (actualValue > line) {
        result = pred === 'over' ? 'win' : 'loss';
      } else {
        result = pred === 'under' ? 'win' : 'loss';
      }

      if (result === 'win') {
        const oddsValue = this.parseOdds(odds);
        profit = oddsValue > 0 ? oddsValue : 100 / Math.abs(oddsValue) * 100;
      } else if (result === 'loss') {
        profit = -100;
      }

      return {
        id: prediction.id,
        sport: prediction.sport,
        player: prediction.player,
        team: prediction.team,
        opponent: prediction.opponent,
        prop: prediction.prop,
        line: prediction.line,
        prediction: prediction.prediction,
        odds: prediction.odds,
        actualValue,
        result,
        profit,
        gameDate: yesterday.toISOString(),
        status: 'completed' as const,
      };
    });
  }

  private parseOdds(odds: string): number {
    const num = parseInt(odds.replace(/[+-]/, ''));
    return odds.startsWith('+') ? num : -num;
  }

  private loadPredictions() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.predictions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
      this.predictions = [];
    }
  }

  private savePredictions() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.predictions));
    } catch (error) {
      console.error('Error saving predictions:', error);
    }
  }

  // Clear all data (for testing)
  clearAllData() {
    this.predictions = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Export singleton instance
export const predictionTracker = new PredictionTracker();
export type { PredictionResult, WinStats };
