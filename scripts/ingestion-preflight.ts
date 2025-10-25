import "dotenv/config";
import fetch from "node-fetch";
import postgres from "postgres";

type League = "NBA" | "NFL" | "MLB" | "WNBA" | "NHL";

async function fetchWithTimeout(url: string, init: any = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal } as any);
  } finally {
    clearTimeout(id);
  }
}

async function schedule(
  league: League,
  dateStr: string,
): Promise<Array<{ gameId: string; home?: string; away?: string }>> {
  try {
    if (league === "NBA") {
      const yyyymmdd = dateStr.replace(/-/g, "");
      const url = `https://cdn.nba.com/static/json/liveData/scoreboard/v2/scoreboard_${yyyymmdd}.json`;
      const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const data: any = await res.json();
      const games = (data?.scoreboard?.games as any[]) || [];
      return games.map((g: any) => ({
        gameId: g.gameId,
        home: g.homeTeam?.teamTricode,
        away: g.awayTeam?.teamTricode,
      }));
    }
    if (league === "WNBA") {
      const [y, m, d] = dateStr.split("-");
      const gameDate = `${m}/${d}/${y}`;
      const res = await fetchWithTimeout(
        `https://stats.wnba.com/stats/scoreboardv2?DayOffset=0&GameDate=${encodeURIComponent(gameDate)}&LeagueID=10`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            Referer: "https://www.wnba.com/",
            Origin: "https://www.wnba.com",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      const rows = (data?.resultSets?.[0]?.rowSet as any[]) || [];
      return rows.map((r: any[]) => ({ gameId: String(r[2]), home: r[6], away: r[4] }));
    }
    if (league === "MLB") {
      const res = await fetchWithTimeout(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}`,
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      const games = (data?.dates?.[0]?.games as any[]) || [];
      return games.map((g: any) => ({
        gameId: String(g.gamePk),
        home: g?.teams?.home?.team?.abbreviation,
        away: g?.teams?.away?.team?.abbreviation,
      }));
    }
    if (league === "NFL") {
      const yyyymmdd = dateStr.replace(/-/g, "");
      const res = await fetchWithTimeout(
        `https://site.api.espn.com/apis/v2/sports/football/nfl/scoreboard?dates=${yyyymmdd}`,
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      const events = (data?.events as any[]) || [];
      const out: Array<{ gameId: string; home?: string; away?: string }> = [];
      for (const ev of events) {
        const comp = ev?.competitions?.[0];
        if (!comp) continue;
        const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
        const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
        out.push({
          gameId: String(comp.id),
          home: home?.team?.abbreviation,
          away: away?.team?.abbreviation,
        });
      }
      return out;
    }
    if (league === "NHL") {
      const res = await fetchWithTimeout(
        `https://statsapi.web.nhl.com/api/v1/schedule?date=${dateStr}`,
      );
      if (!res.ok) return [];
      const data: any = await res.json();
      const games = (data?.dates?.[0]?.games as any[]) || [];
      return games.map((g: any) => ({ gameId: String(g.gamePk) }));
    }
  } catch {
    return [];
  }
  return [];
}

async function boxscoreProbe(
  league: League,
  gameId: string,
): Promise<{ ok: boolean; note?: string }> {
  try {
    if (league === "NBA") {
      const url = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;
      const r = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
      return { ok: r.ok, note: `status=${r.status}` };
    }
    if (league === "WNBA") {
      const base = "https://stats.wnba.com/stats";
      const url = `${base}/boxscoretraditionalv2?GameID=${gameId}&StartPeriod=0&EndPeriod=0&StartRange=0&EndRange=0&RangeType=0`;
      const r = await fetchWithTimeout(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
          Referer: "https://www.wnba.com/",
          Origin: "https://www.wnba.com",
        },
      });
      return { ok: r.ok, note: `status=${r.status}` };
    }
    if (league === "MLB") {
      const r = await fetchWithTimeout(
        `https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`,
      );
      return { ok: r.ok, note: `status=${r.status}` };
    }
    if (league === "NFL") {
      const r = await fetchWithTimeout(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`,
      );
      return { ok: r.ok, note: `status=${r.status}` };
    }
    if (league === "NHL") {
      const r = await fetchWithTimeout(
        `https://statsapi.web.nhl.com/api/v1/game/${gameId}/feed/live`,
      );
      return { ok: r.ok, note: `status=${r.status}` };
    }
  } catch (e: any) {
    return { ok: false, note: e?.message || String(e) };
  }
  return { ok: false };
}

async function dbProbe() {
  const conn = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) return { ok: false, note: "No DATABASE_URL/NEON_DATABASE_URL" };
  const sql = postgres(conn, { prepare: false });
  try {
    const [l] = await sql<{ n: number }[]>`select count(*)::int as n from public.leagues`;
    const [t] = await sql<{ n: number }[]>`select count(*)::int as n from public.teams`;
    return { ok: true, leagues: l.n, teams: t.n } as any;
  } catch (e: any) {
    return { ok: false, note: e?.message || String(e) };
  } finally {
    try {
      await sql.end({ timeout: 2 });
    } catch (e) {
      // ignore end errors
    }
  }
}

async function main() {
  console.log("Ingestion Preflight (read-only):");
  const today = new Date();
  const days = Number(process.env.PREFLIGHT_DAYS || 7);
  const leagues: League[] = ["NFL", "NBA", "MLB", "WNBA", "NHL"];

  for (const lg of leagues) {
    let total = 0;
    let sample: { gameId: string; home?: string; away?: string } | undefined;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const sched = await schedule(lg, ds);
      total += sched.length;
      if (!sample && sched.length > 0) sample = sched[0];
    }
    console.log(`- ${lg}: last ${days} days schedule total = ${total}`);
    if (sample) {
      const probe = await boxscoreProbe(lg, sample.gameId);
      console.log(`  sample game ${sample.gameId} boxscore: ok=${probe.ok} ${probe.note || ""}`);
    } else {
      console.log("  no games found in range");
    }
  }

  const db = await dbProbe();
  console.log("DB:", db);
}

main().catch((e) => {
  console.error("preflight failed:", e);
  process.exit(1);
});
