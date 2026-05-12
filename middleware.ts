import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/api/:path*"],
};

let ratelimit: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      ratelimit = null;
      return null;
    }
    const redis = Redis.fromEnv();
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, "1 m"),
      prefix: "statpedia:ratelimit",
      analytics: false,
    });
  } catch {
    ratelimit = null;
  }
  return ratelimit ?? null;
}

export default async function middleware(request: NextRequest) {
  const rl = getLimiter();
  if (!rl) {
    return NextResponse.next();
  }

  const id =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";

  const { success, limit, remaining, reset } = await rl.limit(id);

  const res = success
    ? NextResponse.next()
    : NextResponse.json({ error: "Too many requests" }, { status: 429 });

  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset", String(reset));

  return res;
}
