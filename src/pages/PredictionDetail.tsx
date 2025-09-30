import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SportIcon } from '@/components/ui/sport-icon';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PredictionDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const prediction = location.state?.prediction;

  if (!prediction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Prediction Found</h2>
          <p className="text-muted-foreground mb-6">The prediction details could not be loaded.</p>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const getTrendIcon = (direction: string) => {
    if (direction === 'over') return <TrendingUp className="w-5 h-5" />;
    if (direction === 'under') return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const confidenceColor = prediction.confidence >= 70 ? 'text-success' : 
                          prediction.confidence >= 50 ? 'text-warning' : 'text-destructive';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="gap-2 hover-scale"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="p-8 mb-6 animate-fade-in glass-morphism">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <SportIcon sport={prediction.sport} size="lg" />
              <div>
                <h1 className="text-3xl font-bold mb-2">{prediction.player}</h1>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{prediction.team}</Badge>
                  <Badge variant="outline">{prediction.opponent}</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Confidence</p>
              <p className={cn("text-4xl font-bold", confidenceColor)}>
                {prediction.confidence}%
              </p>
            </div>
          </div>

          {/* Prediction Details */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-card-hover">
              <p className="text-sm text-muted-foreground mb-1">Stat Type</p>
              <p className="text-xl font-bold capitalize">{prediction.stat}</p>
            </Card>
            <Card className="p-4 bg-card-hover">
              <p className="text-sm text-muted-foreground mb-1">Line</p>
              <p className="text-xl font-bold">{prediction.line}</p>
            </Card>
            <Card className="p-4 bg-card-hover">
              <p className="text-sm text-muted-foreground mb-1">Prediction</p>
              <div className="flex items-center gap-2">
                {getTrendIcon(prediction.direction)}
                <p className="text-xl font-bold capitalize">{prediction.direction}</p>
              </div>
            </Card>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confidence Level</span>
              <span className={cn("font-medium", confidenceColor)}>{prediction.confidence}%</span>
            </div>
            <Progress 
              value={prediction.confidence} 
              className="h-3 animate-slide-up"
            />
          </div>
        </Card>

        {/* Analysis Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Key Factors */}
          <Card className="p-6 animate-fade-in glass-morphism" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Key Factors</h2>
            </div>
            <ul className="space-y-3">
              {prediction.keyFactors.map((factor: string, index: number) => (
                <li 
                  key={index} 
                  className="flex items-start gap-3 animate-slide-up"
                  style={{ animationDelay: `${(index + 1) * 50}ms` }}
                >
                  <Zap className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{factor}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Statistics */}
          <Card className="p-6 animate-fade-in glass-morphism" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Statistical Analysis</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-card-hover rounded-lg animate-scale-in" style={{ animationDelay: '250ms' }}>
                <p className="text-sm text-muted-foreground mb-1">Season Average</p>
                <p className="text-2xl font-bold">{prediction.seasonAvg || 'N/A'}</p>
              </div>
              <div className="p-4 bg-card-hover rounded-lg animate-scale-in" style={{ animationDelay: '300ms' }}>
                <p className="text-sm text-muted-foreground mb-1">Last 10 Games Avg</p>
                <p className="text-2xl font-bold">{prediction.last10Avg || 'N/A'}</p>
              </div>
              <div className="p-4 bg-card-hover rounded-lg animate-scale-in" style={{ animationDelay: '350ms' }}>
                <p className="text-sm text-muted-foreground mb-1">vs Opponent Avg</p>
                <p className="text-2xl font-bold">{prediction.vsOpponentAvg || 'N/A'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Explanation */}
        <Card className="p-6 animate-fade-in glass-morphism" style={{ animationDelay: '300ms' }}>
          <h2 className="text-xl font-bold mb-4">Detailed Analysis</h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              {prediction.explanation || `Based on comprehensive analysis of ${prediction.player}'s recent performance, 
              matchup history, and current team dynamics, this ${prediction.direction} prediction on ${prediction.stat} 
              shows a ${prediction.confidence}% confidence level. The player has been trending ${prediction.direction === 'over' ? 'upward' : 'downward'} 
              in recent games, and the opposing team's defensive metrics support this prediction.`}
            </p>
          </div>
        </Card>

        {/* Matchup Details */}
        <Card className="p-6 mt-6 animate-fade-in glass-morphism" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-bold mb-4">Matchup Overview</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-primary">{prediction.team}</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Record:</span>
                  <span className="font-medium">{prediction.teamRecord || '0-0'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">PPG:</span>
                  <span className="font-medium">{prediction.teamPPG || 'N/A'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Pace:</span>
                  <span className="font-medium">{prediction.teamPace || 'N/A'}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-destructive">{prediction.opponent}</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Record:</span>
                  <span className="font-medium">{prediction.oppRecord || '0-0'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Def Rating:</span>
                  <span className="font-medium">{prediction.oppDefRating || 'N/A'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Pace:</span>
                  <span className="font-medium">{prediction.oppPace || 'N/A'}</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
