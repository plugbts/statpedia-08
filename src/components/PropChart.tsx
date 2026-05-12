"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatterStats } from "@/types/mlb";
import { cn } from "@/lib/utils";

export type PropChartProps = {
  l5: BatterStats[];
  title?: string;
  className?: string;
};

/** L5 trend: proxy “hit probability” from recent hit outcomes (demo curve). */
export function PropChart({ l5, title = "L5 hit-rate trend", className }: PropChartProps) {
  const data = l5.map((g, i) => {
    const hits = g.hits ?? 0;
    const prob = Math.min(0.95, 0.42 + hits * 0.12 - i * 0.02);
    return {
      label: g.date.slice(5),
      hitProb: Number((prob * 100).toFixed(1)),
      hits,
    };
  });

  return (
    <Card className={cn("border-border/50 bg-card/60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Smoothed game-to-game hit probability (model-style)</CardDescription>
      </CardHeader>
      <CardContent className="h-[220px] pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              unit="%"
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="hitProb"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
