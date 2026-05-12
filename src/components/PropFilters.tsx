"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type PropMarket = "hits" | "hr" | "k";
export type PropSide = "over" | "under";

export type PropFiltersValue = {
  market: PropMarket;
  side: PropSide;
};

export type PropFiltersProps = {
  value: PropFiltersValue;
  onChange: (next: PropFiltersValue) => void;
  className?: string;
};

export function PropFilters({ value, onChange, className }: PropFiltersProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4", className)}>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Market</p>
        <ToggleGroup
          type="single"
          value={value.market}
          onValueChange={(v) => {
            if (v === "hits" || v === "hr" || v === "k") onChange({ ...value, market: v });
          }}
          className="flex flex-wrap justify-start"
        >
          <ToggleGroupItem value="hits" className="px-3 text-xs sm:text-sm">
            Hits
          </ToggleGroupItem>
          <ToggleGroupItem value="hr" className="px-3 text-xs sm:text-sm">
            HR
          </ToggleGroupItem>
          <ToggleGroupItem value="k" className="px-3 text-xs sm:text-sm">
            K
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Side</p>
        <ToggleGroup
          type="single"
          value={value.side}
          onValueChange={(v) => {
            if (v === "over" || v === "under") onChange({ ...value, side: v });
          }}
        >
          <ToggleGroupItem value="over" className="min-w-[4.5rem] text-xs sm:text-sm">
            Over
          </ToggleGroupItem>
          <ToggleGroupItem value="under" className="min-w-[4.5rem] text-xs sm:text-sm">
            Under
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
