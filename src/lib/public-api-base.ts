/**
 * Base URL for internal MLB JSON APIs (Next route handlers or Vercel serverless).
 *
 * Set in `.env.local`:
 *   NEXT_PUBLIC_API_BASE=http://localhost:3000/api
 * Production:
 *   NEXT_PUBLIC_API_BASE=https://yourdomain.com/api
 *
 * Paths in the app use `/api/odds/...`, `/api/stats/...`. If the base already ends with `/api`,
 * `/api/...` request paths are normalized so you do not get `/api/api/...`.
 */
export function getInternalJsonApiBase(): string {
  if (typeof import.meta === "undefined") return "";
  const env = (import.meta as ImportMeta).env as Record<string, string | undefined>;
  const raw = env.NEXT_PUBLIC_API_BASE || env.VITE_API_BASE || env.VITE_MLB_API_BASE || "";
  return String(raw).trim().replace(/\/+$/, "");
}

/** Absolute or same-origin URL for internal JSON routes. */
export function internalJsonApiUrl(path: string): string {
  const base = getInternalJsonApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  if (base.endsWith("/api") && p.startsWith("/api/")) {
    return `${base}${p.slice(4)}`;
  }
  return `${base}${p}`;
}
