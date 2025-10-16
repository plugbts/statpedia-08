// Centralized API client for routing all app requests
// Dev -> local API server; Prod -> Cloudflare Worker (VITE_AUTH_ENDPOINT)

export function getApiBaseUrl(): string {
  // In dev, always use the local API server
  if (import.meta.env.DEV) return "http://localhost:3001";
  // In prod, prefer configured endpoint; fallback to default Worker URL
  return (
    (import.meta as any).env?.VITE_AUTH_ENDPOINT ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_AUTH_ENDPOINT) ||
    "https://statpedia-player-props.statpedia.workers.dev"
  );
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${getApiBaseUrl()}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as Record<string, string>;

  const resp = await fetch(url, { ...options, headers });
  return resp;
}
