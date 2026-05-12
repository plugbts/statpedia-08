import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MlbPlayerIdParamSchema, StatsResponseSchema } from "@/types/mlb";
import { swrCacheHeaders, swrStatsCacheHeaders } from "@/lib/propline";
import { fallbackStats, getStatsForPlayer } from "@/lib/propsports";

export const runtime = "edge";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ playerId: string }> }) {
  const { playerId: rawId } = await ctx.params;
  const idParse = MlbPlayerIdParamSchema.safeParse(rawId);
  const playerId = idParse.success ? idParse.data : "0";

  let usedFallback = false;
  let payload: z.infer<typeof StatsResponseSchema>;

  try {
    if (!idParse.success) {
      payload = fallbackStats(rawId || "unknown");
      usedFallback = true;
    } else {
      payload = await getStatsForPlayer(playerId);
      const check = StatsResponseSchema.safeParse(payload);
      if (!check.success) {
        payload = fallbackStats(playerId);
        usedFallback = true;
      }
    }
  } catch (e) {
    console.error("[api/stats] error", e);
    payload = fallbackStats(playerId);
    usedFallback = true;
  }

  const safe = StatsResponseSchema.safeParse(payload).success ? payload : fallbackStats(playerId);

  return NextResponse.json(safe, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...swrStatsCacheHeaders(),
      "X-Statpedia-Fallback": usedFallback ? "1" : "0",
    },
  });
}
