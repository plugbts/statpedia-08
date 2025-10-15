import { logAPI, logSuccess, logError, logWarning, logInfo } from '@/utils/console-logger';
import { hasuraPlayerPropsNormalizedService } from './hasura-player-props-normalized-service';
import { IngestedPlayerProp } from './sportsgameodds-ingestion-service';

// Updated interfaces for stable data architecture
export interface NormalizedPlayerPropData {
  game_id: string;
  player_id: string;
  sportsbook_id: string;
  market: string;
  line: number;
  odds: number;
  ev_percent?: number;
}

export interface UpsertStats {
  totalProcessed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  sportsbooks: { [key: string]: number };
  propTypes: { [key: string]: number };
  leagues: { [key: string]: number };
  resolutionStats: {
    playersResolved: number;
    teamsResolved: number;
    sportsbooksResolved: number;
    gamesResolved: number;
  };
}

class StableDataUpsertService {
  private batchSize = 100; // Process in batches to avoid timeout
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Main upsert method - processes all ingested props using canonical mapping tables
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
      leagues: {},
      resolutionStats: {
        playersResolved: 0,
        teamsResolved: 0,
        sportsbooksResolved: 0,
        gamesResolved: 0
      }
    };

    if (props.length === 0) {
      logInfo('StableDataUpsert', 'No props to upsert');
      return stats;
    }

    logInfo('StableDataUpsert', `Starting stable data upsert of ${props.length} player props`);

    // Process in batches
    for (let i = 0; i < props.length; i += this.batchSize) {
      const batch = props.slice(i, i + this.batchSize);
      
      try {
        const batchStats = await this.upsertBatch(batch);
        this.mergeStats(stats, batchStats);
        
        logAPI('StableDataUpsert', `Processed batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(props.length / this.batchSize)}`);
      } catch (error) {
        logError('StableDataUpsert', `Failed to process batch starting at ${i}:`, error);
        stats.errors += batch.length;
      }
    }

    logSuccess('StableDataUpsert', `Stable data upsert completed: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.errors} errors`);
    logInfo('StableDataUpsert', `Resolution stats: Players: ${stats.resolutionStats.playersResolved}, Teams: ${stats.resolutionStats.teamsResolved}, Sportsbooks: ${stats.resolutionStats.sportsbooksResolved}, Games: ${stats.resolutionStats.gamesResolved}`);
    
    return stats;
  }

  /**
   * Upsert a batch of props using canonical mapping
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
      leagues: {},
      resolutionStats: {
        playersResolved: 0,
        teamsResolved: 0,
        sportsbooksResolved: 0,
        gamesResolved: 0
      }
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
        logError('StableDataUpsert', `Failed to upsert prop with conflict key ${conflictKey}:`, error);
        stats.errors++;
      }
    }

    return stats;
  }

  /**
   * Upsert a single prop using canonical mapping tables
   */
  private async upsertSingleProp(prop: IngestedPlayerProp): Promise<'inserted' | 'updated' | 'skipped'> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.performStableUpsert(prop);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries) {
          logWarning('StableDataUpsert', `Upsert attempt ${attempt} failed, retrying in ${this.retryDelay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay *= 2; // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Perform the actual upsert operation using canonical mapping
   */
  private async performStableUpsert(prop: IngestedPlayerProp): Promise<'inserted' | 'updated' | 'skipped'> {
    try {
      // Step 1: Resolve canonical IDs
      const resolvedIds = await this.resolveCanonicalIds(prop);
      
      if (!resolvedIds) {
        logWarning('StableDataUpsert', `Skipping ${prop.player_name} ${prop.prop_type} - could not resolve canonical IDs`);
        return 'skipped';
      }

      // Step 2: Prepare normalized data for bulk upsert
      const normalizedData: NormalizedPlayerPropData = {
        game_id: resolvedIds.gameId,
        player_id: resolvedIds.playerId,
        sportsbook_id: resolvedIds.sportsbookId,
        market: prop.prop_type,
        line: prop.line,
        odds: prop.over_odds, // Using over odds as primary
        ev_percent: this.calculateEV(prop.over_odds, prop.under_odds)
      };

      // Step 3: Use the bulk upsert function
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await hasuraPlayerPropsNormalizedService.bulkUpsertPlayerProps(
        [normalizedData],
        batchId
      );

      if (result.success) {
        logAPI('StableDataUpsert', `Successfully upserted ${prop.player_name} ${prop.prop_type} from ${prop.sportsbook} using stable data architecture`);
        return 'inserted'; // The bulk function handles insert/update logic
      } else {
        logWarning('StableDataUpsert', `Bulk upsert returned success=false for ${prop.player_name} ${prop.prop_type}`);
        return 'skipped';
      }

    } catch (error) {
      logError('StableDataUpsert', `Failed to perform stable upsert for ${prop.player_name} ${prop.prop_type}:`, error);
      throw error;
    }
  }

  /**
   * Resolve canonical IDs for a prop using the resolution functions
   */
  private async resolveCanonicalIds(prop: IngestedPlayerProp): Promise<{
    playerId: string;
    teamId: string;
    sportsbookId: string;
    gameId: string;
  } | null> {
    try {
      // Resolve player ID
      const playerId = await this.resolvePlayerId(prop);
      if (!playerId) {
        logWarning('StableDataUpsert', `Could not resolve player: ${prop.player_name} (${prop.team})`);
        return null;
      }

      // Resolve team ID
      const teamId = await this.resolveTeamId(prop.team, prop.league);
      if (!teamId) {
        logWarning('StableDataUpsert', `Could not resolve team: ${prop.team} (${prop.league})`);
        return null;
      }

      // Resolve sportsbook ID
      const sportsbookId = await this.resolveSportsbookId(prop.sportsbook);
      if (!sportsbookId) {
        logWarning('StableDataUpsert', `Could not resolve sportsbook: ${prop.sportsbook}`);
        return null;
      }

      // Resolve game ID
      const gameId = await this.resolveGameId(prop, teamId);
      if (!gameId) {
        logWarning('StableDataUpsert', `Could not resolve game for ${prop.team} vs ${prop.opponent}`);
        return null;
      }

      return {
        playerId,
        teamId,
        sportsbookId,
        gameId
      };

    } catch (error) {
      logError('StableDataUpsert', `Failed to resolve canonical IDs for ${prop.player_name}:`, error);
      return null;
    }
  }

  /**
   * Resolve player ID using the resolve_player function
   */
  private async resolvePlayerId(prop: IngestedPlayerProp): Promise<string | null> {
    try {
      // First try by external_id if available
      if (prop.player_id) {
        const result = await hasuraPlayerPropsNormalizedService.executeQuery(`
          SELECT resolve_player($1, NULL, $2) as player_id
        `, [prop.player_id, prop.league]);
        
        if (result && result.player_id) {
          return result.player_id;
        }
      }

      // Fallback to display name
      const result = await hasuraPlayerPropsNormalizedService.executeQuery(`
        SELECT resolve_player($1, NULL, $2) as player_id
      `, [prop.player_name, prop.league]);
      
      return result?.player_id || null;
    } catch (error) {
      logError('StableDataUpsert', `Failed to resolve player ID for ${prop.player_name}:`, error);
      return null;
    }
  }

  /**
   * Resolve team ID using the resolve_team function
   */
  private async resolveTeamId(teamAbbr: string, league: string): Promise<string | null> {
    try {
      const result = await hasuraPlayerPropsNormalizedService.executeQuery(`
        SELECT resolve_team($1, $2) as team_id
      `, [teamAbbr, league]);
      
      return result?.team_id || null;
    } catch (error) {
      logError('StableDataUpsert', `Failed to resolve team ID for ${teamAbbr}:`, error);
      return null;
    }
  }

  /**
   * Resolve sportsbook ID using the resolve_sportsbook function
   */
  private async resolveSportsbookId(sportsbookName: string): Promise<string | null> {
    try {
      const result = await hasuraPlayerPropsNormalizedService.executeQuery(`
        SELECT resolve_sportsbook($1) as sportsbook_id
      `, [sportsbookName]);
      
      return result?.sportsbook_id || null;
    } catch (error) {
      logError('StableDataUpsert', `Failed to resolve sportsbook ID for ${sportsbookName}:`, error);
      return null;
    }
  }

  /**
   * Resolve game ID by finding the game between the teams
   */
  private async resolveGameId(prop: IngestedPlayerProp, teamId: string): Promise<string | null> {
    try {
      // First resolve opponent team ID
      const opponentTeamId = await this.resolveTeamId(prop.opponent, prop.league);
      if (!opponentTeamId) {
        return null;
      }

      // Find the game between these teams
      const result = await hasuraPlayerPropsNormalizedService.executeQuery(`
        SELECT id FROM games 
        WHERE ((home_team_id = $1 AND away_team_id = $2) OR (home_team_id = $2 AND away_team_id = $1))
        AND league = $3
        AND is_active = true
        ORDER BY game_date DESC
        LIMIT 1
      `, [teamId, opponentTeamId, prop.league]);
      
      return result?.id || null;
    } catch (error) {
      logError('StableDataUpsert', `Failed to resolve game ID for ${prop.team} vs ${prop.opponent}:`, error);
      return null;
    }
  }

  /**
   * Calculate EV percentage from odds
   */
  private calculateEV(overOdds: number, underOdds: number): number | undefined {
    try {
      // Simple EV calculation - this could be enhanced
      const overImpliedProb = this.oddsToImpliedProbability(overOdds);
      const underImpliedProb = this.oddsToImpliedProbability(underOdds);
      
      if (overImpliedProb && underImpliedProb) {
        const totalImpliedProb = overImpliedProb + underImpliedProb;
        const overEV = (1 - totalImpliedProb) * 100; // Positive EV when total < 100%
        return Math.round(overEV * 100) / 100; // Round to 2 decimal places
      }
      
      return undefined;
    } catch (error) {
      logWarning('StableDataUpsert', `Failed to calculate EV for odds ${overOdds}/${underOdds}:`, error);
      return undefined;
    }
  }

  /**
   * Convert American odds to implied probability
   */
  private oddsToImpliedProbability(odds: number): number | null {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else if (odds < 0) {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
    return null;
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

    // Merge resolution stats
    target.resolutionStats.playersResolved += source.resolutionStats.playersResolved;
    target.resolutionStats.teamsResolved += source.resolutionStats.teamsResolved;
    target.resolutionStats.sportsbooksResolved += source.resolutionStats.sportsbooksResolved;
    target.resolutionStats.gamesResolved += source.resolutionStats.gamesResolved;
  }

  /**
   * Set batch size for processing
   */
  setBatchSize(size: number): void {
    if (size > 0 && size <= 1000) {
      this.batchSize = size;
      logInfo('StableDataUpsert', `Batch size set to ${size}`);
    } else {
      logWarning('StableDataUpsert', `Invalid batch size ${size}, keeping current size ${this.batchSize}`);
    }
  }

  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batchSize;
  }

  /**
   * Validate that canonical tables exist and are accessible
   */
  async validateCanonicalTables(): Promise<boolean> {
    try {
      // Check if all canonical tables exist
      const tables = ['players', 'teams', 'sportsbooks', 'games', 'player_props'];
      
      for (const table of tables) {
        const result = await hasuraPlayerPropsNormalizedService.executeQuery(`
          SELECT 1 FROM ${table} LIMIT 1
        `);
        
        if (!result) {
          logError('StableDataUpsert', `Table ${table} is not accessible`);
          return false;
        }
      }

      logSuccess('StableDataUpsert', 'All canonical tables are accessible');
      return true;
    } catch (error) {
      logError('StableDataUpsert', 'Failed to validate canonical tables:', error);
      return false;
    }
  }
}

// Export singleton instance
export const stableDataUpsertService = new StableDataUpsertService();
