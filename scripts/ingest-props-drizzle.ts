#!/usr/bin/env tsx

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fetch from 'node-fetch';
import { and, eq } from 'drizzle-orm';

// Drizzle schema (Neon/PG)
import { leagues, teams, players, props } from '../src/db/schema/index';

type V2Event = any; // Use loose type for resilience to API shape changes

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const API_KEY = process.env.SPORTSGAMEODDS_API_KEY || process.env.SPORTS_API_KEY;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  process.exit(1);
}
if (!API_KEY) {
  console.error('❌ Missing SPORTSGAMEODDS_API_KEY (or SPORTS_API_KEY)');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizePropType(market: string): string {
  const key = market.toLowerCase().replace(/\s+/g, '_');
  switch (key) {
    case 'passing_yards': return 'Passing Yards';
    case 'rushing_yards': return 'Rushing Yards';
    case 'receiving_yards': return 'Receiving Yards';
    case 'receptions': return 'Receptions';
    case 'rush_attempts': return 'Rushing Attempts';
    case 'passing_tds': return 'Passing TDs';
    case 'rushing_tds': return 'Rushing TDs';
    case 'receiving_tds': return 'Receiving TDs';
    case 'points': return 'Points';
    case 'assists': return 'Assists';
    case 'rebounds': return 'Rebounds';
    case 'shots_on_goal': return 'Shots on Goal';
    case 'saves': return 'Saves';
    default: return market;
  }
}

function mapStatIdToPropType(statId?: string | null): string | null {
  if (!statId) return null;
  const map: Record<string, string> = {
    passing_yards: 'Passing Yards',
    rushing_yards: 'Rushing Yards',
    receiving_yards: 'Receiving Yards',
    receiving_receptions: 'Receptions',
    rushing_attempts: 'Rushing Attempts',
    passing_touchdowns: 'Passing TDs',
    rushing_touchdowns: 'Rushing TDs',
    receiving_touchdowns: 'Receiving TDs',
    points: 'Points',
    assists: 'Assists',
    rebounds: 'Rebounds',
    shots_on_goal: 'Shots on Goal',
    saves: 'Saves',
  };
  return map[statId] || toTitleCase(statId.replace(/_/g, ' '));
}

function buildConflictKey(league: string, gameId: string, playerId: string, market: string, line: number | string, odds: string) {
  return `${league}:${gameId}:${playerId}:${normalizePropType(market)}:${line}:${odds}`;
}

async function getOrCreateLeagueId(leagueCode: string): Promise<string> {
  const upper = leagueCode.toUpperCase();
  const existing = await db.select({ id: leagues.id }).from(leagues).where(eq(leagues.code, upper)).limit(1);
  if (existing.length > 0) return existing[0].id as string;
  const inserted = await db.insert(leagues).values({ code: upper, name: upper }).returning({ id: leagues.id });
  return inserted[0].id as string;
}

async function getOrCreateTeamId(leagueId: string, name: string, abbr?: string | null, logoUrl?: string | null): Promise<string> {
  const abbreviation = (abbr || name.substring(0, 3)).toUpperCase();
  const existing = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.league_id, leagueId), eq(teams.abbreviation, abbreviation)))
    .limit(1);
  if (existing.length > 0) return existing[0].id as string;
  const inserted = await db
    .insert(teams)
    .values({ league_id: leagueId, name, abbreviation: abbreviation, logo_url: logoUrl || null })
    .returning({ id: teams.id });
  return inserted[0].id as string;
}

async function getOrCreatePlayerId(name: string, teamId?: string | null, position?: string | null): Promise<string> {
  const existing = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.name, name))
    .limit(1);
  if (existing.length > 0) return existing[0].id as string;
  const inserted = await db
    .insert(players)
    .values({ name, team_id: teamId || null, position: position || null, status: 'Active' })
    .returning({ id: players.id });
  return inserted[0].id as string;
}

function extractAbbrFromTeam(team: any): string | undefined {
  return team?.names?.short || team?.abbreviation || undefined;
}

function extractTeamName(team: any): string | undefined {
  return team?.names?.long || team?.name || undefined;
}

function parsePlayerNameFromId(playerId: string): string {
  // Example: DREW_SAMPLE_1_NFL -> Drew Sample
  const base = playerId.replace(/_\d+_.+$/, '');
  return toTitleCase(base.replace(/_/g, ' '));
}

function isCancelled(status: any): boolean {
  if (status == null) return false;
  if (typeof status === 'string') return /cancelled|postponed/i.test(status);
  if (typeof status === 'object') return Boolean(status.cancelled);
  return false;
}

async function ingestLeague(league: string) {
  const leagueId = await getOrCreateLeagueId(league);

  let nextCursor: string | null = null;
  const seen = new Set<string>();
  let totalInserted = 0;

  do {
    const url = `https://api.sportsgameodds.com/v2/events?leagueID=${encodeURIComponent(league)}&oddsAvailable=true&limit=100${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ''}`;
    const res = await fetch(url, {
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`SGO v2 error: ${res.status} ${res.statusText}`);
    const payload = await res.json();
    const events: V2Event[] = payload.data || payload.events || [];

    for (const event of events) {
      if (isCancelled(event?.status)) continue;

      const home = event?.teams?.home || event?.homeTeam || {};
      const away = event?.teams?.away || event?.awayTeam || {};
      const homeAbbr = extractAbbrFromTeam(home) || undefined;
      const awayAbbr = extractAbbrFromTeam(away) || undefined;
      const homeName = extractTeamName(home) || homeAbbr || 'HOME';
      const awayName = extractTeamName(away) || awayAbbr || 'AWAY';

      // Upsert teams first
      const homeTeamId = await getOrCreateTeamId(leagueId, homeName, homeAbbr);
      const awayTeamId = await getOrCreateTeamId(leagueId, awayName, awayAbbr);

      // Odds container (player props live in event.odds under keys per market)
      const oddsObj = event?.odds || {};
      const oddEntries: Array<[string, any]> = Object.entries(oddsObj);

      if (oddEntries.length === 0) continue;

      // Build quick map of player -> team by inspecting event.players if present
      const playerTeamMap = new Map<string, string>();
      const playersObj = event?.players || {};
      for (const [pid, p] of Object.entries(playersObj)) {
        const teamIdRaw: string | undefined = (p as any)?.teamID || (p as any)?.teamId || undefined;
        if (!teamIdRaw) continue;
        // Map external team id to home/away by comparing
        const isHome = teamIdRaw === home?.teamID;
        const teamId = isHome ? homeTeamId : awayTeamId;
        playerTeamMap.set(pid, teamId);
      }

      for (const [oddId, odd] of oddEntries) {
        // Only OU player props with a playerID
        if (!odd?.playerID) continue;
        if (odd?.betTypeID && odd.betTypeID !== 'ou') continue;

        const playerIdRaw: string = odd.playerID;
        const playerName = parsePlayerNameFromId(playerIdRaw);
        const statId: string | null = odd.statID || null;
        const propType = mapStatIdToPropType(statId);
        if (!propType) continue;

        const lineStr: string | undefined = odd.fairOverUnder || odd.bookOverUnder;
        const line = lineStr ? parseFloat(lineStr) : NaN;
        if (!isFinite(line)) continue;

        const oddsStr: string | undefined = odd.fairOdds || odd.bookOdds || undefined;
        if (!oddsStr) continue;

        const gameId: string = event.eventID || event.id || event.game_id || '';
        if (!gameId) continue;

        // Resolve team for player (may be undefined)
        const teamIdForPlayer = playerTeamMap.get(playerIdRaw) || null;

        // Upsert player (by name; our schema lacks externalId)
        const playerRowId = await getOrCreatePlayerId(playerName, teamIdForPlayer, odd?.position || null);

        const conflictKey = buildConflictKey(league, gameId, playerRowId, propType, line, String(oddsStr));
        if (seen.has(conflictKey)) continue;
        seen.add(conflictKey);

        try {
          await db.insert(props).values({
            player_id: playerRowId,
            team_id: teamIdForPlayer,
            game_id: gameId,
            prop_type: propType,
            line: String(line),
            odds: String(oddsStr),
          });
          totalInserted += 1;
        } catch (e) {
          // Best-effort insert; continue on errors
          // console.error('Insert failed for prop', e);
        }
      }
    }

    nextCursor = payload.nextCursor || null;
  } while (nextCursor);

  console.log(`✅ ${league}: inserted ${totalInserted} props`);
}

async function main() {
  try {
    const leagueArg = (process.argv[2] || 'NFL').toUpperCase();
    const leaguesToIngest = leagueArg === 'ALL' ? ['NFL', 'NBA', 'MLB', 'NHL'] : [leagueArg];
    for (const lg of leaguesToIngest) {
      console.log(`\n🚀 Ingesting ${lg} player props...`);
      await ingestLeague(lg);
    }
    console.log('\n🎉 Drizzle ingestion completed');
  } catch (err) {
    console.error('❌ Ingestion failed', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}


