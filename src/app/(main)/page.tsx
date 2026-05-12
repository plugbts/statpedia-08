"use client";

import { Link } from "react-router-dom";
import { MatrixBackground } from "@/components/effects/matrix-background";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlayerSearch } from "@/components/PlayerSearch";
import { PropCard } from "@/components/PropCard";
import { TrendingUp, Cloud, Wind, MapPin, Radio, Flame } from "lucide-react";

const GAMES = [
  { away: "NYY", home: "BOS", time: "7:10 PM ET", park: "Fenway Park", wind: "12 mph out to LF" },
  { away: "LAD", home: "CHC", time: "8:05 PM ET", park: "Wrigley Field", wind: "8 mph in from RF" },
  { away: "HOU", home: "TEX", time: "8:10 PM ET", park: "Globe Life", wind: "6 mph cross" },
  { away: "ATL", home: "PHI", time: "6:40 PM ET", park: "Citizens Bank", wind: "10 mph to CF" },
];

const TOP_PROPS = [
  { player: "Aaron Judge", id: "592450", market: "HR", line: "O 0.5", steam: "▲ line buy" },
  { player: "Kyle Tucker", id: "663656", market: "Hits", line: "O 1.5", steam: "Steam O" },
  { player: "Bobby Witt Jr.", id: "677950", market: "TB", line: "O 1.5", steam: "Sharp" },
];

const MOVES = [
  { label: "Judge HR", from: "+200", to: "+175", book: "DK" },
  { label: "Ohtani K", from: "O 6.5 -110", to: "O 6.5 -125", book: "FD" },
  { label: "Soto walks", from: "O 0.5 +140", to: "O 0.5 +120", book: "Pinny" },
];

export default function MlbSlateOverviewPage() {
  return (
    <div className="relative min-h-screen">
      <MatrixBackground />
      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-2 bg-gradient-success text-xs">
              <TrendingUp className="mr-1 h-3 w-3" />
              MLB slate
            </Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Today&apos;s board
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Games, park &amp; weather context, live steamers, and top props — briefing-style
              layout.
            </p>
          </div>
          <PlayerSearch hotkey className="w-full lg:max-w-xl" />
        </header>

        <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/15 via-card to-card shadow-glow">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" />
              <CardTitle className="text-lg sm:text-xl">Line movement — hero</CardTitle>
              <Badge variant="secondary" className="text-[10px] uppercase">
                Live
              </Badge>
            </div>
            <CardDescription>
              Steam and liability shifts (demo narrative; wire PropSports MCP for live feed)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {MOVES.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-border/50 bg-background/50 p-3 backdrop-blur-sm"
              >
                <p className="text-xs text-muted-foreground">{m.book}</p>
                <p className="font-semibold text-foreground">{m.label}</p>
                <p className="mt-1 font-mono text-sm text-primary">
                  {m.from} <span className="text-muted-foreground">→</span> {m.to}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 bg-card/70 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-emerald-400" />
                Today&apos;s games
              </CardTitle>
              <CardDescription>First pitch &amp; venue snapshot</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {GAMES.map((g) => (
                <div
                  key={`${g.away}-${g.home}`}
                  className="rounded-lg border border-border/50 bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>
                      {g.away} @ {g.home}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">{g.time}</span>
                  </div>
                  <Separator className="my-2 bg-border/50" />
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{g.park}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Wind className="h-3.5 w-3.5" />
                    {g.wind}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cloud className="h-4 w-4 text-sky-400" />
                Park &amp; weather
              </CardTitle>
              <CardDescription>PropSports MCP fields (placeholder copy)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Fenway:</span> short porch RF, temps
                dropping late — HR props volatile.
              </p>
              <p>
                <span className="font-medium text-foreground">Wrigley:</span> cross-wind may
                suppress barrels vs LAD pen.
              </p>
              <p>
                <span className="font-medium text-foreground">Globe Life:</span> neutral park
                factors; heat index elevated.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="text-base">Top props</CardTitle>
              <CardDescription>Quick links into player boards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {TOP_PROPS.map((p) => (
                <Link
                  key={p.id}
                  to={`/mlb/players/${p.id}/props`}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div>
                    <p className="font-medium text-foreground">{p.player}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.market} · {p.line}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {p.steam}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Featured card
            </h2>
            <PropCard playerId="592450" playerName="Aaron Judge" />
          </div>
        </div>

        <footer className="pb-8 text-center text-xs text-muted-foreground">
          Statpedia MLB · Same styling tokens as main app ·{" "}
          <Link to="/" className="text-primary hover:underline">
            Back to dashboard
          </Link>
        </footer>
      </div>
    </div>
  );
}
