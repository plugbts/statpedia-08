// AI Prediction Factors Service
// Centralized system for managing prediction accuracy and factors

export interface PredictionFactor {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, how much this factor influences the prediction
  category: 'performance' | 'situational' | 'historical' | 'market' | 'external';
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1, how confident we are in this factor
}

export interface MarketFactors {
  playerProps: PredictionFactor[];
  moneyline: PredictionFactor[];
  spread: PredictionFactor[];
  total: PredictionFactor[];
  periodSpecific: PredictionFactor[];
}

export class AIPredictionFactorsService {
  private static instance: AIPredictionFactorsService;
  private factors: MarketFactors;

  private constructor() {
    this.factors = this.initializeFactors();
  }

  public static getInstance(): AIPredictionFactorsService {
    if (!AIPredictionFactorsService.instance) {
      AIPredictionFactorsService.instance = new AIPredictionFactorsService();
    }
    return AIPredictionFactorsService.instance;
  }

  private initializeFactors(): MarketFactors {
    return {
      playerProps: [
        {
          id: 'usage_rate',
          name: 'Usage Rate Analysis',
          description: 'Player\'s target share and snap count percentage in recent games',
          weight: 0.25,
          category: 'performance',
          impact: 'positive',
          confidence: 0.85
        },
        {
          id: 'red_zone_efficiency',
          name: 'Red Zone Performance',
          description: 'Player\'s success rate in scoring situations and red zone targets',
          weight: 0.20,
          category: 'situational',
          impact: 'positive',
          confidence: 0.80
        },
        {
          id: 'opponent_defense',
          name: 'Defensive Matchup',
          description: 'How opposing defense ranks against this position and prop type',
          weight: 0.18,
          category: 'situational',
          impact: 'positive',
          confidence: 0.75
        },
        {
          id: 'weather_conditions',
          name: 'Weather Impact',
          description: 'Wind, temperature, and precipitation effects on passing/rushing',
          weight: 0.12,
          category: 'external',
          impact: 'neutral',
          confidence: 0.70
        },
        {
          id: 'rest_advantage',
          name: 'Rest & Health',
          description: 'Days of rest, injury reports, and player conditioning',
          weight: 0.15,
          category: 'external',
          impact: 'positive',
          confidence: 0.78
        },
        {
          id: 'coaching_tendencies',
          name: 'Coaching Strategy',
          description: 'Offensive coordinator tendencies and game plan adjustments',
          weight: 0.10,
          category: 'situational',
          impact: 'positive',
          confidence: 0.65
        }
      ],
      moneyline: [
        {
          id: 'team_form',
          name: 'Recent Form',
          description: 'Team\'s performance in last 5 games and momentum trends',
          weight: 0.30,
          category: 'performance',
          impact: 'positive',
          confidence: 0.82
        },
        {
          id: 'head_to_head',
          name: 'Historical Matchup',
          description: 'Head-to-head record, recent meetings, and rivalry factors',
          weight: 0.20,
          category: 'historical',
          impact: 'positive',
          confidence: 0.75
        },
        {
          id: 'injury_report',
          name: 'Key Injuries',
          description: 'Impact of missing starters and depth chart adjustments',
          weight: 0.25,
          category: 'external',
          impact: 'negative',
          confidence: 0.88
        },
        {
          id: 'home_advantage',
          name: 'Home Field Edge',
          description: 'Home record, crowd impact, and travel fatigue factors',
          weight: 0.15,
          category: 'situational',
          impact: 'positive',
          confidence: 0.72
        },
        {
          id: 'coaching_matchup',
          name: 'Coaching Battle',
          description: 'Head coach records, strategic advantages, and adjustments',
          weight: 0.10,
          category: 'situational',
          impact: 'positive',
          confidence: 0.68
        }
      ],
      spread: [
        {
          id: 'point_differential',
          name: 'Point Differential',
          description: 'Average margin of victory/defeat and consistency metrics',
          weight: 0.28,
          category: 'performance',
          impact: 'positive',
          confidence: 0.85
        },
        {
          id: 'closing_line_value',
          name: 'Line Movement',
          description: 'How the line has moved and sharp money indicators',
          weight: 0.22,
          category: 'market',
          impact: 'positive',
          confidence: 0.78
        },
        {
          id: 'situational_factors',
          name: 'Game Situation',
          description: 'Rest advantage, weather, and schedule positioning',
          weight: 0.20,
          category: 'situational',
          impact: 'positive',
          confidence: 0.73
        },
        {
          id: 'defensive_matchup',
          name: 'Defense vs Offense',
          description: 'How each team\'s defense matches up against opponent\'s offense',
          weight: 0.18,
          category: 'situational',
          impact: 'positive',
          confidence: 0.80
        },
        {
          id: 'public_betting',
          name: 'Public Sentiment',
          description: 'Betting percentages and contrarian indicators',
          weight: 0.12,
          category: 'market',
          impact: 'neutral',
          confidence: 0.65
        }
      ],
      total: [
        {
          id: 'pace_analysis',
          name: 'Game Pace',
          description: 'Offensive tempo, play count, and time of possession trends',
          weight: 0.25,
          category: 'performance',
          impact: 'positive',
          confidence: 0.82
        },
        {
          id: 'scoring_efficiency',
          name: 'Scoring Trends',
          description: 'Points per game, red zone efficiency, and explosive plays',
          weight: 0.23,
          category: 'performance',
          impact: 'positive',
          confidence: 0.85
        },
        {
          id: 'weather_impact',
          name: 'Weather Conditions',
          description: 'Wind, temperature, and precipitation effects on scoring',
          weight: 0.20,
          category: 'external',
          impact: 'negative',
          confidence: 0.88
        },
        {
          id: 'defensive_rankings',
          name: 'Defensive Strength',
          description: 'Points allowed per game and defensive efficiency metrics',
          weight: 0.18,
          category: 'situational',
          impact: 'negative',
          confidence: 0.80
        },
        {
          id: 'over_under_trends',
          name: 'O/U History',
          description: 'Team\'s recent over/under record and total trends',
          weight: 0.14,
          category: 'historical',
          impact: 'positive',
          confidence: 0.72
        }
      ],
      periodSpecific: [
        {
          id: 'first_half_tendencies',
          name: 'First Half Performance',
          description: 'How teams perform in opening quarters and halftime adjustments',
          weight: 0.30,
          category: 'performance',
          impact: 'positive',
          confidence: 0.78
        },
        {
          id: 'script_prediction',
          name: 'Game Script',
          description: 'Expected game flow and how teams adjust to score/deficit',
          weight: 0.25,
          category: 'situational',
          impact: 'positive',
          confidence: 0.75
        },
        {
          id: 'momentum_factors',
          name: 'Momentum Shifts',
          description: 'How teams respond to early success or adversity',
          weight: 0.20,
          category: 'situational',
          impact: 'positive',
          confidence: 0.70
        },
        {
          id: 'coaching_adjustments',
          name: 'Halftime Adjustments',
          description: 'Coaching tendencies and strategic changes between periods',
          weight: 0.15,
          category: 'situational',
          impact: 'positive',
          confidence: 0.68
        },
        {
          id: 'fatigue_management',
          name: 'Energy & Fatigue',
          description: 'Player conditioning and how teams manage energy throughout game',
          weight: 0.10,
          category: 'external',
          impact: 'negative',
          confidence: 0.72
        }
      ]
    };
  }

  public getFactorsForMarket(marketType: string, period?: string): PredictionFactor[] {
    let factors: PredictionFactor[] = [];

    // Get base factors for market type
    switch (marketType) {
      case 'player-prop':
        factors = [...this.factors.playerProps];
        break;
      case 'moneyline':
        factors = [...this.factors.moneyline];
        break;
      case 'spread':
        factors = [...this.factors.spread];
        break;
      case 'total':
        factors = [...this.factors.total];
        break;
      default:
        factors = [...this.factors.playerProps];
    }

    // Add period-specific factors if applicable
    if (period && period !== 'full_game') {
      factors = [...factors, ...this.factors.periodSpecific];
    }

    // Sort by weight (most important first)
    return factors.sort((a, b) => b.weight - a.weight);
  }

  public calculateWeightedConfidence(factors: PredictionFactor[]): number {
    if (factors.length === 0) return 0.5;

    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedSum = factors.reduce((sum, factor) => 
      sum + (factor.confidence * factor.weight), 0
    );

    return Math.min(weightedSum / totalWeight, 1.0);
  }

  public generateFactorInsights(factors: PredictionFactor[], prediction: any): string[] {
    const insights: string[] = [];

    // Get top 3 factors by weight
    const topFactors = factors.slice(0, 3);

    topFactors.forEach(factor => {
      let insight = factor.description;
      
      // Add specific details based on prediction data
      if (factor.id === 'usage_rate' && prediction.playerName) {
        insight += ` ${prediction.playerName} has seen consistent target share.`;
      }
      
      if (factor.id === 'opponent_defense' && prediction.opponentAbbr) {
        insight += ` ${prediction.opponentAbbr} ranks in bottom half against this position.`;
      }
      
      if (factor.id === 'weather_conditions') {
        insight += ` Current conditions favor ${factor.impact === 'positive' ? 'higher' : 'lower'} scoring.`;
      }

      insights.push(insight);
    });

    return insights;
  }

  // Method to update factors (for future AI improvements)
  public updateFactor(factorId: string, updates: Partial<PredictionFactor>): void {
    const allFactors = [
      ...this.factors.playerProps,
      ...this.factors.moneyline,
      ...this.factors.spread,
      ...this.factors.total,
      ...this.factors.periodSpecific
    ];

    const factor = allFactors.find(f => f.id === factorId);
    if (factor) {
      Object.assign(factor, updates);
    }
  }

  // Method to add new factors (for AI expansion)
  public addFactor(marketType: keyof MarketFactors, factor: PredictionFactor): void {
    this.factors[marketType].push(factor);
    // Re-sort by weight
    this.factors[marketType].sort((a, b) => b.weight - a.weight);
  }
}

export const aiPredictionFactors = AIPredictionFactorsService.getInstance();
