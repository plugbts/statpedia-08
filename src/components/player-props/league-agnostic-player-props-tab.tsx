import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  leagueAgnosticPlayerPropsService,
  LeagueStats,
} from "@/services/league-agnostic-player-props-service";
import { NormalizedPlayerProp } from "@/services/hasura-player-props-normalized-service";
import { EnhancedPlayerPropCard } from "./enhanced-player-prop-card";
import PlayerPropsTable from "@/components/PlayerPropsTable";
import { mapToPlayerPropsTableRows } from "@/components/player-props/map-to-player-props-table";

interface LeagueSelectorProps {
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
  leagues: string[];
  leagueStats: Record<string, LeagueStats>;
}

export function LeagueSelector({
  selectedLeague,
  onLeagueChange,
  leagues,
  leagueStats,
}: LeagueSelectorProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">League:</span>
        <Select value={selectedLeague} onValueChange={onLeagueChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {leagues.map((league) => (
              <SelectItem key={league} value={league}>
                {league.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {leagueStats[selectedLeague] && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{leagueStats[selectedLeague].total_props} props</span>
          <span>{leagueStats[selectedLeague].total_games} games</span>
          <span>{leagueStats[selectedLeague].total_players} players</span>
        </div>
      )}
    </div>
  );
}

interface LeagueAgnosticPlayerPropsTabProps {
  initialLeague?: string;
}

export function LeagueAgnosticPlayerPropsTab({
  initialLeague = "nfl",
}: LeagueAgnosticPlayerPropsTabProps) {
  const [selectedLeague, setSelectedLeague] = useState(initialLeague);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [leagueStats, setLeagueStats] = useState<Record<string, LeagueStats>>({});
  const [playerProps, setPlayerProps] = useState<NormalizedPlayerProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available leagues
  useEffect(() => {
    const loadLeagues = async () => {
      try {
        const availableLeagues = await leagueAgnosticPlayerPropsService.getActiveLeagues();
        setLeagues(availableLeagues);

        // Load stats for all leagues
        const statsPromises = availableLeagues.map(async (league) => {
          try {
            const stats = await leagueAgnosticPlayerPropsService.getLeagueStats(league);
            return { league, stats };
          } catch (err) {
            console.warn(`Failed to load stats for ${league}:`, err);
            return { league, stats: null };
          }
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<string, LeagueStats> = {};
        statsResults.forEach(({ league, stats }) => {
          if (stats) {
            statsMap[league] = stats;
          }
        });

        setLeagueStats(statsMap);
      } catch (err) {
        console.error("Failed to load leagues:", err);
        setError("Failed to load leagues");
      }
    };

    loadLeagues();
  }, []);

  // Load player props when league changes
  useEffect(() => {
    const loadPlayerProps = async () => {
      if (!selectedLeague) return;

      setLoading(true);
      setError(null);

      try {
        const props = await leagueAgnosticPlayerPropsService.getPlayerPropsByLeague(
          selectedLeague,
          {
            limit: 50,
            sortBy: "ev_percent",
            sortOrder: "desc",
          },
        );
        setPlayerProps(props);
      } catch (err) {
        console.error("Failed to load player props:", err);
        setError("Failed to load player props");
      } finally {
        setLoading(false);
      }
    };

    loadPlayerProps();
  }, [selectedLeague]);

  const handleLeagueChange = (league: string) => {
    setSelectedLeague(league);
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* League Selector */}
      <LeagueSelector
        selectedLeague={selectedLeague}
        onLeagueChange={handleLeagueChange}
        leagues={leagues}
        leagueStats={leagueStats}
      />

      {/* League Tabs */}
      <Tabs value={selectedLeague} onValueChange={handleLeagueChange}>
        <TabsList className="grid w-full grid-cols-3">
          {leagues.map((league) => (
            <TabsTrigger key={league} value={league} className="flex items-center gap-2">
              {league.toUpperCase()}
              {leagueStats[league] && (
                <Badge variant="secondary" className="text-xs">
                  {leagueStats[league].total_props}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {leagues.map((league) => (
          <TabsContent key={league} value={league} className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </Card>
                ))}
              </div>
            ) : playerProps.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <p>No player props available for {league.toUpperCase()}</p>
                <p className="text-sm mt-2">Check back later for updated odds</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* New clean table view */}
                <PlayerPropsTable data={mapToPlayerPropsTableRows(playerProps)} />

                {/* Keep existing cards below for now (can be toggled or removed later) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playerProps.map((prop) => (
                    <EnhancedPlayerPropCard key={prop.prop_id} prop={prop} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* League Stats Summary */}
      {Object.keys(leagueStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>League Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(leagueStats).map(([league, stats]) => (
                <div key={league} className="space-y-2">
                  <h3 className="font-semibold text-lg">{league.toUpperCase()}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{stats.total_props} total props</p>
                    <p>{stats.total_games} games</p>
                    <p>{stats.total_players} players</p>
                    <p>{stats.total_teams} teams</p>
                    <p>Avg EV: {stats.avg_ev_percent.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
