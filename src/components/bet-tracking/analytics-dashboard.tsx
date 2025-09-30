import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  DollarSign,
  PieChart,
  Activity
} from 'lucide-react';
import { type BettingStats, type MonthlyAnalytics, type UserBankroll } from '@/services/bet-tracking-service';

interface AnalyticsDashboardProps {
  stats: BettingStats | null;
  monthlyAnalytics: MonthlyAnalytics[];
  selectedBankroll: UserBankroll | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats,
  monthlyAnalytics,
  selectedBankroll
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getBestMonth = () => {
    if (monthlyAnalytics.length === 0) return null;
    return monthlyAnalytics.reduce((best, current) => 
      current.net_profit > best.net_profit ? current : best
    );
  };

  const getWorstMonth = () => {
    if (monthlyAnalytics.length === 0) return null;
    return monthlyAnalytics.reduce((worst, current) => 
      current.net_profit < worst.net_profit ? current : worst
    );
  };

  const calculateAverageMonthlyROI = () => {
    if (monthlyAnalytics.length === 0) return 0;
    const totalROI = monthlyAnalytics.reduce((sum, month) => sum + month.roi_percentage, 0);
    return totalROI / monthlyAnalytics.length;
  };

  const calculateStatpediaImprovement = () => {
    if (!stats || stats.statpedia_bets === 0) return 0;
    return stats.statpedia_win_percentage - stats.win_percentage;
  };

  const bestMonth = getBestMonth();
  const worstMonth = getWorstMonth();
  const averageROI = calculateAverageMonthlyROI();
  const statpediaImprovement = calculateStatpediaImprovement();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
        <p className="text-sm text-muted-foreground">
          Comprehensive analysis of your betting performance and Statpedia impact
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatPercentage(stats?.win_percentage || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.won_bets || 0} of {stats?.total_bets || 0} bets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.roi_percentage || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatPercentage(stats?.roi_percentage || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Net: {formatCurrency(stats?.net_profit || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Statpedia Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatPercentage(stats?.statpedia_win_percentage || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.statpedia_wins || 0} of {stats?.statpedia_bets || 0} Statpedia bets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statpediaImprovement >= 0 ? 'text-success' : 'text-destructive'}`}>
              {statpediaImprovement >= 0 ? '+' : ''}{formatPercentage(statpediaImprovement)}
            </div>
            <p className="text-xs text-muted-foreground">
              With Statpedia vs without
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly Performance
          </CardTitle>
          <CardDescription>
            Track your performance over time and identify trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyAnalytics.length > 0 ? (
            <div className="space-y-4">
              {/* Monthly Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <div className="text-lg font-bold text-success">
                    {bestMonth ? formatCurrency(bestMonth.net_profit) : '$0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Best Month</div>
                  {bestMonth && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(bestMonth.year, bestMonth.month - 1).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                  )}
                </div>

                <div className="text-center p-3 bg-destructive/10 rounded-lg">
                  <div className="text-lg font-bold text-destructive">
                    {worstMonth ? formatCurrency(worstMonth.net_profit) : '$0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Worst Month</div>
                  {worstMonth && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(worstMonth.year, worstMonth.month - 1).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                  )}
                </div>

                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {formatPercentage(averageROI)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Monthly ROI</div>
                  <div className="text-xs text-muted-foreground">
                    Over {monthlyAnalytics.length} months
                  </div>
                </div>
              </div>

              {/* Monthly Details */}
              <div className="space-y-3">
                {monthlyAnalytics.slice(0, 6).map((analytics) => (
                  <div key={analytics.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {new Date(analytics.year, analytics.month - 1).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {analytics.total_bets} bets • {formatPercentage(analytics.win_percentage)} win rate
                      </div>
                      {analytics.statpedia_bets > 0 && (
                        <div className="text-xs text-primary">
                          {analytics.statpedia_bets} Statpedia bets ({formatPercentage(analytics.statpedia_win_percentage)} win rate)
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${analytics.net_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(analytics.net_profit)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(analytics.roi_percentage)} ROI
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No monthly data available</p>
              <p className="text-sm text-muted-foreground">Start tracking bets to see monthly analytics</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statpedia Impact Analysis */}
      {stats && stats.statpedia_bets > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Statpedia Impact Analysis
            </CardTitle>
            <CardDescription>
              How Statpedia predictions have improved your betting performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Performance Comparison</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overall Win Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPercentage(stats.win_percentage)}</span>
                      <Badge variant="outline">All Bets</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Statpedia Win Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">{formatPercentage(stats.statpedia_win_percentage)}</span>
                      <Badge variant="default" className="bg-primary">Statpedia</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Improvement</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${statpediaImprovement >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {statpediaImprovement >= 0 ? '+' : ''}{formatPercentage(statpediaImprovement)}
                      </span>
                      {statpediaImprovement >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Betting Volume</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Bets</span>
                    <span className="font-medium">{stats.total_bets}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Statpedia Bets</span>
                    <span className="font-medium text-primary">{stats.statpedia_bets}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Statpedia Usage</span>
                    <span className="font-bold">
                      {((stats.statpedia_bets / stats.total_bets) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="mt-6 p-4 bg-primary/5 rounded-lg">
              <h4 className="font-medium mb-2">Impact Summary</h4>
              <p className="text-sm text-muted-foreground">
                {statpediaImprovement >= 0 ? (
                  <>
                    Using Statpedia predictions has improved your win rate by{' '}
                    <span className="font-semibold text-success">{formatPercentage(statpediaImprovement)}</span>.
                    You've used Statpedia for{' '}
                    <span className="font-semibold">{stats.statpedia_bets}</span> of your{' '}
                    <span className="font-semibold">{stats.total_bets}</span> total bets.
                  </>
                ) : (
                  <>
                    Your Statpedia win rate is currently{' '}
                    <span className="font-semibold text-destructive">{formatPercentage(Math.abs(statpediaImprovement))}</span> lower
                    than your overall win rate. Consider reviewing your Statpedia usage patterns.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recommendations
          </CardTitle>
          <CardDescription>
            Tips to improve your betting performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats && stats.win_percentage < 50 && (
              <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg">
                <Target className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <div className="font-medium">Improve Win Rate</div>
                  <div className="text-sm text-muted-foreground">
                    Your current win rate is below 50%. Consider using more Statpedia predictions
                    and focusing on higher-confidence bets.
                  </div>
                </div>
              </div>
            )}

            {stats && stats.statpedia_bets === 0 && (
              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">Start Using Statpedia</div>
                  <div className="text-sm text-muted-foreground">
                    You haven't used any Statpedia predictions yet. Try connecting your bets
                    to Statpedia predictions to improve your win rate.
                  </div>
                </div>
              </div>
            )}

            {stats && stats.statpedia_bets > 0 && statpediaImprovement < 0 && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <div className="font-medium">Review Statpedia Usage</div>
                  <div className="text-sm text-muted-foreground">
                    Your Statpedia bets are performing worse than your overall average.
                    Consider reviewing which predictions you're following and your bet sizing.
                  </div>
                </div>
              </div>
            )}

            {monthlyAnalytics.length >= 3 && averageROI < 0 && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <div className="font-medium">Negative ROI Trend</div>
                  <div className="text-sm text-muted-foreground">
                    Your average monthly ROI is negative. Consider reducing bet sizes
                    and focusing on higher-confidence opportunities.
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
