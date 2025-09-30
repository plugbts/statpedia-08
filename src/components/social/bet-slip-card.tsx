import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Heart, 
  Share2,
  Target,
  DollarSign,
  Star,
  Copy,
  Check
} from 'lucide-react';
import { betSlipSharingService, type SharedBetSlip, type BetSlipTail } from '@/services/bet-slip-sharing';
import { useToast } from '@/hooks/use-toast';

interface BetSlipCardProps {
  betSlip: SharedBetSlip;
  currentUserId?: string;
  onTail?: (betSlipId: string) => void;
  onLike?: (betSlipId: string) => void;
}

export const BetSlipCard: React.FC<BetSlipCardProps> = ({ 
  betSlip, 
  currentUserId,
  onTail,
  onLike 
}) => {
  const [isTailing, setIsTailing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showTails, setShowTails] = useState(false);
  const [tails, setTails] = useState<BetSlipTail[]>([]);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleTail = async () => {
    if (!currentUserId) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to tail bet slips",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsTailing(true);
      await betSlipSharingService.tailBetSlip(betSlip.id, currentUserId, 10); // Default stake
      
      toast({
        title: "Success",
        description: "Bet slip tailed! Picks added to your My Picks tab."
      });
      
      onTail?.(betSlip.id);
    } catch (error) {
      console.error('Failed to tail bet slip:', error);
      toast({
        title: "Error",
        description: "Failed to tail bet slip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTailing(false);
    }
  };

  const handleLike = async () => {
    try {
      setIsLiking(true);
      await betSlipSharingService.likeBetSlip(betSlip.id, currentUserId || '');
      onLike?.(betSlip.id);
    } catch (error) {
      console.error('Failed to like bet slip:', error);
      toast({
        title: "Error",
        description: "Failed to like bet slip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleShowTails = async () => {
    if (tails.length === 0) {
      try {
        const tailData = await betSlipSharingService.getBetSlipTails(betSlip.id);
        setTails(tailData);
      } catch (error) {
        console.error('Failed to load tails:', error);
      }
    }
    setShowTails(!showTails);
  };

  const handleCopyBetSlip = async () => {
    try {
      const betSlipText = `${betSlip.title}\n\n${betSlip.picks.map(pick => 
        `${pick.playerName} ${pick.propType} ${pick.prediction === 'over' ? 'O' : 'U'} ${pick.line} (${pick.odds})`
      ).join('\n')}\n\nTotal Odds: ${betSlip.totalOdds.toFixed(2)}x\nPotential Payout: $${betSlip.potentialPayout.toFixed(2)}`;
      
      await navigator.clipboard.writeText(betSlipText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Copied",
        description: "Bet slip copied to clipboard"
      });
    } catch (error) {
      console.error('Failed to copy bet slip:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={betSlip.userAvatar} />
              <AvatarFallback>
                {getInitials(betSlip.userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm">{betSlip.userName}</div>
              <div className="text-xs text-muted-foreground">
                {formatTimeAgo(betSlip.createdAt)}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Target className="w-3 h-3" />
            {betSlip.picks.length} Leg{betSlip.picks.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bet Slip Title and Description */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{betSlip.title}</h3>
          {betSlip.description && (
            <p className="text-sm text-muted-foreground">{betSlip.description}</p>
          )}
        </div>

        {/* Picks */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Picks:</h4>
          <div className="space-y-2">
            {betSlip.picks.map((pick, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
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
                    {pick.prediction === 'over' ? (
                      <span className="text-green-600">O {pick.line}</span>
                    ) : (
                      <span className="text-red-600">U {pick.line}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pick.odds}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bet Slip Summary */}
        <Card className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                Stake
              </div>
              <div className="font-bold">${betSlip.stake}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                Total Odds
              </div>
              <div className="font-bold">{betSlip.totalOdds.toFixed(2)}x</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Target className="w-3 h-3" />
                Potential Payout
              </div>
              <div className="font-bold text-green-600">${betSlip.potentialPayout.toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="w-3 h-3" />
                Profit
              </div>
              <div className="font-bold text-green-600">
                +${(betSlip.potentialPayout - betSlip.stake).toFixed(2)}
              </div>
            </div>
          </div>
        </Card>

        {/* Engagement Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={`gap-1 ${betSlip.isLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-4 h-4 ${betSlip.isLiked ? 'fill-current' : ''}`} />
              {betSlip.likeCount}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowTails}
              className="gap-1"
            >
              <Users className="w-4 h-4" />
              {betSlip.tailCount} Tail{betSlip.tailCount !== 1 ? 's' : ''}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyBetSlip}
              className="gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy
            </Button>
            
            <Button
              onClick={handleTail}
              disabled={isTailing || betSlip.isTailed || betSlip.userId === currentUserId}
              className="gap-1"
            >
              {isTailing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Tailing...
                </>
              ) : betSlip.isTailed ? (
                <>
                  <Check className="w-4 h-4" />
                  Tailed
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Tail
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tails List */}
        {showTails && tails.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">People Tailing:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {tails.map((tail) => (
                  <div key={tail.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={tail.userAvatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(tail.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{tail.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        ${tail.stake} • {formatTimeAgo(tail.tailedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
