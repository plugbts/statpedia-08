import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Star,
  Minus
} from 'lucide-react';
import { predictionService, type PredictionPollData } from '@/services/prediction-service';
import { useToast } from '@/hooks/use-toast';

interface PredictionPollProps {
  propId: string;
  propTitle: string;
  propValue: number;
  propType: string;
  playerName: string;
  team: string;
  opponent: string;
  gameDate: string;
  gameStatus?: 'scheduled' | 'live' | 'final';
}

export const PredictionPoll: React.FC<PredictionPollProps> = ({
  propId,
  propTitle,
  propValue,
  propType,
  playerName,
  team,
  opponent,
  gameDate,
  gameStatus = 'scheduled'
}) => {
  const [pollData, setPollData] = useState<PredictionPollData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPollData();
  }, [propId]);

  const loadPollData = async () => {
    try {
      setIsLoading(true);
      const data = await predictionService.getPredictionPollData(propId);
      setPollData(data);
    } catch (error) {
      console.error('Failed to load poll data:', error);
      toast({
        title: "Error",
        description: "Failed to load prediction poll",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (predictionType: 'over' | 'under') => {
    if (!pollData) return;

    try {
      setIsVoting(true);

      if (pollData.userPrediction) {
        // Update existing vote
        await predictionService.updateUserPrediction(pollData.prediction.id, predictionType);
      } else {
        // Create new vote
        await predictionService.createUserPrediction(pollData.prediction.id, predictionType);
      }

      // Reload poll data
      await loadPollData();
      setShowResults(true);

      toast({
        title: "Vote Recorded",
        description: `You predicted ${predictionType.toUpperCase()} ${propValue} ${propType}`
      });
    } catch (error: any) {
      console.error('Failed to vote:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record your vote",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  };

  const formatGameDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="destructive" className="animate-pulse">LIVE</Badge>;
      case 'final':
        return <Badge variant="secondary">FINAL</Badge>;
      default:
        return <Badge variant="outline">SCHEDULED</Badge>;
    }
  };

  const getResultIcon = (actualResult?: number) => {
    if (!actualResult) return null;
    
    if (actualResult > propValue) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (actualResult < propValue) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-muted rounded w-20"></div>
              <div className="h-8 bg-muted rounded w-20"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pollData) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert>
            <AlertDescription>
              No prediction poll available for this prop.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { prediction, userPrediction, overPercentage, underPercentage } = pollData;
  const hasVoted = !!userPrediction;
  const showPollResults = showResults || hasVoted || gameStatus === 'final';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Prediction Poll
          </CardTitle>
          <div className="flex items-center gap-2">
            {getGameStatusBadge(gameStatus)}
            {getResultIcon(prediction.actual_result)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prop Information */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{propTitle}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{playerName} ({team})</span>
            <span>vs {opponent}</span>
            <span>{formatGameDate(gameDate)}</span>
          </div>
        </div>

        {/* Poll Question */}
        <div className="text-center py-4">
          <p className="text-lg font-medium">
            Will {playerName} go <span className="font-bold">OVER</span> or <span className="font-bold">UNDER</span> {propValue} {propType}?
          </p>
        </div>

        {/* Voting Buttons */}
        {!showPollResults && (
          <div className="flex gap-4">
            <Button
              variant={userPrediction?.prediction_type === 'over' ? 'default' : 'outline'}
              className="flex-1 h-12"
              onClick={() => handleVote('over')}
              disabled={isVoting}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              OVER {propValue}
            </Button>
            <Button
              variant={userPrediction?.prediction_type === 'under' ? 'default' : 'outline'}
              className="flex-1 h-12"
              onClick={() => handleVote('under')}
              disabled={isVoting}
            >
              <TrendingDown className="w-5 h-5 mr-2" />
              UNDER {propValue}
            </Button>
          </div>
        )}

        {/* Poll Results */}
        {showPollResults && (
          <div className="space-y-4">
            {/* Vote Count */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{prediction.total_votes} votes</span>
              </div>
              {hasVoted && (
                <Badge variant="secondary">
                  You voted {userPrediction?.prediction_type.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Progress Bars */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    OVER ({prediction.over_votes})
                  </span>
                  <span className="font-medium">{overPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={overPercentage} className="h-2" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    UNDER ({prediction.under_votes})
                  </span>
                  <span className="font-medium">{underPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={underPercentage} className="h-2" />
              </div>
            </div>

            {/* Game Result */}
            {gameStatus === 'final' && prediction.actual_result !== null && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Final Result</p>
                <p className="text-lg font-bold">
                  {prediction.actual_result} {propType}
                </p>
                {hasVoted && (
                  <div className="mt-2 space-y-2">
                    {userPrediction?.prediction_type === 'over' && prediction.actual_result! > propValue ? (
                      <Badge variant="default" className="bg-green-500">✓ Correct!</Badge>
                    ) : userPrediction?.prediction_type === 'under' && prediction.actual_result! < propValue ? (
                      <Badge variant="default" className="bg-green-500">✓ Correct!</Badge>
                    ) : (
                      <Badge variant="destructive">✗ Incorrect</Badge>
                    )}
                    
                    {/* Karma Change Display */}
                    <div className="text-sm">
                      {userPrediction?.prediction_type === 'over' && prediction.actual_result! > propValue ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <Star className="w-4 h-4" />
                          <span>+2-4 Karma</span>
                        </div>
                      ) : userPrediction?.prediction_type === 'under' && prediction.actual_result! < propValue ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <Star className="w-4 h-4" />
                          <span>+2-4 Karma</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <Minus className="w-4 h-4" />
                          <span>-1-2 Karma</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show Results Button */}
            {!showResults && hasVoted && gameStatus !== 'final' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResults(true)}
                className="w-full"
              >
                Show Results
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
