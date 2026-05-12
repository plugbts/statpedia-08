import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SearchQuerySchema, SearchResponseSchema } from "@/types/mlb";
import { swrStatsCacheHeaders } from "@/lib/propline";
import { fallbackSearch, searchPlayersCached } from "@/lib/propsports";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const qRaw = req.nextUrl.searchParams.get("q") ?? "";
  const qParse = SearchQuerySchema.safeParse(qRaw);

  let usedFallback = false;
  let payload: z.infer<typeof SearchResponseSchema>;

  try {
    if (!qParse.success) {
      payload = { players: [] };
      usedFallback = true;
    } else {
      const q = qParse.data;
      payload = await searchPlayersCached(q);
      const check = SearchResponseSchema.safeParse(payload);
      if (!check.success) {
        payload = fallbackSearch(q);
        usedFallback = true;
      }
    }
  } catch (e) {
    console.error("[api/search] error", e);
    payload = fallbackSearch(qParse.success ? qParse.data : qRaw);
    usedFallback = true;
  }

  const safe = SearchResponseSchema.safeParse(payload).success
    ? payload
    : fallbackSearch(qParse.success ? qParse.data : "unknown");

  return NextResponse.json(safe, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...swrStatsCacheHeaders(),
      "X-Statpedia-Fallback": usedFallback ? "1" : "0",
    },
  });
}
