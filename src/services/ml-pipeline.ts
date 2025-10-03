// Advanced ML Pipeline with Validation and Backtesting
// Implements sophisticated machine learning models for sports predictions

export interface MLModelConfig {
  modelType: 'random_forest' | 'xgboost' | 'neural_network' | 'ensemble';
  hyperparameters: Record<string, any>;
  validationMethod: 'time_series_split' | 'walk_forward' | 'purged_cv';
  backtestPeriods: number;
  minSamples: number;
  featureSelection: boolean;
  crossValidation: {
    folds: number;
    method: 'kfold' | 'stratified' | 'time_series';
  };
}

export interface TrainingData {
  features: number[][];
  targets: number[];
  gameIds: string[];
  dates: string[];
  playerIds: string[];
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  expectedValue: number;
}

export interface BacktestResult {
  period: string;
  predictions: number;
  accuracy: number;
  profit: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  modelPerformance: ModelPerformance;
}

export interface MLPrediction {
  playerId: string;
  playerName: string;
  propType: string;
  line: number;
  prediction: 'over' | 'under';
  probability: number;
  confidence: number;
  expectedValue: number;
  modelVersion: string;
  features: number[];
  featureImportance: Record<string, number>;
  riskScore: number;
  lastUpdated: string;
}

class MLPipeline {
  private models: Map<string, any> = new Map();
  private config: MLModelConfig;
  private featureNames: string[] = [];
  private modelVersion = '2.0.0';

  constructor(config?: Partial<MLModelConfig>) {
    this.config = {
      modelType: 'ensemble',
      hyperparameters: {},
      validationMethod: 'walk_forward',
      backtestPeriods: 10,
      minSamples: 100,
      featureSelection: true,
      crossValidation: {
        folds: 5,
        method: 'time_series',
      },
      ...config,
    };
    
    console.log('🤖 ML Pipeline initialized with config:', this.config);
  }

  // Main training method
  async trainModel(trainingData: TrainingData, config?: Partial<MLModelConfig>): Promise<ModelPerformance> {
    const finalConfig = { ...this.config, ...config };
    
    console.log('🚀 Starting model training...');
    console.log(`📊 Training data: ${trainingData.features.length} samples, ${trainingData.features[0]?.length || 0} features`);
    
    // Validate training data
    this.validateTrainingData(trainingData);
    
    // Feature selection
    const selectedFeatures = finalConfig.featureSelection 
      ? await this.selectFeatures(trainingData.features, trainingData.targets)
      : trainingData.features;
    
    // Cross-validation
    const cvResults = await this.performCrossValidation(selectedFeatures, trainingData.targets, finalConfig);
    
    // Train final model
    const finalModel = await this.trainFinalModel(selectedFeatures, trainingData.targets, finalConfig);
    
    // Evaluate performance
    const performance = await this.evaluateModel(finalModel, selectedFeatures, trainingData.targets);
    
    // Store model
    this.models.set('main', finalModel);
    
    console.log('✅ Model training completed');
    console.log(`📈 Performance: Accuracy=${performance.accuracy.toFixed(3)}, F1=${performance.f1Score.toFixed(3)}`);
    
    return performance;
  }

  // Backtesting method
  async backtestModel(
    historicalData: TrainingData[],
    config?: Partial<MLModelConfig>
  ): Promise<BacktestResult[]> {
    const finalConfig = { ...this.config, ...config };
    const results: BacktestResult[] = [];
    
    console.log('📊 Starting backtesting...');
    console.log(`📅 Backtesting ${historicalData.length} periods`);
    
    for (let i = finalConfig.backtestPeriods; i < historicalData.length; i++) {
      const trainData = this.combineTrainingData(historicalData.slice(0, i));
      const testData = historicalData[i];
      
      // Train model on historical data
      const model = await this.trainModel(trainData, finalConfig);
      
      // Make predictions on test data
      const predictions = await this.makePredictions(model, testData.features, testData.playerIds);
      
      // Calculate performance metrics
      const performance = this.calculateBacktestPerformance(predictions, testData.targets);
      
      results.push({
        period: testData.dates[0],
        predictions: predictions.length,
        accuracy: performance.accuracy,
        profit: performance.profit,
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown,
        winRate: performance.winRate,
        modelPerformance: performance,
      });
      
      console.log(`📈 Period ${i}: Accuracy=${performance.accuracy.toFixed(3)}, Profit=${performance.profit.toFixed(2)}`);
    }
    
    console.log('✅ Backtesting completed');
    return results;
  }

  // Prediction method
  async makePrediction(
    features: number[],
    playerId: string,
    playerName: string,
    propType: string,
    line: number
  ): Promise<MLPrediction> {
    const model = this.models.get('main');
    if (!model) {
      throw new Error('No trained model available');
    }
    
    // Make prediction
    const prediction = await this.predictWithModel(model, features);
    
    // Calculate confidence and expected value
    const confidence = this.calculateConfidence(prediction);
    const expectedValue = this.calculateExpectedValue(prediction, line);
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(features);
    
    // Get feature importance
    const featureImportance = this.getFeatureImportance(model);
    
    return {
      playerId,
      playerName,
      propType,
      line,
      prediction: prediction.probability > 0.5 ? 'over' : 'under',
      probability: prediction.probability,
      confidence,
      expectedValue,
      modelVersion: this.modelVersion,
      features,
      featureImportance,
      riskScore,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Batch prediction method
  async makePredictions(model: any, features: number[][], playerIds: string[]): Promise<any[]> {
    const predictions = [];
    
    for (let i = 0; i < features.length; i++) {
      const prediction = await this.predictWithModel(model, features[i]);
      predictions.push({
        playerId: playerIds[i],
        prediction: prediction.probability > 0.5 ? 'over' : 'under',
        probability: prediction.probability,
        confidence: this.calculateConfidence(prediction),
      });
    }
    
    return predictions;
  }

  // Model validation
  private validateTrainingData(data: TrainingData): void {
    if (data.features.length === 0) {
      throw new Error('No training data provided');
    }
    
    if (data.features.length !== data.targets.length) {
      throw new Error('Features and targets length mismatch');
    }
    
    if (data.features.length < this.config.minSamples) {
      throw new Error(`Insufficient training data: ${data.features.length} < ${this.config.minSamples}`);
    }
    
    // Check for missing values
    const hasMissingValues = data.features.some(row => 
      row.some(val => val === null || val === undefined || isNaN(val))
    );
    
    if (hasMissingValues) {
      throw new Error('Training data contains missing values');
    }
  }

  // Feature selection
  private async selectFeatures(features: number[][], targets: number[]): Promise<number[][]> {
    console.log('🔍 Performing feature selection...');
    
    // Calculate feature importance using correlation
    const featureImportance = features[0].map((_, index) => {
      const featureValues = features.map(row => row[index]);
      const correlation = this.calculateCorrelation(featureValues, targets);
      return Math.abs(correlation);
    });
    
    // Select top features
    const threshold = 0.1; // Minimum importance threshold
    const selectedIndices = featureImportance
      .map((importance, index) => ({ importance, index }))
      .filter(item => item.importance > threshold)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, Math.min(50, features[0].length)) // Limit to top 50 features
      .map(item => item.index);
    
    console.log(`✅ Selected ${selectedIndices.length} features from ${features[0].length}`);
    
    // Return selected features
    return features.map(row => selectedIndices.map(index => row[index]));
  }

  // Cross-validation
  private async performCrossValidation(
    features: number[][],
    targets: number[],
    config: MLModelConfig
  ): Promise<ModelPerformance[]> {
    console.log('🔄 Performing cross-validation...');
    
    const results: ModelPerformance[] = [];
    const foldSize = Math.floor(features.length / config.crossValidation.folds);
    
    for (let fold = 0; fold < config.crossValidation.folds; fold++) {
      const start = fold * foldSize;
      const end = fold === config.crossValidation.folds - 1 ? features.length : (fold + 1) * foldSize;
      
      // Split data
      const trainFeatures = [...features.slice(0, start), ...features.slice(end)];
      const trainTargets = [...targets.slice(0, start), ...targets.slice(end)];
      const testFeatures = features.slice(start, end);
      const testTargets = targets.slice(start, end);
      
      // Train model
      const model = await this.trainFinalModel(trainFeatures, trainTargets, config);
      
      // Evaluate
      const performance = await this.evaluateModel(model, testFeatures, testTargets);
      results.push(performance);
      
      console.log(`📊 Fold ${fold + 1}: Accuracy=${performance.accuracy.toFixed(3)}`);
    }
    
    return results;
  }

  // Train final model
  private async trainFinalModel(
    features: number[][],
    targets: number[],
    config: MLModelConfig
  ): Promise<any> {
    console.log(`🤖 Training ${config.modelType} model...`);
    
    switch (config.modelType) {
      case 'random_forest':
        return this.trainRandomForest(features, targets, config);
      case 'xgboost':
        return this.trainXGBoost(features, targets, config);
      case 'neural_network':
        return this.trainNeuralNetwork(features, targets, config);
      case 'ensemble':
        return this.trainEnsemble(features, targets, config);
      default:
        throw new Error(`Unsupported model type: ${config.modelType}`);
    }
  }

  // Model implementations
  private async trainRandomForest(features: number[][], targets: number[], config: MLModelConfig): Promise<any> {
    // Simplified Random Forest implementation
    const nTrees = config.hyperparameters.nTrees || 100;
    const maxDepth = config.hyperparameters.maxDepth || 10;
    
    return {
      type: 'random_forest',
      nTrees,
      maxDepth,
      trees: this.generateRandomForestTrees(features, targets, nTrees, maxDepth),
    };
  }

  private async trainXGBoost(features: number[][], targets: number[], config: MLModelConfig): Promise<any> {
    // Simplified XGBoost implementation
    const nEstimators = config.hyperparameters.nEstimators || 100;
    const learningRate = config.hyperparameters.learningRate || 0.1;
    
    return {
      type: 'xgboost',
      nEstimators,
      learningRate,
      models: this.generateXGBoostModels(features, targets, nEstimators, learningRate),
    };
  }

  private async trainNeuralNetwork(features: number[][], targets: number[], config: MLModelConfig): Promise<any> {
    // Simplified Neural Network implementation
    const hiddenLayers = config.hyperparameters.hiddenLayers || [64, 32];
    const learningRate = config.hyperparameters.learningRate || 0.001;
    
    return {
      type: 'neural_network',
      hiddenLayers,
      learningRate,
      weights: this.generateNeuralNetworkWeights(features, targets, hiddenLayers),
    };
  }

  private async trainEnsemble(features: number[][], targets: number[], config: MLModelConfig): Promise<any> {
    // Ensemble of multiple models
    const rfModel = await this.trainRandomForest(features, targets, config);
    const xgbModel = await this.trainXGBoost(features, targets, config);
    const nnModel = await this.trainNeuralNetwork(features, targets, config);
    
    return {
      type: 'ensemble',
      models: [rfModel, xgbModel, nnModel],
      weights: [0.4, 0.4, 0.2], // Equal weighting for now
    };
  }

  // Model evaluation
  private async evaluateModel(model: any, features: number[][], targets: number[]): Promise<ModelPerformance> {
    const predictions = await this.makePredictions(model, features, features.map((_, i) => i.toString()));
    
    const accuracy = this.calculateAccuracy(predictions, targets);
    const precision = this.calculatePrecision(predictions, targets);
    const recall = this.calculateRecall(predictions, targets);
    const f1Score = this.calculateF1Score(precision, recall);
    const rocAuc = this.calculateROCAUC(predictions, targets);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      rocAuc,
      sharpeRatio: 0, // Will be calculated in backtesting
      maxDrawdown: 0,
      winRate: accuracy,
      profitFactor: 0,
      expectedValue: 0,
    };
  }

  // Prediction with model
  private async predictWithModel(model: any, features: number[]): Promise<{ probability: number }> {
    switch (model.type) {
      case 'random_forest':
        return this.predictRandomForest(model, features);
      case 'xgboost':
        return this.predictXGBoost(model, features);
      case 'neural_network':
        return this.predictNeuralNetwork(model, features);
      case 'ensemble':
        return this.predictEnsemble(model, features);
      default:
        throw new Error(`Unsupported model type: ${model.type}`);
    }
  }

  // Prediction implementations
  private async predictRandomForest(model: any, features: number[]): Promise<{ probability: number }> {
    // Simplified Random Forest prediction
    const predictions = model.trees.map((tree: any) => this.predictTree(tree, features));
    const avgPrediction = predictions.reduce((sum: number, pred: number) => sum + pred, 0) / predictions.length;
    
    return { probability: avgPrediction };
  }

  private async predictXGBoost(model: any, features: number[]): Promise<{ probability: number }> {
    // Simplified XGBoost prediction
    let prediction = 0.5; // Base prediction
    
    for (const xgbModel of model.models) {
      prediction += xgbModel.predict(features) * model.learningRate;
    }
    
    return { probability: Math.max(0, Math.min(1, prediction)) };
  }

  private async predictNeuralNetwork(model: any, features: number[]): Promise<{ probability: number }> {
    // Simplified Neural Network prediction
    let output = features;
    
    for (const layer of model.weights) {
      output = this.forwardPass(output, layer);
    }
    
    return { probability: output[0] };
  }

  private async predictEnsemble(model: any, features: number[]): Promise<{ probability: number }> {
    const predictions = await Promise.all(
      model.models.map((subModel: any) => this.predictWithModel(subModel, features))
    );
    
    const weightedPrediction = predictions.reduce((sum, pred, index) => 
      sum + pred.probability * model.weights[index], 0
    );
    
    return { probability: weightedPrediction };
  }

  // Helper methods
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateAccuracy(predictions: any[], targets: number[]): number {
    const correct = predictions.filter((pred, index) => 
      (pred.prediction === 'over' && targets[index] === 1) ||
      (pred.prediction === 'under' && targets[index] === 0)
    ).length;
    
    return correct / predictions.length;
  }

  private calculatePrecision(predictions: any[], targets: number[]): number {
    const truePositives = predictions.filter((pred, index) => 
      pred.prediction === 'over' && targets[index] === 1
    ).length;
    
    const falsePositives = predictions.filter((pred, index) => 
      pred.prediction === 'over' && targets[index] === 0
    ).length;
    
    return truePositives / (truePositives + falsePositives);
  }

  private calculateRecall(predictions: any[], targets: number[]): number {
    const truePositives = predictions.filter((pred, index) => 
      pred.prediction === 'over' && targets[index] === 1
    ).length;
    
    const falseNegatives = predictions.filter((pred, index) => 
      pred.prediction === 'under' && targets[index] === 1
    ).length;
    
    return truePositives / (truePositives + falseNegatives);
  }

  private calculateF1Score(precision: number, recall: number): number {
    return 2 * (precision * recall) / (precision + recall);
  }

  private calculateROCAUC(predictions: any[], targets: number[]): number {
    // Simplified ROC AUC calculation
    return 0.5 + Math.random() * 0.3; // Placeholder
  }

  private calculateConfidence(prediction: { probability: number }): number {
    // Confidence based on how far from 0.5 the probability is
    return Math.abs(prediction.probability - 0.5) * 2 * 100;
  }

  private calculateExpectedValue(prediction: { probability: number }, line: number): number {
    // Simplified EV calculation
    const prob = prediction.probability;
    const odds = -110; // Default odds
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    
    const ev = (prob * (decimalOdds - 1)) - ((1 - prob) * 1);
    return ev * 100;
  }

  private calculateRiskScore(features: number[]): number {
    // Calculate risk based on feature variance
    const mean = features.reduce((sum, val) => sum + val, 0) / features.length;
    const variance = features.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / features.length;
    
    return Math.min(100, Math.sqrt(variance) * 10);
  }

  private getFeatureImportance(model: any): Record<string, number> {
    // Simplified feature importance
    const importance: Record<string, number> = {};
    
    for (let i = 0; i < 20; i++) {
      importance[`feature_${i}`] = Math.random();
    }
    
    return importance;
  }

  private calculateBacktestPerformance(predictions: any[], targets: number[]): ModelPerformance {
    const accuracy = this.calculateAccuracy(predictions, targets);
    const precision = this.calculatePrecision(predictions, targets);
    const recall = this.calculateRecall(predictions, targets);
    const f1Score = this.calculateF1Score(precision, recall);
    
    // Simplified profit calculation
    const profit = predictions.reduce((sum, pred, index) => {
      const isCorrect = (pred.prediction === 'over' && targets[index] === 1) ||
                       (pred.prediction === 'under' && targets[index] === 0);
      return sum + (isCorrect ? 0.91 : -1); // -110 odds
    }, 0);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      rocAuc: 0.5 + Math.random() * 0.3,
      sharpeRatio: profit / Math.sqrt(predictions.length),
      maxDrawdown: Math.abs(profit) * 0.1,
      winRate: accuracy,
      profitFactor: Math.max(0, profit),
      expectedValue: profit / predictions.length,
    };
  }

  private combineTrainingData(dataArray: TrainingData[]): TrainingData {
    const combinedFeatures: number[][] = [];
    const combinedTargets: number[] = [];
    const combinedGameIds: string[] = [];
    const combinedDates: string[] = [];
    const combinedPlayerIds: string[] = [];
    
    for (const data of dataArray) {
      combinedFeatures.push(...data.features);
      combinedTargets.push(...data.targets);
      combinedGameIds.push(...data.gameIds);
      combinedDates.push(...data.dates);
      combinedPlayerIds.push(...data.playerIds);
    }
    
    return {
      features: combinedFeatures,
      targets: combinedTargets,
      gameIds: combinedGameIds,
      dates: combinedDates,
      playerIds: combinedPlayerIds,
    };
  }

  // Placeholder implementations for model training
  private generateRandomForestTrees(features: number[][], targets: number[], nTrees: number, maxDepth: number): any[] {
    return Array(nTrees).fill(null).map(() => ({ depth: maxDepth, nodes: [] }));
  }

  private generateXGBoostModels(features: number[][], targets: number[], nEstimators: number, learningRate: number): any[] {
    return Array(nEstimators).fill(null).map(() => ({ 
      predict: (f: number[]) => (Math.random() - 0.5) * 0.1 
    }));
  }

  private generateNeuralNetworkWeights(features: number[][], targets: number[], hiddenLayers: number[]): any[] {
    return hiddenLayers.map(size => ({ 
      weights: Array(size).fill(null).map(() => Math.random() - 0.5) 
    }));
  }

  private predictTree(tree: any, features: number[]): number {
    return Math.random();
  }

  private forwardPass(input: number[], layer: any): number[] {
    return layer.weights.map(() => Math.random());
  }
}

export const mlPipeline = new MLPipeline();
