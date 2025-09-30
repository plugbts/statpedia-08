import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Shield, 
  Target, 
  BarChart3,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerAnalysisOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    team: string;
    position: string;
    headshot?: string;
    stats: {
      points: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      turnovers: number;
      minutes: number;
      efficiency: number;
    };
    injuryStatus: 'healthy' | 'questionable' | 'doubtful' | 'out';
    injuryDetails?: string;
    recentForm: 'hot' | 'cold' | 'average';
    matchupAdvantage: 'strong' | 'neutral' | 'weak';
  };
}

interface InjuryReport {
  id: string;
  playerName: string;
  team: string;
  position: string;
  injuryType: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'questionable' | 'doubtful' | 'out';
  impact: 'low' | 'medium' | 'high';
  expectedReturn: string;
}

interface AdvancedStats {
  per36: {
    points: number;
    rebounds: number;
    assists: number;
  };
  efficiency: {
    offensive: number;
    defensive: number;
    net: number;
  };
  shooting: {
    fg: number;
    fg3: number;
    ft: number;
    efg: number;
  };
  advanced: {
    usage: number;
    pace: number;
    ortg: number;
    drtg: number;
  };
}

interface MatchupStats {
  position: string;
  opponent: string;
  gamesPlayed: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  efficiency: number;
  winRate: number;
  lastMeeting: {
    date: string;
    points: number;
    rebounds: number;
    assists: number;
    result: 'win' | 'loss';
  };
}

export const PlayerAnalysisOverlay: React.FC<PlayerAnalysisOverlayProps> = ({
  isOpen,
  onClose,
  player
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showInjuredPlayers, setShowInjuredPlayers] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>([]);

  // Mock data - in real app, this would come from API
  const injuryReports: InjuryReport[] = [
    {
      id: '1',
      playerName: 'LeBron James',
      team: 'LAL',
      position: 'F',
      injuryType: 'Ankle Sprain',
      severity: 'minor',
      status: 'questionable',
      impact: 'medium',
      expectedReturn: '2-3 days'
    },
    {
      id: '2',
      playerName: 'Anthony Davis',
      team: 'LAL',
      position: 'F/C',
      injuryType: 'Knee Soreness',
      severity: 'moderate',
      status: 'doubtful',
      impact: 'high',
      expectedReturn: '1-2 weeks'
    },
    {
      id: '3',
      playerName: 'Stephen Curry',
      team: 'GSW',
      position: 'G',
      injuryType: 'Shoulder Strain',
      severity: 'minor',
      status: 'questionable',
      impact: 'low',
      expectedReturn: '3-5 days'
    }
  ];

  const advancedStats: AdvancedStats = {
    per36: {
      points: 28.4,
      rebounds: 8.2,
      assists: 6.8
    },
    efficiency: {
      offensive: 118.5,
      defensive: 112.3,
      net: 6.2
    },
    shooting: {
      fg: 0.487,
      fg3: 0.342,
      ft: 0.856,
      efg: 0.558
    },
    advanced: {
      usage: 28.5,
      pace: 102.3,
      ortg: 118.5,
      drtg: 112.3
    }
  };

  const matchupStats: MatchupStats[] = [
    {
      position: 'G',
      opponent: 'Point Guards',
      gamesPlayed: 12,
      avgPoints: 24.8,
      avgRebounds: 5.2,
      avgAssists: 7.1,
      efficiency: 22.3,
      winRate: 0.75,
      lastMeeting: {
        date: '2024-01-15',
        points: 28,
        rebounds: 6,
        assists: 8,
        result: 'win'
      }
    },
    {
      position: 'F',
      opponent: 'Forwards',
      gamesPlayed: 15,
      avgPoints: 22.1,
      avgRebounds: 7.8,
      avgAssists: 5.9,
      efficiency: 19.7,
      winRate: 0.67,
      lastMeeting: {
        date: '2024-01-12',
        points: 25,
        rebounds: 8,
        assists: 6,
        result: 'win'
      }
    },
    {
      position: 'C',
      opponent: 'Centers',
      gamesPlayed: 8,
      avgPoints: 18.5,
      avgRebounds: 9.2,
      avgAssists: 4.1,
      efficiency: 16.8,
      winRate: 0.50,
      lastMeeting: {
        date: '2024-01-10',
        points: 20,
        rebounds: 10,
        assists: 3,
        result: 'loss'
      }
    }
  ];

  const getPerformanceColor = (value: number, thresholds: { good: number; bad: number }) => {
    if (value >= thresholds.good) return 'text-green-500 bg-green-500/10';
    if (value <= thresholds.bad) return 'text-red-500 bg-red-500/10';
    return 'text-yellow-500 bg-yellow-500/10';
  };

  const getInjuryColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-500/10';
      case 'questionable': return 'text-yellow-500 bg-yellow-500/10';
      case 'doubtful': return 'text-orange-500 bg-orange-500/10';
      case 'out': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'severe': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const toggleInjury = (injuryId: string) => {
    setSelectedInjuries(prev => 
      prev.includes(injuryId) 
        ? prev.filter(id => id !== injuryId)
        : [...prev, injuryId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/10 to-accent/10 p-6 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-primary/20">
              <AvatarImage src={player.headshot} alt={player.name} />
              <AvatarFallback className="text-2xl font-bold">
                {player.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground">{player.name}</h2>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {player.team} • {player.position}
                </Badge>
                <Badge className={cn("text-lg px-3 py-1", getInjuryColor(player.injuryStatus))}>
                  {player.injuryStatus.toUpperCase()}
                </Badge>
                <Badge className={cn(
                  "text-lg px-3 py-1",
                  player.recentForm === 'hot' ? 'bg-green-500/20 text-green-600' :
                  player.recentForm === 'cold' ? 'bg-red-500/20 text-red-600' :
                  'bg-yellow-500/20 text-yellow-600'
                )}>
                  {player.recentForm.toUpperCase()}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full hover:bg-muted/50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="injuries" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Injuries
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="matchups" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Matchups
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(player.stats).map(([key, value]) => (
                  <Card key={key} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground capitalize">{key}</p>
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                      </div>
                      <div className={cn(
                        "p-2 rounded-full",
                        getPerformanceColor(value, { good: 20, bad: 10 })
                      )}>
                        {value >= 20 ? <TrendingUp className="w-5 h-5" /> :
                         value <= 10 ? <TrendingDown className="w-5 h-5" /> :
                         <Minus className="w-5 h-5" />}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* 3D Performance Chart */}
              <Card className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-4 relative">
                        {/* 3D Chart Placeholder - would be replaced with actual chart library */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full transform rotate-45"></div>
                        <div className="absolute inset-2 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full transform -rotate-45"></div>
                        <div className="absolute inset-4 bg-gradient-to-br from-primary/60 to-accent/60 rounded-full transform rotate-12"></div>
                      </div>
                      <p className="text-muted-foreground">Interactive 3D Performance Chart</p>
                      <p className="text-sm text-muted-foreground">Hover to explore data points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Injuries Tab */}
            <TabsContent value="injuries" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showInjuredPlayers}
                      onCheckedChange={setShowInjuredPlayers}
                    />
                    <Label>Show Injured Players</Label>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {injuryReports.length} Active Injuries
                  </Badge>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {injuryReports.map((injury) => (
                  <Card 
                    key={injury.id} 
                    className={cn(
                      "p-4 cursor-pointer transition-all hover:shadow-lg",
                      selectedInjuries.includes(injury.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => toggleInjury(injury.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{injury.playerName}</h4>
                        <p className="text-sm text-muted-foreground">{injury.team} • {injury.position}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedInjuries.includes(injury.id) ? (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Injury</span>
                        <Badge className={cn("text-xs", getInjuryColor(injury.status))}>
                          {injury.injuryType}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Severity</span>
                        <span className={cn("text-sm font-medium", getSeverityColor(injury.severity))}>
                          {injury.severity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Impact</span>
                        <span className={cn(
                          "text-sm font-medium",
                          injury.impact === 'high' ? 'text-red-500' :
                          injury.impact === 'medium' ? 'text-yellow-500' :
                          'text-green-500'
                        )}>
                          {injury.impact}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Return</span>
                        <span className="text-sm font-medium">{injury.expectedReturn}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Advanced Stats Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Per 36 Stats */}
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Per 36 Minutes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(advancedStats.per36).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{key}</span>
                        <span className="text-lg font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Efficiency Stats */}
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Efficiency Ratings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(advancedStats.efficiency).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{key}</span>
                        <span className={cn(
                          "text-lg font-semibold",
                          getPerformanceColor(value, { good: 115, bad: 105 })
                        )}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Shooting Stats */}
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Shooting Percentages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(advancedStats.shooting).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground uppercase">{key}</span>
                        <span className={cn(
                          "text-lg font-semibold",
                          getPerformanceColor(value * 100, { good: 50, bad: 35 })
                        )}>
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Advanced Metrics */}
                <Card className="p-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Advanced Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(advancedStats.advanced).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground uppercase">{key}</span>
                        <span className="text-lg font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Matchups Tab */}
            <TabsContent value="matchups" className="space-y-6">
              <div className="flex items-center gap-4">
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="G">Guards</SelectItem>
                    <SelectItem value="F">Forwards</SelectItem>
                    <SelectItem value="C">Centers</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">
                  {matchupStats.filter(m => selectedPosition === 'all' || m.position === selectedPosition).length} Matchups
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchupStats
                  .filter(matchup => selectedPosition === 'all' || matchup.position === selectedPosition)
                  .map((matchup, index) => (
                    <Card key={index} className="p-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          vs {matchup.opponent}
                        </CardTitle>
                        <Badge variant="outline" className="w-fit">
                          {matchup.gamesPlayed} games
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{matchup.avgPoints}</p>
                            <p className="text-sm text-muted-foreground">Avg Points</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{matchup.avgRebounds}</p>
                            <p className="text-sm text-muted-foreground">Avg Rebounds</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{matchup.avgAssists}</p>
                            <p className="text-sm text-muted-foreground">Avg Assists</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{matchup.efficiency}</p>
                            <p className="text-sm text-muted-foreground">Efficiency</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm text-muted-foreground">Win Rate</span>
                          <span className={cn(
                            "text-lg font-semibold",
                            getPerformanceColor(matchup.winRate * 100, { good: 70, bad: 40 })
                          )}>
                            {(matchup.winRate * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <p>Last Meeting: {matchup.lastMeeting.date}</p>
                          <p className="flex items-center gap-1">
                            {matchup.lastMeeting.result === 'win' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <X className="w-4 h-4 text-red-500" />
                            )}
                            {matchup.lastMeeting.points}P / {matchup.lastMeeting.rebounds}R / {matchup.lastMeeting.assists}A
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
