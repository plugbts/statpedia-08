import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  BarChart3, 
  Plus,
  Wallet,
  Trophy,
  Calendar,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { betTrackingService, type UserBankroll, type BettingStats, type MonthlyAnalytics } from '@/services/bet-tracking-service';
import { BankrollManagement } from './bankroll-management';
import { BetEntry } from './bet-entry';
import { BetHistory } from './bet-history';
import { SportsbookConnections } from './sportsbook-connections';
import { AnalyticsDashboard } from './analytics-dashboard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BetTrackingTabProps {
  userRole: string;
}

export const BetTrackingTab: React.FC<BetTrackingTabProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [bankrolls, setBankrolls] = useState<UserBankroll[]>([]);
  const [selectedBankroll, setSelectedBankroll] = useState<UserBankroll | null>(null);
  const [stats, setStats] = useState<BettingStats | null>(null);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<MonthlyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bankrollsData, statsData, analyticsData] = await Promise.all([
        betTrackingService.getUserBankrolls(user.id),
        betTrackingService.getBettingStats(user.id),
        betTrackingService.getMonthlyAnalytics(user.id)
      ]);

      setBankrolls(bankrollsData);
      setStats(statsData);
      setMonthlyAnalytics(analyticsData);

      if (bankrollsData.length > 0 && !selectedBankroll) {
        setSelectedBankroll(bankrollsData[0]);
      }
    } catch (error: any) {
      console.error('Failed to load bet tracking data:', error);
      
      // Handle database errors gracefully
      if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        console.log('Bet tracking tables not yet created, showing empty state');
        setBankrolls([]);
        setStats({
          total_bets: 0,
          won_bets: 0,
          lost_bets: 0,
          push_bets: 0,
          total_wagered: 0,
          total_won: 0,
          net_profit: 0,
          win_percentage: 0,
          roi_percentage: 0,
          statpedia_bets: 0,
          statpedia_wins: 0,
          statpedia_win_percentage: 0
        });
        setMonthlyAnalytics([]);
      } else {
        toast({
          title: "Error",
          description: "Failed to load bet tracking data",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankrollChange = async (bankroll: UserBankroll) => {
    setSelectedBankroll(bankroll);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [statsData, analyticsData] = await Promise.all([
        betTrackingService.getBettingStats(user.id, bankroll.id),
        betTrackingService.getMonthlyAnalytics(user.id, bankroll.id)
      ]);

      setStats(statsData);
      setMonthlyAnalytics(analyticsData);
    } catch (error: any) {
      console.error('Failed to load bankroll data:', error);
      
      // Handle database errors gracefully
      if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        console.log('Bet tracking tables not yet created for bankroll change');
        setStats({
          total_bets: 0,
          won_bets: 0,
          lost_bets: 0,
          push_bets: 0,
          total_wagered: 0,
          total_won: 0,
          net_profit: 0,
          win_percentage: 0,
          roi_percentage: 0,
          statpedia_bets: 0,
          statpedia_wins: 0,
          statpedia_win_percentage: 0
        });
        setMonthlyAnalytics([]);
      } else {
        toast({
          title: "Error",
          description: "Failed to load bankroll data",
          variant: "destructive"
        });
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bet Tracking</h2>
          <p className="text-muted-foreground">
            Track your sports bets, bankroll, and performance analytics
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Bankroll Selector */}
      {bankrolls.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Bankroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {bankrolls.map((bankroll) => (
                <Button
                  key={bankroll.id}
                  variant={selectedBankroll?.id === bankroll.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleBankrollChange(bankroll)}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {bankroll.bankroll_name}
                  <Badge variant="secondary" className="ml-2">
                    {formatCurrency(bankroll.current_amount)}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bankroll">Bankroll</TabsTrigger>
          <TabsTrigger value="bets">Bets</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="connections">Sportsbooks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_bets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.won_bets || 0} won, {stats?.lost_bets || 0} lost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatPercentage(stats?.win_percentage || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.statpedia_bets ? `${formatPercentage(stats.statpedia_win_percentage)} with Statpedia` : 'No Statpedia bets yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ROI</CardTitle>
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
                <CardTitle className="text-sm font-medium">Total Wagered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.total_wagered || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Won: {formatCurrency(stats?.total_won || 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Statpedia Impact */}
          {stats && stats.statpedia_bets > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Statpedia Impact
                </CardTitle>
                <CardDescription>
                  Your performance improvement using Statpedia predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {formatPercentage(stats.statpedia_win_percentage)}
                    </div>
                    <p className="text-sm text-muted-foreground">Statpedia Win Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-success">
                      {formatPercentage(stats.statpedia_win_percentage - stats.win_percentage)}
                    </div>
                    <p className="text-sm text-muted-foreground">Improvement</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {stats.statpedia_bets}
                    </div>
                    <p className="text-sm text-muted-foreground">Statpedia Bets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest betting activity and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyAnalytics.length > 0 ? (
                <div className="space-y-4">
                  {monthlyAnalytics.slice(0, 3).map((analytics) => (
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
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No betting data yet</p>
                  <p className="text-sm text-muted-foreground">Start tracking your bets to see analytics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bankroll" className="space-y-4">
          <BankrollManagement 
            bankrolls={bankrolls} 
            onBankrollUpdate={loadData}
            selectedBankroll={selectedBankroll}
            onBankrollSelect={setSelectedBankroll}
          />
        </TabsContent>

        <TabsContent value="bets" className="space-y-4">
          <BetEntry 
            bankrolls={bankrolls}
            selectedBankroll={selectedBankroll}
            onBetCreated={loadData}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <BetHistory 
            selectedBankroll={selectedBankroll}
            onBetUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <SportsbookConnections onConnectionUpdate={loadData} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard 
            stats={stats}
            monthlyAnalytics={monthlyAnalytics}
            selectedBankroll={selectedBankroll}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
