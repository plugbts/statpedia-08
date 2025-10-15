// Migration Guide: Updating Frontend Components to Use Normalized Data
// This file shows how to migrate existing components to use the stable normalized view

import React, { useState, useEffect } from 'react';
import { PlayerPropsNormalizedService, NormalizedPlayerProp } from '@/services/player-props-normalized-service';

// Example: Updated PlayerPropCard component using normalized data
interface UpdatedPlayerPropCardProps {
  prop: NormalizedPlayerProp;
  isSubscribed: boolean;
  onCardClick?: (prop: NormalizedPlayerProp) => void;
}

export const UpdatedPlayerPropCard: React.FC<UpdatedPlayerPropCardProps> = ({
  prop,
  isSubscribed,
  onCardClick
}) => {
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(prop);
    }
  };

  return (
    <div 
      className="bg-gradient-card border border-border/50 rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-all duration-200"
      onClick={handleCardClick}
    >
      {/* Player Info - Now guaranteed to be resolved */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {prop.player_name.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{prop.player_name}</h3>
          <div className="flex items-center gap-2">
            <img 
              src={prop.team_logo} 
              alt={prop.team_name}
              className="w-6 h-6"
              onError={(e) => {
                // Fallback to team abbreviation if logo fails
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="text-sm text-muted-foreground hidden">
              {prop.team_abbrev}
            </span>
            <span className="text-sm text-muted-foreground">vs</span>
            <img 
              src={prop.opponent_logo} 
              alt={prop.opponent_name}
              className="w-6 h-6"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="text-sm text-muted-foreground hidden">
              {prop.opponent_abbrev}
            </span>
          </div>
        </div>
      </div>

      {/* Prop Info */}
      <div className="mb-4">
        <h4 className="font-semibold text-foreground mb-2">{prop.market}</h4>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">{prop.line}</span>
          <span className="text-sm text-muted-foreground">
            {prop.odds > 0 ? '+' : ''}{prop.odds}
          </span>
        </div>
      </div>

      {/* Enrichment Stats - Only show if available */}
      {prop.streak && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Streak: {prop.streak}</span>
          {prop.rating && <span>Rating: {prop.rating}</span>}
        </div>
      )}

      {/* EV Percentage */}
      {prop.ev_percent && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">EV</span>
            <span className={`font-semibold ${
              prop.ev_percent > 0 ? 'text-success' : 'text-destructive'
            }`}>
              {prop.ev_percent > 0 ? '+' : ''}{prop.ev_percent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Example: Updated PlayerPropsTab component using normalized service
export const UpdatedPlayerPropsTab: React.FC = () => {
  const [props, setProps] = useState<NormalizedPlayerProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('nfl');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  useEffect(() => {
    loadPlayerProps();
  }, [selectedSport, selectedTeam]);

  const loadPlayerProps = async () => {
    try {
      setLoading(true);
      setError(null);

      const filter = {
        sport: selectedSport,
        team_abbrev: selectedTeam || undefined,
        limit: 50
      };

      const data = await PlayerPropsNormalizedService.getPlayerProps(filter);
      setProps(data);
    } catch (err) {
      console.error('Error loading player props:', err);
      setError('Failed to load player props. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (prop: NormalizedPlayerProp) => {
    // Navigate to prediction detail with normalized data
    console.log('Card clicked:', prop);
    // navigation logic here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive mb-4">{error}</p>
        <button 
          onClick={loadPlayerProps}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <select 
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-background"
        >
          <option value="nfl">NFL</option>
          <option value="nba">NBA</option>
          <option value="mlb">MLB</option>
          <option value="nhl">NHL</option>
        </select>
        
        <select 
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-background"
        >
          <option value="">All Teams</option>
          {/* Team options would be loaded from normalized service */}
        </select>
      </div>

      {/* Props Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {props.map((prop) => (
          <UpdatedPlayerPropCard
            key={prop.prop_id}
            prop={prop}
            isSubscribed={true} // This would come from auth context
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {props.length === 0 && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">No player props found for the selected filters.</p>
        </div>
      )}
    </div>
  );
};

// Example: Health Check Component
export const IngestionHealthCheck: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const healthData = await PlayerPropsNormalizedService.getIngestionHealth();
      setHealth(healthData);
    } catch (error) {
      console.error('Error checking health:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Checking health...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-gradient-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-foreground">Ingestion Health</h3>
        <span className={`text-sm font-medium ${getStatusColor(health?.status)}`}>
          {health?.status?.toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{health?.message}</p>
      {health?.details && (
        <div className="text-xs text-muted-foreground">
          <div>Batches: {health.details.batches}</div>
          <div>Success Rate: {health.details.success_rate?.toFixed(1)}%</div>
          <div>Errors: {health.details.errors}</div>
        </div>
      )}
    </div>
  );
};

// Example: Golden Dataset Test Runner
export const GoldenDatasetTestRunner: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    try {
      setRunning(true);
      const results = await PlayerPropsNormalizedService.runGoldenDatasetTests();
      setTests(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={runTests}
        disabled={running}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {running ? 'Running Tests...' : 'Run Golden Dataset Tests'}
      </button>

      {tests.length > 0 && (
        <div className="space-y-2">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gradient-card border border-border/50 rounded-lg">
              <div>
                <div className="font-medium text-foreground">{test.test_name}</div>
                <div className="text-sm text-muted-foreground">
                  Props Found: {test.props_found} | Time: {test.execution_time_ms}ms
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                test.status === 'passed' ? 'bg-success text-white' :
                test.status === 'failed' ? 'bg-destructive text-white' :
                'bg-warning text-white'
              }`}>
                {test.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdatedPlayerPropsTab;
