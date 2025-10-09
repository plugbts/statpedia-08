// player-props-analytics-enhanced.tsx - Enhanced React component with analytics integration

import React, { useState, useMemo, useEffect } from "react";
import { usePlayerProps, filterPropsByMarket, getUniqueMarketTypes, formatOdds } from "./player-props-hook";

type FilterOptions = {
  marketType: string;
  minLine: number | null;
  maxLine: number | null;
  hasOverOdds: boolean;
  hasUnderOdds: boolean;
};

type AnalyticsData = {
  matchupRank: any[];
  last5: any[];
  last10: any[];
  last20: any[];
  loading: boolean;
  error: string | null;
};

export default function PlayerPropsAnalyticsEnhanced({ league }: { league: string }) {
  const { events, loading, error, marketSummary, refetch } = usePlayerProps(league);
  
  const [selectedMarket, setSelectedMarket] = useState<string>("All");
  const [showOnlyWithOdds, setShowOnlyWithOdds] = useState(false);
  const [sortBy, setSortBy] = useState<"player" | "market" | "line" | "matchup_rank" | "last5_avg" | "last10_avg" | "last20_avg">("player");
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    matchupRank: [],
    last5: [],
    last10: [],
    last20: [],
    loading: false,
    error: null
  });

  // Fetch analytics data when component mounts or league changes
  useEffect(() => {
    async function fetchAnalytics() {
      if (!showAnalytics) return;
      
      setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const baseUrl = "https://statpedia-player-props.statpedia.workers.dev";
        const leagueParam = league === "all" ? "all" : league;
        
        const [matchupRankRes, last5Res, last10Res, last20Res] = await Promise.all([
          fetch(`${baseUrl}/analytics/matchup-rank?league=${leagueParam}&limit=100`),
          fetch(`${baseUrl}/analytics/last-5?league=${leagueParam}&limit=100`),
          fetch(`${baseUrl}/analytics/last-10?league=${leagueParam}&limit=100`),
          fetch(`${baseUrl}/analytics/last-20?league=${leagueParam}&limit=100`)
        ]);

        const [matchupRankData, last5Data, last10Data, last20Data] = await Promise.all([
          matchupRankRes.json(),
          last5Res.json(),
          last10Res.json(),
          last20Res.json()
        ]);

        setAnalyticsData({
          matchupRank: matchupRankData.success ? matchupRankData.data : [],
          last5: last5Data.success ? last5Data.data : [],
          last10: last10Data.success ? last10Data.data : [],
          last20: last20Data.success ? last20Data.data : [],
          loading: false,
          error: null
        });
      } catch (err) {
        setAnalyticsData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch analytics'
        }));
      }
    }

    fetchAnalytics();
  }, [league, showAnalytics]);

  // Get all unique market types across all events
  const allMarketTypes = useMemo(() => {
    const markets = new Set<string>();
    events.forEach(event => {
      event.player_props.forEach(prop => markets.add(prop.market_type));
    });
    return ["All", ...Array.from(markets).sort()];
  }, [events]);

  // Helper function to get analytics data for a specific player and prop type
  const getAnalyticsForPlayer = (playerName: string, propType: string) => {
    const matchupRank = analyticsData.matchupRank.find(item => 
      item.player_name === playerName && item.prop_type === propType
    );
    const last5 = analyticsData.last5.find(item => 
      item.player_name === playerName && item.prop_type === propType
    );
    const last10 = analyticsData.last10.find(item => 
      item.player_name === playerName && item.prop_type === propType
    );
    const last20 = analyticsData.last20.find(item => 
      item.player_name === playerName && item.prop_type === propType
    );

    return { matchupRank, last5, last10, last20 };
  };

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
        .map(prop => {
          const analytics = getAnalyticsForPlayer(prop.player_name, prop.market_type);
          return {
            ...prop,
            analytics
          };
        })
        .sort((a, b) => {
          switch (sortBy) {
            case "player":
              return (a.player_name || "").localeCompare(b.player_name || "");
            case "market":
              return a.market_type.localeCompare(b.market_type);
            case "line":
              return (a.line || 0) - (b.line || 0);
            case "matchup_rank":
              const aRank = a.analytics?.matchupRank?.hit || 0;
              const bRank = b.analytics?.matchupRank?.hit || 0;
              return bRank - aRank;
            case "last5_avg":
              const aLast5 = a.analytics?.last5?.avg_value || 0;
              const bLast5 = b.analytics?.last5?.avg_value || 0;
              return bLast5 - aLast5;
            case "last10_avg":
              const aLast10 = a.analytics?.last10?.avg_value || 0;
              const bLast10 = b.analytics?.last10?.avg_value || 0;
              return bLast10 - aLast10;
            case "last20_avg":
              const aLast20 = a.analytics?.last20?.avg_value || 0;
              const bLast20 = b.analytics?.last20?.avg_value || 0;
              return bLast20 - aLast20;
            default:
              return 0;
          }
        })
    }));
  }, [events, selectedMarket, showOnlyWithOdds, sortBy, analyticsData]);

  if (loading) return <div className="loading">Loading props…</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="player-props-analytics-enhanced">
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
            {showAnalytics && (
              <>
                <option value="matchup_rank">Matchup Rank</option>
                <option value="last5_avg">Last 5 Avg</option>
                <option value="last10_avg">Last 10 Avg</option>
                <option value="last20_avg">Last 20 Avg</option>
              </>
            )}
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

        <div className="control-group">
          <label>
            <input 
              type="checkbox" 
              checked={showAnalytics}
              onChange={(e) => setShowAnalytics(e.target.checked)}
            />
            Show Analytics Columns
          </label>
        </div>

        <button onClick={refetch} className="refresh-btn">Refresh</button>
      </div>

      {/* Analytics Status */}
      {showAnalytics && (
        <div className="analytics-status">
          {analyticsData.loading && <div className="loading">Loading analytics...</div>}
          {analyticsData.error && <div className="error">Analytics Error: {analyticsData.error}</div>}
          {!analyticsData.loading && !analyticsData.error && (
            <div className="analytics-summary">
              Analytics loaded: {analyticsData.matchupRank.length} matchup rankings, {analyticsData.last5.length} last-5, {analyticsData.last10.length} last-10, {analyticsData.last20.length} last-20
            </div>
          )}
        </div>
      )}

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
                    {showAnalytics && (
                      <>
                        <th>Matchup Rank</th>
                        <th>Last 5 Avg</th>
                        <th>Last 10 Avg</th>
                        <th>Last 20 Avg</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {event.player_props.map((prop, idx) => {
                    const analytics = prop.analytics;
                    return (
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
                        {showAnalytics && (
                          <>
                            <td className="analytics matchup-rank">
                              {analytics?.matchupRank ? (
                                <div className="analytics-cell">
                                  <div className="hit-rate">
                                    {analytics.matchupRank.hit ? "✅" : "❌"} 
                                    {analytics.matchupRank.margin ? ` (${analytics.matchupRank.margin.toFixed(1)})` : ""}
                                  </div>
                                  <div className="analytics-detail">
                                    vs {analytics.matchupRank.opponent}
                                  </div>
                                </div>
                              ) : (
                                <span className="no-data">-</span>
                              )}
                            </td>
                            <td className="analytics last5">
                              {analytics?.last5 ? (
                                <div className="analytics-cell">
                                  <div className="avg-value">
                                    {analytics.last5.avg_value}
                                  </div>
                                  <div className="analytics-detail">
                                    {analytics.last5.total_games} games • {analytics.last5.trend}
                                  </div>
                                </div>
                              ) : (
                                <span className="no-data">-</span>
                              )}
                            </td>
                            <td className="analytics last10">
                              {analytics?.last10 ? (
                                <div className="analytics-cell">
                                  <div className="avg-value">
                                    {analytics.last10.avg_value}
                                  </div>
                                  <div className="analytics-detail">
                                    {analytics.last10.total_games} games • {analytics.last10.improvement > 0 ? "+" : ""}{analytics.last10.improvement}
                                  </div>
                                </div>
                              ) : (
                                <span className="no-data">-</span>
                              )}
                            </td>
                            <td className="analytics last20">
                              {analytics?.last20 ? (
                                <div className="analytics-cell">
                                  <div className="avg-value">
                                    {analytics.last20.avg_value}
                                  </div>
                                  <div className="analytics-detail">
                                    {analytics.last20.total_games} games • σ{analytics.last20.consistency}
                                  </div>
                                </div>
                              ) : (
                                <span className="no-data">-</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
