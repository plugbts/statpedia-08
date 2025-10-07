import { analyticsPrecomputationService } from '@/services/analytics-precomputation';

interface Prop {
  playerId: string;
  playerName: string;
  propType: string;
  line: number;
  direction: 'over' | 'under';
  team: string;
  opponent: string;
  position: string;
  sport?: string;
}

interface ChunkedResult {
  key: string;
  analytics: any;
}

/**
 * Process analytics in chunks to prevent UI freezing
 */
export async function* processAnalyticsChunked(
  props: Prop[],
  chunkSize: number = 5,
  delayMs: number = 10
): AsyncGenerator<ChunkedResult[], void, unknown> {
  console.log(`🔄 Processing ${props.length} props in chunks of ${chunkSize}`);
  
  for (let i = 0; i < props.length; i += chunkSize) {
    const chunk = props.slice(i, i + chunkSize);
    
    console.log(`📦 Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(props.length / chunkSize)}`);
    
    const chunkResults: ChunkedResult[] = [];
    
    for (const prop of chunk) {
      try {
        const analytics = await analyticsPrecomputationService.precomputeAnalytics(
          prop.playerId,
          prop.playerName,
          prop.propType,
          prop.line,
          prop.direction,
          prop.team,
          prop.opponent,
          prop.position,
          prop.sport
        );
        
        chunkResults.push({
          key: `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`,
          analytics
        });
        
        // Yield control back to the event loop every iteration
        await new Promise(resolve => setTimeout(resolve, 0));
        
      } catch (error) {
        console.error(`❌ Failed to process ${prop.playerName} ${prop.propType}:`, error);
        chunkResults.push({
          key: `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`,
          analytics: null
        });
      }
    }
    
    yield chunkResults;
    
    // Small delay between chunks
    if (i + chunkSize < props.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Process analytics with progress callback
 */
export async function processAnalyticsWithProgress(
  props: Prop[],
  onProgress: (completed: number, total: number, results: ChunkedResult[]) => void,
  chunkSize: number = 5
): Promise<ChunkedResult[]> {
  const allResults: ChunkedResult[] = [];
  let completed = 0;
  
  for await (const chunkResults of processAnalyticsChunked(props, chunkSize)) {
    allResults.push(...chunkResults);
    completed += chunkResults.length;
    
    onProgress(completed, props.length, allResults);
  }
  
  return allResults;
}

/**
 * Generator function for yielding control during heavy operations
 */
export async function* yieldControl<T>(
  items: T[],
  batchSize: number = 100
): AsyncGenerator<T[], void, unknown> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    yield batch;
    
    // Yield control back to the event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
