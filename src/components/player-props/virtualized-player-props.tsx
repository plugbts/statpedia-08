import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { PlayerProp } from '@/types/player-prop';
import { useMemoizedAnalytics } from '@/hooks/use-memoized-analytics';

interface VirtualizedPlayerPropsProps {
  props: PlayerProp[];
  onPropClick?: (prop: PlayerProp) => void;
  isLoading?: boolean;
  overUnderFilter?: 'over' | 'under' | 'both';
  selectedSport?: string;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    props: PlayerProp[];
    onPropClick?: (prop: PlayerProp) => void;
    overUnderFilter: 'over' | 'under' | 'both';
    getAnalytics: (playerId: string, propType: string, line: number, direction: string) => any;
  };
}

const PlayerPropRow: React.FC<RowProps> = ({ index, style, data }) => {
  const { props, onPropClick, overUnderFilter, getAnalytics } = data;
  const prop = props[index];

  if (!prop) return null;

  const analytics = getAnalytics(
    prop.playerId || prop.player_id || '',
    prop.propType,
    prop.line || 0,
    overUnderFilter
  );

  return (
    <div style={style} className="border-b border-gray-200 p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {prop.playerName?.charAt(0) || '?'}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {prop.playerName || 'Unknown Player'}
                </h3>
                <span className="text-xs text-gray-500">
                  {prop.team} vs {prop.opponent}
                </span>
              </div>
              
              <div className="mt-1 flex items-center space-x-4">
                <span className="text-sm text-gray-600">{prop.propType}</span>
                <span className="text-sm font-medium text-gray-900">
                  {prop.line} {overUnderFilter}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Analytics Display */}
          {analytics ? (
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="text-xs text-gray-500">Season</div>
                <div className="font-medium">
                  {analytics.season.hits}/{analytics.season.total}
                </div>
                <div className="text-xs text-gray-500">
                  ({Math.round(analytics.season.pct * 100)}%)
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-500">L5</div>
                <div className="font-medium">
                  {analytics.l5.hits}/{analytics.l5.total}
                </div>
                <div className="text-xs text-gray-500">
                  ({Math.round(analytics.l5.pct * 100)}%)
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-500">Streak</div>
                <div className="font-medium">{analytics.streak.current}</div>
                <div className="text-xs text-gray-500">
                  ({analytics.streak.longest} max)
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-500">Rank</div>
                <div className="font-medium">{analytics.matchupRank.display}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Loading...</div>
          )}

          <button
            onClick={() => onPropClick?.(prop)}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            Analyze
          </button>
        </div>
      </div>
    </div>
  );
};

export function VirtualizedPlayerProps({
  props,
  onPropClick,
  isLoading = false,
  overUnderFilter = 'both',
  selectedSport = 'nfl'
}: VirtualizedPlayerPropsProps) {
  const { calculateAnalytics, getAnalytics, isLoading: analyticsLoading, progress } = useMemoizedAnalytics();

  // Filter props based on overUnderFilter
  const filteredProps = useMemo(() => {
    if (overUnderFilter === 'both') return props;
    return props.filter(prop => prop.direction === overUnderFilter);
  }, [props, overUnderFilter]);

  // Calculate analytics when props change
  React.useEffect(() => {
    if (filteredProps.length > 0) {
      const propsToCalculate = filteredProps.slice(0, 50).map(prop => ({
        playerId: prop.playerId || prop.player_id || '',
        playerName: prop.playerName || 'Unknown Player',
        propType: prop.propType,
        line: prop.line || 0,
        direction: overUnderFilter as 'over' | 'under',
        team: prop.team || 'UNK',
        opponent: prop.opponent || 'UNK',
        position: prop.position || 'QB',
        sport: prop.sport || selectedSport
      }));

      calculateAnalytics(propsToCalculate);
    }
  }, [filteredProps, overUnderFilter, selectedSport, calculateAnalytics]);

  const rowData = useMemo(() => ({
    props: filteredProps,
    onPropClick,
    overUnderFilter,
    getAnalytics
  }), [filteredProps, onPropClick, overUnderFilter, getAnalytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading player props...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      {analyticsLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Calculating Analytics
            </span>
            <span className="text-sm text-blue-700">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Virtualized list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <List
          height={600} // Fixed height for virtualization
          itemCount={filteredProps.length}
          itemSize={80} // Height of each row
          itemData={rowData}
          overscanCount={5} // Render 5 extra items for smooth scrolling
        >
          {PlayerPropRow}
        </List>
      </div>

      {/* Footer info */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredProps.length} player props
        {analyticsLoading && ` • Calculating analytics...`}
      </div>
    </div>
  );
}
