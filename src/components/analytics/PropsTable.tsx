import React from "react";
import { MatchupBadge, MatchupBadgeCompact } from "./MatchupBadge";
import { PropMatchup } from "../../lib/analytics";
import { LEAGUE_DISPLAY_NAMES } from "../../lib/leagues";

interface PropsTableProps {
  rows: PropMatchup[];
  league: string;
  showPlayerNames?: boolean;
  compact?: boolean;
  className?: string;
}

export function PropsTable({ 
  rows, 
  league, 
  showPlayerNames = true, 
  compact = false,
  className = "" 
}: PropsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No props available for {LEAGUE_DISPLAY_NAMES[league] || league.toUpperCase()} on this date.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`overflow-x-auto scrollbar-thin ${className}`}>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prop
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Line
              </th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ranks
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.slice(0, 15).map((row) => (
              <tr key={row.prop_id} className="hover:bg-gray-50/50">
                <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">
                  {row.player_id}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 capitalize">
                  {row.prop_type}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-right font-medium">
                  {row.line}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                  <MatchupBadgeCompact grade={row.matchup_grade} />
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-center text-xs text-gray-600">
                  {row.offense_rank}/{row.defense_rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto scrollbar-thin ${className}`}>
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Player
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prop Type
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Line
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Matchup Grade
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Off/Def Ranks
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rolling 10
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Season Avg
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.prop_id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {showPlayerNames ? row.player_id : `Player ${row.player_id.slice(-4)}`}
                </div>
                <div className="text-xs text-gray-500">
                  {row.game_id}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm text-gray-900 capitalize">
                  {row.prop_type}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                {row.line}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                <MatchupBadge grade={row.matchup_grade} size="sm" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                <div className="text-sm text-gray-900">
                  <span className="font-medium">{row.offense_rank}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="font-medium">{row.defense_rank}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {row.avg_offense.toFixed(1)} / {row.avg_defense.toFixed(1)}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                {row.rolling_10 ? row.rolling_10.toFixed(1) : "N/A"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                {row.season_avg ? row.season_avg.toFixed(1) : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Specialized component for game matchups
interface GameMatchupTableProps {
  games: any[];
  league: string;
  className?: string;
}

export function GameMatchupTable({ games, league, className = "" }: GameMatchupTableProps) {
  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No games available for {LEAGUE_DISPLAY_NAMES[league] || league.toUpperCase()} on this date.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Game
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Game Grade
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Team A Grade
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Team B Grade
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {games.map((game, index) => (
            <tr key={`${game.game_id}-${game.prop_type}-${index}`} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {game.team_a} vs {game.team_b}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {game.prop_type}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <MatchupBadge grade={game.game_prop_grade} size="sm" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <MatchupBadgeCompact grade={game.team_a_grade} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <MatchupBadgeCompact grade={game.team_b_grade} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
