import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { crossReferenceService, CrossReferenceAnalysis as CrossReferenceAnalysisType } from '@/services/cross-reference-service';
import { unifiedSportsAPI } from '@/services/unified-sports-api';

export const CrossReferenceAnalysis: React.FC = () => {
  const [analysis, setAnalysis] = useState<CrossReferenceAnalysisType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSport, setSelectedSport] = useState('NBA');
  const [copied, setCopied] = useState(false);

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

  const formatAnalysisForCoding = (analysis: CrossReferenceAnalysisType): string => {
    const criticalDiscrepancies = analysis.detailedDiscrepancies.filter(d => d.severity === 'critical');
    const highDiscrepancies = analysis.detailedDiscrepancies.filter(d => d.severity === 'high');
    
    return `# Cross Reference Analysis Report - ${selectedSport}
Generated: ${new Date(analysis.lastUpdated).toISOString()}

## Summary Metrics
- Total Props Analyzed: ${analysis.totalPropsAnalyzed}
- Props with Discrepancies: ${analysis.propsWithDiscrepancies} (${((analysis.propsWithDiscrepancies / analysis.totalPropsAnalyzed) * 100).toFixed(1)}%)
- Average Line Difference: ${analysis.averageLineDifference.toFixed(2)} points
- Average Odds Difference: ${analysis.averageOddsDifference.toFixed(0)} points
- Sync Status: ${analysis.debugInfo.syncStatus.toUpperCase()}
- Our Accuracy: ${analysis.debugInfo.ourAccuracy.toFixed(1)}%
- Sportsbook Consistency: ${analysis.debugInfo.sportsbookConsistency.toFixed(1)}%

## Critical Issues (${criticalDiscrepancies.length} found)
${criticalDiscrepancies.length > 0 ? criticalDiscrepancies.map(d => 
`### ${d.playerName} - ${d.propType}
- Our Line: ${d.ourLine} | Sportsbook Line: ${d.sportsbookLine.toFixed(1)}
- Our Odds: ${d.ourOverOdds}/${d.ourUnderOdds} | Sportsbook Odds: ${d.sportsbookOverOdds}/${d.sportsbookUnderOdds}
- Line Difference: ${d.lineDifference.toFixed(2)} points
- Odds Difference: ${d.oddsDifference.toFixed(0)} points
- Action Required: ${d.suggestedAction}
`).join('\n') : 'No critical issues found.'}

## High Priority Issues (${highDiscrepancies.length} found)
${highDiscrepancies.length > 0 ? highDiscrepancies.map(d => 
`### ${d.playerName} - ${d.propType}
- Line Difference: ${d.lineDifference.toFixed(2)} points
- Odds Difference: ${d.oddsDifference.toFixed(0)} points
- Action: ${d.suggestedAction}
`).join('\n') : 'No high priority issues found.'}

## Recommended Fixes
${analysis.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## Code Implementation Priority
1. **IMMEDIATE (Critical Issues)**: Fix ${criticalDiscrepancies.length} critical discrepancies
2. **HIGH (Line Differences)**: ${analysis.averageLineDifference > 0.5 ? 'Update statistical models with recent data' : 'Line differences within acceptable range'}
3. **HIGH (Odds Differences)**: ${analysis.averageOddsDifference > 5 ? 'Implement proper vig/juice calculations' : 'Odds differences within acceptable range'}
4. **MEDIUM (Sync Status)**: ${analysis.debugInfo.syncStatus === 'outdated' ? 'Implement real-time sportsbook synchronization' : 'Sync status acceptable'}
5. **LOW (API Integration)**: Replace mock data with real sportsbook APIs

## Technical Implementation Notes
- Current mock data variations: ±0.5 points for lines, ±4 points for odds
- Discrepancy thresholds: 0.5 points for lines, 5 points for odds
- Severity levels: Low (<1), Medium (<3), High (<6), Critical (≥6)
- Sportsbooks included: FanDuel, DraftKings, BetMGM, Caesars, PointsBet

## Next Steps for Development Team
1. Review critical discrepancies above
2. Update statistical models if line differences > 0.5 points
3. Implement proper vig calculations if odds differences > 5 points
4. Set up real-time API integration with major sportsbooks
5. Add automated testing for discrepancy detection`;
  };

  const handleCopyAnalysis = async () => {
    if (!analysis) return;
    
    try {
      const formattedText = formatAnalysisForCoding(analysis);
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy analysis:', error);
    }
  };

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
              {analysis && (
                <Button
                  onClick={handleCopyAnalysis}
                  variant="outline"
                  className="bg-slate-800 hover:bg-slate-700 text-white border-slate-600"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy Report'}
                </Button>
              )}
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
