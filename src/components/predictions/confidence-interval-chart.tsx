import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Activity,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfidenceIntervalData {
  prediction: 'over' | 'under';
  probability: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number;
  };
  confidence: number;
  expectedValue: number;
  featureImportance: Array<{
    feature: string;
    importance: number;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}

interface ConfidenceIntervalChartProps {
  data: ConfidenceIntervalData;
  className?: string;
}

export const ConfidenceIntervalChart: React.FC<ConfidenceIntervalChartProps> = ({ 
  data, 
  className 
}) => {
  const { prediction, probability, confidenceInterval, confidence, expectedValue, featureImportance } = data;
  
  // Calculate interval width
  const intervalWidth = confidenceInterval.upper - confidenceInterval.lower;
  const intervalCenter = (confidenceInterval.upper + confidenceInterval.lower) / 2;
  
  // Calculate position of probability within interval
  const probabilityPosition = ((probability - confidenceInterval.lower) / intervalWidth) * 100;
  
  // Get color based on confidence level
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-emerald-400';
    if (conf >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getConfidenceBgColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-emerald-600/20 border-emerald-500/30';
    if (conf >= 0.6) return 'bg-yellow-600/20 border-yellow-500/30';
    return 'bg-red-600/20 border-red-500/30';
  };

  return (
    <Card className={cn("bg-slate-800/50 border-slate-700", className)}>
      <CardHeader>
        <CardTitle className="text-slate-200 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Confidence Interval Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Prediction Display */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Badge className={cn(
              "text-lg px-4 py-2 border-2",
              prediction === 'over' 
                ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50"
                : "bg-red-600/20 text-red-300 border-red-500/50"
            )}>
              {prediction === 'over' ? (
                <TrendingUp className="w-4 h-4 mr-2" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-2" />
              )}
              {prediction.toUpperCase()}
            </Badge>
            
            <Badge className={cn("text-lg px-4 py-2 border", getConfidenceBgColor(confidence))}>
              <Brain className="w-4 h-4 mr-2" />
              {Math.round(confidence * 100)}% Confidence
            </Badge>
          </div>
          
          <div className="text-2xl font-bold text-white">
            {Math.round(probability * 100)}% Probability
          </div>
        </div>

        {/* Confidence Interval Visualization */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Confidence Interval ({confidenceInterval.level}%)</span>
            <span className="text-slate-300 text-sm">
              {Math.round(confidenceInterval.lower * 100)}% - {Math.round(confidenceInterval.upper * 100)}%
            </span>
          </div>
          
          <div className="relative">
            {/* Interval Bar */}
            <div className="h-8 bg-slate-700 rounded-lg relative overflow-hidden">
              {/* Interval Background */}
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-lg"
                style={{ 
                  left: `${confidenceInterval.lower * 100}%`,
                  width: `${intervalWidth * 100}%`
                }}
              />
              
              {/* Probability Marker */}
              <div 
                className="absolute top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-full shadow-lg"
                style={{ left: `${probability * 100}%` }}
              />
              
              {/* Center Line */}
              <div 
                className="absolute top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-slate-400"
                style={{ left: `${intervalCenter * 100}%` }}
              />
            </div>
            
            {/* Labels */}
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
          
          {/* Interval Statistics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-slate-400 text-sm">Lower Bound</div>
              <div className="text-white font-semibold">{Math.round(confidenceInterval.lower * 100)}%</div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-slate-400 text-sm">Prediction</div>
              <div className="text-white font-semibold">{Math.round(probability * 100)}%</div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-slate-400 text-sm">Upper Bound</div>
              <div className="text-white font-semibold">{Math.round(confidenceInterval.upper * 100)}%</div>
            </div>
          </div>
        </div>

        {/* Expected Value */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-300 font-semibold">Expected Value</span>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <div className="text-2xl font-bold text-white">
              {expectedValue.toFixed(2)}
            </div>
            <div className="text-slate-400 text-sm">
              Based on probability distribution and historical performance
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-slate-300 font-semibold">Key Factors</span>
          </div>
          <div className="space-y-2">
            {featureImportance.slice(0, 5).map((factor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    factor.impact === 'positive' ? "bg-emerald-400" :
                    factor.impact === 'negative' ? "bg-red-400" : "bg-slate-400"
                  )} />
                  <span className="text-slate-300 text-sm">{factor.feature}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={factor.importance * 100} 
                    className="w-16 h-2"
                  />
                  <span className="text-slate-400 text-xs w-8">
                    {Math.round(factor.importance * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interpretation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300 font-semibold">Interpretation</span>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg space-y-2">
            <div className="text-slate-300 text-sm">
              <strong>Prediction:</strong> {Math.round(probability * 100)}% probability of {prediction}
            </div>
            <div className="text-slate-300 text-sm">
              <strong>Confidence:</strong> {Math.round(confidence * 100)}% confidence in this prediction
            </div>
            <div className="text-slate-300 text-sm">
              <strong>Interval:</strong> {confidenceInterval.level}% confidence that true probability is between {Math.round(confidenceInterval.lower * 100)}% and {Math.round(confidenceInterval.upper * 100)}%
            </div>
            <div className="text-slate-300 text-sm">
              <strong>Risk Level:</strong> {
                confidence >= 0.8 ? 'Low risk - High confidence prediction' :
                confidence >= 0.6 ? 'Medium risk - Moderate confidence prediction' :
                'High risk - Low confidence prediction'
              }
            </div>
          </div>
        </div>

        {/* Quality Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {confidence >= 0.8 ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
            <span className="text-slate-400 text-sm">
              {confidence >= 0.8 ? 'High Quality' : 'Medium Quality'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
            <span className="text-slate-400 text-sm">
              ML Model v1.0
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
