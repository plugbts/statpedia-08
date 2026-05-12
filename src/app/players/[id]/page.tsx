"use client";

import { Link, useParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PropChart } from "@/components/PropChart";
import { StatcastChart } from "@/components/StatcastChart";
import { PropCard } from "@/components/PropCard";
import { mlbFetchJson } from "@/lib/mlb-client";
import type { MatchupsResponse, OddsResponse, StatsResponse } from "@/types/mlb";

export default function MlbPlayerProfilePage() {
  const { id = "" } = useParams<{ id: string }>();

  const [oddsQ, statsQ, matchQ] = useQueries({
    queries: [
      {
        queryKey: ["mlb-odds", id],
        queryFn: () => mlbFetchJson<OddsResponse>(`/api/odds/${id}`),
        enabled: !!id,
      },
      {
        queryKey: ["mlb-stats", id],
        queryFn: () => mlbFetchJson<StatsResponse>(`/api/stats/${id}`),
        enabled: !!id,
      },
      {
        queryKey: ["mlb-matchups", id],
        queryFn: () => mlbFetchJson<MatchupsResponse>(`/api/matchups/${id}`),
        enabled: !!id,
      },
    ],
  });

  const stats = statsQ.data;
  const matchups = matchQ.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/mlb" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Slate
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/mlb/players/${id}/props`}>
                <Table2 className="mr-2 h-4 w-4" />
                DK vs FD
              </Link>
            </Button>
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Player {id}</h1>
          <p className="text-sm text-muted-foreground">
            MLB profile · odds, Statcast, and matchup splits
            {oddsQ.isFetching ? (
              <span className="ml-2 text-xs text-primary">Refreshing odds…</span>
            ) : null}
          </p>
        </div>

        <PropCard playerId={id} />

        <div className="grid gap-6 lg:grid-cols-2">
          <PropChart l5={stats?.l5 ?? []} />
          {stats?.statcast ? (
            <StatcastChart statcast={stats.statcast} />
          ) : (
            <Card className="border-border/50 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Statcast</CardTitle>
                <CardDescription>Loading or unavailable</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        <Tabs defaultValue="matchups">
          <TabsList>
            <TabsTrigger value="matchups">Vs pitcher</TabsTrigger>
            <TabsTrigger value="raw">Books</TabsTrigger>
          </TabsList>
          <TabsContent value="matchups" className="mt-4">
            <Card className="border-border/50 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Matchup snapshot
                </CardTitle>
                <CardDescription>Career-style view from PropSports MCP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {matchups?.vs_pitcher?.length ? (
                  <ul className="space-y-2">
                    {matchups.vs_pitcher.map((m, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap justify-between gap-2 rounded-md border border-border/40 px-3 py-2"
                      >
                        <span className="font-medium">{m.pitcher_name ?? m.pitcher_id}</span>
                        <span className="text-muted-foreground">
                          PA {m.pa ?? "—"} · AVG {m.avg?.toFixed(3) ?? "—"} · OPS{" "}
                          {m.ops?.toFixed(3) ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No matchup rows yet.</p>
                )}
                {matchups?.career && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    Career: G {matchups.career.games ?? "—"} · AVG{" "}
                    {matchups.career.avg?.toFixed(3) ?? "—"} · OPS{" "}
                    {matchups.career.ops?.toFixed(3) ?? "—"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="raw" className="mt-4">
            <Card className="border-border/50 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Books on offer</CardTitle>
                <CardDescription>{(oddsQ.data?.books ?? []).join(", ") || "—"}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(oddsQ.data?.props ?? []).map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-xs capitalize">
                    {p.market} {p.line}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
