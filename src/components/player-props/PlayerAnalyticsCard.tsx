import React from 'react';
import { usePlayerAnalyticsEnriched, formatHitRate, formatAverage, getStreakDisplay, getPerformanceGrade, getTrendDirection } from '@/hooks/usePlayerAnalyticsEnriched';

interface PlayerAnalyticsCardProps {
  playerId: string;
  propType: string;
  season?: string;
  className?: string;
}

export function PlayerAnalyticsCard({ playerId, propType, season = '2025', className = '' }: PlayerAnalyticsCardProps) {
  const { data, loading, error } = usePlayerAnalyticsEnriched(playerId, propType, season);

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 text-sm">Unable to load analytics</p>
      </div>
    );
  }

  const { summary, recentGames } = data;
  const trendDirection = getTrendDirection(recentGames);
  const performanceGrade = getPerformanceGrade(summary.careerHitRate);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Player Analytics</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">{summary.totalGames} games</span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            performanceGrade.startsWith('A') ? 'bg-green-100 text-green-800' :
            performanceGrade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
            performanceGrade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            Grade: {performanceGrade}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Career Avg</span>
            <span className="text-sm font-medium text-gray-900">
              {formatAverage(summary.careerAvg)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">L5 Avg</span>
            <span className="text-sm font-medium text-gray-900">
              {formatAverage(summary.avgL5)}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Hit Rate</span>
            <span className="text-sm font-medium text-gray-900">
              {formatHitRate(summary.careerHitRate)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">L5 Hit Rate</span>
            <span className="text-sm font-medium text-gray-900">
              {formatHitRate(summary.hitRateL5)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Streak:</span>
          <span className={`text-sm font-medium ${
            summary.currentStreakType === 'over' ? 'text-green-600' : 'text-red-600'
          }`}>
            {getStreakDisplay(summary.currentStreak, summary.currentStreakType)}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-600">Trend:</span>
          <div className={`w-2 h-2 rounded-full ${
            trendDirection === 'up' ? 'bg-green-500' :
            trendDirection === 'down' ? 'bg-red-500' :
            'bg-gray-400'
          }`}></div>
          <span className="text-xs text-gray-600 capitalize">{treakDirection}</span>
        </div>
      </div>

      {recentGames.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Recent Games</span>
            <span className="text-xs text-gray-500">{recentGames.length} shown</span>
          </div>
          <div className="flex space-x-1">
            {recentGames.slice(0, 5).map((game, index) => (
              <div
                key={index}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  game.hit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
                title={`${game.actual_value} vs ${game.line} (${game.game_date})`}
              >
                {game.actual_value >= game.line ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for use in prop cards
export function PlayerAnalyticsCompact({ playerId, propType, season = '2025' }: PlayerAnalyticsCardProps) {
  const { data, loading } = usePlayerAnalyticsEnriched(playerId, propType, season);

  if (loading || !data) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
        <span>Loading...</span>
      </div>
    );
  }

  const { summary } = data;
  const performanceGrade = getPerformanceGrade(summary.careerHitRate);

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center space-x-3">
        <span className="text-gray-600">
          Avg: <span className="font-medium text-gray-900">{formatAverage(summary.careerAvg)}</span>
        </span>
        <span className="text-gray-600">
          Hit: <span className="font-medium text-gray-900">{formatHitRate(summary.careerHitRate)}</span>
        </span>
        <span className="text-gray-600">
          Streak: <span className={`font-medium ${
            summary.currentStreakType === 'over' ? 'text-green-600' : 'text-red-600'
          }`}>
            {getStreakDisplay(summary.currentStreak, summary.currentStreakType)}
          </span>
        </span>
      </div>
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
        performanceGrade.startsWith('A') ? 'bg-green-100 text-green-800' :
        performanceGrade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
        performanceGrade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {performanceGrade}
      </div>
    </div>
  );
}
