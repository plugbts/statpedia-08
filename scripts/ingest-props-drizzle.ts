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

// Priority props that 90% of users care about
const PRIORITY_PROPS = new Set([
  // NFL Priority Props
  'Passing Yards',
  'Passing TDs',
  'Passing Attempts',
  'Passing Completions',
  'Rushing Yards',
  'Rushing TDs',
  'Rushing Attempts',
  'Receiving Yards',
  'Receiving TDs',
  'Receptions',
  'Rush+Rec Yards',
  'Pass+Rush Yards',
  'Anytime TD',
  'First TD',
  'Interceptions',
  'Sacks',
  'Tackles',
  'Fantasy Score',
  
  // NBA Priority Props
  'Points',
  'Assists',
  'Rebounds',
  '3-Pointers Made',
  'Steals',
  'Blocks',
  'Turnovers',
  'Points+Assists',
  'Points+Rebounds',
  'Assists+Rebounds',
  'Points+Assists+Rebounds',
  
  // MLB Priority Props
  'Hits',
  'Singles',
  'Doubles',
  'Triples',
  'Home Runs',
  'Total Bases',
  'Runs',
  'RBIs',
  'Walks',
  'Stolen Bases',
  'Strikeouts',
  'Pitcher Strikeouts',
  'Earned Runs',
  'Hits Allowed',
  'Pitcher Walks',
  'Innings Pitched',
  
  // NHL Priority Props
  'Goals',
  'Assists',
  'Shots on Goal',
  'Blocked Shots',
  'Saves',
  'Goals Against',
]);

function normalizePropType(market: string): string {
  const key = market.toLowerCase().replace(/\s+/g, '_');
  switch (key) {
    // NFL
    case 'passing_yards': return 'Passing Yards';
    case 'passing_touchdowns':
    case 'passing_tds': return 'Passing TDs';
    case 'passing_attempts': return 'Passing Attempts';
    case 'passing_completions': return 'Passing Completions';
    case 'rushing_yards': return 'Rushing Yards';
    case 'rushing_touchdowns':
    case 'rushing_tds': return 'Rushing TDs';
    case 'rushing_attempts': return 'Rushing Attempts';
    case 'receiving_yards': return 'Receiving Yards';
    case 'receiving_touchdowns':
    case 'receiving_tds': return 'Receiving TDs';
    case 'receiving_receptions':
    case 'receptions': return 'Receptions';
    case 'rushing_receiving_yards':
    case 'rush_rec_yards': return 'Rush+Rec Yards';
    case 'passing_rushing_yards':
    case 'pass_rush_yards': return 'Pass+Rush Yards';
    case 'anytime_touchdown':
    case 'anytime_td':
    case 'touchdowns': return 'Anytime TD';
    case 'first_touchdown':
    case 'first_td': return 'First TD';
    case 'defense_interceptions':
    case 'interceptions': return 'Interceptions';
    case 'defense_sacks':
    case 'sacks': return 'Sacks';
    case 'defense_combinedtackles':
    case 'tackles': return 'Tackles';
    case 'defense_solo_tackles': return 'Solo Tackles';
    case 'defense_assisted_tackles': return 'Assisted Tackles';
    case 'fantasyscore':
    case 'fantasy_score': return 'Fantasy Score';
    
    // NBA
    case 'points': return 'Points';
    case 'assists': return 'Assists';
    case 'rebounds': return 'Rebounds';
    case 'three_pointers_made':
    case '3pm':
    case 'threes': return '3-Pointers Made';
    case 'steals': return 'Steals';
    case 'blocks': return 'Blocks';
    case 'turnovers': return 'Turnovers';
    case 'points_assists':
    case 'pts_ast': return 'Points+Assists';
    case 'points_rebounds':
    case 'pts_reb': return 'Points+Rebounds';
    case 'assists_rebounds':
    case 'ast_reb': return 'Assists+Rebounds';
    case 'points_assists_rebounds':
    case 'pts_ast_reb': return 'Points+Assists+Rebounds';
    
    // MLB Batting
    case 'batting_hits':
    case 'hits':
    case 'total_hits':
    case 'over_0.5_hits': return 'Hits';
    case 'batting_singles':
    case 'singles':
    case '1b': return 'Singles';
    case 'batting_doubles':
    case 'doubles':
    case '2b': return 'Doubles';
    case 'batting_triples':
    case 'triples':
    case '3b': return 'Triples';
    case 'batting_homeruns':
    case 'batting_home_runs':
    case 'home_runs':
    case 'hr': return 'Home Runs';
    case 'batting_totalbases':
    case 'total_bases':
    case 'tb': return 'Total Bases';
    case 'batting_runs':
    case 'runs':
    case 'runs_scored': return 'Runs';
    case 'batting_rbis':
    case 'batting_rbi':
    case 'rbis':
    case 'rbi':
    case 'runs_batted_in': return 'RBIs';
    case 'batting_walks':
    case 'batting_basesonballs':
    case 'walks':
    case 'bb': return 'Walks';
    case 'batting_stolenbases':
    case 'stolen_bases':
    case 'sb': return 'Stolen Bases';
    case 'batting_strikeouts':
    case 'strikeouts': return 'Strikeouts';
    
    // MLB Pitching
    case 'pitching_strikeouts':
    case 'pitcher_strikeouts':
    case 'pitcher_outs': return 'Pitcher Strikeouts';
    case 'pitching_earnedruns':
    case 'earned_runs':
    case 'er': return 'Earned Runs';
    case 'pitching_hitsallowed':
    case 'hits_allowed': return 'Hits Allowed';
    case 'pitching_walks':
    case 'pitcher_walks': return 'Pitcher Walks';
    case 'pitching_innings':
    case 'innings_pitched': return 'Innings Pitched';
    
    // NHL
    case 'goals': return 'Goals';
    case 'shots_on_goal': return 'Shots on Goal';
    case 'blocked_shots': return 'Blocked Shots';
    case 'saves': return 'Saves';
    case 'goals_against': return 'Goals Against';
    
    // Fallback: title case the input
    default: return toTitleCase(market);
  }
}

function isPriorityProp(propType: string): boolean {
  return PRIORITY_PROPS.has(propType);
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
  let totalPriorityInserted = 0;

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

        // Determine if this is a priority prop
        const priority = isPriorityProp(propType);

        try {
          await db.insert(props).values({
            player_id: playerRowId,
            team_id: teamIdForPlayer,
            game_id: gameId,
            prop_type: propType,
            line: String(line),
            odds: String(oddsStr),
            priority: priority,
            side: side as 'over' | 'under',
            conflict_key: conflictKey,
          });
          totalInserted += 1;
          if (priority) totalPriorityInserted += 1;
        } catch (e) {
          // Best-effort insert; continue on errors
          // console.error('Insert failed for prop', e);
        }
      }
    }

    nextCursor = payload.nextCursor || null;
  } while (nextCursor);

  console.log(`✅ ${league}: inserted ${totalInserted} props (${totalPriorityInserted} priority, ${totalInserted - totalPriorityInserted} extended)`);
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


