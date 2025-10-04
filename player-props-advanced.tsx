// player-props-advanced.tsx - Advanced React component with filtering and market grouping

import React, { useState, useMemo } from "react";
import { usePlayerProps, filterPropsByMarket, getUniqueMarketTypes, formatOdds } from "./player-props-hook";

type FilterOptions = {
  marketType: string;
  minLine: number | null;
  maxLine: number | null;
  hasOverOdds: boolean;
  hasUnderOdds: boolean;
};

export default function PlayerPropsAdvanced({ league }: { league: string }) {
  const { events, loading, error, marketSummary, refetch } = usePlayerProps(league);
  
  const [selectedMarket, setSelectedMarket] = useState<string>("All");
  const [showOnlyWithOdds, setShowOnlyWithOdds] = useState(false);
  const [sortBy, setSortBy] = useState<"player" | "market" | "line">("player");

  // Get all unique market types across all events
  const allMarketTypes = useMemo(() => {
    const markets = new Set<string>();
    events.forEach(event => {
      event.player_props.forEach(prop => markets.add(prop.market_type));
    });
    return ["All", ...Array.from(markets).sort()];
  }, [events]);

  // Filter and sort props
  const filteredEvents = useMemo(() => {
    return events.map(event => ({
      ...event,
      player_props: event.player_props
        .filter(prop => {
          if (selectedMarket !== "All" && prop.market_type !== selectedMarket) return false;
          if (showOnlyWithOdds && !prop.best_over && !prop.best_under) return false;
          return true;
        })
        .sort((a, b) => {
          switch (sortBy) {
            case "player":
              return (a.player_name || "").localeCompare(b.player_name || "");
            case "market":
              return a.market_type.localeCompare(b.market_type);
            case "line":
              return (a.line || 0) - (b.line || 0);
            default:
              return 0;
          }
        })
    }));
  }, [events, selectedMarket, showOnlyWithOdds, sortBy]);

  if (loading) return <div className="loading">Loading props…</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="player-props-advanced">
      {/* Controls */}
      <div className="controls">
        <div className="control-group">
          <label>Market Type:</label>
          <select 
            value={selectedMarket} 
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            {allMarketTypes.map(market => (
              <option key={market} value={market}>{market}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Sort By:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="player">Player Name</option>
            <option value="market">Market Type</option>
            <option value="line">Line</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <input 
              type="checkbox" 
              checked={showOnlyWithOdds}
              onChange={(e) => setShowOnlyWithOdds(e.target.checked)}
            />
            Only show props with odds
          </label>
        </div>

        <button onClick={refetch} className="refresh-btn">Refresh</button>
      </div>

      {/* Market Summary */}
      <div className="market-summary">
        <h3>Market Summary</h3>
        <div className="summary-grid">
          {Object.entries(marketSummary)
            .sort(([,a], [,b]) => b - a)
            .map(([market, count]) => (
              <div 
                key={market} 
                className={`market-tag ${selectedMarket === market ? 'selected' : ''}`}
                onClick={() => setSelectedMarket(market)}
              >
                {market}: {count}
              </div>
            ))}
        </div>
      </div>

      {/* Events */}
      {filteredEvents.map(event => (
        <div key={event.eventID} className="event-block">
          <h2>{event.away_team} @ {event.home_team}</h2>
          <p className="event-stats">
            {event.player_props.length} props • {getUniqueMarketTypes(event.player_props).length} markets
          </p>
          
          {event.player_props.length === 0 ? (
            <p className="no-props">No props match the current filters</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Market</th>
                    <th>Line</th>
                    <th>Best Over</th>
                    <th>Best Under</th>
                  </tr>
                </thead>
                <tbody>
                  {event.player_props.map((prop, idx) => (
                    <tr key={idx} className="prop-row">
                      <td className="player-name">{prop.player_name || "Unknown"}</td>
                      <td className="market-type">{prop.market_type}</td>
                      <td className="line">{prop.line}</td>
                      <td className="odds over">
                        {formatOdds(prop.best_over)}
                      </td>
                      <td className="odds under">
                        {formatOdds(prop.best_under)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
