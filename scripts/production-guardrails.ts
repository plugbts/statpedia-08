#!/usr/bin/env tsx

/**
 * Production Guardrails and Observability
 * 
 * Provides monitoring, logging, and safety checks for production ingestion
 * and enrichment processes.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL is not set');
}

const client = postgres(connectionString);
const db = drizzle(client);

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
  async logIngestionMetrics(metrics: IngestionMetrics, process: string): Promise<void> {
    console.log(`📊 [${process}] Ingestion Metrics:`);
    console.log(`  - Inserted: ${metrics.inserted}`);
    console.log(`  - Failed: ${metrics.failed}`);
    console.log(`  - Skipped: ${metrics.skipped}`);
    console.log(`  - Duration: ${metrics.duration}ms`);
    console.log(`  - Timestamp: ${metrics.timestamp}`);
    
    // Store in database for historical tracking
    try {
      await db.execute(sql`
        INSERT INTO ingestion_logs (process, inserted_count, failed_count, skipped_count, duration_ms, created_at)
        VALUES (${process}, ${metrics.inserted}, ${metrics.failed}, ${metrics.skipped}, ${metrics.duration}, ${metrics.timestamp}::timestamp)
      `);
    } catch (error) {
      console.warn('Failed to log ingestion metrics to database:', error);
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
    
    // Store in database for historical tracking
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
   * Check if enrichment data is stale
   */
  async checkEnrichmentFreshness(thresholdMinutes: number = 60): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT MAX(last_refreshed_at) as last_refresh
        FROM player_enriched_stats
      `);
      
      const lastRefresh = result[0]?.last_refresh;
      if (!lastRefresh) {
        console.warn('⚠️ No enrichment data found');
        return false;
      }
      
      const now = new Date();
      const diffMinutes = (now.getTime() - new Date(lastRefresh).getTime()) / (1000 * 60);
      
      if (diffMinutes > thresholdMinutes) {
        console.warn(`⚠️ Enrichment data is stale (${Math.round(diffMinutes)} minutes old)`);
        return false;
      }
      
      console.log(`✅ Enrichment data is fresh (${Math.round(diffMinutes)} minutes old)`);
      return true;
    } catch (error) {
      console.error('Failed to check enrichment freshness:', error);
      return false;
    }
  }
  
  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    enrichment: boolean;
    dataQuality: boolean;
    performance: boolean;
  }> {
    const health = {
      enrichment: false,
      dataQuality: false,
      performance: false
    };
    
    try {
      // Check enrichment freshness
      health.enrichment = await this.checkEnrichmentFreshness();
      
      // Check data quality
      const qualityChecks = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM props WHERE player_id IS NULL) as null_player_ids,
          (SELECT COUNT(*) FROM player_game_logs WHERE opponent_team_id IS NULL) as null_opponents,
          (SELECT COUNT(*) FROM player_enriched_stats WHERE streak IS NULL AND l5 IS NULL) as null_enrichment
      `);
      
      const quality = qualityChecks[0];
      health.dataQuality = quality.null_player_ids === 0 && quality.null_opponents === 0;
      
      // Check performance (recent ingestion times)
      const performanceCheck = await db.execute(sql`
        SELECT AVG(duration_ms) as avg_duration
        FROM ingestion_logs
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);
      
      const avgDuration = performanceCheck[0]?.avg_duration || 0;
      health.performance = avgDuration < 30000; // Less than 30 seconds average
      
      console.log('🏥 System Health Check:');
      console.log(`  - Enrichment: ${health.enrichment ? '✅' : '❌'}`);
      console.log(`  - Data Quality: ${health.dataQuality ? '✅' : '❌'}`);
      console.log(`  - Performance: ${health.performance ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('Health check failed:', error);
    }
    
    return health;
  }
  
  /**
   * Validate data before production deployment
   */
  async validateForProduction(): Promise<boolean> {
    console.log('🔍 Validating system for production deployment...');
    
    const health = await this.getSystemHealth();
    
    if (!health.enrichment) {
      console.error('❌ Enrichment validation failed');
      return false;
    }
    
    if (!health.dataQuality) {
      console.error('❌ Data quality validation failed');
      return false;
    }
    
    if (!health.performance) {
      console.warn('⚠️ Performance validation failed (but not blocking)');
    }
    
    console.log('✅ System validated for production deployment');
    return true;
  }
}

// Export for use in other scripts
export { ProductionGuardrails, IngestionMetrics, EnrichmentMetrics };

// CLI usage
const guardrails = new ProductionGuardrails();

const command = process.argv[2];

switch (command) {
  case 'health':
    guardrails.getSystemHealth().then(() => process.exit(0));
    break;
  case 'validate':
    guardrails.validateForProduction().then(success => process.exit(success ? 0 : 1));
    break;
  default:
    console.log('Usage: tsx scripts/production-guardrails.ts [health|validate]');
    process.exit(1);
}
