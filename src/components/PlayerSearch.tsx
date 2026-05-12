"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { mlbApiUrl } from "@/lib/mlb-client";
import type { Player } from "@/types/mlb";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type PlayerSearchProps = {
  className?: string;
  /** Cmd+K style shortcut */
  hotkey?: boolean;
};

export function PlayerSearch({ className, hotkey }: PlayerSearchProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [position, setPosition] = React.useState<string>("ALL");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useSWR(
    debounced.length >= 1 ? mlbApiUrl(`/api/search?q=${encodeURIComponent(debounced)}`) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  const players: Player[] = (data?.players as Player[]) ?? [];

  const filtered =
    position === "ALL"
      ? players
      : players.filter((p) => (p.position || "").toUpperCase().startsWith(position));

  React.useEffect(() => {
    if (!hotkey) return;
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [hotkey]);

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground sm:max-w-md border-border/60 bg-card/50"
            type="button"
          >
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">Search MLB players…</span>
            {hotkey ? (
              <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
                ⌘K
              </kbd>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,420px)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Type a name (e.g. Judge)…" value={q} onValueChange={setQ} />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Searching…" : debounced ? "No players found." : "Type to search."}
              </CommandEmpty>
              <CommandGroup heading="Players">
                {filtered.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name}-${p.id}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate(`/mlb/players/${p.id}`);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.team ?? "—"} · {p.position ?? "—"}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <ToggleGroup
        type="single"
        value={position}
        onValueChange={(v) => v && setPosition(v)}
        className="justify-start"
      >
        {(["ALL", "IF", "OF", "P", "C"] as const).map((pos) => (
          <ToggleGroupItem key={pos} value={pos} className="px-2 text-xs sm:text-sm">
            {pos}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
