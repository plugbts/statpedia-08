/**
 * Metrics API Service
 * 
 * Proxies requests to the Cloudflare Worker metrics endpoint
 */

interface MetricsData {
  totalKeptPlayerProps: number;
  totalDroppedPlayerProps: number;
  cacheHits: number;
  cacheMisses: number;
  upstreamStatusCounts: {
    "200": number;
    "4xx": number;
    "5xx": number;
  };
  avgResponseTimeMs: number;
  totalRequests: number;
  lastUpdated: string;
}

class MetricsAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://statpedia-player-props.statpedia.workers.dev';
  }

  /**
   * Get current metrics
   */
  async getMetrics(reset: boolean = false): Promise<MetricsData> {
    try {
      const url = new URL(`${this.baseUrl}/metrics`);
      if (reset) {
        url.searchParams.set('reset', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

  /**
   * Reset metrics counters
   */
  async resetMetrics(): Promise<MetricsData> {
    return this.getMetrics(true);
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string {
    // Try to get from localStorage first, fallback to default
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_token') || 'test-token-123';
    }
    return 'test-token-123';
  }

  /**
   * Health check for metrics endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Metrics health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const metricsAPI = new MetricsAPI();

// Export types
export type { MetricsData };
