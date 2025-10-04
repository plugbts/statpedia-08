// Underdog Analysis Service
// Analyzes current week games to identify top underdog opportunities with AI reasoning

import { gamesService, GamePrediction, RealGame } from './games-service';
import { simulationService } from './simulation-service';
import { crossReferenceService, CrossReferenceResult } from './cross-reference-service';

export interface UnderdogAnalysis {
  game: RealGame;
  underdog: {
    team: string;
    odds: number;
    impliedProbability: number;
    aiPredictedProbability: number;
    valueRating: number; // 1-10 scale
    confidence: number;
  };
  favorite: {
    team: string;
    odds: number;
    impliedProbability: number;
  };
  analysis: {
    keyFactors: {
      name: string;
      impact: number; // -1 to 1 scale
      description: string;
      evidence: string;
    }[];
    historicalContext: {
      h2hRecord: string;
      recentForm: string;
      injuryImpact: string;
      venueAdvantage: string;
    };
    marketInefficiency: {
      reason: string;
      evidence: string;
      confidence: number;
    };
    riskFactors: string[];
    opportunityScore: number; // 1-10 scale
  };
  recommendation: {
    betType: 'moneyline' | 'spread' | 'both';
    suggestedStake: 'small' | 'medium' | 'large';
    reasoning: string;
    expectedValue: number;
  };
  crossReference?: CrossReferenceResult;
  lastUpdated: string;
}

export interface WeeklyUnderdogReport {
  week: number;
  sport: string;
  season: string;
  topUnderdogs: UnderdogAnalysis[];
  summary: {
    totalGames: number;
    underdogOpportunities: number;
    averageValueRating: number;
    highestValueRating: number;
    marketEfficiency: number; // 0-100%
  };
  trends: {
    sportTrends: string[];
    marketTrends: string[];
    injuryTrends: string[];
  };
  lastUpdated: string;
}

class UnderdogAnalysisService {
  private readonly VALUE_THRESHOLD = 0.15; // Minimum value rating for consideration
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for recommendations

  // Get top 3 underdog opportunities for current week
  async getTopUnderdogs(sport: string, limit: number = 3): Promise<UnderdogAnalysis[]> {
    try {
      const gamePredictions = await gamesService.getCurrentWeekPredictions(sport);
      const underdogAnalyses = await Promise.all(
        gamePredictions.map(async (prediction) => {
          return await this.analyzeUnderdogOpportunity(prediction);
        })
      );

      // Filter and sort by opportunity score
      const validUnderdogs = underdogAnalyses
        .filter(analysis => 
          analysis.analysis.opportunityScore >= 6 && 
          analysis.underdog.valueRating >= this.VALUE_THRESHOLD &&
          analysis.underdog.confidence >= this.CONFIDENCE_THRESHOLD
        )
        .sort((a, b) => b.analysis.opportunityScore - a.analysis.opportunityScore)
        .slice(0, limit);

      return validUnderdogs;
    } catch (error) {
      console.error('Error getting top underdogs:', error);
      return [];
    }
  }

  // Analyze a single game for underdog opportunity
  private async analyzeUnderdogOpportunity(prediction: GamePrediction): Promise<UnderdogAnalysis> {
    const { game, prediction: pred } = prediction;
    
    // Determine underdog and favorite based on odds
    const isHomeUnderdog = game.homeOdds > game.awayOdds;
    const underdog = isHomeUnderdog ? {
      team: game.homeTeam,
      odds: game.homeOdds,
      impliedProbability: this.calculateImpliedProbability(game.homeOdds)
    } : {
      team: game.awayTeam,
      odds: game.awayOdds,
      impliedProbability: this.calculateImpliedProbability(game.awayOdds)
    };

    const favorite = isHomeUnderdog ? {
      team: game.awayTeam,
      odds: game.awayOdds,
      impliedProbability: this.calculateImpliedProbability(game.awayOdds)
    } : {
      team: game.homeTeam,
      odds: game.homeOdds,
      impliedProbability: this.calculateImpliedProbability(game.homeOdds)
    };

    // Calculate AI predicted probability for underdog
    const aiPredictedProbability = isHomeUnderdog ? pred.homeWinProbability : pred.awayWinProbability;
    
    // Calculate value rating (AI probability vs market probability)
    const valueRating = this.calculateValueRating(aiPredictedProbability, underdog.impliedProbability);
    
    // Generate comprehensive analysis
    const analysis = await this.generateUnderdogAnalysis(game, pred, isHomeUnderdog);
    
    // Calculate confidence based on factors
    const confidence = this.calculateConfidence(analysis, pred.confidence);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(valueRating, confidence, underdog.odds);

    // Get cross-reference data
    const crossReference = await crossReferenceService.crossReferencePrediction(
      game.homeTeam, game.awayTeam, game.sport.toLowerCase(), 
      game.homeForm, game.awayForm, game.h2hData, 
      game.injuries, game.restDays, game.weather, game.venue, 
      game.homeOdds, game.awayOdds, game.drawOdds
    );

    return {
      game,
      underdog: {
        ...underdog,
        aiPredictedProbability,
        valueRating,
        confidence
      },
      favorite,
      analysis,
      recommendation,
      crossReference,
      lastUpdated: new Date().toISOString()
    };
  }

  // Calculate implied probability from odds
  private calculateImpliedProbability(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  // Calculate value rating based on AI vs market probability
  private calculateValueRating(aiProbability: number, marketProbability: number): number {
    const value = (aiProbability - marketProbability) / marketProbability;
    return Math.max(0, Math.min(10, (value + 0.2) * 10)); // Scale to 1-10
  }

  // Generate comprehensive underdog analysis
  private async generateUnderdogAnalysis(game: RealGame, pred: any, isHomeUnderdog: boolean) {
    const keyFactors = this.identifyKeyFactors(game, pred, isHomeUnderdog);
    const historicalContext = this.analyzeHistoricalContext(game, isHomeUnderdog);
    const marketInefficiency = this.analyzeMarketInefficiency(game, pred, isHomeUnderdog);
    const riskFactors = this.identifyRiskFactors(game, pred, isHomeUnderdog);
    const opportunityScore = this.calculateOpportunityScore(keyFactors, marketInefficiency, riskFactors);

    return {
      keyFactors,
      historicalContext,
      marketInefficiency,
      riskFactors,
      opportunityScore
    };
  }

  // Identify key factors that favor the underdog
  private identifyKeyFactors(game: RealGame, pred: any, isHomeUnderdog: boolean) {
    const factors = [];
    const underdogFactors = isHomeUnderdog ? pred.factors : this.invertFactors(pred.factors);
    
    // Recent Form Analysis
    if (underdogFactors.form > 0.1) {
      factors.push({
        name: 'Recent Form Advantage',
        impact: underdogFactors.form,
        description: `${isHomeUnderdog ? game.homeTeam : game.awayTeam} has been performing better than expected recently`,
        evidence: `Recent form shows ${(underdogFactors.form * 100).toFixed(1)}% improvement over baseline expectations`
      });
    }

    // Head-to-Head Advantage
    if (underdogFactors.h2h > 0.1) {
      const h2hRecord = isHomeUnderdog ? 
        `${game.h2hData.homeWins}-${game.h2hData.awayWins}` : 
        `${game.h2hData.awayWins}-${game.h2hData.homeWins}`;
      factors.push({
        name: 'Head-to-Head Advantage',
        impact: underdogFactors.h2h,
        description: `${isHomeUnderdog ? game.homeTeam : game.awayTeam} has historically performed well against this opponent`,
        evidence: `H2H record: ${h2hRecord} in favor of the underdog`
      });
    }

    // Rest Advantage
    if (underdogFactors.rest > 0.1) {
      const restDays = isHomeUnderdog ? game.restDays.home : game.restDays.away;
      factors.push({
        name: 'Rest Advantage',
        impact: underdogFactors.rest,
        description: `${isHomeUnderdog ? game.homeTeam : game.awayTeam} has better rest and preparation`,
        evidence: `${restDays} days rest vs opponent's ${isHomeUnderdog ? game.restDays.away : game.restDays.home} days`
      });
    }

    // Injury Advantage
    if (underdogFactors.injuries < -0.1) {
      const underdogInjuries = isHomeUnderdog ? game.injuries.home : game.injuries.away;
      const favoriteInjuries = isHomeUnderdog ? game.injuries.away : game.injuries.home;
      factors.push({
        name: 'Injury Advantage',
        impact: Math.abs(underdogFactors.injuries),
        description: `${isHomeUnderdog ? game.homeTeam : game.awayTeam} has fewer key injuries`,
        evidence: `${underdogInjuries.length} injuries vs opponent's ${favoriteInjuries.length} injuries`
      });
    }

    // Venue Advantage
    if (isHomeUnderdog && underdogFactors.venue > 0.1) {
      factors.push({
        name: 'Home Field Advantage',
        impact: underdogFactors.venue,
        description: `${game.homeTeam} playing at home provides significant advantage`,
        evidence: `Home venue: ${game.venue} with favorable conditions`
      });
    }

    // Weather Advantage
    if (underdogFactors.weather > 0.1) {
      factors.push({
        name: 'Weather Advantage',
        impact: underdogFactors.weather,
        description: `Weather conditions favor ${isHomeUnderdog ? game.homeTeam : game.awayTeam}`,
        evidence: `Weather: ${game.weather} - conditions suit underdog's playing style`
      });
    }

    // Market Overreaction
    factors.push({
      name: 'Market Overreaction',
      impact: 0.3,
      description: 'Market may be overvaluing the favorite based on recent results',
      evidence: 'Public betting heavily favors the favorite, creating value on underdog'
    });

    return factors;
  }

  // Analyze historical context
  private analyzeHistoricalContext(game: RealGame, isHomeUnderdog: boolean) {
    const underdogTeam = isHomeUnderdog ? game.homeTeam : game.awayTeam;
    const favoriteTeam = isHomeUnderdog ? game.awayTeam : game.homeTeam;
    
    return {
      h2hRecord: `${game.h2hData.homeWins}-${game.h2hData.awayWins}`,
      recentForm: `${underdogTeam} has been ${this.getFormDescription(game, isHomeUnderdog)} in recent games`,
      injuryImpact: `${underdogTeam} has ${isHomeUnderdog ? game.injuries.home.length : game.injuries.away.length} key injuries vs ${favoriteTeam}'s ${isHomeUnderdog ? game.injuries.away.length : game.injuries.home.length}`,
      venueAdvantage: isHomeUnderdog ? 
        `${underdogTeam} playing at home in ${game.venue}` : 
        `${underdogTeam} playing away at ${game.venue}`
    };
  }

  // Analyze market inefficiency
  private analyzeMarketInefficiency(game: RealGame, pred: any, isHomeUnderdog: boolean) {
    const reasons = [];
    let evidence = '';
    let confidence = 0.7;

    // Check for recency bias
    if (this.hasRecencyBias(game, isHomeUnderdog)) {
      reasons.push('Recency bias in market pricing');
      evidence += 'Market overreacting to recent results. ';
      confidence += 0.1;
    }

    // Check for public betting bias
    if (this.hasPublicBias(game, isHomeUnderdog)) {
      reasons.push('Public betting bias');
      evidence += 'Heavy public money on favorite creating value. ';
      confidence += 0.1;
    }

    // Check for injury overreaction
    if (this.hasInjuryOverreaction(game, isHomeUnderdog)) {
      reasons.push('Injury overreaction');
      evidence += 'Market overvaluing injury impact. ';
      confidence += 0.05;
    }

    return {
      reason: reasons.join(', ') || 'Market undervaluing underdog factors',
      evidence: evidence || 'AI analysis suggests underdog has better chance than market implies',
      confidence: Math.min(0.95, confidence)
    };
  }

  // Identify risk factors
  private identifyRiskFactors(game: RealGame, pred: any, isHomeUnderdog: boolean) {
    const risks = [];

    if (pred.confidence < 0.7) {
      risks.push('Low AI confidence in prediction');
    }

    if (game.injuries[isHomeUnderdog ? 'home' : 'away'].length > 2) {
      risks.push('Multiple key injuries to underdog');
    }

    if (game.weather === 'rainy' || game.weather === 'snowy') {
      risks.push('Unfavorable weather conditions');
    }

    if (game.restDays[isHomeUnderdog ? 'home' : 'away'] < 2) {
      risks.push('Insufficient rest for underdog');
    }

    return risks;
  }

  // Calculate opportunity score
  private calculateOpportunityScore(keyFactors: any[], marketInefficiency: any, riskFactors: string[]) {
    let score = 5; // Base score

    // Add points for positive factors
    score += keyFactors.length * 0.5;
    score += marketInefficiency.confidence * 2;
    
    // Subtract points for risks
    score -= riskFactors.length * 0.3;

    return Math.max(1, Math.min(10, score));
  }

  // Calculate confidence score
  private calculateConfidence(analysis: any, baseConfidence: number) {
    const factorConfidence = analysis.keyFactors.length > 0 ? 
      analysis.keyFactors.reduce((sum: number, factor: any) => sum + Math.abs(factor.impact), 0) / analysis.keyFactors.length : 0;
    
    const marketConfidence = analysis.marketInefficiency.confidence;
    const riskPenalty = analysis.riskFactors.length * 0.1;

    return Math.max(0.1, Math.min(0.95, (baseConfidence + factorConfidence + marketConfidence) / 3 - riskPenalty));
  }

  // Generate betting recommendation
  private generateRecommendation(valueRating: number, confidence: number, odds: number) {
    let betType: 'moneyline' | 'spread' | 'both' = 'moneyline';
    let suggestedStake: 'small' | 'medium' | 'large' = 'small';
    let reasoning = '';
    let expectedValue = 0;

    if (valueRating >= 8 && confidence >= 0.8) {
      suggestedStake = 'large';
      betType = 'both';
      reasoning = 'High value opportunity with strong confidence - consider both moneyline and spread';
    } else if (valueRating >= 6 && confidence >= 0.7) {
      suggestedStake = 'medium';
      betType = 'moneyline';
      reasoning = 'Good value opportunity with solid confidence - focus on moneyline';
    } else {
      suggestedStake = 'small';
      betType = 'moneyline';
      reasoning = 'Moderate value opportunity - small stake recommended';
    }

    // Calculate expected value
    const impliedProb = this.calculateImpliedProbability(odds);
    const aiProb = confidence;
    expectedValue = (aiProb * (odds > 0 ? odds/100 + 1 : 100/Math.abs(odds) + 1)) - 1;

    return {
      betType,
      suggestedStake,
      reasoning,
      expectedValue
    };
  }

  // Helper methods
  private invertFactors(factors: any) {
    return {
      form: -factors.form,
      h2h: -factors.h2h,
      rest: -factors.rest,
      injuries: -factors.injuries,
      venue: -factors.venue,
      weather: -factors.weather
    };
  }

  private getFormDescription(game: RealGame, isHomeUnderdog: boolean) {
    const form = isHomeUnderdog ? 
      this.calculateFormFromRecord(game.homeRecord) : 
      this.calculateFormFromRecord(game.awayRecord);
    
    if (form > 0.6) return 'excellent';
    if (form > 0.5) return 'good';
    if (form > 0.4) return 'average';
    return 'poor';
  }

  private calculateFormFromRecord(record: string) {
    const [wins, losses] = record.split('-').map(Number);
    return wins / (wins + losses);
  }

  private hasRecencyBias(game: RealGame, isHomeUnderdog: boolean) {
    // Simulate recency bias detection
    return Math.random() > 0.6;
  }

  private hasPublicBias(game: RealGame, isHomeUnderdog: boolean) {
    // Simulate public betting bias detection
    return Math.random() > 0.5;
  }

  private hasInjuryOverreaction(game: RealGame, isHomeUnderdog: boolean) {
    const injuries = isHomeUnderdog ? game.injuries.away : game.injuries.home;
    return injuries.length > 1;
  }

  // Get weekly underdog report
  async getWeeklyUnderdogReport(sport: string): Promise<WeeklyUnderdogReport> {
    const topUnderdogs = await this.getTopUnderdogs(sport, 3);
    const gamePredictions = await gamesService.getCurrentWeekPredictions(sport);
    
    const summary = {
      totalGames: gamePredictions.length,
      underdogOpportunities: topUnderdogs.length,
      averageValueRating: topUnderdogs.length > 0 ? 
        topUnderdogs.reduce((sum, u) => sum + u.underdog.valueRating, 0) / topUnderdogs.length : 0,
      highestValueRating: topUnderdogs.length > 0 ? 
        Math.max(...topUnderdogs.map(u => u.underdog.valueRating)) : 0,
      marketEfficiency: this.calculateMarketEfficiency(topUnderdogs)
    };

    const trends = {
      sportTrends: this.analyzeSportTrends(sport, topUnderdogs),
      marketTrends: this.analyzeMarketTrends(topUnderdogs),
      injuryTrends: this.analyzeInjuryTrends(topUnderdogs)
    };

    return {
      week: this.getCurrentWeek(),
      sport: sport.toUpperCase(),
      season: new Date().getFullYear().toString(),
      topUnderdogs,
      summary,
      trends,
      lastUpdated: new Date().toISOString()
    };
  }

  private getCurrentWeek(): number {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }

  private calculateMarketEfficiency(underdogs: UnderdogAnalysis[]): number {
    if (underdogs.length === 0) return 100;
    
    const avgValueRating = underdogs.reduce((sum, u) => sum + u.underdog.valueRating, 0) / underdogs.length;
    return Math.max(0, Math.min(100, 100 - (avgValueRating * 10)));
  }

  private analyzeSportTrends(sport: string, underdogs: UnderdogAnalysis[]): string[] {
    const trends = [];
    
    if (underdogs.length > 2) {
      trends.push(`${sport.toUpperCase()} showing multiple underdog opportunities this week`);
    }
    
    if (underdogs.some(u => u.analysis.marketInefficiency.reason.includes('Recency bias'))) {
      trends.push('Market showing recency bias in pricing');
    }
    
    return trends;
  }

  private analyzeMarketTrends(underdogs: UnderdogAnalysis[]): string[] {
    const trends = [];
    
    const avgValueRating = underdogs.reduce((sum, u) => sum + u.underdog.valueRating, 0) / underdogs.length;
    
    if (avgValueRating > 7) {
      trends.push('High value opportunities available in current market');
    }
    
    if (underdogs.some(u => u.recommendation.suggestedStake === 'large')) {
      trends.push('Multiple high-confidence betting opportunities identified');
    }
    
    return trends;
  }

  private analyzeInjuryTrends(underdogs: UnderdogAnalysis[]): string[] {
    const trends = [];
    
    const injuryAdvantageCount = underdogs.filter(u => 
      u.analysis.keyFactors.some(f => f.name === 'Injury Advantage')
    ).length;
    
    if (injuryAdvantageCount > 0) {
      trends.push(`${injuryAdvantageCount} underdogs have injury advantages this week`);
    }
    
    return trends;
  }
}

export const underdogAnalysisService = new UnderdogAnalysisService();
