#!/usr/bin/env tsx

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fetch from 'node-fetch';
import { and, eq } from 'drizzle-orm';

// Drizzle schema (Neon/PG)
import { leagues, teams, players, props, pickemProps } from '../src/db/schema/index';

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
    case 'passing_yards':
    case 'pass_yards':
    case 'pass_yds': return 'Passing Yards';
    case 'passing_touchdowns':
    case 'passing_tds':
    case 'pass_tds': return 'Passing TDs';
    case 'passing_attempts': return 'Passing Attempts';
    case 'completions':
    case 'pass_completions':
    case 'passing_completions': return 'Passing Completions';
    case 'rushing_yards':
    case 'rush_yards':
    case 'rush_yds': return 'Rushing Yards';
    case 'rushing_touchdowns':
    case 'rushing_tds':
    case 'rush_tds': return 'Rushing TDs';
    case 'rushing_attempts': return 'Rushing Attempts';
    case 'longest_rush':
    case 'long_rush': return 'Longest Rush';
    case 'receiving_yards':
    case 'rec_yards':
    case 'rec_yds': return 'Receiving Yards';
    case 'receiving_touchdowns':
    case 'receiving_tds':
    case 'rec_tds': return 'Receiving TDs';
    case 'receiving_receptions':
    case 'receptions':
    case 'catches': return 'Receptions';
    case 'longest_reception':
    case 'long_rec': return 'Longest Reception';
    case 'rushing_receiving_yards':
    case 'rush_rec_yards':
    case 'rushing+receiving_yards':
    case 'rush+rec': return 'Rush + Rec Yards';
    case 'passing_rushing_yards':
    case 'pass_rush_yards':
    case 'pass+rush':
    case 'passing+rushing_yards': return 'Pass + Rush Yards';
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

// League-specific priority sets
const leaguePrioritySets: Record<string, Set<string>> = {
  NFL: new Set([
    "Passing Yards","Passing TDs","Pass Attempts","Passing Completions","Interceptions",
    "Rushing Yards","Rushing TDs","Rush Attempts","Longest Rush",
    "Receiving Yards","Receptions","Receiving TDs","Longest Reception",
    "Rush + Rec Yards","Pass + Rush Yards"
  ]),
  NBA: new Set([
    "Points","Assists","Rebounds","Points + Assists","Points + Rebounds","Points + Rebounds + Assists",
    "3-Pointers Made","Steals","Blocks"
  ]),
  MLB: new Set([
    "Hits","Singles","Doubles","Triples","Home Runs","Total Bases","Runs","RBIs","Walks","Stolen Bases",
    "Strikeouts","Pitcher Outs Recorded"
  ]),
  NHL: new Set([
    "Shots on Goal","Goals","Assists","Points","Saves"
  ]),
  WNBA: new Set([
    "Points","Assists","Rebounds","Points + Rebounds + Assists","3-Pointers Made"
  ]),
  CBB: new Set([
    "Points","Assists","Rebounds","Points + Rebounds + Assists","3-Pointers Made"
  ])
};

function isPriorityProp(propType: string, league: string): boolean {
  return leaguePrioritySets[league]?.has(propType) ?? false;
}

function mapStatIdToPropType(statId?: string | null): string | null {
  if (!statId) return null;
  const map: Record<string, string> = {
    passing_yards: 'Passing Yards',
    rushing_yards: 'Rushing Yards',
    receiving_yards: 'Receiving Yards',
    receiving_receptions: 'Receptions',
    receiving_longestreception: 'Longest Reception',
    rushing_longestrush: 'Longest Rush',
    passing_longestcompletion: 'Longest Completion',
    rushing_attempts: 'Rushing Attempts',
    passing_touchdowns: 'Passing TDs',
    rushing_touchdowns: 'Rushing TDs',
    receiving_touchdowns: 'Receiving TDs',
    points: 'Points',
    assists: 'Assists',
    rebounds: 'Rebounds',
    shots_on_goal: 'Shots on Goal',
    saves: 'Saves',
    // MLB Batting
    batting_totalbases: 'Total Bases',
    batting_homeruns: 'Home Runs',
    batting_hits: 'Hits',
    batting_doubles: 'Doubles',
    batting_singles: 'Singles',
    batting_triples: 'Triples',
    batting_rbi: 'RBIs',
    batting_hits_runs_rbi: 'Hits + Runs + RBIs',
    // MLB Pitching
    pitching_strikeouts: 'Pitcher Strikeouts',
    pitching_outs: 'Innings Pitched',
    pitching_hits: 'Hits Allowed',
    // NHL
    shots_ongoal: 'Shots on Goal',
    goals_assists: 'Goals + Assists',
    powerplay_goals_assists: 'Power Play Goals + Assists',
    minutesplayed: 'Minutes Played',
    // Defense
    defense_combinedtackles: 'Tackles',
    defense_solo_tackles: 'Solo Tackles',
    defense_assisted_tackles: 'Assisted Tackles',
  };
  return map[statId] || toTitleCase(statId.replace(/_/g, ' '));
}

function buildConflictKey(league: string, gameId: string, playerId: string, market: string, line: number | string) {
  // Dedupe on league + game + player + prop_type + line only
  // This collapses multiple books offering the same market into one row
  return `${league}:${gameId}:${playerId}:${normalizePropType(market)}:${line}`;
}

function buildPickemConflictKey(league: string, gameId: string, playerId: string, market: string, line: number | string, site: string) {
  // Dedupe on league + game + player + prop_type + line + site
  // This allows multiple pickem sites for the same prop
  return `${league}:${gameId}:${playerId}:${normalizePropType(market)}:${line}:${site}`;
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

      // PropFinder-style aggregation: collect all odds by (player, prop_type, line)
      const sportsbookPropMap = new Map<string, any>();
      const pickemPropMap = new Map<string, any>();

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

        const side: string = odd.sideID || odd.side || 'over';
        const gameId: string = event.eventID || event.id || event.game_id || '';
        if (!gameId) continue;

        // 🔍 DEBUG: Log raw prop data for Xavier Worthy and other key players
        if (playerName.toLowerCase().includes('worthy') || 
            playerName.toLowerCase().includes('mahomes') || 
            playerName.toLowerCase().includes('allen')) {
          console.log("🔍 RAW MARKET DEBUG:", {
            player: playerName,
            statId: statId,
            propType: propType,
            rawLine: lineStr,
            parsedLine: line,
            odds: oddsStr,
            side: side,
            rawOdd: {
              oddID: odd.oddID,
              marketName: odd.marketName,
              fairOverUnder: odd.fairOverUnder,
              bookOverUnder: odd.bookOverUnder,
              fairOdds: odd.fairOdds,
              bookOdds: odd.bookOdds
            }
          });
        }

        // Resolve team for player
        const teamIdForPlayer = playerTeamMap.get(playerIdRaw) || null;
        const playerRowId = await getOrCreatePlayerId(playerName, teamIdForPlayer, odd?.position || null);

        // Determine if this is sportsbook or pickem
        // Since the API doesn't have bookmaker/book fields, we'll treat all props as sportsbook
        // unless they have specific pickem indicators
        const isSportsbook = true; // All props from this API are sportsbook props
        const bookName = 'SportsGameOdds'; // Default book name
        
        // 🔍 DEBUG: Log sportsbook detection
        if (playerName.toLowerCase().includes('worthy') || 
            playerName.toLowerCase().includes('allen')) {
          console.log("🔍 SPORTSBOOK DEBUG:", {
            player: playerName,
            propType: propType,
            line: line,
            isSportsbook: isSportsbook,
            bookName: bookName,
            bookmaker: odd?.bookmaker,
            book: odd?.book
          });
        }
        
        if (isSportsbook) {
          // Handle sportsbook props (existing logic)
          const key = `${playerRowId}:${propType}:${line}`;
          
          if (!sportsbookPropMap.has(key)) {
            sportsbookPropMap.set(key, {
              playerId: playerRowId,
              teamId: teamIdForPlayer,
              gameId: gameId,
              propType: propType,
              line: line,
              bestOddsOver: null,
              bestOddsUnder: null,
              booksOver: {},
              booksUnder: {},
              priority: isPriorityProp(propType, league)
            });
          }

          const propEntry = sportsbookPropMap.get(key);
          
          // Aggregate odds by side
          if (side === 'over') {
            propEntry.booksOver[bookName] = oddsStr;
            if (!propEntry.bestOddsOver || Number(oddsStr) > Number(propEntry.bestOddsOver)) {
              propEntry.bestOddsOver = oddsStr;
            }
            
            // 🔍 DEBUG: Log over odds aggregation
            if (playerName.toLowerCase().includes('worthy') || 
                playerName.toLowerCase().includes('allen')) {
              console.log("🔍 OVER AGGREGATION:", {
                player: playerName,
                propType: propType,
                line: line,
                odds: oddsStr,
                bestOddsOver: propEntry.bestOddsOver
              });
            }
          } else if (side === 'under') {
            propEntry.booksUnder[bookName] = oddsStr;
            if (!propEntry.bestOddsUnder || Number(oddsStr) > Number(propEntry.bestOddsUnder)) {
              propEntry.bestOddsUnder = oddsStr;
            }
            
            // 🔍 DEBUG: Log under odds aggregation
            if (playerName.toLowerCase().includes('worthy') || 
                playerName.toLowerCase().includes('allen')) {
              console.log("🔍 UNDER AGGREGATION:", {
                player: playerName,
                propType: propType,
                line: line,
                odds: oddsStr,
                bestOddsUnder: propEntry.bestOddsUnder
              });
            }
          }
        } else {
          // Handle pickem props (new logic)
          const key = `${playerRowId}:${propType}:${line}:${bookName}`;
          
          if (!pickemPropMap.has(key)) {
            pickemPropMap.set(key, {
              playerId: playerRowId,
              teamId: teamIdForPlayer,
              gameId: gameId,
              propType: propType,
              line: line,
              site: bookName,
              overProjection: null,
              underProjection: null
            });
          }

          const propEntry = pickemPropMap.get(key);
          
          // Store projections by side
          if (side === 'over') {
            propEntry.overProjection = parseFloat(oddsStr);
          } else if (side === 'under') {
            propEntry.underProjection = parseFloat(oddsStr);
          }
        }
      }

      // Insert sportsbook props
      for (const [key, propEntry] of sportsbookPropMap) {
        const conflictKey = buildConflictKey(league, propEntry.gameId, propEntry.playerId, propEntry.propType, propEntry.line);
        if (seen.has(conflictKey)) continue;
        seen.add(conflictKey);

        try {
          // 🔍 DEBUG: Log insertion data
          if (propEntry.playerId && propEntry.propType && propEntry.propType.includes('Passing Yards')) {
            console.log("🔍 INSERTION DEBUG:", {
              playerId: propEntry.playerId,
              propType: propEntry.propType,
              line: propEntry.line,
              bestOddsOver: propEntry.bestOddsOver,
              bestOddsUnder: propEntry.bestOddsUnder,
              booksOver: Object.keys(propEntry.booksOver),
              booksUnder: Object.keys(propEntry.booksUnder)
            });
          }
          
          await db.insert(props).values({
            player_id: propEntry.playerId,
            team_id: propEntry.teamId,
            game_id: propEntry.gameId,
            prop_type: propEntry.propType,
            line: String(propEntry.line),
            odds: propEntry.bestOddsOver || propEntry.bestOddsUnder || '0', // Fallback odds
            priority: propEntry.priority,
            side: 'both', // Indicates this prop has both over and under
            source: 'sportsbook',
            best_odds_over: propEntry.bestOddsOver,
            best_odds_under: propEntry.bestOddsUnder,
            books_over: JSON.stringify(propEntry.booksOver),
            books_under: JSON.stringify(propEntry.booksUnder),
            conflict_key: conflictKey,
          }).onConflictDoUpdate({
            target: [props.conflict_key],
            set: {
              best_odds_over: propEntry.bestOddsOver,
              best_odds_under: propEntry.bestOddsUnder,
              books_over: JSON.stringify(propEntry.booksOver),
              books_under: JSON.stringify(propEntry.booksUnder),
              updated_at: new Date(),
            }
          });
          totalInserted += 1;
          if (propEntry.priority) totalPriorityInserted += 1;
        } catch (e) {
          // Best-effort insert; continue on errors
          console.error('Insert failed for sportsbook prop', e);
        }
      }

      // Insert pickem props
      for (const [key, propEntry] of pickemPropMap) {
        const conflictKey = buildPickemConflictKey(league, propEntry.gameId, propEntry.playerId, propEntry.propType, propEntry.line, propEntry.site);
        
        try {
          await db.insert(pickemProps).values({
            player_id: propEntry.playerId,
            team_id: propEntry.teamId,
            game_id: propEntry.gameId,
            prop_type: propEntry.propType,
            line: String(propEntry.line),
            pickem_site: propEntry.site,
            over_projection: propEntry.overProjection ? String(propEntry.overProjection) : null,
            under_projection: propEntry.underProjection ? String(propEntry.underProjection) : null,
            conflict_key: conflictKey,
          }).onConflictDoUpdate({
            target: [pickemProps.conflict_key],
            set: {
              over_projection: propEntry.overProjection ? String(propEntry.overProjection) : null,
              under_projection: propEntry.underProjection ? String(propEntry.underProjection) : null,
              updated_at: new Date(),
            }
          });
          totalInserted += 1;
        } catch (e) {
          // Best-effort insert; continue on errors
          console.error('Insert failed for pickem prop', e);
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


