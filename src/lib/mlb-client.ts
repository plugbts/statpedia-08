/**
 * Browser URLs for MLB Next/API routes (odds, stats, matchups, search).
 * Uses NEXT_PUBLIC_API_BASE / VITE_API_BASE / VITE_MLB_API_BASE via {@link internalJsonApiUrl}.
 */
import { getInternalJsonApiBase, internalJsonApiUrl } from "@/lib/public-api-base";

export function getMlbApiBaseUrl(): string {
  return getInternalJsonApiBase();
}

export function mlbApiUrl(path: string): string {
  return internalJsonApiUrl(path);
}

export async function mlbFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(mlbApiUrl(path), {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MLB API ${path}: ${res.status} ${t.slice(0, 120)}`);
  }
  return res.json() as Promise<T>;
}
