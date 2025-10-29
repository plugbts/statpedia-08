#!/usr/bin/env tsx
/**
 * Blocking UNK value monitor
 * 
 * This script checks for UNK values and exits with error code if found.
 * Use this in CI/CD pipelines to block deployments with bad data.
 * 
 * Exit codes:
 *   0 - No UNK values found (success)
 *   1 - UNK values found (failure)
 *   2 - Script error
 * 
 * Usage:
 *   tsx scripts/monitor-unk-blocking.ts [--fail-on-warnings]
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface UnkCheck {
  table: string;
  column: string;
  count: number;
  samples: any[];
}

/**
 * Check for UNK values in proplines table
 */
async function checkProplines(): Promise<UnkCheck[]> {
  const checks: UnkCheck[] = [];

  // Check team column
  const teamResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.proplines
    WHERE team = 'UNK' OR team = '-' OR trim(team) = ''
  `);

  if (teamResult.length > 0 && Number(teamResult[0].count) > 0) {
    checks.push({
      table: 'proplines',
      column: 'team',
      count: Number(teamResult[0].count),
      samples: teamResult[0].sample_ids || []
    });
  }

  // Check opponent column
  const opponentResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.proplines
    WHERE opponent = 'UNK' OR opponent = '-' OR trim(opponent) = ''
  `);

  if (opponentResult.length > 0 && Number(opponentResult[0].count) > 0) {
    checks.push({
      table: 'proplines',
      column: 'opponent',
      count: Number(opponentResult[0].count),
      samples: opponentResult[0].sample_ids || []
    });
  }

  // Check player_name column
  const playerNameResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.proplines
    WHERE player_name = 'UNK' OR player_name = '-' OR trim(player_name) = ''
  `);

  if (playerNameResult.length > 0 && Number(playerNameResult[0].count) > 0) {
    checks.push({
      table: 'proplines',
      column: 'player_name',
      count: Number(playerNameResult[0].count),
      samples: playerNameResult[0].sample_ids || []
    });
  }

  // Check home_team column
  const homeTeamResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.proplines
    WHERE home_team = 'UNK' OR home_team = '-' OR trim(home_team) = ''
  `);

  if (homeTeamResult.length > 0 && Number(homeTeamResult[0].count) > 0) {
    checks.push({
      table: 'proplines',
      column: 'home_team',
      count: Number(homeTeamResult[0].count),
      samples: homeTeamResult[0].sample_ids || []
    });
  }

  // Check away_team column
  const awayTeamResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.proplines
    WHERE away_team = 'UNK' OR away_team = '-' OR trim(away_team) = ''
  `);

  if (awayTeamResult.length > 0 && Number(awayTeamResult[0].count) > 0) {
    checks.push({
      table: 'proplines',
      column: 'away_team',
      count: Number(awayTeamResult[0].count),
      samples: awayTeamResult[0].sample_ids || []
    });
  }

  return checks;
}

/**
 * Check for UNK values in players table
 */
async function checkPlayers(): Promise<UnkCheck[]> {
  const checks: UnkCheck[] = [];

  // Check full_name column
  const fullNameResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.players
    WHERE full_name = 'UNK' OR full_name = '-' OR trim(full_name) = ''
  `);

  if (fullNameResult.length > 0 && Number(fullNameResult[0].count) > 0) {
    checks.push({
      table: 'players',
      column: 'full_name',
      count: Number(fullNameResult[0].count),
      samples: fullNameResult[0].sample_ids || []
    });
  }

  // Check first_name column
  const firstNameResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.players
    WHERE first_name = 'UNK' OR first_name = '-' OR trim(first_name) = ''
  `);

  if (firstNameResult.length > 0 && Number(firstNameResult[0].count) > 0) {
    checks.push({
      table: 'players',
      column: 'first_name',
      count: Number(firstNameResult[0].count),
      samples: firstNameResult[0].sample_ids || []
    });
  }

  // Check last_name column
  const lastNameResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.players
    WHERE last_name = 'UNK' OR last_name = '-' OR trim(last_name) = ''
  `);

  if (lastNameResult.length > 0 && Number(lastNameResult[0].count) > 0) {
    checks.push({
      table: 'players',
      column: 'last_name',
      count: Number(lastNameResult[0].count),
      samples: lastNameResult[0].sample_ids || []
    });
  }

  return checks;
}

/**
 * Check for UNK values in teams table
 */
async function checkTeams(): Promise<UnkCheck[]> {
  const checks: UnkCheck[] = [];

  // Check name column
  const nameResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.teams
    WHERE name = 'UNK' OR name = '-' OR trim(name) = ''
  `);

  if (nameResult.length > 0 && Number(nameResult[0].count) > 0) {
    checks.push({
      table: 'teams',
      column: 'name',
      count: Number(nameResult[0].count),
      samples: nameResult[0].sample_ids || []
    });
  }

  // Check abbreviation column
  const abbreviationResult = await db.execute(sql`
    SELECT COUNT(*) as count,
           ARRAY_AGG(id) FILTER (WHERE id IS NOT NULL) as sample_ids
    FROM public.teams
    WHERE abbreviation = 'UNK' OR abbreviation = '-' OR trim(abbreviation) = ''
  `);

  if (abbreviationResult.length > 0 && Number(abbreviationResult[0].count) > 0) {
    checks.push({
      table: 'teams',
      column: 'abbreviation',
      count: Number(abbreviationResult[0].count),
      samples: abbreviationResult[0].sample_ids || []
    });
  }

  return checks;
}

/**
 * Print check results
 */
function printResults(allChecks: UnkCheck[]): boolean {
  console.log('\n🔍 UNK Value Monitor - Blocking Mode');
  console.log('='.repeat(80));

  if (allChecks.length === 0) {
    console.log('✅ No UNK values found - PASSED');
    console.log('='.repeat(80));
    return true;
  }

  console.log('❌ UNK values found - FAILED');
  console.log('='.repeat(80));

  const totalCount = allChecks.reduce((sum, check) => sum + check.count, 0);
  console.log(`\nTotal records with UNK values: ${totalCount}`);

  // Group by table
  const byTable = allChecks.reduce((acc, check) => {
    if (!acc[check.table]) acc[check.table] = [];
    acc[check.table].push(check);
    return acc;
  }, {} as Record<string, UnkCheck[]>);

  for (const [table, checks] of Object.entries(byTable)) {
    const tableTotal = checks.reduce((sum, c) => sum + c.count, 0);
    console.log(`\n${table} (${tableTotal} total records):`);
    
    for (const check of checks) {
      console.log(`  ${check.column}: ${check.count} records`);
      if (check.samples.length > 0) {
        const sampleIds = check.samples.slice(0, 3);
        console.log(`    Sample IDs: ${sampleIds.join(', ')}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('⚠️  ACTION REQUIRED:');
  console.log('1. Run the backfill script to clean these values:');
  console.log('   tsx scripts/backfill-clean-unk-values.ts --delete-unresolvable');
  console.log('2. Fix the ingestion pipeline to prevent new UNK values');
  console.log('3. Ensure validation is running before data ingestion');
  console.log('='.repeat(80));

  return false;
}

/**
 * Main function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const failOnWarnings = args.includes('--fail-on-warnings');

    console.log('Starting UNK value monitoring...');

    // Run all checks
    const proplinesChecks = await checkProplines();
    const playersChecks = await checkPlayers();
    const teamsChecks = await checkTeams();

    const allChecks = [...proplinesChecks, ...playersChecks, ...teamsChecks];

    // Print results
    const passed = printResults(allChecks);

    // Close database connection
    await client.end();

    // Exit with appropriate code
    if (passed) {
      console.log('\n✅ Monitoring PASSED - Safe to deploy');
      process.exit(0);
    } else {
      console.log('\n❌ Monitoring FAILED - DO NOT DEPLOY');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Monitor script error:', error);
    await client.end();
    process.exit(2);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
