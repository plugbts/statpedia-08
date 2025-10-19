import React from "react";

// Shape aligned with our GraphQL player props selection (see league-agnostic service)
export type GQLPlayerProp = {
  prop_id?: string;
  player_id: string;
  player_name?: string;
  team_abbrev?: string;
  opponent_abbrev?: string;
  prop_type: string; // market / prop type name
  line: number;
  // Odds can be provided as american or decimal depending on the source
  odds?: number | null; // consensus odds (decimal)
  over_odds_american?: number | null;
  under_odds_american?: number | null;
  ev_percent?: number | null;
  matchup_rank?: number | null;
  // Simple analytics cached fields
  l5?: number | null;
  l10?: number | null;
  l20?: number | null;
};

// --- Helpers ---
const formatPropName = (prop: string) => {
  if (!prop) return "-";
  const key = prop.toLowerCase().replace(/\s+/g, "_");
  switch (key) {
    case "batting_bases_total":
    case "total_bases":
      return "Total Bases (O/U)";
    case "strikeouts":
    case "pitching_strikeouts":
      return "Strikeouts (O/U)";
    case "hits_runs_rbis":
    case "hits + runs + rbis":
    case "hitsrunsrbi":
      return "Hits + Runs + RBIs";
    default:
      return prop.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const toAmericanOddsFromDecimal = (decimal?: number | null) => {
  if (!decimal || !Number.isFinite(decimal) || decimal <= 1) return "-";
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `${Math.round(-100 / (decimal - 1))}`;
};

const normalizeAmerican = (val?: number | null) => {
  if (val == null) return "-";
  const n = Number(val);
  if (!Number.isFinite(n) || n === 0) return "-";
  return n > 0 ? `+${n}` : `${n}`;
};

// Prefer american if present, else infer from decimal odds
function renderOdds(row: GQLPlayerProp) {
  if (row.over_odds_american != null || row.under_odds_american != null) {
    const over = normalizeAmerican(row.over_odds_american);
    const under = normalizeAmerican(row.under_odds_american);
    if (over !== "-" && under !== "-") return `${over} / ${under}`;
    return over !== "-" ? over : under;
  }
  return toAmericanOddsFromDecimal(row.odds ?? null);
}

// Map analytics fields; show dash when missing
function renderPct(val?: number | null) {
  if (val == null || !Number.isFinite(Number(val))) return "-";
  const n = Number(val);
  // If stored as 0-100 leave as is; if 0-1 scale, convert to %
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(0)}%`;
}

export type PlayerPropsTableProps = {
  data: GQLPlayerProp[];
  className?: string;
};

// --- Component ---
const PlayerPropsTable: React.FC<PlayerPropsTableProps> = ({ data, className = "" }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-3 py-2">Prop</th>
            <th className="px-3 py-2 text-right">Line</th>
            <th className="px-3 py-2 text-right">Odds</th>
            <th className="px-3 py-2 text-center">L5</th>
            <th className="px-3 py-2 text-center">L10</th>
            <th className="px-3 py-2 text-center">L20</th>
            <th className="px-3 py-2 text-center">Matchup</th>
            <th className="px-3 py-2 text-center">EV%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => (
            <tr key={p.prop_id || `${p.player_id}-${p.prop_type}-${idx}`} className="border-b">
              <td className="px-3 py-2">{p.player_name || p.player_id}</td>
              <td className="px-3 py-2">{p.team_abbrev || "-"}</td>
              <td className="px-3 py-2">{formatPropName(p.prop_type)}</td>
              <td className="px-3 py-2 text-right">{Number(p.line ?? 0)}</td>
              <td className="px-3 py-2 text-right">{renderOdds(p)}</td>
              <td className="px-3 py-2 text-center">{renderPct(p.l5)}</td>
              <td className="px-3 py-2 text-center">{renderPct(p.l10)}</td>
              <td className="px-3 py-2 text-center">{renderPct(p.l20)}</td>
              <td className="px-3 py-2 text-center">{p.matchup_rank ?? "-"}</td>
              <td className="px-3 py-2 text-center">
                {p.ev_percent != null ? `${Number(p.ev_percent).toFixed(1)}%` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerPropsTable;
