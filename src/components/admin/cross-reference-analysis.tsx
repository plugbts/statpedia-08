import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { crossReferenceService, CrossReferenceAnalysis } from '@/services/cross-reference-service';
import { unifiedSportsAPI } from '@/services/unified-sports-api';

export const CrossReferenceAnalysis: React.FC = () => {
  const [analysis, setAnalysis] = useState<CrossReferenceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSport, setSelectedSport] = useState('NBA');

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      // Get our current props
      const ourProps = await unifiedSportsAPI.getPlayerProps(selectedSport);
      
      // Run cross-reference analysis
      const analysisResult = await crossReferenceService.analyzePropDiscrepancies(ourProps);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('Error running cross-reference analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [selectedSport]);

  const getSeverityColor = (value: number, threshold: number) => {
    if (value > threshold * 1.5) return 'text-red-500';
    if (value > threshold) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSeverityIcon = (value: number, threshold: number) => {
    if (value > threshold * 1.5) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (value > threshold) return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Cross-Reference Analysis
              </CardTitle>
              <CardDescription className="text-slate-300">
                Compare our player props with other sportsbooks to identify discrepancies
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="bg-slate-800 text-white border-slate-600 rounded px-3 py-1"
              >
                <option value="NBA">NBA</option>
                <option value="NFL">NFL</option>
                <option value="MLB">MLB</option>
                <option value="NHL">NHL</option>
              </select>
              <Button
                onClick={runAnalysis}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isLoading ? 'Analyzing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {analysis && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-200">Total Props</p>
                    <p className="text-2xl font-bold text-white">{analysis.totalPropsAnalyzed}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-200">Discrepancies</p>
                    <p className="text-2xl font-bold text-white">{analysis.propsWithDiscrepancies}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-200">Avg Line Diff</p>
                    <p className={`text-2xl font-bold ${getSeverityColor(analysis.averageLineDifference, 1.5)}`}>
                      {analysis.averageLineDifference.toFixed(2)}
                    </p>
                  </div>
                  {getSeverityIcon(analysis.averageLineDifference, 1.5)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-200">Avg Odds Diff</p>
                    <p className={`text-2xl font-bold ${getSeverityColor(analysis.averageOddsDifference, 15)}`}>
                      {analysis.averageOddsDifference.toFixed(0)}
                    </p>
                  </div>
                  {getSeverityIcon(analysis.averageOddsDifference, 15)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Results */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Analysis Results</CardTitle>
              <CardDescription className="text-slate-300">
                Last updated: {new Date(analysis.lastUpdated).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Discrepancy Rate */}
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <h3 className="text-white font-semibold">Discrepancy Rate</h3>
                  <p className="text-slate-300 text-sm">
                    {analysis.propsWithDiscrepancies} of {analysis.totalPropsAnalyzed} props show significant differences
                  </p>
                </div>
                <Badge 
                  variant={analysis.propsWithDiscrepancies > analysis.totalPropsAnalyzed * 0.3 ? "destructive" : "secondary"}
                  className="text-lg px-4 py-2"
                >
                  {((analysis.propsWithDiscrepancies / analysis.totalPropsAnalyzed) * 100).toFixed(1)}%
                </Badge>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold">Recommendations</h3>
                {analysis.recommendations.map((rec, index) => (
                  <Alert key={index} className="bg-slate-800/50 border-slate-600">
                    <AlertDescription className="text-slate-200">
                      {rec}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>

              {/* Key Issues Identified */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold">Key Issues Identified</h3>
                
                {analysis.averageLineDifference > 1.5 && (
                  <Alert className="bg-red-900/20 border-red-700">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">
                      <strong>Line Calculation Issues:</strong> Our lines are significantly different from sportsbook averages. 
                      This suggests our statistical models may be using outdated or incorrect data.
                    </AlertDescription>
                  </Alert>
                )}

                {analysis.averageOddsDifference > 15 && (
                  <Alert className="bg-yellow-900/20 border-yellow-700">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-200">
                      <strong>Odds Calculation Issues:</strong> Our odds show large variances from sportsbook averages. 
                      We may not be applying proper vig/juice calculations or market conditions.
                    </AlertDescription>
                  </Alert>
                )}

                {analysis.propsWithDiscrepancies > analysis.totalPropsAnalyzed * 0.3 && (
                  <Alert className="bg-orange-900/20 border-orange-700">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <AlertDescription className="text-orange-200">
                      <strong>Algorithm Calibration:</strong> High discrepancy rate suggests our prediction models 
                      need recalibration or we're using too much randomization in mock data.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Suggested Actions */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold">Suggested Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardContent className="p-4">
                      <h4 className="text-white font-medium mb-2">Immediate Fixes</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• Replace mock data with real sportsbook APIs</li>
                        <li>• Implement proper vig/juice calculations</li>
                        <li>• Use more recent statistical data</li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardContent className="p-4">
                      <h4 className="text-white font-medium mb-2">Long-term Improvements</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• Add real-time odds synchronization</li>
                        <li>• Implement machine learning models</li>
                        <li>• Add confidence intervals to predictions</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
