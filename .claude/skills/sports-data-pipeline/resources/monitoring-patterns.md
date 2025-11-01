# Monitoring Patterns

**Deep dive:** Production guardrails, observability, logging, health checks, alerts, and operational best practices.

---

## Overview

Production monitoring ensures:
- **Observability** - Track what the system is doing
- **Alerting** - Detect problems quickly
- **Debugging** - Investigate failures efficiently
- **Reliability** - Prevent and recover from issues

---

## Production Guardrails Class

**Centralized monitoring and safety checks:**

```typescript
interface IngestionMetrics {
  inserted: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: string;
}

interface EnrichmentMetrics {
  gamesProcessed: number;
  playersEnriched: number;
  duration: number;
  timestamp: string;
}

class ProductionGuardrails {
  private featureFlags: Map<string, boolean> = new Map();
  
  constructor() {
    // Initialize feature flags
    this.featureFlags.set('enable_streaks', true);
    this.featureFlags.set('enable_rolling_averages', true);
    this.featureFlags.set('enable_matchup_ranks', true);
    this.featureFlags.set('enable_new_enrichment_columns', false);
  }
  
  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    return this.featureFlags.get(feature) || false;
  }
  
  /**
   * Log ingestion metrics
   */
  async logIngestionMetrics(metrics: IngestionMetrics): Promise<void> {
    console.log(`🔄 Ingestion Metrics:`);
    console.log(`  - Inserted: ${metrics.inserted}`);
    console.log(`  - Failed: ${metrics.failed}`);
    console.log(`  - Skipped: ${metrics.skipped}`);
    console.log(`  - Duration: ${metrics.duration}ms`);
    console.log(`  - Timestamp: ${metrics.timestamp}`);
    
    // Store in database for historical tracking
    try {
      await db.execute(sql`
        INSERT INTO ingestion_logs (inserted, failed, skipped, duration_ms, created_at)
        VALUES (${metrics.inserted}, ${metrics.failed}, ${metrics.skipped}, ${metrics.duration}, ${metrics.timestamp}::timestamp)
      `);
    } catch (error) {
      console.warn('Failed to log ingestion metrics to database:', error);
    }
    
    // Alert if failure rate is high
    const total = metrics.inserted + metrics.failed;
    const failureRate = total > 0 ? metrics.failed / total : 0;
    
    if (failureRate > 0.1) {
      console.warn(`⚠️ High failure rate: ${(failureRate * 100).toFixed(1)}%`);
      await this.sendAlert('High Ingestion Failure Rate', 
        `${metrics.failed}/${total} (${(failureRate * 100).toFixed(1)}%) records failed`);
    }
  }
  
  /**
   * Log enrichment metrics
   */
  async logEnrichmentMetrics(metrics: EnrichmentMetrics): Promise<void> {
    console.log(`🔄 Enrichment Metrics:`);
    console.log(`  - Games Processed: ${metrics.gamesProcessed}`);
    console.log(`  - Players Enriched: ${metrics.playersEnriched}`);
    console.log(`  - Duration: ${metrics.duration}ms`);
    console.log(`  - Timestamp: ${metrics.timestamp}`);
    
    try {
      await db.execute(sql`
        INSERT INTO enrichment_logs (games_processed, players_enriched, duration_ms, created_at)
        VALUES (${metrics.gamesProcessed}, ${metrics.playersEnriched}, ${metrics.duration}, ${metrics.timestamp}::timestamp)
      `);
    } catch (error) {
      console.warn('Failed to log enrichment metrics to database:', error);
    }
  }
  
  /**
   * Check ingestion health
   */
  async checkIngestionHealth(): Promise<boolean> {
    console.log('🏥 Checking ingestion health...');
    
    // Check for recent ingestion activity (last 24 hours)
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM player_game_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    const recentCount = result[0]?.count || 0;
    
    if (recentCount === 0) {
      console.error('❌ No ingestion activity in last 24 hours!');
      await this.sendAlert('Ingestion Stalled', 'No new data in last 24 hours');
      return false;
    }
    
    console.log(`✅ Health check passed: ${recentCount} records in last 24h`);
    return true;
  }
  
  /**
   * Check enrichment health
   */
  async checkEnrichmentHealth(): Promise<boolean> {
    console.log('🏥 Checking enrichment health...');
    
    // Check for stale analytics (updated > 7 days ago)
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM player_analytics
      WHERE updated_at < NOW() - INTERVAL '7 days'
        AND season = EXTRACT(YEAR FROM CURRENT_DATE)::text
    `);
    
    const staleCount = result[0]?.count || 0;
    
    if (staleCount > 100) {
      console.warn(`⚠️ ${staleCount} stale analytics records`);
      await this.sendAlert('Stale Analytics', `${staleCount} records not updated in 7+ days`);
      return false;
    }
    
    console.log(`✅ Enrichment health check passed`);
    return true;
  }
  
  /**
   * Send alert notification
   */
  private async sendAlert(title: string, message: string): Promise<void> {
    // macOS notification
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      const escaped = message.replace(/"/g, '\\"');
      exec(`osascript -e 'display notification "${escaped}" with title "${title}"'`);
    }
    
    // Slack webhook (if configured)
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 *${title}*\n${message}`,
            username: 'Pipeline Monitor',
            icon_emoji: ':rotating_light:'
          })
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  }
  
  /**
   * Validate data quality
   */
  async validateDataQuality(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check for suspicious stat values
    const suspiciousStats = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM player_game_logs
      WHERE stat_value < 0 OR stat_value > 1000
        AND created_at > NOW() - INTERVAL '24 hours'
    `);
    
    if (suspiciousStats[0]?.count > 0) {
      issues.push(`${suspiciousStats[0].count} stats with suspicious values (< 0 or > 1000)`);
    }
    
    // Check for missing player names
    const missingNames = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM player_game_logs
      WHERE player_name IS NULL OR player_name = ''
        AND created_at > NOW() - INTERVAL '24 hours'
    `);
    
    if (missingNames[0]?.count > 0) {
      issues.push(`${missingNames[0].count} logs with missing player names`);
    }
    
    // Check for duplicate entries
    const duplicates = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT game_id, player_id, prop_type, COUNT(*)
        FROM player_game_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY game_id, player_id, prop_type
        HAVING COUNT(*) > 1
      ) dupes
    `);
    
    if (duplicates[0]?.count > 0) {
      issues.push(`${duplicates[0].count} duplicate entries detected`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Export singleton
export const guardrails = new ProductionGuardrails();
```

---

## Usage in Scripts

### Ingestion Script Integration
```typescript
import { guardrails } from './production-guardrails';

async function runIngestion() {
  const startTime = Date.now();
  let inserted = 0;
  let failed = 0;
  let skipped = 0;
  
  try {
    // ... ingestion logic ...
    
    inserted = await ingestData();
    
  } catch (error) {
    failed++;
    console.error('Ingestion failed:', error);
  } finally {
    // Log metrics
    await guardrails.logIngestionMetrics({
      inserted,
      failed,
      skipped,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Enrichment Script Integration
```typescript
import { guardrails } from './production-guardrails';

async function runEnrichment() {
  const startTime = Date.now();
  let gamesProcessed = 0;
  let playersEnriched = 0;
  
  try {
    // ... enrichment logic ...
    
    gamesProcessed = 58;
    playersEnriched = 207;
    
  } finally {
    await guardrails.logEnrichmentMetrics({
      gamesProcessed,
      playersEnriched,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## Logging Best Practices

### Structured Logging
```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, any>;
  timestamp: string;
}

function log(level: LogEntry['level'], message: string, context: Record<string, any> = {}): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString()
  };
  
  // Console output
  const emoji = { info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
  console[level === 'error' ? 'error' : 'log'](
    `${emoji} [${level.toUpperCase()}] ${message}`,
    context
  );
  
  // Could also send to external logging service
  // await sendToDatadog(entry);
}

// Usage
log('info', 'Starting NFL ingestion', { league: 'NFL', dates: 30 });
log('warn', 'High failure rate detected', { failures: 45, total: 100 });
log('error', 'ESPN API timeout', { url: '...', attempt: 3 });
```

### Progress Logging
```typescript
class ProgressLogger {
  private startTime: number;
  private lastLogTime: number;
  private processed: number = 0;
  private total: number;
  
  constructor(total: number) {
    this.startTime = Date.now();
    this.lastLogTime = Date.now();
    this.total = total;
  }
  
  increment(count: number = 1): void {
    this.processed += count;
    
    // Log every 10% or every 30 seconds
    const percentDone = (this.processed / this.total) * 100;
    const timeSinceLastLog = Date.now() - this.lastLogTime;
    
    if (percentDone % 10 < (count / this.total * 100) || timeSinceLastLog > 30000) {
      this.log();
    }
  }
  
  log(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.processed / elapsed;
    const remaining = (this.total - this.processed) / rate;
    const percentDone = (this.processed / this.total) * 100;
    
    console.log(
      `Progress: ${this.processed}/${this.total} (${percentDone.toFixed(1)}%) | ` +
      `Rate: ${rate.toFixed(1)}/s | ` +
      `ETA: ${remaining.toFixed(0)}s`
    );
    
    this.lastLogTime = Date.now();
  }
  
  complete(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(`✅ Complete: ${this.processed} in ${elapsed.toFixed(1)}s`);
  }
}

// Usage
const logger = new ProgressLogger(365); // 365 dates to process
for (const date of dates) {
  await ingestDate(date);
  logger.increment();
}
logger.complete();
```

---

## Health Check Endpoints

### Express Health Check
```typescript
import express from 'express';

const app = express();

app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabaseHealth(),
      ingestion: await guardrails.checkIngestionHealth(),
      enrichment: await guardrails.checkEnrichmentHealth()
    }
  };
  
  const allHealthy = Object.values(health.checks).every(c => c === true);
  
  res.status(allHealthy ? 200 : 503).json(health);
});

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
```

---

## Monitoring Dashboards

### Database Tables for Metrics
```sql
-- Ingestion logs table
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inserted INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  skipped INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingestion_logs_created ON ingestion_logs(created_at DESC);

-- Enrichment logs table
CREATE TABLE IF NOT EXISTS enrichment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  games_processed INTEGER NOT NULL,
  players_enriched INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrichment_logs_created ON enrichment_logs(created_at DESC);
```

### Metrics Queries
```sql
-- Ingestion rate over last 7 days
SELECT 
  DATE(created_at) as date,
  SUM(inserted) as total_inserted,
  SUM(failed) as total_failed,
  AVG(duration_ms) as avg_duration_ms,
  COUNT(*) as runs
FROM ingestion_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Enrichment performance
SELECT 
  DATE(created_at) as date,
  SUM(players_enriched) as total_players,
  AVG(duration_ms) as avg_duration_ms,
  COUNT(*) as runs
FROM enrichment_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Data freshness by league
SELECT 
  l.code as league,
  COUNT(DISTINCT pgl.game_id) as games,
  COUNT(pgl.id) as stats,
  MAX(pgl.created_at) as last_ingested
FROM player_game_logs pgl
JOIN games g ON g.id = pgl.game_id
JOIN leagues l ON l.id = g.league_id
WHERE pgl.created_at > NOW() - INTERVAL '24 hours'
GROUP BY l.code;
```

---

## Alert Conditions

### Failure Rate Alert
```typescript
async function checkFailureRate(): Promise<void> {
  const recent = await db.execute(sql`
    SELECT 
      SUM(inserted) as inserted,
      SUM(failed) as failed
    FROM ingestion_logs
    WHERE created_at > NOW() - INTERVAL '1 hour'
  `);
  
  const { inserted, failed } = recent[0];
  const total = inserted + failed;
  const failureRate = total > 0 ? failed / total : 0;
  
  if (failureRate > 0.1) {
    await guardrails.sendAlert(
      'High Failure Rate',
      `${(failureRate * 100).toFixed(1)}% of recent ingestions failed (${failed}/${total})`
    );
  }
}
```

### Stale Data Alert
```typescript
async function checkStaleData(): Promise<void> {
  const leagues = ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA'];
  
  for (const league of leagues) {
    const lastIngested = await db.execute(sql`
      SELECT MAX(pgl.created_at) as last_ingested
      FROM player_game_logs pgl
      JOIN games g ON g.id = pgl.game_id
      JOIN leagues l ON l.id = g.league_id
      WHERE l.code = ${league}
    `);
    
    const lastTime = new Date(lastIngested[0]?.last_ingested);
    const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince > 24) {
      await guardrails.sendAlert(
        `${league} Data Stale`,
        `No new data in ${hoursSince.toFixed(1)} hours`
      );
    }
  }
}
```

### Data Quality Alert
```typescript
async function checkDataQuality(): Promise<void> {
  const { valid, issues } = await guardrails.validateDataQuality();
  
  if (!valid) {
    await guardrails.sendAlert(
      'Data Quality Issues',
      `Issues found:\n${issues.join('\n')}`
    );
  }
}
```

---

## Scheduled Monitoring

### Cron Jobs
```typescript
import cron from 'node-cron';

// Run health checks every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running hourly health checks...');
  await guardrails.checkIngestionHealth();
  await guardrails.checkEnrichmentHealth();
  await checkFailureRate();
});

// Run data quality checks every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running data quality checks...');
  await checkDataQuality();
});

// Check for stale data every day at 9am
cron.schedule('0 9 * * *', async () => {
  console.log('Checking for stale data...');
  await checkStaleData();
});
```

---

## Performance Monitoring

### Query Performance Tracking
```typescript
async function trackQueryPerformance<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await query();
    const duration = Date.now() - startTime;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow query: ${queryName} took ${duration}ms`);
      
      // Store in database
      await db.execute(sql`
        INSERT INTO slow_queries (query_name, duration_ms, created_at)
        VALUES (${queryName}, ${duration}, NOW())
      `);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Query failed: ${queryName}`, error);
    throw error;
  }
}

// Usage
const players = await trackQueryPerformance(
  'fetch_active_players',
  () => db.execute(sql`SELECT * FROM players WHERE active = true`)
);
```

---

## Debugging Tools

### Verbose Mode
```typescript
const VERBOSE = process.env.VERBOSE === '1';

function debug(message: string, data?: any): void {
  if (VERBOSE) {
    console.log(`🔍 [DEBUG] ${message}`, data || '');
  }
}

// Usage
debug('Fetching schedule', { league: 'NFL', date: '2025-01-26' });
debug('Extracted stats', { count: 163, propTypes: ['Passing Yards', 'Rushing Yards'] });
```

### Dry Run Mode
```typescript
const DRY_RUN = process.env.DRY_RUN === '1';

async function upsertData(data: any[]): Promise<number> {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would insert ${data.length} records`);
    console.log('[DRY_RUN] Sample:', data[0]);
    return data.length;
  }
  
  // Actual insert
  return await db.insert(player_game_logs).values(data);
}
```

---

## Common Pitfalls

### Pitfall 1: Not Logging Enough Context
```typescript
// BAD: Generic error log
console.error('Insert failed');

// GOOD: Contextual error log
console.error('Insert failed for NFL game 401671720', {
  league: 'NFL',
  gameId: '401671720',
  date: '2025-01-26',
  recordCount: 163,
  error: error.message
});
```

### Pitfall 2: Ignoring Alerts
```typescript
// BAD: Log and forget
if (failureRate > 0.1) {
  console.warn('High failure rate!');
}

// GOOD: Alert and take action
if (failureRate > 0.1) {
  await sendAlert('High Failure Rate', `${failureRate * 100}%`);
  // Potentially pause ingestion, investigate, etc.
}
```

### Pitfall 3: No Metrics History
```typescript
// BAD: Only console logs (lost after restart)
console.log(`Inserted ${count} records`);

// GOOD: Store metrics in database for historical analysis
await db.execute(sql`
  INSERT INTO ingestion_logs (inserted, created_at)
  VALUES (${count}, NOW())
`);
```

---

## Next Steps

After implementing monitoring:
1. Set up ingestion and enrichment logs tables
2. Integrate guardrails into existing scripts
3. Configure alert notifications (Slack, email, etc.)
4. Schedule health check cron jobs
5. Create dashboards for metrics visualization
6. Test alerts with simulated failures

---

**Related:** [Ingestion Patterns](./ingestion-patterns.md), [Enrichment Patterns](./enrichment-patterns.md), [Backfill Patterns](./backfill-patterns.md)
