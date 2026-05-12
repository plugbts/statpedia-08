import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MlbPlayerIdParamSchema, MatchupsResponseSchema } from "@/types/mlb";
import { swrStatsCacheHeaders } from "@/lib/propline";
import { fallbackMatchups, getMatchupsForPlayer } from "@/lib/propsports";

export const runtime = "edge";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ playerId: string }> }) {
  const { playerId: rawId } = await ctx.params;
  const idParse = MlbPlayerIdParamSchema.safeParse(rawId);
  const playerId = idParse.success ? idParse.data : "0";

  let usedFallback = false;
  let payload: z.infer<typeof MatchupsResponseSchema>;

  try {
    if (!idParse.success) {
      payload = fallbackMatchups(rawId || "unknown");
      usedFallback = true;
    } else {
      payload = await getMatchupsForPlayer(playerId);
      const check = MatchupsResponseSchema.safeParse(payload);
      if (!check.success) {
        payload = fallbackMatchups(playerId);
        usedFallback = true;
      }
    }
  } catch (e) {
    console.error("[api/matchups] error", e);
    payload = fallbackMatchups(playerId);
    usedFallback = true;
  }

  const safe = MatchupsResponseSchema.safeParse(payload).success
    ? payload
    : fallbackMatchups(playerId);

  return NextResponse.json(safe, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...swrStatsCacheHeaders(),
      "X-Statpedia-Fallback": usedFallback ? "1" : "0",
    },
  });
}
