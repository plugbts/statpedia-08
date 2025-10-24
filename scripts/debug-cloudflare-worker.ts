#!/usr/bin/env tsx

import "dotenv/config";

const BASE = "https://statpedia-player-props.statpedia.workers.dev";

function log(section: string, obj: any) {
  console.log(`\n=== ${section} ===`);
  console.log(JSON.stringify(obj, null, 2));
}

async function postIngest(payload: any) {
  const res = await fetch(`${BASE}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch (e) {
    /* ignore JSON parse errors */
  }
  return { status: res.status, ok: res.ok, json };
}

async function getProps(params: Record<string, string>) {
  const url = new URL(`${BASE}/api/player-props`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString());
  let json: any = null;
  try {
    json = await res.json();
  } catch (e) {
    /* ignore JSON parse errors */
  }
  return { status: res.status, ok: res.ok, url: url.toString(), json };
}

async function main() {
  const date = process.argv[2] || new Date().toISOString().split("T")[0];

  const ingestVariants = [
    { label: "league+date", body: { league: "MLB", date } },
    { label: "sport+date", body: { sport: "mlb", date } },
    { label: "league+season+date", body: { league: "MLB", season: "2025", date } },
    {
      label: "league+season+phase+date",
      body: { league: "MLB", season: "2025", phase: "postseason", date },
    },
  ];

  for (const v of ingestVariants) {
    const r = await postIngest(v.body);
    log(`POST /ingest ${v.label}`, r);
  }

  const getVariants: Array<{ label: string; params: Record<string, string> }> = [
    { label: "sport+date+force", params: { sport: "mlb", date, force_refresh: "true" } },
    {
      label: "sport+league+date+force",
      params: { sport: "mlb", league: "MLB", date, force_refresh: "true" },
    },
    {
      label: "sport+date_from/to+force",
      params: {
        sport: "mlb",
        date_from: new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        date_to: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        date,
        force_refresh: "true",
      },
    },
  ];

  for (const v of getVariants) {
    const r = await getProps(v.params);
    log(`GET /api/player-props ${v.label}`, {
      status: r.status,
      ok: r.ok,
      url: r.url,
      meta: r.json
        ? {
            success: r.json.success,
            totalProps: r.json.totalProps,
            totalEvents: r.json.totalEvents,
            cached: r.json.cached,
            error: r.json.error,
          }
        : null,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
