import { useEffect, useRef, useState, useCallback } from 'react';

interface AnalyticsWorkerMessage {
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

interface AnalyticsWorkerResponse {
  type: 'ANALYTICS_RESULT';
  payload: {
    results: Array<{
      key: string;
      analytics: any;
    }>;
    error?: string;
  };
}

export function useAnalyticsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create worker
    try {
      workerRef.current = new Worker(
        new URL('../workers/analytics.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event: MessageEvent<AnalyticsWorkerResponse>) => {
        const { type, payload } = event.data;
        
        if (type === 'ANALYTICS_RESULT') {
          setIsLoading(false);
          if (payload.error) {
            setError(payload.error);
          } else {
            setError(null);
            // Results will be handled by the calling component
          }
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('❌ Worker error:', error);
        setIsLoading(false);
        setError('Worker error occurred');
      };

    } catch (error) {
      console.warn('⚠️ Web Workers not supported, falling back to main thread');
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const calculateAnalytics = useCallback(async (
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
    }>
  ): Promise<Array<{ key: string; analytics: any }>> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        // Fallback to main thread if worker not available
        reject(new Error('Worker not available'));
        return;
      }

      setIsLoading(true);
      setError(null);

      const messageHandler = (event: MessageEvent<AnalyticsWorkerResponse>) => {
        const { type, payload } = event.data;
        
        if (type === 'ANALYTICS_RESULT') {
          workerRef.current?.removeEventListener('message', messageHandler);
          setIsLoading(false);
          
          if (payload.error) {
            setError(payload.error);
            reject(new Error(payload.error));
          } else {
            setError(null);
            resolve(payload.results);
          }
        }
      };

      workerRef.current.addEventListener('message', messageHandler);

      const message: AnalyticsWorkerMessage = {
        type: 'CALCULATE_ANALYTICS',
        payload: { props }
      };

      workerRef.current.postMessage(message);
    });
  }, []);

  return {
    calculateAnalytics,
    isLoading,
    error,
    isWorkerAvailable: workerRef.current !== null
  };
}
