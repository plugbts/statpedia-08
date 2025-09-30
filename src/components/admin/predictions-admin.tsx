import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  BarChart3,
  Search,
  RefreshCw
} from 'lucide-react';
import { predictionService, type PlayerPropPrediction, type UserPredictionStats } from '@/services/prediction-service';
import { useToast } from '@/hooks/use-toast';

export const PredictionsAdmin: React.FC = () => {
  const [predictions, setPredictions] = useState<PlayerPropPrediction[]>([]);
  const [stats, setStats] = useState<UserPredictionStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<PlayerPropPrediction | null>(null);
  const [actualResult, setActualResult] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [predictionsData, statsData] = await Promise.all([
        predictionService.getRecentPredictions(100),
        loadUserStats()
      ]);
      
      setPredictions(predictionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load predictions data:', error);
      toast({
        title: "Error",
        description: "Failed to load predictions data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserStats = async (): Promise<UserPredictionStats[]> => {
    try {
      // This would typically be an admin function to get all user stats
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('Failed to load user stats:', error);
      return [];
    }
  };

  const handleUpdateResult = async () => {
    if (!selectedPrediction || !actualResult) return;

    try {
      setIsUpdating(true);
      const result = parseFloat(actualResult);
      
      if (isNaN(result)) {
        toast({
          title: "Error",
          description: "Please enter a valid number for the actual result",
          variant: "destructive"
        });
        return;
      }

      await predictionService.updateGameResults(selectedPrediction.id, result);
      
      toast({
        title: "Success",
        description: "Game results updated successfully"
      });

      // Reload data
      await loadData();
      setSelectedPrediction(null);
      setActualResult('');
    } catch (error: any) {
      console.error('Failed to update game results:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update game results",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredPredictions = predictions.filter(prediction =>
    prediction.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prediction.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prediction.opponent.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getResultIcon = (prediction: PlayerPropPrediction) => {
    if (!prediction.actual_result) return null;
    
    if (prediction.actual_result > prediction.prop_value) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (prediction.actual_result < prediction.prop_value) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Predictions Management</h2>
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Predictions Management</h2>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by player, team, or opponent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Predictions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Player Prop Predictions ({filteredPredictions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Prop</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Votes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPredictions.map((prediction) => (
                  <TableRow key={prediction.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{prediction.player_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {prediction.team} vs {prediction.opponent}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{prediction.prop_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {prediction.prop_title}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-lg">{prediction.prop_value}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span>{prediction.over_votes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          <span>{prediction.under_votes}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: {prediction.total_votes}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getGameStatusBadge(prediction.game_status)}
                        {getResultIcon(prediction)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {prediction.actual_result !== null ? (
                        <div className="font-bold">{prediction.actual_result}</div>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {prediction.game_status !== 'final' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPrediction(prediction)}
                        >
                          Update Result
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Update Result Modal */}
      {selectedPrediction && (
        <Card>
          <CardHeader>
            <CardTitle>Update Game Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">{selectedPrediction.player_name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedPrediction.prop_type}: {selectedPrediction.prop_value}
              </p>
            </div>
            
            <div>
              <Label htmlFor="actual-result">Actual Result</Label>
              <Input
                id="actual-result"
                type="number"
                step="0.1"
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                placeholder="Enter the actual stat achieved"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpdateResult}
                disabled={isUpdating || !actualResult}
              >
                {isUpdating ? 'Updating...' : 'Update Result'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPrediction(null);
                  setActualResult('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Total Predictions</span>
            </div>
            <div className="text-2xl font-bold">{predictions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="font-medium">Total Votes</span>
            </div>
            <div className="text-2xl font-bold">
              {predictions.reduce((sum, p) => sum + p.total_votes, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Completed Games</span>
            </div>
            <div className="text-2xl font-bold">
              {predictions.filter(p => p.game_status === 'final').length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
