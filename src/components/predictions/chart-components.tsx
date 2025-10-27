import React, { memo, useMemo, useCallback } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

// Chart configuration for consistent theming
export const chartConfig = {
  performance: {
    label: "Performance",
    color: "hsl(var(--primary))",
  },
  line: {
    label: "Line",
    color: "hsl(var(--warning))",
  },
  average: {
    label: "Average",
    color: "hsl(var(--accent))",
  },
  over: {
    label: "Over",
    color: "hsl(var(--success))",
  },
  under: {
    label: "Under",
    color: "hsl(var(--destructive))",
  },
  trend: {
    label: "Trend",
    color: "hsl(var(--primary))",
  },
  volume: {
    label: "Volume",
    color: "hsl(var(--muted-foreground))",
  },
};

// Performance-optimized line chart component
export const PerformanceLineChart = memo(
  ({
    data,
    line,
    className = "",
    height = 300,
  }: {
    data: any[];
    line: number;
    className?: string;
    height?: number;
  }) => {
    const chartData = useMemo(() => {
      return data.map((item, index) => ({
        ...item,
        game: `G${index + 1}`,
        performance: item.performance,
        line: line,
        average: item.average || line * 0.95,
      }));
    }, [data, line]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl">
            <p className="text-slate-300 text-sm font-medium mb-2">{`Game ${label}`}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Performance:</span>
                <span className="text-white font-semibold">{data.performance}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Line:</span>
                <span className="text-yellow-400 font-semibold">{data.line}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Opponent:</span>
                <span className="text-slate-300">{data.opponent}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Result:</span>
                <span className={cn("font-semibold", data.hit ? "text-green-400" : "text-red-400")}>
                  {data.hit ? "OVER" : "UNDER"}
                </span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <div className={cn("w-full", className)}>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
            <XAxis
              dataKey="game"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={line}
              stroke="hsl(var(--warning))"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: "Line", position: "topRight" }}
            />
            <Line
              type="monotone"
              dataKey="performance"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
          </RechartsLineChart>
        </ChartContainer>
      </div>
    );
  },
);

PerformanceLineChart.displayName = "PerformanceLineChart";

// Performance-optimized bar chart component
export const PerformanceBarChart = memo(
  ({
    data,
    line,
    className = "",
    height = 300,
  }: {
    data: any[];
    line: number;
    className?: string;
    height?: number;
  }) => {
    const chartData = useMemo(() => {
      return data.map((item, index) => ({
        ...item,
        game: `G${index + 1}`,
        performance: item.performance,
        line: line,
      }));
    }, [data, line]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl">
            <p className="text-slate-300 text-sm font-medium mb-2">{`Game ${label}`}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Performance:</span>
                <span className="text-white font-semibold">{data.performance}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Line:</span>
                <span className="text-yellow-400 font-semibold">{data.line}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Result:</span>
                <span className={cn("font-semibold", data.hit ? "text-green-400" : "text-red-400")}>
                  {data.hit ? "OVER" : "UNDER"}
                </span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <div className={cn("w-full", className)}>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
            <XAxis
              dataKey="game"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={line}
              stroke="hsl(var(--warning))"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: "Line", position: "topRight" }}
            />
            <Bar
              dataKey="performance"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              stroke="hsl(var(--primary))"
              strokeWidth={1}
            />
          </RechartsBarChart>
        </ChartContainer>
      </div>
    );
  },
);

PerformanceBarChart.displayName = "PerformanceBarChart";

// Performance-optimized area chart component
export const PerformanceAreaChart = memo(
  ({
    data,
    line,
    className = "",
    height = 300,
  }: {
    data: any[];
    line: number;
    className?: string;
    height?: number;
  }) => {
    const chartData = useMemo(() => {
      return data.map((item, index) => ({
        ...item,
        game: `G${index + 1}`,
        performance: item.performance,
        line: line,
      }));
    }, [data, line]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl">
            <p className="text-slate-300 text-sm font-medium mb-2">{`Game ${label}`}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Performance:</span>
                <span className="text-white font-semibold">{data.performance}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Line:</span>
                <span className="text-yellow-400 font-semibold">{data.line}</span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <div className={cn("w-full", className)}>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
            <XAxis
              dataKey="game"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={line}
              stroke="hsl(var(--warning))"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: "Line", position: "topRight" }}
            />
            <Area
              type="monotone"
              dataKey="performance"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    );
  },
);

PerformanceAreaChart.displayName = "PerformanceAreaChart";

// Performance-optimized pie chart component
export const HitRatePieChart = memo(
  ({
    data,
    className = "",
    height = 300,
  }: {
    data: { name: string; value: number; color: string }[];
    className?: string;
    height?: number;
  }) => {
    const CustomTooltip = useCallback(({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0];
        return (
          <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
              <span className="text-slate-300 font-medium">{data.name}</span>
            </div>
            <div className="mt-1">
              <span className="text-white font-semibold">{data.value}%</span>
            </div>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <div className={cn("w-full", className)}>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <RechartsPieChart>
            <ChartTooltip content={<CustomTooltip />} />
            <RechartsPieChart
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </RechartsPieChart>
          </RechartsPieChart>
        </ChartContainer>
      </div>
    );
  },
);

HitRatePieChart.displayName = "HitRatePieChart";

// Performance-optimized scatter plot component
export const PerformanceScatterChart = memo(
  ({
    data,
    line,
    className = "",
    height = 300,
  }: {
    data: any[];
    line: number;
    className?: string;
    height?: number;
  }) => {
    const chartData = useMemo(() => {
      return data.map((item, index) => ({
        ...item,
        game: index + 1,
        performance: item.performance,
        line: line,
      }));
    }, [data, line]);

    const CustomTooltip = useCallback(({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl">
            <p className="text-slate-300 text-sm font-medium mb-2">{`Game ${data.game}`}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Performance:</span>
                <span className="text-white font-semibold">{data.performance}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Line:</span>
                <span className="text-yellow-400 font-semibold">{data.line}</span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    }, []);

    return (
      <div className={cn("w-full", className)}>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
            <XAxis
              dataKey="game"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={line}
              stroke="hsl(var(--warning))"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: "Line", position: "topRight" }}
            />
            <Scatter
              dataKey="performance"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              r={6}
            />
          </ScatterChart>
        </ChartContainer>
      </div>
    );
  },
);

PerformanceScatterChart.displayName = "PerformanceScatterChart";
