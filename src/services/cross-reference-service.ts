// Cross-Reference Service for AI Model Predictions
// Similar to Rithm AI model cross-referencing system

export interface CrossReferenceData {
  modelId: string;
  modelName: string;
  confidence: number;
  prediction: 'home' | 'away' | 'draw';
  reasoning: string;
  factors: {
    form: number;
    h2h: number;
    rest: number;
    injuries: number;
    venue: number;
    weather: number;
    momentum: number;
    value: number;
  };
  lastUpdated: string;
}

export interface CrossReferenceResult {
  consensus: 'home' | 'away' | 'draw';
  confidence: number;
  agreement: number; // Percentage of models that agree
  models: CrossReferenceData[];
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  valueRating: number; // 1-5 stars
}

class CrossReferenceService {
  private models: CrossReferenceData[] = [];

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    this.models = [
      {
        modelId: 'statistical',
        modelName: 'Statistical Analysis Model',
        confidence: 0.0,
        prediction: 'home',
        reasoning: 'Based on historical data and team performance metrics',
        factors: {
          form: 0,
          h2h: 0,
          rest: 0,
          injuries: 0,
          venue: 0,
          weather: 0,
          momentum: 0,
          value: 0
        },
        lastUpdated: new Date().toISOString()
      },
      {
        modelId: 'momentum',
        modelName: 'Momentum & Form Model',
        confidence: 0.0,
        prediction: 'home',
        reasoning: 'Analyzes recent team form and momentum shifts',
        factors: {
          form: 0,
          h2h: 0,
          rest: 0,
          injuries: 0,
          venue: 0,
          weather: 0,
          momentum: 0,
          value: 0
        },
        lastUpdated: new Date().toISOString()
      },
      {
        modelId: 'value',
        modelName: 'Value & Odds Model',
        confidence: 0.0,
        prediction: 'home',
        reasoning: 'Focuses on betting value and market inefficiencies',
        factors: {
          form: 0,
          h2h: 0,
          rest: 0,
          injuries: 0,
          venue: 0,
          weather: 0,
          momentum: 0,
          value: 0
        },
        lastUpdated: new Date().toISOString()
      },
      {
        modelId: 'injury',
        modelName: 'Injury & Rest Model',
        confidence: 0.0,
        prediction: 'home',
        reasoning: 'Evaluates impact of injuries and rest days',
        factors: {
          form: 0,
          h2h: 0,
          rest: 0,
          injuries: 0,
          venue: 0,
          weather: 0,
          momentum: 0,
          value: 0
        },
        lastUpdated: new Date().toISOString()
      },
      {
        modelId: 'venue',
        modelName: 'Venue & Weather Model',
        confidence: 0.0,
        prediction: 'home',
        reasoning: 'Considers home advantage and weather conditions',
        factors: {
          form: 0,
          h2h: 0,
          rest: 0,
          injuries: 0,
          venue: 0,
          weather: 0,
          momentum: 0,
          value: 0
        },
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  public async crossReferencePrediction(
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
  ): Promise<CrossReferenceResult> {
    // Update all models with current data
    await this.updateAllModels(
      homeTeam, awayTeam, sport, homeForm, awayForm, h2hData, 
      injuries, restDays, weather, venue, homeOdds, awayOdds, drawOdds
    );

    // Calculate consensus
    const homeVotes = this.models.filter(m => m.prediction === 'home').length;
    const awayVotes = this.models.filter(m => m.prediction === 'away').length;
    const drawVotes = this.models.filter(m => m.prediction === 'draw').length;

    const totalVotes = this.models.length;
    const consensus = homeVotes > awayVotes && homeVotes > drawVotes ? 'home' :
                     awayVotes > homeVotes && awayVotes > drawVotes ? 'away' : 'draw';
    
    const agreement = Math.max(homeVotes, awayVotes, drawVotes) / totalVotes * 100;
    
    // Calculate weighted confidence
    const totalConfidence = this.models.reduce((sum, model) => sum + model.confidence, 0);
    const avgConfidence = totalConfidence / this.models.length;
    
    // Calculate risk level
    const riskLevel = agreement > 80 ? 'low' : agreement > 60 ? 'medium' : 'high';
    
    // Calculate value rating (1-5 stars)
    const valueRating = this.calculateValueRating(homeOdds, awayOdds, drawOdds, consensus);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(consensus, agreement, this.models);

    return {
      consensus,
      confidence: avgConfidence,
      agreement,
      models: [...this.models],
      reasoning,
      riskLevel,
      valueRating
    };
  }

  private async updateAllModels(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    homeForm: number[],
    awayForm: number[],
    h2hData: { homeWins: number; awayWins: number; draws: number },
    injuries: { home: string[]; away: string[] },
    restDays: { home: number; away: number },
    weather: string,
    venue: string,
    homeOdds: number,
    awayOdds: number,
    drawOdds?: number
  ) {
    for (const model of this.models) {
      await this.updateModel(model, {
        homeTeam, awayTeam, sport, homeForm, awayForm, h2hData,
        injuries, restDays, weather, venue, homeOdds, awayOdds, drawOdds
      });
    }
  }

  private async updateModel(
    model: CrossReferenceData,
    data: any
  ) {
    // Simulate different model calculations
    const { homeForm, awayForm, h2hData, injuries, restDays, homeOdds, awayOdds } = data;
    
    let confidence = 0;
    let prediction: 'home' | 'away' | 'draw' = 'home';
    let reasoning = '';
    let factors = {
      form: 0,
      h2h: 0,
      rest: 0,
      injuries: 0,
      venue: 0,
      weather: 0,
      momentum: 0,
      value: 0
    };

    switch (model.modelId) {
      case 'statistical':
        const homeFormAvg = homeForm.reduce((a: number, b: number) => a + b, 0) / homeForm.length;
        const awayFormAvg = awayForm.reduce((a: number, b: number) => a + b, 0) / awayForm.length;
        const h2hAdvantage = h2hData.homeWins / (h2hData.homeWins + h2hData.awayWins);
        
        factors.form = (homeFormAvg - awayFormAvg) * 50;
        factors.h2h = (h2hAdvantage - 0.5) * 100;
        factors.rest = (restDays.away - restDays.home) * 10;
        
        confidence = Math.min(0.95, 0.5 + Math.abs(factors.form + factors.h2h + factors.rest) / 300);
        prediction = factors.form + factors.h2h + factors.rest > 0 ? 'home' : 'away';
        reasoning = `Statistical analysis shows ${prediction === 'home' ? 'home' : 'away'} team advantage based on form and head-to-head records`;
        break;

      case 'momentum':
        const recentHomeForm = homeForm.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
        const recentAwayForm = awayForm.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
        
        factors.momentum = (recentHomeForm - recentAwayForm) * 60;
        factors.form = (homeForm[homeForm.length - 1] - awayForm[awayForm.length - 1]) * 40;
        
        confidence = Math.min(0.9, 0.4 + Math.abs(factors.momentum + factors.form) / 200);
        prediction = factors.momentum + factors.form > 0 ? 'home' : 'away';
        reasoning = `Momentum analysis favors ${prediction === 'home' ? 'home' : 'away'} team based on recent form trends`;
        break;

      case 'value':
        const homeImpliedProb = homeOdds > 0 ? 100 / (homeOdds + 100) : Math.abs(homeOdds) / (Math.abs(homeOdds) + 100);
        const awayImpliedProb = awayOdds > 0 ? 100 / (awayOdds + 100) : Math.abs(awayOdds) / (Math.abs(awayOdds) + 100);
        
        // Simulate value calculation
        const homeValue = (0.6 - homeImpliedProb) * 100;
        const awayValue = (0.6 - awayImpliedProb) * 100;
        
        factors.value = Math.max(homeValue, awayValue);
        confidence = Math.min(0.85, 0.3 + Math.abs(factors.value) / 100);
        prediction = homeValue > awayValue ? 'home' : 'away';
        reasoning = `Value analysis identifies ${prediction === 'home' ? 'home' : 'away'} team as better betting value`;
        break;

      case 'injury':
        const homeInjuryImpact = injuries.home.length * -5;
        const awayInjuryImpact = injuries.away.length * -5;
        const restAdvantage = (restDays.away - restDays.home) * 8;
        
        factors.injuries = homeInjuryImpact - awayInjuryImpact;
        factors.rest = restAdvantage;
        
        confidence = Math.min(0.8, 0.4 + Math.abs(factors.injuries + factors.rest) / 50);
        prediction = factors.injuries + factors.rest > 0 ? 'home' : 'away';
        reasoning = `Injury and rest analysis shows ${prediction === 'home' ? 'home' : 'away'} team advantage`;
        break;

      case 'venue':
        const venueAdvantage = venue === 'home' ? 15 : venue === 'away' ? -15 : 0;
        const weatherImpact = weather === 'clear' ? 0 : weather === 'rain' ? -10 : -5;
        
        factors.venue = venueAdvantage;
        factors.weather = weatherImpact;
        
        confidence = Math.min(0.75, 0.3 + Math.abs(factors.venue + factors.weather) / 30);
        prediction = factors.venue + factors.weather > 0 ? 'home' : 'away';
        reasoning = `Venue and weather analysis favors ${prediction === 'home' ? 'home' : 'away'} team`;
        break;
    }

    // Update model
    model.confidence = confidence;
    model.prediction = prediction;
    model.reasoning = reasoning;
    model.factors = factors;
    model.lastUpdated = new Date().toISOString();
  }

  private calculateValueRating(homeOdds: number, awayOdds: number, drawOdds: number | undefined, consensus: string): number {
    // Simple value rating based on odds and consensus
    const odds = consensus === 'home' ? homeOdds : consensus === 'away' ? awayOdds : drawOdds || 0;
    const impliedProb = odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
    
    // Higher value rating for better odds
    if (impliedProb < 0.4) return 5;
    if (impliedProb < 0.5) return 4;
    if (impliedProb < 0.6) return 3;
    if (impliedProb < 0.7) return 2;
    return 1;
  }

  private generateReasoning(consensus: string, agreement: number, models: CrossReferenceData[]): string {
    const topModel = models.reduce((prev, current) => 
      (prev.confidence > current.confidence) ? prev : current
    );
    
    if (agreement > 80) {
      return `Strong consensus (${agreement.toFixed(0)}% agreement) - All models favor ${consensus} team. ${topModel.reasoning}`;
    } else if (agreement > 60) {
      return `Moderate consensus (${agreement.toFixed(0)}% agreement) - Majority of models favor ${consensus} team. ${topModel.reasoning}`;
    } else {
      return `Mixed signals (${agreement.toFixed(0)}% agreement) - Models show conflicting predictions, but ${consensus} team has slight edge. ${topModel.reasoning}`;
    }
  }
}

export const crossReferenceService = new CrossReferenceService();
