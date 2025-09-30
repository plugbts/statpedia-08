import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { evCalculatorService, type EVCalculation } from '@/services/ev-calculator';

interface EVRatingProps {
  evCalculation: EVCalculation;
  compact?: boolean;
}

export const EVRating: React.FC<EVRatingProps> = ({ evCalculation, compact = false }) => {
  const { evPercentage, roiPercentage, aiRating, confidence, factors, recommendation } = evCalculation;

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < aiRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRecommendationIcon = () => {
    switch (recommendation) {
      case 'strong_bet':
      case 'good_bet':
        return <TrendingUp className="w-3 h-3" />;
      case 'avoid':
      case 'strong_avoid':
        return <TrendingDown className="w-3 h-3" />;
      case 'neutral':
        return <Minus className="w-3 h-3" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1">
                {renderStars()}
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs ${evCalculatorService.getRecommendationColor(recommendation)}`}
              >
                {evCalculatorService.getRecommendationText(recommendation)}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-medium">AI EV Rating: {aiRating}/5 stars</div>
              <div>EV: {evPercentage.toFixed(1)}%</div>
              <div>ROI: {roiPercentage.toFixed(1)}%</div>
              <div>Confidence: {confidence.toFixed(0)}%</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>AI EV Analysis</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {renderStars()}
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs ${evCalculatorService.getRecommendationColor(recommendation)}`}
            >
              {getRecommendationIcon()}
              {evCalculatorService.getRecommendationText(recommendation)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* EV Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold" style={{ color: evCalculatorService.getEVColor(evPercentage) }}>
              {evPercentage > 0 ? '+' : ''}{evPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Expected Value</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold" style={{ color: evCalculatorService.getEVColor(roiPercentage) }}>
              {roiPercentage > 0 ? '+' : ''}{roiPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">ROI</div>
          </div>
        </div>

        {/* Confidence */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">Confidence</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{confidence.toFixed(0)}%</div>
        </div>

        {/* Key Factors */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Key Factors</div>
          <div className="space-y-1">
            {factors.slice(0, 3).map((factor, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{factor.name}</span>
                <div className="flex items-center gap-1">
                  {factor.impact === 'positive' && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {factor.impact === 'negative' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  {factor.impact === 'neutral' && <Minus className="w-3 h-3 text-yellow-500" />}
                  <span className={`text-xs ${
                    factor.impact === 'positive' ? 'text-green-500' :
                    factor.impact === 'negative' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : '='}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
