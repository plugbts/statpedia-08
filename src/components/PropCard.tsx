"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { mlbApiUrl } from "@/lib/mlb-client";
import type { PlayerProp } from "@/types/mlb";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type PropCardProps = {
  playerId: string;
  playerName?: string;
  className?: string;
};

function formatAmerican(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n > 0) return `+${n}`;
  return String(n);
}

export function PropCard({ playerId, playerName, className }: PropCardProps) {
  const { data } = useSWR(mlbApiUrl(`/api/odds/${playerId}`), fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const props: PlayerProp[] = (data?.props as PlayerProp[]) ?? [];

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/40",
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live books</p>
            <p className="text-sm font-semibold">{playerName ?? `Player ${playerId}`}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            DK · FD · Pinny
          </Badge>
        </div>

        <Carousel className="w-full">
          <CarouselContent className="-ml-1">
            {props.length === 0 ? (
              <CarouselItem className="pl-1 basis-full">
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No props yet — check MCP / fallback.
                </div>
              </CarouselItem>
            ) : (
              props.map((p, idx) => (
                <CarouselItem
                  key={`${p.market}-${p.line}-${idx}`}
                  className="pl-1 basis-full sm:basis-1/2"
                >
                  <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {p.market.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">O/U {p.line}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.odds.dk != null && (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-mono text-emerald-200">
                          DK {formatAmerican(p.odds.dk)}
                        </span>
                      )}
                      {p.odds.fd != null && (
                        <span className="rounded-md bg-blue-500/15 px-2 py-1 text-xs font-mono text-blue-200">
                          FD {formatAmerican(p.odds.fd)}
                        </span>
                      )}
                      {p.odds.pinny != null && (
                        <span className="rounded-md bg-amber-500/15 px-2 py-1 text-xs font-mono text-amber-100">
                          Pin {formatAmerican(p.odds.pinny)}
                        </span>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))
            )}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-3 border-border/60 bg-card/90" />
          <CarouselNext className="hidden sm:flex -right-3 border-border/60 bg-card/90" />
        </Carousel>
        <p className="mt-2 text-center text-[11px] text-muted-foreground sm:hidden">
          Swipe for more props →
        </p>
      </CardContent>
    </Card>
  );
}
