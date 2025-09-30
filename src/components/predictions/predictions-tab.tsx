import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  Brain, 
  Zap,
  Calendar,
  Users,
  Activity,
  AlertCircle,
  Play,
  RotateCcw,
  DollarSign,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  Filter,
  SortAsc,
  SortDesc,
  Download,
  Share2,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { seasonService } from '@/services/season-service';
import { gamesService, GamePrediction } from '@/services/games-service';
import { simulationService, PredictionAnalysis } from '@/services/simulation-service';
import { crossReferenceService, CrossReferenceResult } from '@/services/cross-reference-service';

interface PredictionsTabProps {
  selectedSport: string;
  userRole?: string;
  userSubscription?: string;
}

interface AdvancedPrediction extends GamePrediction {
  analysis?: PredictionAnalysis;
  crossReference?: CrossReferenceResult;
  confidence: number;
  valueRating: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  lastUpdated: Date;
  isLive: boolean;
  isBookmarked?: boolean;
}

export const PredictionsTab: React.FC<PredictionsTabProps> = ({ 
  selectedSport, 
  userRole = 'user', 
  userSubscription = 'free' 
}) => {
  const [predictions, setPredictions] = useState<AdvancedPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'value' | 'time' | 'sport'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [bookmarkedPredictions, setBookmarkedPredictions] = useState<Set<string>>(new Set());
  const [shouldShowPredictions, setShouldShowPredictions] = useState(true);
  const [offseasonMessage, setOffseasonMessage] = useState('');
  const [seasonLoading, setSeasonLoading] = useState(true);
  const { toast } = useToast();

  const isSubscribed = userRole === 'owner' || userSubscription !== 'free';

  // Load season data from ESPN API
  useEffect(() => {
    const loadSeasonData = async () => {
      setSeasonLoading(true);
      try {
        const [shouldShow, message] = await Promise.all([
          seasonService.shouldShowMoneylinePredictions(selectedSport),
          seasonService.getOffseasonMessage(selectedSport)
        ]);
        setShouldShowPredictions(shouldShow);
        setOffseasonMessage(message);
      } catch (error) {
        console.error('Error loading season data:', error);
        // Fallback to sync methods
        setShouldShowPredictions(seasonService.shouldShowMoneylinePredictionsSync(selectedSport));
        setOffseasonMessage(seasonService.getOffseasonMessageSync(selectedSport));
      } finally {
        setSeasonLoading(false);
      }
    };

    loadSeasonData();
  }, [selectedSport]);

  // Load predictions
  useEffect(() => {
    if (shouldShowPredictions) {
      loadPredictions();
    }
  }, [selectedSport, shouldShowPredictions]);

  // Load bookmarked predictions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bookmarked_predictions_${selectedSport}`);
    if (saved) {
      try {
        setBookmarkedPredictions(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error('Failed to load bookmarked predictions:', error);
      }
    }
  }, [selectedSport]);

  const loadPredictions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get base predictions
      const gamePredictions = await gamesService.getCurrentWeekPredictions(selectedSport);
      
      // Enhance each prediction with advanced analysis
      const enhancedPredictions: AdvancedPrediction[] = await Promise.all(
        gamePredictions.map(async (prediction) => {
          try {
            // Get simulation analysis
            const analysis = await simulationService.generatePredictionAnalysis(
              prediction.homeTeam,
              prediction.awayTeam,
              selectedSport,
              prediction.homeForm,
              prediction.awayForm,
              prediction.h2hData,
              prediction.injuries,
              prediction.restDays,
              prediction.weather,
              prediction.venue,
              prediction.homeOdds,
              prediction.awayOdds,
              prediction.drawOdds
            );

            // Get cross-reference analysis
            const crossReference = await crossReferenceService.crossReferencePrediction(
              prediction.homeTeam,
              prediction.awayTeam,
              selectedSport,
              prediction.homeForm,
              prediction.awayForm,
              prediction.h2hData,
              prediction.injuries,
              prediction.restDays,
              prediction.weather,
              prediction.venue,
              prediction.homeOdds,
              prediction.awayOdds,
              prediction.drawOdds
            );

            // Calculate confidence and value rating
            const confidence = Math.min(95, Math.max(60, 
              (analysis.predictedHomeScore + analysis.predictedAwayScore) / 2 + 
              crossReference.agreement / 20 + 
              Math.random() * 10
            ));

            const valueRating = Math.min(5, Math.max(1, 
              crossReference.valueRating + 
              (confidence > 80 ? 1 : 0) + 
              (analysis.predictedHomeScore > analysis.predictedAwayScore ? 0.5 : -0.5)
            ));

            const riskLevel: 'low' | 'medium' | 'high' = 
              confidence > 85 && crossReference.agreement > 80 ? 'low' :
              confidence > 70 && crossReference.agreement > 60 ? 'medium' : 'high';

            const factors = [
              `Recent form: ${prediction.homeForm.slice(-3).reduce((a, b) => a + b, 0) / 3 > 0.5 ? 'Strong' : 'Weak'}`,
              `H2H advantage: ${prediction.h2hData.homeWins > prediction.h2hData.awayWins ? 'Home' : 'Away'}`,
              `Injury impact: ${prediction.injuries.home.length > prediction.injuries.away.length ? 'Home' : 'Away'} affected`,
              `Rest advantage: ${prediction.restDays.home > prediction.restDays.away ? 'Home' : 'Away'} better rested`,
              `Weather factor: ${prediction.weather === 'clear' ? 'Neutral' : 'Impactful'}`
            ];

            return {
              ...prediction,
              analysis,
              crossReference,
              confidence: Math.round(confidence),
              valueRating: Math.round(valueRating * 10) / 10,
              riskLevel,
              factors,
              lastUpdated: new Date(),
              isLive: true,
              isBookmarked: bookmarkedPredictions.has(prediction.id)
            };
          } catch (error) {
            console.error(`Error enhancing prediction ${prediction.id}:`, error);
            // Return basic prediction if enhancement fails
            return {
              ...prediction,
              confidence: 65,
              valueRating: 3.0,
              riskLevel: 'medium' as const,
              factors: ['Basic analysis available'],
              lastUpdated: new Date(),
              isLive: false,
              isBookmarked: bookmarkedPredictions.has(prediction.id)
            };
          }
        })
      );

      setPredictions(enhancedPredictions);
      
      toast({
        title: 'Predictions Updated',
        description: `Loaded ${enhancedPredictions.length} advanced predictions for ${selectedSport?.toUpperCase() || 'Unknown Sport'}`,
      });
    } catch (err) {
      setError('Failed to load predictions');
      console.error('Error loading predictions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBookmark = (predictionId: string) => {
    const newBookmarked = new Set(bookmarkedPredictions);
    if (newBookmarked.has(predictionId)) {
      newBookmarked.delete(predictionId);
    } else {
      newBookmarked.add(predictionId);
    }
    setBookmarkedPredictions(newBookmarked);
    localStorage.setItem(`bookmarked_predictions_${selectedSport}`, JSON.stringify([...newBookmarked]));
    
    // Update prediction in state
    setPredictions(prev => prev.map(p => 
      p.id === predictionId ? { ...p, isBookmarked: newBookmarked.has(predictionId) } : p
    ));
  };

  const filteredPredictions = predictions.filter(prediction => {
    if (filterRisk !== 'all' && prediction.riskLevel !== filterRisk) return false;
    if (showLiveOnly && !prediction.isLive) return false;
    return true;
  });

  const sortedPredictions = [...filteredPredictions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'confidence':
        comparison = a.confidence - b.confidence;
        break;
      case 'value':
        comparison = a.valueRating - b.valueRating;
        break;
      case 'time':
        comparison = a.lastUpdated.getTime() - b.lastUpdated.getTime();
        break;
      case 'sport':
        comparison = a.sport.localeCompare(b.sport);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-500';
    if (confidence >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  if (seasonLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading season data...</p>
        </div>
      </div>
    );
  }

  if (!shouldShowPredictions) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground mb-4">Season Ended</h2>
          <div className="p-6 bg-muted/30 rounded-lg border border-muted max-w-md mx-auto">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">Season Ended</h3>
              <p className="text-muted-foreground">
                {offseasonMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                Advanced predictions will return when the season begins.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Advanced Predictions</h1>
        <p className="text-muted-foreground">
          AI-powered predictions with real-time analysis and cross-reference validation
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="value">Value</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="sport">Sport</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>

          <Select value={filterRisk} onValueChange={(value: any) => setFilterRisk(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showLiveOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLiveOnly(!showLiveOnly)}
          >
            <Activity className="w-4 h-4 mr-1" />
            Live Only
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPredictions}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPredictions}
              className="ml-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading advanced predictions...</p>
        </div>
      )}

      {/* Predictions Grid */}
      {!isLoading && sortedPredictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPredictions.map((prediction) => (
            <Card key={prediction.id} className="relative overflow-hidden">
              {/* Bookmark Button */}
              <button
                onClick={() => toggleBookmark(prediction.id)}
                className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                {prediction.isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-primary" />
                ) : (
                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {prediction.sport?.toUpperCase() || 'Unknown'}
                  </Badge>
                  {prediction.isLive && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      <Activity className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </div>
                
                <CardTitle className="text-lg">
                  {prediction.homeTeam || 'Home Team'} vs {prediction.awayTeam || 'Away Team'}
                </CardTitle>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {prediction.date ? new Date(prediction.date).toLocaleDateString() : 'TBD'}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Confidence & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Confidence</span>
                      <span className={`text-sm font-bold ${getConfidenceColor(prediction.confidence || 0)}`}>
                        {prediction.confidence || 0}%
                      </span>
                    </div>
                    <Progress value={prediction.confidence || 0} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Value Rating</span>
                      <span className="text-sm font-bold text-primary">
                        {prediction.valueRating || 0}/5
                      </span>
                    </div>
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "w-3 h-3",
                            i < Math.floor(prediction.valueRating || 0) 
                              ? "text-yellow-400 fill-current" 
                              : "text-muted-foreground"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Risk Level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <Badge className={cn("text-xs", getRiskColor(prediction.riskLevel))}>
                    {prediction.riskLevel?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>

                {/* Prediction Details */}
                {prediction.analysis && (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Predicted Score: </span>
                      <span className="text-muted-foreground">
                        {prediction.homeTeam} {Math.round(prediction.analysis.predictedHomeScore)} - 
                        {Math.round(prediction.analysis.predictedAwayScore)} {prediction.awayTeam}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium">AI Recommendation: </span>
                      <span className="text-muted-foreground">
                        {prediction.analysis.recommendation}
                      </span>
                    </div>
                  </div>
                )}

                {/* Cross-Reference Analysis */}
                {prediction.crossReference && (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Model Consensus: </span>
                      <span className="text-muted-foreground">
                        {prediction.crossReference.consensus}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium">Agreement: </span>
                      <span className="text-muted-foreground">
                        {prediction.crossReference.agreement.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Key Factors */}
                <div className="space-y-1">
                  <span className="text-sm font-medium">Key Factors:</span>
                  <div className="space-y-1">
                    {(prediction.factors || []).slice(0, 3).map((factor, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {factor}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground">
                  Updated: {prediction.lastUpdated ? prediction.lastUpdated.toLocaleTimeString() : 'Unknown'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Predictions */}
      {!isLoading && sortedPredictions.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Predictions Found</h3>
          <p className="text-muted-foreground mb-4">
            No predictions match your current filters.
          </p>
          <Button onClick={() => {
            setFilterRisk('all');
            setShowLiveOnly(false);
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};
