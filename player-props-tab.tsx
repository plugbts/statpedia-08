// player-props-tab.tsx

import React, { useEffect, useState } from "react";

type PlayerProp = {
  player_name: string;
  market_type: string;
  line: number | null;
  best_over: { bookmaker: string; price: string; line: number | null } | null;
  best_under: { bookmaker: string; price: string; line: number | null } | null;
};

type Event = {
  eventID: string;
  home_team: string;
  away_team: string;
  player_props: PlayerProp[];
};

export default function PlayerPropsTab({ league }: { league: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/${league}/player-props?date=2025-10-05`);
      const data = await res.json();
      setEvents(data);
      setLoading(false);
    }
    load();
  }, [league]);

  if (loading) return <div>Loading props…</div>;

  return (
    <div>
      {events.map(ev => (
        <div key={ev.eventID} className="event-block">
          <h3>{ev.away_team} @ {ev.home_team}</h3>
          
          {/* Market Summary */}
          <div className="market-summary">
            <h4>Market Summary:</h4>
            <div className="summary-grid">
              {Object.entries(
                ev.player_props.reduce((counts: Record<string, number>, prop) => {
                  const label = prop.market_type || "Unknown";
                  counts[label] = (counts[label] || 0) + 1;
                  return counts;
                }, {})
              ).map(([market, count]) => (
                <span key={market} className="market-tag">
                  {market}: {count}
                </span>
              ))}
            </div>
          </div>

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
              {ev.player_props.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.player_name || "Unknown"}</td>
                  <td>{p.market_type}</td>
                  <td>{p.line}</td>
                  <td>{p.best_over ? `${p.best_over.price} (${p.best_over.bookmaker})` : "-"}</td>
                  <td>{p.best_under ? `${p.best_under.price} (${p.best_under.bookmaker})` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
