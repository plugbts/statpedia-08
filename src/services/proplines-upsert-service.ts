import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
// Supabase removed - using Hasura + Neon only
import { IngestedPlayerProp } from './sportsgameodds-ingestion-service';

// Proplines table interface
export interface ProplinesRecord {
  id?: string;
  player_id: string;
  player_name: string;
  team: string;
  opponent: string;
  prop_type: string;
  line: number;
  over_odds: number;
  under_odds: number;
  sportsbook: string;
  sportsbook_key: string;
  game_id: string;
  game_time: string;
  home_team: string;
  away_team: string;
  league: string;
  season: string;
  week?: string;
  conflict_key: string;
  last_updated: string;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

// Upsert statistics
export interface UpsertStats {
  totalProcessed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  sportsbooks: { [key: string]: number };
  propTypes: { [key: string]: number };
  leagues: { [key: string]: number };
}

class ProplinesUpsertService {
  private batchSize = 100; // Process in batches to avoid timeout
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Main upsert method - processes all ingested props with sportsbook conflict handling
   */
  async upsertPlayerProps(props: IngestedPlayerProp[]): Promise<UpsertStats> {
    const stats: UpsertStats = {
      totalProcessed: props.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      sportsbooks: {},
      propTypes: {},
      leagues: {}
    };

    if (props.length === 0) {
      logInfo('ProplinesUpsert', 'No props to upsert');
      return stats;
    }

    logInfo('ProplinesUpsert', `Starting upsert of ${props.length} player props`);

    // Process in batches
    for (let i = 0; i < props.length; i += this.batchSize) {
      const batch = props.slice(i, i + this.batchSize);
      
      try {
        const batchStats = await this.upsertBatch(batch);
        this.mergeStats(stats, batchStats);
        
        logAPI('ProplinesUpsert', `Processed batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(props.length / this.batchSize)}`);
      } catch (error) {
        logError('ProplinesUpsert', `Failed to process batch starting at ${i}:`, error);
        stats.errors += batch.length;
      }
    }

    logSuccess('ProplinesUpsert', `Upsert completed: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.errors} errors`);
    return stats;
  }

  /**
   * Upsert a batch of props
   */
  private async upsertBatch(props: IngestedPlayerProp[]): Promise<UpsertStats> {
    const stats: UpsertStats = {
      totalProcessed: props.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      sportsbooks: {},
      propTypes: {},
      leagues: {}
    };

    // Group props by conflict_key to handle duplicates
    const propsByConflictKey = new Map<string, IngestedPlayerProp[]>();
    
    for (const prop of props) {
      if (!propsByConflictKey.has(prop.conflict_key)) {
        propsByConflictKey.set(prop.conflict_key, []);
      }
      propsByConflictKey.get(prop.conflict_key)!.push(prop);
    }

    // Process each unique conflict key
    for (const [conflictKey, conflictProps] of propsByConflictKey) {
      try {
        // Use the most recent prop if there are duplicates
        const latestProp = conflictProps.reduce((latest, current) => 
          new Date(current.last_updated) > new Date(latest.last_updated) ? current : latest
        );

        const result = await this.upsertSingleProp(latestProp);
        
        // Update stats
        if (result === 'inserted') {
          stats.inserted++;
        } else if (result === 'updated') {
          stats.updated++;
        } else {
          stats.skipped++;
        }

        // Track by sportsbook, prop type, and league
        stats.sportsbooks[latestProp.sportsbook] = (stats.sportsbooks[latestProp.sportsbook] || 0) + 1;
        stats.propTypes[latestProp.prop_type] = (stats.propTypes[latestProp.prop_type] || 0) + 1;
        stats.leagues[latestProp.league] = (stats.leagues[latestProp.league] || 0) + 1;

      } catch (error) {
        logError('ProplinesUpsert', `Failed to upsert prop with conflict key ${conflictKey}:`, error);
        stats.errors++;
      }
    }

    return stats;
  }

  /**
   * Upsert a single prop with retry logic
   */
  private async upsertSingleProp(prop: IngestedPlayerProp): Promise<'inserted' | 'updated' | 'skipped'> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.performUpsert(prop);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries) {
          logWarning('ProplinesUpsert', `Upsert attempt ${attempt} failed, retrying in ${this.retryDelay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay *= 2; // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Perform the actual upsert operation
   */
  private async performUpsert(prop: IngestedPlayerProp): Promise<'inserted' | 'updated' | 'skipped'> {
    const now = new Date().toISOString();
    
    // Check if record exists using conflict_key (which includes sportsbook)
    const { data: existing, error: selectError } = await supabase
      .from('proplines')
      .select('id, conflict_key, last_updated')
      .eq('conflict_key', prop.conflict_key)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check existing record: ${selectError.message}`);
    }

    if (existing) {
      // Check if we need to update (compare last_updated timestamps)
      if (new Date(prop.last_updated) <= new Date(existing.last_updated)) {
        logAPI('ProplinesUpsert', `Skipping ${prop.player_name} ${prop.prop_type} - no update needed`);
        return 'skipped';
      }

      // Update existing record
      const { error: updateError } = await supabase
        .from('proplines')
        .update({
          player_name: prop.player_name,
          team: prop.team,
          opponent: prop.opponent,
          line: prop.line,
          over_odds: prop.over_odds,
          under_odds: prop.under_odds,
          game_time: prop.game_time,
          home_team: prop.home_team,
          away_team: prop.away_team,
          last_updated: prop.last_updated,
          is_available: prop.is_available,
          updated_at: now
        })
        .eq('conflict_key', prop.conflict_key);

      if (updateError) {
        throw new Error(`Failed to update record: ${updateError.message}`);
      }

      logAPI('ProplinesUpsert', `Updated ${prop.player_name} ${prop.prop_type} from ${prop.sportsbook}`);
      return 'updated';
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('proplines')
        .insert({
          player_id: prop.player_id,
          player_name: prop.player_name,
          team: prop.team,
          opponent: prop.opponent,
          prop_type: prop.prop_type,
          line: prop.line,
          over_odds: prop.over_odds,
          under_odds: prop.under_odds,
          sportsbook: prop.sportsbook,
          sportsbook_key: prop.sportsbook_key,
          game_id: prop.game_id,
          game_time: prop.game_time,
          home_team: prop.home_team,
          away_team: prop.away_team,
          league: prop.league,
          season: prop.season,
          week: prop.week,
          conflict_key: prop.conflict_key,
          last_updated: prop.last_updated,
          is_available: prop.is_available,
          created_at: now,
          updated_at: now
        });

      if (insertError) {
        throw new Error(`Failed to insert record: ${insertError.message}`);
      }

      logAPI('ProplinesUpsert', `Inserted ${prop.player_name} ${prop.prop_type} from ${prop.sportsbook}`);
      return 'inserted';
    }
  }

  /**
   * Merge stats from batch processing
   */
  private mergeStats(target: UpsertStats, source: UpsertStats): void {
    target.inserted += source.inserted;
    target.updated += source.updated;
    target.skipped += source.skipped;
    target.errors += source.errors;

    // Merge sportsbooks
    for (const [sportsbook, count] of Object.entries(source.sportsbooks)) {
      target.sportsbooks[sportsbook] = (target.sportsbooks[sportsbook] || 0) + count;
    }

    // Merge prop types
    for (const [propType, count] of Object.entries(source.propTypes)) {
      target.propTypes[propType] = (target.propTypes[propType] || 0) + count;
    }

    // Merge leagues
    for (const [league, count] of Object.entries(source.leagues)) {
      target.leagues[league] = (target.leagues[league] || 0) + count;
    }
  }

  /**
   * Get upsert statistics from database
   */
  async getUpsertStats(league?: string, season?: string): Promise<{
    totalRecords: number;
    recordsByLeague: { [key: string]: number };
    recordsBySportsbook: { [key: string]: number };
    recordsByPropType: { [key: string]: number };
    lastUpdated: string | null;
  }> {
    try {
      // Supabase removed - using Hasura + Neon only
      console.log('📊 Proplines stats: Supabase removed, using Hasura + Neon only');
      const data = [];
      const error = null;

      if (error) {
        throw new Error(`Failed to get stats: ${error.message}`);
      }

      const stats = {
        totalRecords: data.length,
        recordsByLeague: {} as { [key: string]: number },
        recordsBySportsbook: {} as { [key: string]: number },
        recordsByPropType: {} as { [key: string]: number },
        lastUpdated: null as string | null
      };

      let latestUpdate: Date | null = null;

      for (const record of data) {
        // Count by league
        stats.recordsByLeague[record.league] = (stats.recordsByLeague[record.league] || 0) + 1;
        
        // Count by sportsbook
        stats.recordsBySportsbook[record.sportsbook] = (stats.recordsBySportsbook[record.sportsbook] || 0) + 1;
        
        // Count by prop type
        stats.recordsByPropType[record.prop_type] = (stats.recordsByPropType[record.prop_type] || 0) + 1;
        
        // Track latest update
        const recordDate = new Date(record.last_updated);
        if (!latestUpdate || recordDate > latestUpdate) {
          latestUpdate = recordDate;
        }
      }

      stats.lastUpdated = latestUpdate?.toISOString() || null;

      return stats;
    } catch (error) {
      logError('ProplinesUpsert', 'Failed to get upsert stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old records (optional maintenance)
   */
  async cleanupOldRecords(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('proplines')
        .delete()
        .lt('last_updated', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw new Error(`Failed to cleanup old records: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      logInfo('ProplinesUpsert', `Cleaned up ${deletedCount} records older than ${daysOld} days`);
      
      return deletedCount;
    } catch (error) {
      logError('ProplinesUpsert', 'Failed to cleanup old records:', error);
      throw error;
    }
  }

  /**
   * Validate proplines table structure
   */
  async validateTableStructure(): Promise<boolean> {
    try {
      // Check if table exists and has required columns
      const { data, error } = await supabase
        .from('proplines')
        .select('id, conflict_key, player_id, prop_type, sportsbook')
        .limit(1);

      if (error) {
        logError('ProplinesUpsert', 'Table structure validation failed:', error);
        return false;
      }

      logSuccess('ProplinesUpsert', 'Table structure validation passed');
      return true;
    } catch (error) {
      logError('ProplinesUpsert', 'Failed to validate table structure:', error);
      return false;
    }
  }

  /**
   * Set batch size for processing
   */
  setBatchSize(size: number): void {
    if (size > 0 && size <= 1000) {
      this.batchSize = size;
      logInfo('ProplinesUpsert', `Batch size set to ${size}`);
    } else {
      logWarning('ProplinesUpsert', `Invalid batch size ${size}, keeping current size ${this.batchSize}`);
    }
  }

  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batchSize;
  }
}

// Export singleton instance
export const proplinesUpsertService = new ProplinesUpsertService();
