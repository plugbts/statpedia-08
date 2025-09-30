import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Share2, 
  Plus, 
  Minus, 
  DollarSign, 
  TrendingUp,
  Users,
  Eye,
  EyeOff,
  Star,
  Target
} from 'lucide-react';
import { betSlipSharingService, type BetSlipPick, type SharedBetSlip } from '@/services/bet-slip-sharing';
import { useToast } from '@/hooks/use-toast';

interface BetSlipSharerProps {
  userId: string;
  onBetSlipShared?: (betSlip: SharedBetSlip) => void;
}

export const BetSlipSharer: React.FC<BetSlipSharerProps> = ({ userId, onBetSlipShared }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stake, setStake] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myPicks, setMyPicks] = useState<BetSlipPick[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMyPicks();
  }, []);

  const loadMyPicks = async () => {
    try {
      // Load user's current picks from localStorage or API
      const savedPicks = localStorage.getItem('statpedia_my_picks');
      if (savedPicks) {
        const picks = JSON.parse(savedPicks);
        const betSlipPicks: BetSlipPick[] = picks.map((pick: any) => ({
          id: pick.prop.id,
          playerName: pick.prop.playerName,
          propType: pick.prop.propType,
          line: pick.prop.line,
          odds: pick.prop.odds,
          sport: pick.prop.sport,
          team: pick.prop.team,
          opponent: pick.prop.opponent,
          prediction: pick.prediction || 'over',
          confidence: pick.prop.hitRate || 50,
          evPercentage: pick.prop.evPercentage || 0,
          aiRating: pick.prop.aiRating || 3
        }));
        setMyPicks(betSlipPicks);
      }
    } catch (error) {
      console.error('Failed to load my picks:', error);
    }
  };

  const calculateTotalOdds = (picks: BetSlipPick[]): number => {
    return picks.reduce((total, pick) => {
      const decimalOdds = convertToDecimalOdds(pick.odds);
      return total * decimalOdds;
    }, 1);
  };

  const convertToDecimalOdds = (americanOdds: string): number => {
    const odds = parseInt(americanOdds);
    if (odds > 0) {
      return (odds / 100) + 1;
    } else {
      return (100 / Math.abs(odds)) + 1;
    }
  };

  const handleShareBetSlip = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for your bet slip",
        variant: "destructive"
      });
      return;
    }

    if (myPicks.length === 0) {
      toast({
        title: "Error",
        description: "Please add some picks to your bet slip",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const sharedBetSlip = await betSlipSharingService.shareBetSlip(
        userId,
        title.trim(),
        description.trim(),
        myPicks,
        stake,
        isPublic
      );

      toast({
        title: "Success",
        description: "Bet slip shared successfully!"
      });

      onBetSlipShared?.(sharedBetSlip);
      setIsOpen(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setStake(10);
      setIsPublic(true);
    } catch (error) {
      console.error('Failed to share bet slip:', error);
      toast({
        title: "Error",
        description: "Failed to share bet slip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOdds = calculateTotalOdds(myPicks);
  const potentialPayout = stake * totalOdds;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share Bet Slip
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Bet Slip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bet Slip Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., NBA Parlay - Warriors vs Lakers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Share your reasoning or analysis..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stake">Stake ($)</Label>
                <Input
                  id="stake"
                  type="number"
                  min="1"
                  max="10000"
                  value={stake}
                  onChange={(e) => setStake(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <Label htmlFor="public" className="flex items-center gap-2">
                    {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {isPublic ? 'Public' : 'Private'}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Picks Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your Picks ({myPicks.length})</h3>
              {myPicks.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Target className="w-3 h-3" />
                  {myPicks.length} Leg{myPicks.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {myPicks.length === 0 ? (
              <Card className="p-6 text-center">
                <div className="text-muted-foreground">
                  <Plus className="w-8 h-8 mx-auto mb-2" />
                  <p>No picks added yet</p>
                  <p className="text-sm">Add picks from the Player Props tab first</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {myPicks.map((pick, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {pick.playerName} {pick.propType}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pick.team} vs {pick.opponent}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">
                          {pick.prediction === 'over' ? 'O' : 'U'} {pick.line}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pick.odds}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Bet Slip Summary */}
          {myPicks.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Bet Slip Summary</h3>
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stake:</span>
                      <span className="font-medium">${stake}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Odds:</span>
                      <span className="font-medium">{totalOdds.toFixed(2)}x</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Potential Payout:</span>
                      <span className="font-bold text-green-600">${potentialPayout.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Profit:</span>
                      <span className="font-bold text-green-600">
                        +${(potentialPayout - stake).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShareBetSlip}
              disabled={isSubmitting || myPicks.length === 0 || !title.trim()}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share Bet Slip
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
