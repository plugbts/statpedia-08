import React, { useState, useEffect } from "react";
import { PropsTable, GameMatchupTable } from "./PropsTable";
import { MatchupBadgeGradient } from "./MatchupBadge";
import { analyticsApi } from "../../services/analytics-api-service";
import { PropMatchup } from "../../lib/analytics";
import { LEAGUE_DISPLAY_NAMES, getActiveLeagues } from "../../lib/leagues";

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className = "" }: AnalyticsDashboardProps) {
  const [selectedLeague, setSelectedLeague] = useState("nhl");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPropType, setSelectedPropType] = useState<string>("");
  const [props, setProps] = useState<PropMatchup[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const activeLeagues = getActiveLeagues();

  const fetchData = async () => {
    if (!selectedLeague || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const [propsResult, gamesResult, summaryResult] = await Promise.all([
        analyticsApi.getProps({
          league: selectedLeague,
          date: selectedDate,
          propType: selectedPropType || undefined
        }),
        analyticsApi.getGames({
          league: selectedLeague,
          date: selectedDate,
          propType: selectedPropType || undefined
        }),
        analyticsApi.getAnalyticsSummary(selectedLeague, selectedDate)
      ]);

      if (propsResult.ok) {
        setProps(propsResult.data);
      } else {
        setError(propsResult.error || "Failed to fetch props");
      }

      if (gamesResult.ok) {
        setGames(gamesResult.data);
      }

      if (summaryResult.ok) {
        setSummary(summaryResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLeague, selectedDate, selectedPropType]);

  const refreshAnalytics = async () => {
    setLoading(true);
    try {
      await analyticsApi.refreshAnalytics();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">
              Prop matchup analysis for {LEAGUE_DISPLAY_NAMES[selectedLeague] || selectedLeague.toUpperCase()}
            </p>
          </div>
          <button
            onClick={refreshAnalytics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Analytics"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              League
            </label>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activeLeagues.map(league => (
                <option key={league} value={league}>
                  {LEAGUE_DISPLAY_NAMES[league] || league.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prop Type (Optional)
            </label>
            <input
              type="text"
              value={selectedPropType}
              onChange={(e) => setSelectedPropType(e.target.value)}
              placeholder="e.g., receiving yards"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Props</div>
            <div className="text-2xl font-bold text-gray-900">{props.length}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Games</div>
            <div className="text-2xl font-bold text-gray-900">{summary.gameCount}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Avg Game Grade</div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.avgGameGrade.toFixed(1)}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Best Matchup</div>
            <div className="text-lg font-bold text-gray-900">
              {summary.bestProp ? (
                <MatchupBadgeGradient grade={summary.bestProp.matchup_grade} />
              ) : (
                "N/A"
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      )}

      {/* Props Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Props</h2>
            <p className="text-sm text-gray-600">
              Ranked by matchup grade for {selectedDate}
            </p>
          </div>
          <PropsTable 
            rows={props} 
            league={selectedLeague}
            compact={false}
          />
        </div>
      )}

      {/* Games Table */}
      {!loading && !error && games.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Game Matchups</h2>
            <p className="text-sm text-gray-600">
              Game-level matchup grades for {selectedDate}
            </p>
          </div>
          <GameMatchupTable 
            games={games} 
            league={selectedLeague}
          />
        </div>
      )}
    </div>
  );
}
