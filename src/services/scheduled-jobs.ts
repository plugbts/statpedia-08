import { analyticsCacheService } from './analytics-cache';
import { historicalDataService } from './historical-data-service';
import { logInfo, logError, logSuccess } from '@/utils/console-logger';

class ScheduledJobsService {
  /**
   * Run all scheduled jobs
   */
  async runAllJobs(): Promise<void> {
    try {
      logInfo('Starting scheduled jobs...');

      // Run jobs in sequence to avoid overwhelming the system
      await this.runDataIngestionJob();
      await this.runAnalyticsPrecomputationJob();
      await this.runCacheCleanupJob();

      logSuccess('All scheduled jobs completed successfully');
    } catch (error) {
      logError('Scheduled jobs failed:', error);
      throw error;
    }
  }

  /**
   * Ingest new historical data
   */
  async runDataIngestionJob(): Promise<void> {
    try {
      logInfo('Running data ingestion job...');

      // Ingest data for the last 7 days to catch any missed games
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      await historicalDataService.ingestHistoricalData(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      logSuccess('Data ingestion job completed');
    } catch (error) {
      logError('Data ingestion job failed:', error);
      throw error;
    }
  }

  /**
   * Precompute analytics for all player props
   */
  async runAnalyticsPrecomputationJob(): Promise<void> {
    try {
      logInfo('Running analytics precomputation job...');

      await analyticsCacheService.precomputeAllAnalytics();

      logSuccess('Analytics precomputation job completed');
    } catch (error) {
      logError('Analytics precomputation job failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old cached data
   */
  async runCacheCleanupJob(): Promise<void> {
    try {
      logInfo('Running cache cleanup job...');

      // Clear analytics cache older than 30 days
      await analyticsCacheService.clearOldCache(30);

      logSuccess('Cache cleanup job completed');
    } catch (error) {
      logError('Cache cleanup job failed:', error);
      throw error;
    }
  }

  /**
   * Get job status and statistics
   */
  async getJobStatus(): Promise<{
    lastRun: string | null;
    cacheStats: {
      totalEntries: number;
      uniquePlayers: number;
      uniqueProps: number;
      lastUpdated: string | null;
    };
  }> {
    try {
      const cacheStats = await analyticsCacheService.getCacheStats();
      
      return {
        lastRun: new Date().toISOString(),
        cacheStats
      };
    } catch (error) {
      logError('Failed to get job status:', error);
      throw error;
    }
  }
}

export const scheduledJobsService = new ScheduledJobsService();
