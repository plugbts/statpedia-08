import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { sportsGameOddsIngestionService } from './sportsgameodds-ingestion-service';
import { stableDataUpsertService, UpsertStats } from './stable-data-upsert-service';
import { propDebugLoggingService, IngestionStats } from './prop-debug-logging-service';
import { propNormalizationService } from './prop-normalization-service';

// Orchestration interfaces
export interface IngestionConfig {
  leagues?: string[];
  sports?: string[];
  season?: string;
  week?: string;
  batchSize?: number;
  enableDebugLogging?: boolean;
  saveDebugData?: boolean;
}

export interface IngestionResult {
  success: boolean;
  totalProps: number;
  upsertStats: UpsertStats;
  debugReport?: any;
  errors: string[];
  duration: number;
  timestamp: string;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  services: {
    ingestion: boolean;
    upsert: boolean;
    debug: boolean;
    normalization: boolean;
  };
  lastIngestion?: string;
  totalRecords?: number;
  errors: string[];
}

class PropIngestionOrchestrator {
  private isRunning = false;
  private lastIngestionTime: Date | null = null;
  private ingestionHistory: IngestionResult[] = [];
  private readonly MAX_HISTORY = 50;

  /**
   * Main orchestration method - runs the complete ingestion pipeline
   */
  async runIngestion(config: IngestionConfig = {}): Promise<IngestionResult> {
    if (this.isRunning) {
      throw new Error('Ingestion is already running');
    }

    const startTime = Date.now();
    this.isRunning = true;
    
    const result: IngestionResult = {
      success: false,
      totalProps: 0,
      upsertStats: {
        totalProcessed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        sportsbooks: {},
        propTypes: {},
        leagues: {}
      },
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      logInfo('PropIngestionOrchestrator', 'Starting complete prop ingestion pipeline');
      
      // Step 1: Validate configuration
      this.validateConfig(config);
      
      // Step 2: Clear debug data if requested
      if (config.enableDebugLogging) {
        propDebugLoggingService.clearDebugData();
      }

      // Step 3: Set batch size for upsert
      if (config.batchSize) {
        stableDataUpsertService.setBatchSize(config.batchSize);
      }

      // Step 4: Validate canonical tables
      const tableValid = await stableDataUpsertService.validateCanonicalTables();
      if (!tableValid) {
        throw new Error('Canonical tables validation failed');
      }

      // Step 5: Ingest data from SportsGameOdds API
      logAPI('PropIngestionOrchestrator', 'Step 1: Ingesting data from SportsGameOdds API');
      const ingestedProps = await sportsGameOddsIngestionService.ingestAllLeagues(
        config.season || '2025',
        config.week
      );

      result.totalProps = ingestedProps.length;
      logSuccess('PropIngestionOrchestrator', `Step 1 complete: Ingested ${ingestedProps.length} props`);

      if (ingestedProps.length === 0) {
        logWarning('PropIngestionOrchestrator', 'No props were ingested - this may indicate an API issue');
      }

      // Step 6: Upsert props to database using stable data architecture
      logAPI('PropIngestionOrchestrator', 'Step 2: Upserting props using stable data architecture');
      result.upsertStats = await stableDataUpsertService.upsertPlayerProps(ingestedProps);
      logSuccess('PropIngestionOrchestrator', `Step 2 complete: ${result.upsertStats.inserted} inserted, ${result.upsertStats.updated} updated using canonical mapping`);

      // Step 7: Refresh enrichment data
      logAPI('PropIngestionOrchestrator', 'Step 3: Refreshing enrichment data');
      await this.refreshEnrichment();
      logSuccess('PropIngestionOrchestrator', 'Step 3 complete: Enrichment data refreshed');

      // Step 8: Generate debug report if enabled
      if (config.enableDebugLogging) {
        logAPI('PropIngestionOrchestrator', 'Step 4: Generating debug report');
        
        // Log ingestion stats
        const ingestionStats: IngestionStats = {
          totalProcessed: ingestedProps.length,
          successful: result.upsertStats.inserted + result.upsertStats.updated,
          failed: result.upsertStats.errors,
          unmappedMarkets: propNormalizationService.getUnmappedMarkets().length,
          unmappedStatIDs: propNormalizationService.getUnmappedStatIDs().length,
          leagues: result.upsertStats.leagues,
          sportsbooks: result.upsertStats.sportsbooks,
          propTypes: result.upsertStats.propTypes,
          timestamp: new Date().toISOString()
        };

        propDebugLoggingService.logIngestionStats(ingestionStats);

        // Generate comprehensive debug report
        result.debugReport = await propDebugLoggingService.generateDebugReport();

        // Save debug data if requested
        if (config.saveDebugData) {
          await propDebugLoggingService.saveDebugData();
        }

        logSuccess('PropIngestionOrchestrator', 'Step 4 complete: Debug report generated');
      }

      // Step 9: Final validation
      if (result.upsertStats.errors > result.upsertStats.totalProcessed * 0.1) {
        result.errors.push(`High error rate: ${result.upsertStats.errors}/${result.upsertStats.totalProcessed} failed`);
      }

      if (result.totalProps === 0) {
        result.errors.push('No props were ingested - check API connectivity');
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // Update state
      this.lastIngestionTime = new Date();
      this.addToHistory(result);

      logSuccess('PropIngestionOrchestrator', `Ingestion pipeline completed successfully in ${result.duration}ms`);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.duration = Date.now() - startTime;
      
      logError('PropIngestionOrchestrator', 'Ingestion pipeline failed:', error);
      
      // Still add to history for debugging
      this.addToHistory(result);
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run ingestion for a specific league only
   */
  async runLeagueIngestion(league: string, config: IngestionConfig = {}): Promise<IngestionResult> {
    logInfo('PropIngestionOrchestrator', `Running ingestion for specific league: ${league}`);
    
    // Temporarily override leagues in config
    const leagueConfig = { ...config, leagues: [league] };
    
    return this.runIngestion(leagueConfig);
  }

  /**
   * Run a quick health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      isHealthy: true,
      services: {
        ingestion: false,
        upsert: false,
        debug: false,
        normalization: false
      },
      errors: []
    };

    try {
      // Test ingestion service
      try {
        const cacheStatus = sportsGameOddsIngestionService.getCacheStatus();
        result.services.ingestion = true;
      } catch (error) {
        result.services.ingestion = false;
        result.errors.push(`Ingestion service error: ${error}`);
      }

      // Test upsert service
      try {
        await stableDataUpsertService.validateCanonicalTables();
        result.services.upsert = true;
      } catch (error) {
        result.services.upsert = false;
        result.errors.push(`Upsert service error: ${error}`);
      }

      // Test debug service
      try {
        const summary = propDebugLoggingService.getUnmappedMarketsSummary();
        result.services.debug = true;
      } catch (error) {
        result.services.debug = false;
        result.errors.push(`Debug service error: ${error}`);
      }

      // Test normalization service
      try {
        const canonicalTypes = propNormalizationService.getAllCanonicalTypes();
        result.services.normalization = canonicalTypes.length > 0;
      } catch (error) {
        result.services.normalization = false;
        result.errors.push(`Normalization service error: ${error}`);
      }

      // Get additional info
      if (this.lastIngestionTime) {
        result.lastIngestion = this.lastIngestionTime.toISOString();
      }

      try {
        // Note: stableDataUpsertService doesn't have getUpsertStats method yet
        // This could be added later or we can query the normalized view directly
        result.totalRecords = 0; // Placeholder for now
      } catch (error) {
        result.errors.push(`Failed to get total records: ${error}`);
      }

      result.isHealthy = Object.values(result.services).every(status => status);

    } catch (error) {
      result.isHealthy = false;
      result.errors.push(`Health check failed: ${error}`);
    }

    return result;
  }

  /**
   * Get ingestion history
   */
  getIngestionHistory(): IngestionResult[] {
    return [...this.ingestionHistory];
  }

  /**
   * Get last ingestion result
   */
  getLastIngestion(): IngestionResult | null {
    return this.ingestionHistory.length > 0 ? this.ingestionHistory[this.ingestionHistory.length - 1] : null;
  }

  /**
   * Clear ingestion history
   */
  clearHistory(): void {
    this.ingestionHistory = [];
    logInfo('PropIngestionOrchestrator', 'Ingestion history cleared');
  }

  /**
   * Check if ingestion is currently running
   */
  isIngestionRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get last ingestion time
   */
  getLastIngestionTime(): Date | null {
    return this.lastIngestionTime;
  }

  /**
   * Refresh enrichment data by calling the database function
   */
  private async refreshEnrichment(): Promise<void> {
    try {
      // Call the refresh_enrichment() function via direct SQL
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.NEON_DATABASE_URL
      });

      const client = await pool.connect();
      try {
        await client.query('SELECT refresh_enrichment()');
        logSuccess('PropIngestionOrchestrator', 'Enrichment refresh completed successfully');
      } finally {
        client.release();
      }
      await pool.end();
    } catch (error) {
      logError('PropIngestionOrchestrator', 'Failed to refresh enrichment data:', error);
      throw new Error(`Enrichment refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: IngestionConfig): void {
    if (config.season && !/^\d{4}$/.test(config.season)) {
      throw new Error('Invalid season format - must be YYYY');
    }

    if (config.week && (!/^\d+$/.test(config.week) || parseInt(config.week) < 1 || parseInt(config.week) > 20)) {
      throw new Error('Invalid week format - must be a number between 1 and 20');
    }

    if (config.batchSize && (config.batchSize < 1 || config.batchSize > 1000)) {
      throw new Error('Invalid batch size - must be between 1 and 1000');
    }

    logAPI('PropIngestionOrchestrator', 'Configuration validation passed');
  }

  /**
   * Add result to history
   */
  private addToHistory(result: IngestionResult): void {
    this.ingestionHistory.push(result);
    
    // Keep only recent history
    if (this.ingestionHistory.length > this.MAX_HISTORY) {
      this.ingestionHistory = this.ingestionHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * Get service status summary
   */
  getServiceStatus(): {
    isRunning: boolean;
    lastIngestion: string | null;
    historyCount: number;
    cacheStatus: any;
    unmappedMarkets: number;
    canonicalTypes: number;
  } {
    return {
      isRunning: this.isRunning,
      lastIngestion: this.lastIngestionTime?.toISOString() || null,
      historyCount: this.ingestionHistory.length,
      cacheStatus: sportsGameOddsIngestionService.getCacheStatus(),
      unmappedMarkets: propDebugLoggingService.getUnmappedMarketsSummary().totalUnmapped,
      canonicalTypes: propNormalizationService.getAllCanonicalTypes().length
    };
  }

  /**
   * Emergency stop - clears all caches and resets state
   */
  emergencyStop(): void {
    logWarning('PropIngestionOrchestrator', 'Emergency stop initiated');
    
    this.isRunning = false;
    sportsGameOddsIngestionService.clearCache();
    propDebugLoggingService.clearDebugData();
    propNormalizationService.clearUnmappedData();
    
    logInfo('PropIngestionOrchestrator', 'Emergency stop completed - all services reset');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    averageDuration: number;
    successRate: number;
    averagePropsPerRun: number;
    errorRate: number;
  } {
    if (this.ingestionHistory.length === 0) {
      return {
        averageDuration: 0,
        successRate: 0,
        averagePropsPerRun: 0,
        errorRate: 0
      };
    }

    const totalDuration = this.ingestionHistory.reduce((sum, result) => sum + result.duration, 0);
    const successfulRuns = this.ingestionHistory.filter(result => result.success).length;
    const totalProps = this.ingestionHistory.reduce((sum, result) => sum + result.totalProps, 0);
    const totalErrors = this.ingestionHistory.reduce((sum, result) => sum + result.errors.length, 0);

    return {
      averageDuration: Math.round(totalDuration / this.ingestionHistory.length),
      successRate: Math.round((successfulRuns / this.ingestionHistory.length) * 100),
      averagePropsPerRun: Math.round(totalProps / this.ingestionHistory.length),
      errorRate: Math.round((totalErrors / this.ingestionHistory.length) * 100)
    };
  }
}

// Export singleton instance
export const propIngestionOrchestrator = new PropIngestionOrchestrator();
