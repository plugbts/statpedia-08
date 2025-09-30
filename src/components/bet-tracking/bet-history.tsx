import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  Calendar,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { betTrackingService, type UserBankroll, type UserBet } from '@/services/bet-tracking-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BetHistoryProps {
  selectedBankroll: UserBankroll | null;
  onBetUpdate: () => void;
}

export const BetHistory: React.FC<BetHistoryProps> = ({
  selectedBankroll,
  onBetUpdate
}) => {
  const [bets, setBets] = useState<UserBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (selectedBankroll) {
      loadBets();
    }
  }, [selectedBankroll, statusFilter]);

  const loadBets = async () => {
    if (!selectedBankroll) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const betsData = await betTrackingService.getUserBets(user.id, selectedBankroll.id, 100);
      
      // Filter by status
      let filteredBets = betsData;
      if (statusFilter !== 'all') {
        filteredBets = betsData.filter(bet => bet.bet_status === statusFilter);
      }

      setBets(filteredBets);
    } catch (error) {
      console.error('Failed to load bets:', error);
      toast({
        title: "Error",
        description: "Failed to load bet history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettleBet = async (betId: string, status: 'won' | 'lost' | 'push') => {
    try {
      const payout = status === 'won' ? bets.find(b => b.id === betId)?.potential_payout || 0 : 0;
      await betTrackingService.settleBet(betId, status, payout);
      
      toast({
        title: "Success",
        description: `Bet marked as ${status}`
      });
      
      onBetUpdate();
      loadBets();
    } catch (error) {
      console.error('Failed to settle bet:', error);
      toast({
        title: "Error",
        description: "Failed to settle bet",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'lost': return <TrendingDown className="w-4 h-4 text-destructive" />;
      case 'push': return <Minus className="w-4 h-4 text-muted-foreground" />;
      default: return <Calendar className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won': return <Badge variant="default" className="bg-success">Won</Badge>;
      case 'lost': return <Badge variant="destructive">Lost</Badge>;
      case 'push': return <Badge variant="secondary">Push</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
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
          <h3 className="text-lg font-semibold">Bet History</h3>
          <p className="text-sm text-muted-foreground">
            View and manage your betting history
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="push">Push</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadBets} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {bets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <History className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No bets found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'all' 
                ? 'Start tracking your bets to see them here'
                : `No ${statusFilter} bets found`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bets.map((bet) => (
            <Card key={bet.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(bet.bet_status)}
                      <span className="font-medium">{bet.home_team} vs {bet.away_team}</span>
                      {getStatusBadge(bet.bet_status)}
                      {bet.used_statpedia && (
                        <Badge variant="outline" className="text-primary">
                          <Target className="w-3 h-3 mr-1" />
                          Statpedia
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div>{bet.bet_selection}</div>
                      <div className="flex items-center gap-4 mt-1">
                        <span>{bet.sport.toUpperCase()} • {bet.bet_type}</span>
                        <span>{betTrackingService.formatOdds(bet.odds)}</span>
                        <span>{formatDate(bet.game_date)}</span>
                      </div>
                    </div>

                    {bet.notes && (
                      <div className="text-sm text-muted-foreground italic">
                        "{bet.notes}"
                      </div>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-semibold">
                      {formatCurrency(bet.bet_amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Potential: {formatCurrency(bet.potential_payout)}
                    </div>
                    {bet.bet_status !== 'pending' && (
                      <div className={`text-sm font-medium ${
                        bet.bet_status === 'won' ? 'text-success' : 
                        bet.bet_status === 'lost' ? 'text-destructive' : 
                        'text-muted-foreground'
                      }`}>
                        {bet.bet_status === 'won' ? `+${formatCurrency(bet.actual_payout - bet.bet_amount)}` :
                         bet.bet_status === 'lost' ? `-${formatCurrency(bet.bet_amount)}` :
                         'Push'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Settlement Actions for Pending Bets */}
                {bet.bet_status === 'pending' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSettleBet(bet.id, 'won')}
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Won
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSettleBet(bet.id, 'lost')}
                    >
                      <TrendingDown className="w-4 h-4 mr-1" />
                      Lost
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSettleBet(bet.id, 'push')}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Push
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
