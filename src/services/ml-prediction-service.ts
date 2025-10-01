import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';

// Machine Learning Prediction Service
export interface MLFeatures {
  // Player performance features
  recentForm: number; // Last 5 games average
  seasonAverage: number;
  homeAwaySplit: number; // Home performance vs away
  opponentStrength: number; // Opponent defensive rating
  restDays: number;
  injuryStatus: number; // 0 = injured, 1 = healthy
  
  // Situational features
  gameImportance: number; // Playoff vs regular season
  weatherConditions: number; // Indoor vs outdoor impact
  teamMotivation: number; // Based on standings
  
  // Historical features
  headToHead: number; // Performance vs this opponent
  trendDirection: number; // Recent trend (up/down/stable)
  consistency: number; // Performance variance
  
  // Market features
  lineMovement: number; // Recent line changes
  volume: number; // Betting volume
  publicSentiment: number; // Public betting percentage
}

export interface MLPrediction {
  prediction: 'over' | 'under';
  confidence: number;
  probability: number;
  expectedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number; // 95%, 90%, etc.
  };
  featureImportance: Array<{
    feature: string;
    importance: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  modelVersion: string;
  timestamp: string;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  lastUpdated: string;
  sampleSize: number;
}

class MLPredictionService {
  private models: Map<string, any> = new Map();
  private performanceMetrics: Map<string, ModelPerformance> = new Map();
  private isInitialized = false;

  // Initialize ML models
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    logAPI('MLPredictionService', 'Initializing machine learning models');
    
    try {
      // Initialize different models for different prop types
      await this.initializeModels();
      this.isInitialized = true;
      
      logSuccess('MLPredictionService', 'ML models initialized successfully');
    } catch (error) {
      logError('MLPredictionService', 'Failed to initialize ML models:', error);
      throw error;
    }
  }

  // Initialize models for different prop types
  private async initializeModels(): Promise<void> {
    const propTypes = ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks', 'Threes'];
    
    for (const propType of propTypes) {
      // In production, this would load pre-trained models
      // For now, we'll create mock models with realistic performance
      const model = await this.createMockModel(propType);
      this.models.set(propType, model);
      
      // Set performance metrics
      this.performanceMetrics.set(propType, {
        accuracy: 0.65 + Math.random() * 0.15, // 65-80% accuracy
        precision: 0.62 + Math.random() * 0.18, // 62-80% precision
        recall: 0.60 + Math.random() * 0.20, // 60-80% recall
        f1Score: 0.61 + Math.random() * 0.19, // 61-80% F1
        auc: 0.68 + Math.random() * 0.17, // 68-85% AUC
        lastUpdated: new Date().toISOString(),
        sampleSize: Math.floor(Math.random() * 5000) + 1000 // 1000-6000 samples
      });
    }
  }

  // Create mock model (replace with actual ML model loading)
  private async createMockModel(propType: string): Promise<any> {
    // Simulate model loading time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      propType,
      version: '1.0.0',
      features: this.getFeatureNames(),
      weights: this.generateRandomWeights(),
      bias: Math.random() * 0.1 - 0.05, // Small random bias
      lastTrained: new Date().toISOString()
    };
  }

  // Get feature names for the model
  private getFeatureNames(): string[] {
    return [
      'recentForm', 'seasonAverage', 'homeAwaySplit', 'opponentStrength',
      'restDays', 'injuryStatus', 'gameImportance', 'weatherConditions',
      'teamMotivation', 'headToHead', 'trendDirection', 'consistency',
      'lineMovement', 'volume', 'publicSentiment'
    ];
  }

  // Generate random weights for mock model
  private generateRandomWeights(): number[] {
    const features = this.getFeatureNames();
    return features.map(() => (Math.random() - 0.5) * 2); // Random weights between -1 and 1
  }

  // Extract features from player data
  extractFeatures(playerData: any, gameContext: any): MLFeatures {
    return {
      recentForm: this.calculateRecentForm(playerData),
      seasonAverage: playerData.seasonStats?.average || 0,
      homeAwaySplit: this.calculateHomeAwaySplit(playerData),
      opponentStrength: this.calculateOpponentStrength(gameContext),
      restDays: gameContext.restDays || 2,
      injuryStatus: playerData.injuryStatus === 'Healthy' ? 1 : 0,
      gameImportance: this.calculateGameImportance(gameContext),
      weatherConditions: this.calculateWeatherImpact(gameContext),
      teamMotivation: this.calculateTeamMotivation(gameContext),
      headToHead: this.calculateHeadToHead(playerData, gameContext),
      trendDirection: this.calculateTrendDirection(playerData),
      consistency: this.calculateConsistency(playerData),
      lineMovement: gameContext.lineMovement || 0,
      volume: gameContext.volume || 0,
      publicSentiment: gameContext.publicSentiment || 0.5
    };
  }

  // Calculate recent form (last 5 games)
  private calculateRecentForm(playerData: any): number {
    const last5Games = playerData.seasonStats?.last5Games || [];
    if (last5Games.length === 0) return 0;
    
    const average = last5Games.reduce((sum: number, val: number) => sum + val, 0) / last5Games.length;
    const seasonAvg = playerData.seasonStats?.average || 0;
    
    return seasonAvg > 0 ? (average - seasonAvg) / seasonAvg : 0;
  }

  // Calculate home/away split
  private calculateHomeAwaySplit(playerData: any): number {
    const homeStats = playerData.advancedStats?.homeAwaySplit?.home;
    const awayStats = playerData.advancedStats?.homeAwaySplit?.away;
    
    if (!homeStats || !awayStats) return 0;
    
    return homeStats.average - awayStats.average;
  }

  // Calculate opponent strength
  private calculateOpponentStrength(gameContext: any): number {
    // Mock opponent defensive rating (0-100 scale)
    return Math.random() * 100;
  }

  // Calculate game importance
  private calculateGameImportance(gameContext: any): number {
    // 0 = regular season, 1 = playoff game
    return gameContext.isPlayoff ? 1 : 0;
  }

  // Calculate weather impact
  private calculateWeatherImpact(gameContext: any): number {
    // 0 = outdoor with weather impact, 1 = indoor/no impact
    return gameContext.isIndoor ? 1 : 0;
  }

  // Calculate team motivation
  private calculateTeamMotivation(gameContext: any): number {
    // Based on standings, playoff race, etc.
    return Math.random(); // Mock value
  }

  // Calculate head-to-head performance
  private calculateHeadToHead(playerData: any, gameContext: any): number {
    // Mock head-to-head performance vs opponent
    return (Math.random() - 0.5) * 2; // -1 to 1
  }

  // Calculate trend direction
  private calculateTrendDirection(playerData: any): number {
    const last5Games = playerData.seasonStats?.last5Games || [];
    if (last5Games.length < 3) return 0;
    
    const firstHalf = last5Games.slice(0, Math.floor(last5Games.length / 2));
    const secondHalf = last5Games.slice(Math.floor(last5Games.length / 2));
    
    const firstAvg = firstHalf.reduce((sum: number, val: number) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum: number, val: number) => sum + val, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  // Calculate consistency
  private calculateConsistency(playerData: any): number {
    const last5Games = playerData.seasonStats?.last5Games || [];
    if (last5Games.length < 2) return 0;
    
    const average = last5Games.reduce((sum: number, val: number) => sum + val, 0) / last5Games.length;
    const variance = last5Games.reduce((sum: number, val: number) => sum + Math.pow(val - average, 2), 0) / last5Games.length;
    
    return Math.max(0, 1 - Math.sqrt(variance) / average); // Higher consistency = lower variance
  }

  // Make prediction using ML model
  async makePrediction(
    propType: string,
    features: MLFeatures,
    line: number
  ): Promise<MLPrediction> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const model = this.models.get(propType);
    if (!model) {
      throw new Error(`No model found for prop type: ${propType}`);
    }

    // Convert features to array
    const featureArray = this.featuresToArray(features);
    
    // Make prediction (mock implementation)
    const prediction = await this.predictWithModel(model, featureArray, line);
    
    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(prediction.probability, model);
    
    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(features, model);
    
    return {
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      probability: prediction.probability,
      expectedValue: prediction.expectedValue,
      confidenceInterval,
      featureImportance,
      modelVersion: model.version,
      timestamp: new Date().toISOString()
    };
  }

  // Convert features to array for model input
  private featuresToArray(features: MLFeatures): number[] {
    return [
      features.recentForm,
      features.seasonAverage,
      features.homeAwaySplit,
      features.opponentStrength,
      features.restDays,
      features.injuryStatus,
      features.gameImportance,
      features.weatherConditions,
      features.teamMotivation,
      features.headToHead,
      features.trendDirection,
      features.consistency,
      features.lineMovement,
      features.volume,
      features.publicSentiment
    ];
  }

  // Predict with model (mock implementation)
  private async predictWithModel(model: any, features: number[], line: number): Promise<{
    prediction: 'over' | 'under';
    confidence: number;
    probability: number;
    expectedValue: number;
  }> {
    // Simulate model prediction time
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Mock prediction logic
    const weightedSum = features.reduce((sum, feature, index) => {
      return sum + (feature * model.weights[index]);
    }, model.bias);
    
    // Apply sigmoid activation
    const probability = 1 / (1 + Math.exp(-weightedSum));
    
    // Determine prediction
    const prediction = probability > 0.5 ? 'over' : 'under';
    const confidence = Math.abs(probability - 0.5) * 2; // Convert to 0-1 scale
    
    // Calculate expected value
    const expectedValue = this.calculateExpectedValue(probability, line);
    
    return {
      prediction,
      confidence: Math.min(confidence, 0.95), // Cap at 95%
      probability,
      expectedValue
    };
  }

  // Calculate expected value
  private calculateExpectedValue(probability: number, line: number): number {
    // Mock expected value calculation
    const baseValue = line;
    const variance = line * 0.2; // 20% variance
    const expectedPerformance = baseValue + (probability - 0.5) * variance;
    
    return expectedPerformance;
  }

  // Calculate confidence interval
  private calculateConfidenceInterval(probability: number, model: any): MLPrediction['confidenceInterval'] {
    // Calculate standard error based on model uncertainty
    const standardError = Math.sqrt(probability * (1 - probability) / model.sampleSize || 1000);
    const margin = 1.96 * standardError; // 95% confidence interval
    
    return {
      lower: Math.max(0, probability - margin),
      upper: Math.min(1, probability + margin),
      level: 95
    };
  }

  // Calculate feature importance
  private calculateFeatureImportance(features: MLFeatures, model: any): MLPrediction['featureImportance'] {
    const featureNames = model.features;
    const weights = model.weights;
    
    return featureNames.map((feature: string, index: number) => {
      const importance = Math.abs(weights[index] * features[feature as keyof MLFeatures]);
      const impact = weights[index] > 0 ? 'positive' : weights[index] < 0 ? 'negative' : 'neutral';
      
      return {
        feature: this.formatFeatureName(feature),
        importance,
        impact
      };
    }).sort((a, b) => b.importance - a.importance);
  }

  // Format feature name for display
  private formatFeatureName(feature: string): string {
    return feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Get model performance metrics
  getModelPerformance(propType: string): ModelPerformance | null {
    return this.performanceMetrics.get(propType) || null;
  }

  // Get all model performance metrics
  getAllModelPerformance(): Map<string, ModelPerformance> {
    return new Map(this.performanceMetrics);
  }

  // Retrain model with new data
  async retrainModel(propType: string, trainingData: any[]): Promise<void> {
    logAPI('MLPredictionService', `Retraining model for ${propType}`);
    
    try {
      // In production, this would retrain the actual model
      // For now, we'll simulate retraining
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update model version
      const model = this.models.get(propType);
      if (model) {
        model.version = this.incrementVersion(model.version);
        model.lastTrained = new Date().toISOString();
      }
      
      // Update performance metrics
      const currentMetrics = this.performanceMetrics.get(propType);
      if (currentMetrics) {
        this.performanceMetrics.set(propType, {
          ...currentMetrics,
          accuracy: Math.min(0.95, currentMetrics.accuracy + Math.random() * 0.05),
          lastUpdated: new Date().toISOString(),
          sampleSize: currentMetrics.sampleSize + trainingData.length
        });
      }
      
      logSuccess('MLPredictionService', `Model retrained for ${propType}`);
    } catch (error) {
      logError('MLPredictionService', `Failed to retrain model for ${propType}:`, error);
      throw error;
    }
  }

  // Increment version number
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  // Get service status
  getServiceStatus(): {
    isInitialized: boolean;
    modelsLoaded: string[];
    totalModels: number;
  } {
    return {
      isInitialized: this.isInitialized,
      modelsLoaded: Array.from(this.models.keys()),
      totalModels: this.models.size
    };
  }
}

export const mlPredictionService = new MLPredictionService();
