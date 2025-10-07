// analytics.worker.ts
import { analyticsPrecomputationService } from '../services/analytics-precomputation';

interface WorkerMessage {
  type: 'CALCULATE_ANALYTICS';
  payload: {
    props: Array<{
      playerId: string;
      playerName: string;
      propType: string;
      line: number;
      direction: 'over' | 'under';
      team: string;
      opponent: string;
      position: string;
      sport?: string;
    }>;
  };
}

interface WorkerResponse {
  type: 'ANALYTICS_RESULT';
  payload: {
    results: Array<{
      key: string;
      analytics: any;
    }>;
    error?: string;
  };
}

// Web Worker context
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  if (type === 'CALCULATE_ANALYTICS') {
    try {
      console.log('🔄 Worker: Starting analytics calculation for', payload.props.length, 'props');
      
      const results = await Promise.all(
        payload.props.map(async (prop) => {
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
            
            return {
              key: `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`,
              analytics
            };
          } catch (error) {
            console.error('❌ Worker: Failed to calculate analytics for', prop.playerName, prop.propType, error);
            return {
              key: `${prop.playerId}-${prop.propType}-${prop.line}-${prop.direction}`,
              analytics: null
            };
          }
        })
      );
      
      const response: WorkerResponse = {
        type: 'ANALYTICS_RESULT',
        payload: { results }
      };
      
      self.postMessage(response);
      
    } catch (error) {
      const response: WorkerResponse = {
        type: 'ANALYTICS_RESULT',
        payload: {
          results: [],
          error: error.message
        }
      };
      
      self.postMessage(response);
    }
  }
};

// Export for TypeScript
export {};
