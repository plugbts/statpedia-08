// Loveable integration for real-time code and UI sync
interface LoveableConfig {
  projectId: string;
  apiUrl: string;
  apiKey?: string;
}

interface LoveableSyncEvent {
  type: 'code' | 'ui' | 'config';
  data: any;
  timestamp: number;
}

class LoveableClient {
  private config: LoveableConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: LoveableConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const wsUrl = `wss://api.loveable.dev/ws/${this.config.projectId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to Loveable real-time sync');
        this.reconnectAttempts = 0;
        this.emit('connected', { timestamp: Date.now() });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing Loveable message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from Loveable');
        this.emit('disconnected', { timestamp: Date.now() });
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Loveable WebSocket error:', error);
        this.emit('error', { error, timestamp: Date.now() });
      };
    } catch (error) {
      console.error('Failed to connect to Loveable:', error);
      throw error;
    }
  }

  private handleMessage(data: LoveableSyncEvent): void {
    switch (data.type) {
      case 'code':
        this.handleCodeSync(data.data);
        break;
      case 'ui':
        this.handleUISync(data.data);
        break;
      case 'config':
        this.handleConfigSync(data.data);
        break;
      default:
        console.warn('Unknown Loveable message type:', data.type);
    }
  }

  private handleCodeSync(data: any): void {
    // Handle real-time code synchronization
    console.log('Code sync received:', data);
    this.emit('code-sync', data);
  }

  private handleUISync(data: any): void {
    // Handle real-time UI synchronization
    console.log('UI sync received:', data);
    this.emit('ui-sync', data);
  }

  private handleConfigSync(data: any): void {
    // Handle configuration synchronization
    console.log('Config sync received:', data);
    this.emit('config-sync', data);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect to Loveable in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached. Please refresh the page.');
      this.emit('max-reconnect-attempts', { timestamp: Date.now() });
    }
  }

  sendSyncEvent(event: LoveableSyncEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      console.warn('Loveable WebSocket not connected. Cannot send sync event.');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private emit(event: string, data: any): void {
    // Emit custom events that can be listened to
    window.dispatchEvent(new CustomEvent(`loveable:${event}`, { detail: data }));
  }

  // Public API methods
  syncCode(codeData: any): void {
    this.sendSyncEvent({
      type: 'code',
      data: codeData,
      timestamp: Date.now()
    });
  }

  syncUI(uiData: any): void {
    this.sendSyncEvent({
      type: 'ui',
      data: uiData,
      timestamp: Date.now()
    });
  }

  syncConfig(configData: any): void {
    this.sendSyncEvent({
      type: 'config',
      data: configData,
      timestamp: Date.now()
    });
  }
}

// Create and export the Loveable client instance
const loveableConfig: LoveableConfig = {
  projectId: import.meta.env.VITE_LOVEABLE_PROJECT_ID || 'statpedia-08',
  apiUrl: import.meta.env.VITE_LOVEABLE_API_URL || 'https://api.loveable.dev',
  apiKey: import.meta.env.VITE_LOVEABLE_API_KEY,
};

export const loveableClient = new LoveableClient(loveableConfig);

// Auto-connect in development with error handling
if (import.meta.env.DEV) {
  loveableClient.connect().catch((error) => {
    console.warn('Loveable client connection failed:', error);
    // Don't throw - just log the error and continue
  });
}

export default loveableClient;
