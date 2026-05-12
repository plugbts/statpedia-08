"use client";

import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropFilters, type PropFiltersValue } from "@/components/PropFilters";
import { mlbFetchJson } from "@/lib/mlb-client";
import type { OddsResponse } from "@/types/mlb";
import * as React from "react";

function fmt(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n > 0) return `+${n}`;
  return String(n);
}

export default function MlbPlayerPropsComparePage() {
  const { id = "" } = useParams<{ id: string }>();
  const [filters, setFilters] = React.useState<PropFiltersValue>({ market: "hits", side: "over" });

  const q = useQuery({
    queryKey: ["mlb-odds-compare", id],
    queryFn: () => mlbFetchJson<OddsResponse>(`/api/odds/${id}`),
    enabled: !!id,
  });

  const rows = (q.data?.props ?? []).filter((p) => {
    const m = p.market.toLowerCase();
    if (filters.market === "hits") return m.includes("hit");
    if (filters.market === "hr") return m.includes("hr") || m.includes("home");
    return m === "k" || m.includes("strike");
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/mlb/players/${id}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Player profile
          </Link>
        </Button>

        <div>
          <h1 className="font-display text-2xl font-bold">Prop comparison</h1>
          <p className="text-sm text-muted-foreground">
            DraftKings vs FanDuel (Pinnacle when present)
          </p>
        </div>

        <PropFilters value={filters} onChange={setFilters} />

        <Card className="border-border/50 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Lines</CardTitle>
            <CardDescription>
              American odds · {q.isFetching ? "Refreshing…" : "Cached 5m at API"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead className="text-emerald-500">DK</TableHead>
                  <TableHead className="text-blue-400">FD</TableHead>
                  <TableHead className="text-amber-200">Pinny</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No rows for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p, i) => (
                    <TableRow key={`${p.market}-${i}`}>
                      <TableCell className="font-medium capitalize">
                        {p.market.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {filters.side === "over" ? `O ${p.line}` : `U ${p.line}`}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{fmt(p.odds.dk)}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(p.odds.fd)}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(p.odds.pinny)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
