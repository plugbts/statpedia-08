import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  TTL_ODDS_SECONDS,
  TTL_STATS_SECONDS,
  deleteKeysByPrefix,
  isRedisConfigured,
  listCacheKeys,
} from "@/lib/cache";

export const runtime = "edge";

const PostBodySchema = z.object({
  invalidatePrefix: z.string().min(1).max(64).optional(),
  invalidateAllMlb: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix") ?? "mlb:*";
  try {
    const keys = await listCacheKeys(prefix);
    return NextResponse.json({
      ok: true,
      redis: isRedisConfigured(),
      ttlOddsSeconds: TTL_ODDS_SECONDS,
      ttlStatsSeconds: TTL_STATS_SECONDS,
      prefix,
      keyCount: keys.length,
      keys: keys.slice(0, 200),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        redis: isRedisConfigured(),
        ttlOddsSeconds: TTL_ODDS_SECONDS,
        ttlStatsSeconds: TTL_STATS_SECONDS,
        error: String(e),
      },
      { status: 200 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const { invalidatePrefix, invalidateAllMlb } = parsed.data;
  try {
    let deleted = 0;
    if (invalidateAllMlb) {
      deleted += await deleteKeysByPrefix("mlb:");
    }
    if (invalidatePrefix) {
      deleted += await deleteKeysByPrefix(invalidatePrefix);
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
