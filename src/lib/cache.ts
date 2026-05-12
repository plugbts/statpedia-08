import { Redis } from "@upstash/redis";

/** Short-lived odds / books (DK/FD/Pinnacle) */
export const TTL_ODDS_SECONDS = 300;

/** Statcast, L5/L20, matchups — slower-moving */
export const TTL_STATS_SECONDS = 3600;

let redisSingleton: Redis | null | undefined;

function log(msg: string, extra?: Record<string, unknown>) {
  console.info(`[mlb-cache] ${msg}`, extra ?? "");
}

export function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisSingleton = null;
    return null;
  }
  try {
    redisSingleton = new Redis({ url, token });
  } catch (e) {
    console.warn("[mlb-cache] Redis init failed", e);
    redisSingleton = null;
  }
  return redisSingleton;
}

export function isRedisConfigured(): boolean {
  return !!getRedis();
}

/**
 * Read-through JSON cache with explicit TTL (Edge-safe; Upstash REST).
 */
export async function withCacheJson<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const r = getRedis();
  if (r) {
    try {
      const raw = await r.get<string>(key);
      if (raw != null && raw !== "") {
        try {
          return JSON.parse(raw) as T;
        } catch {
          /* fall through */
        }
      }
    } catch (e) {
      log("get miss", { key, err: String(e) });
    }
  }

  const val = await producer();

  if (r) {
    try {
      await r.set(key, JSON.stringify(val), { ex: ttlSeconds });
    } catch (e) {
      log("set failed", { key, err: String(e) });
    }
  }

  return val;
}

/** List keys matching pattern (dev/admin; avoid hot path in prod traffic). */
export async function listCacheKeys(pattern: string): Promise<string[]> {
  const r = getRedis();
  if (!r) return [];
  try {
    const keys = await r.keys(pattern);
    return Array.isArray(keys) ? keys : [];
  } catch (e) {
    log("keys failed", { pattern, err: String(e) });
    return [];
  }
}

/** Delete keys matching prefix `mlb:odds:` etc. Returns deleted count. */
export async function deleteKeysByPrefix(prefix: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  const pattern = prefix.endsWith("*") ? prefix : `${prefix}*`;
  let deleted = 0;
  try {
    const keys = await r.keys(pattern);
    const batch = keys.slice(0, 500);
    for (const k of batch) {
      await r.del(k);
      deleted++;
    }
  } catch (e) {
    log("delete prefix failed", { prefix, err: String(e) });
  }
  return deleted;
}
