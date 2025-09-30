import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Calculator, 
  Target, 
  Calendar,
  DollarSign,
  TrendingUp,
  Info
} from 'lucide-react';
import { betTrackingService, type UserBankroll, type UserBet } from '@/services/bet-tracking-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BetEntryProps {
  bankrolls: UserBankroll[];
  selectedBankroll: UserBankroll | null;
  onBetCreated: () => void;
}

export const BetEntry: React.FC<BetEntryProps> = ({
  bankrolls,
  selectedBankroll,
  onBetCreated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showParlayLegs, setShowParlayLegs] = useState(false);
  const [parlayLegs, setParlayLegs] = useState<Array<{
    sport: string;
    game_date: string;
    home_team: string;
    away_team: string;
    bet_selection: string;
    odds: number;
  }>>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    bankroll_id: '',
    sportsbook_id: '',
    bet_type: 'single',
    bet_category: 'moneyline',
    sport: 'nfl',
    bet_amount: '',
    odds: '',
    game_date: '',
    home_team: '',
    away_team: '',
    bet_selection: '',
    used_statpedia: false,
    confidence_level: '',
    notes: '',
    tags: ''
  });

  const calculatePayout = () => {
    if (!formData.bet_amount || !formData.odds) return 0;
    return betTrackingService.calculatePayout(
      parseFloat(formData.bet_amount),
      parseFloat(formData.odds)
    );
  };

  const addParlayLeg = () => {
    setParlayLegs([...parlayLegs, {
      sport: 'nfl',
      game_date: '',
      home_team: '',
      away_team: '',
      bet_selection: '',
      odds: 0
    }]);
  };

  const updateParlayLeg = (index: number, field: string, value: string | number) => {
    const updatedLegs = [...parlayLegs];
    updatedLegs[index] = { ...updatedLegs[index], [field]: value };
    setParlayLegs(updatedLegs);
  };

  const removeParlayLeg = (index: number) => {
    setParlayLegs(parlayLegs.filter((_, i) => i !== index));
  };

  const calculateParlayOdds = () => {
    if (parlayLegs.length === 0) return 0;
    
    let combinedOdds = 1;
    parlayLegs.forEach(leg => {
      if (leg.odds > 0) {
        combinedOdds *= (leg.odds / 100) + 1;
      } else {
        combinedOdds *= (100 / Math.abs(leg.odds)) + 1;
      }
    });
    
    return (combinedOdds - 1) * 100;
  };

  const handleSubmit = async () => {
    if (!formData.bankroll_id || !formData.bet_amount || !formData.odds || !formData.game_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.bet_type === 'parlay' && parlayLegs.length < 2) {
      toast({
        title: "Error",
        description: "Parlay bets must have at least 2 legs",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const betData: Omit<UserBet, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        bankroll_id: formData.bankroll_id,
        sportsbook_id: formData.sportsbook_id || undefined,
        bet_type: formData.bet_type as any,
        bet_category: formData.bet_category as any,
        sport: formData.sport,
        bet_amount: parseFloat(formData.bet_amount),
        odds: parseFloat(formData.odds),
        potential_payout: calculatePayout(),
        game_date: formData.game_date,
        home_team: formData.home_team,
        away_team: formData.away_team,
        bet_selection: formData.bet_selection,
        bet_status: 'pending',
        actual_payout: 0,
        used_statpedia: formData.used_statpedia,
        confidence_level: formData.confidence_level ? parseInt(formData.confidence_level) : undefined,
        notes: formData.notes || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : undefined
      };

      const bet = await betTrackingService.createBet(betData);

      // Create parlay legs if it's a parlay bet
      if (formData.bet_type === 'parlay' && parlayLegs.length > 0) {
        const legsData = parlayLegs.map((leg, index) => ({
          bet_id: bet.id,
          leg_number: index + 1,
          sport: leg.sport,
          game_date: leg.game_date,
          home_team: leg.home_team,
          away_team: leg.away_team,
          bet_selection: leg.bet_selection,
          odds: leg.odds,
          leg_status: 'pending' as const
        }));

        await betTrackingService.createParlayLegs(legsData);
      }

      toast({
        title: "Success",
        description: "Bet created successfully"
      });

      // Reset form
      setFormData({
        bankroll_id: '',
        sportsbook_id: '',
        bet_type: 'single',
        bet_category: 'moneyline',
        sport: 'nfl',
        bet_amount: '',
        odds: '',
        game_date: '',
        home_team: '',
        away_team: '',
        bet_selection: '',
        used_statpedia: false,
        confidence_level: '',
        notes: '',
        tags: ''
      });
      setParlayLegs([]);
      setShowParlayLegs(false);
      onBetCreated();
    } catch (error: any) {
      console.error('Failed to create bet:', error);
      
      // Handle database errors gracefully
      if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        toast({
          title: "Database Not Ready",
          description: "Bet tracking tables are not yet created. Please try again later.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create bet",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Add New Bet</h3>
        <p className="text-sm text-muted-foreground">
          Track your sports bets and connect them to Statpedia predictions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Bet Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bankroll Selection */}
          <div>
            <Label htmlFor="bankroll_id">Bankroll *</Label>
            <Select
              value={formData.bankroll_id}
              onValueChange={(value) => setFormData({ ...formData, bankroll_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bankroll" />
              </SelectTrigger>
              <SelectContent>
                {bankrolls.map((bankroll) => (
                  <SelectItem key={bankroll.id} value={bankroll.id}>
                    {bankroll.bankroll_name} ({bankroll.current_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bet Type */}
          <div>
            <Label htmlFor="bet_type">Bet Type *</Label>
            <Select
              value={formData.bet_type}
              onValueChange={(value) => {
                setFormData({ ...formData, bet_type: value });
                setShowParlayLegs(value === 'parlay');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {betTrackingService.getBetTypeOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bet Category */}
          <div>
            <Label htmlFor="bet_category">Bet Category *</Label>
            <Select
              value={formData.bet_category}
              onValueChange={(value) => setFormData({ ...formData, bet_category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {betTrackingService.getBetCategoryOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sport */}
          <div>
            <Label htmlFor="sport">Sport *</Label>
            <Select
              value={formData.sport}
              onValueChange={(value) => setFormData({ ...formData, sport: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {betTrackingService.getSportOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bet Amount and Odds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bet_amount">Bet Amount *</Label>
              <Input
                id="bet_amount"
                type="number"
                step="0.01"
                value={formData.bet_amount}
                onChange={(e) => setFormData({ ...formData, bet_amount: e.target.value })}
                placeholder="100.00"
              />
            </div>
            <div>
              <Label htmlFor="odds">Odds *</Label>
              <Input
                id="odds"
                type="number"
                step="0.1"
                value={formData.odds}
                onChange={(e) => setFormData({ ...formData, odds: e.target.value })}
                placeholder="+150 or -110"
              />
            </div>
          </div>

          {/* Payout Calculation */}
          {formData.bet_amount && formData.odds && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <span className="font-medium">Payout Calculation</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Potential Payout: <span className="font-semibold text-foreground">
                  {calculatePayout().toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
              </div>
            </div>
          )}

          {/* Game Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="home_team">Home Team *</Label>
              <Input
                id="home_team"
                value={formData.home_team}
                onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                placeholder="Kansas City Chiefs"
              />
            </div>
            <div>
              <Label htmlFor="away_team">Away Team *</Label>
              <Input
                id="away_team"
                value={formData.away_team}
                onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                placeholder="Buffalo Bills"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="game_date">Game Date *</Label>
            <Input
              id="game_date"
              type="datetime-local"
              value={formData.game_date}
              onChange={(e) => setFormData({ ...formData, game_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="bet_selection">Bet Selection *</Label>
            <Input
              id="bet_selection"
              value={formData.bet_selection}
              onChange={(e) => setFormData({ ...formData, bet_selection: e.target.value })}
              placeholder="Chiefs -3.5, Over 45.5, Chiefs ML"
            />
          </div>

          {/* Statpedia Integration */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="used_statpedia"
                checked={formData.used_statpedia}
                onCheckedChange={(checked) => setFormData({ ...formData, used_statpedia: !!checked })}
              />
              <Label htmlFor="used_statpedia" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Used Statpedia Prediction
              </Label>
            </div>

            {formData.used_statpedia && (
              <div>
                <Label htmlFor="confidence_level">Confidence Level (1-10)</Label>
                <Input
                  id="confidence_level"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.confidence_level}
                  onChange={(e) => setFormData({ ...formData, confidence_level: e.target.value })}
                  placeholder="8"
                />
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this bet..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="nfl, playoffs, primetime"
            />
          </div>

          {/* Parlay Legs */}
          {showParlayLegs && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Parlay Legs</h4>
                <Button size="sm" onClick={addParlayLeg}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Leg
                </Button>
              </div>

              {parlayLegs.map((leg, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Leg {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeParlayLeg(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Home Team</Label>
                          <Input
                            value={leg.home_team}
                            onChange={(e) => updateParlayLeg(index, 'home_team', e.target.value)}
                            placeholder="Kansas City Chiefs"
                          />
                        </div>
                        <div>
                          <Label>Away Team</Label>
                          <Input
                            value={leg.away_team}
                            onChange={(e) => updateParlayLeg(index, 'away_team', e.target.value)}
                            placeholder="Buffalo Bills"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Bet Selection</Label>
                          <Input
                            value={leg.bet_selection}
                            onChange={(e) => updateParlayLeg(index, 'bet_selection', e.target.value)}
                            placeholder="Chiefs -3.5"
                          />
                        </div>
                        <div>
                          <Label>Odds</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={leg.odds}
                            onChange={(e) => updateParlayLeg(index, 'odds', parseFloat(e.target.value) || 0)}
                            placeholder="+150"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {parlayLegs.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm">
                    Combined Parlay Odds: <span className="font-semibold">
                      {betTrackingService.formatOdds(calculateParlayOdds())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? 'Creating Bet...' : 'Create Bet'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
