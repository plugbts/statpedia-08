import React from "react";
import { formatPropName, toAmericanOdds } from "@/utils/formatters";

type PlayerProp = {
  player: string;
  team: string;
  prop_name: string;
  line: number;
  odds: number;
  ev_percent?: number | null;
  streak?: number | null;
  rating?: number | null;
  matchup?: string | null;
};

const PlayerPropsRow: React.FC<{ prop: PlayerProp }> = ({ prop }) => {
  return (
    <tr className="border-b text-sm">
      <td className="px-3 py-2">{prop.player}</td>
      <td className="px-3 py-2">{prop.team}</td>
      <td className="px-3 py-2">{formatPropName(prop.prop_name)}</td>
      <td className="px-3 py-2">{prop.line}</td>
      <td className="px-3 py-2">{toAmericanOdds(prop.odds)}</td>
      <td className="px-3 py-2">
        {prop.ev_percent !== null && prop.ev_percent !== undefined ? `${prop.ev_percent}%` : "-"}
      </td>
      <td className="px-3 py-2">{prop.streak ?? "-"}</td>
      <td className="px-3 py-2">{prop.rating ?? "-"}</td>
      <td className="px-3 py-2">{prop.matchup ?? "-"}</td>
    </tr>
  );
};

export default PlayerPropsRow;
