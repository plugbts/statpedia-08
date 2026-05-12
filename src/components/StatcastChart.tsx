"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Statcast } from "@/types/mlb";
import { cn } from "@/lib/utils";

export type StatcastChartProps = {
  statcast: Statcast;
  /** League-average barrels % for reference line */
  leagueBarrelPct?: number;
  leagueEv?: number;
  className?: string;
};

export function StatcastChart({
  statcast,
  leagueBarrelPct = 7.8,
  leagueEv = 88.4,
  className,
}: StatcastChartProps) {
  const evN = Math.min(100, Math.max(0, ((statcast.exit_velo - 78) / (104 - 78)) * 100));
  const leagueEvN = Math.min(100, Math.max(0, ((leagueEv - 78) / (104 - 78)) * 100));
  const data = [
    { name: "EV index", player: Number(evN.toFixed(1)), league: Number(leagueEvN.toFixed(1)) },
    { name: "Barrel %", player: statcast.barrel_pct, league: leagueBarrelPct },
    { name: "Hard-hit %", player: statcast.hard_hit_pct, league: 38.5 },
  ];

  return (
    <Card className={cn("border-border/50 bg-card/60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Statcast vs league</CardTitle>
        <CardDescription>Barrel & hard-hit %; EV shown as 0–100 index vs league</CardDescription>
      </CardHeader>
      <CardContent className="h-[240px] pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Bar dataKey="player" name="Player" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar
              dataKey="league"
              name="League avg"
              fill="hsl(var(--muted-foreground) / 0.35)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
