import { supabase } from '@/integrations/supabase/client';

export interface OAuthConnection {
  id: string;
  user_id: string;
  sportsbook_name: string;
  connection_status: 'pending' | 'connected' | 'failed' | 'disconnected';
  oauth_state: string;
  oauth_code?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  last_sync_at?: string;
  sync_frequency: 'daily' | 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  bets_synced: number;
  error?: string;
  last_sync_time?: string;
}

class SportsbookOAuthService {
  private readonly OAUTH_BASE_URL = import.meta.env.VITE_OAUTH_BASE_URL || 'https://api.statpedia.com/oauth';
  private readonly REDIRECT_URI = `${window.location.origin}/sportsbook-callback`;

  // OAuth configuration for different sportsbooks
  private getOAuthConfig(sportsbook: string) {
    const configs = {
      draftkings: {
        client_id: import.meta.env.VITE_DRAFTKINGS_CLIENT_ID,
        auth_url: 'https://sportsbook.draftkings.com/oauth/authorize',
        scope: 'read:user read:bets',
        response_type: 'code'
      },
      fanduel: {
        client_id: import.meta.env.VITE_FANDUEL_CLIENT_ID,
        auth_url: 'https://sportsbook.fanduel.com/oauth/authorize',
        scope: 'read:profile read:bets',
        response_type: 'code'
      },
      betmgm: {
        client_id: import.meta.env.VITE_BETMGM_CLIENT_ID,
        auth_url: 'https://sports.betmgm.com/oauth/authorize',
        scope: 'read:account read:bets',
        response_type: 'code'
      },
      caesars: {
        client_id: import.meta.env.VITE_CAESARS_CLIENT_ID,
        auth_url: 'https://sportsbook.caesars.com/oauth/authorize',
        scope: 'read:profile read:bets',
        response_type: 'code'
      }
    };

    return configs[sportsbook as keyof typeof configs];
  }

  // Generate OAuth authorization URL
  generateAuthUrl(sportsbook: string): { url: string; state: string } {
    const config = this.getOAuthConfig(sportsbook);
    if (!config) {
      throw new Error(`OAuth not supported for ${sportsbook}`);
    }

    const state = this.generateRandomState();
    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: this.REDIRECT_URI,
      response_type: config.response_type,
      scope: config.scope,
      state: state
    });

    const url = `${config.auth_url}?${params.toString()}`;
    return { url, state };
  }

  // Generate random state for OAuth security
  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Create OAuth connection record
  async createOAuthConnection(userId: string, sportsbook: string, state: string): Promise<OAuthConnection> {
    const { data, error } = await supabase
      .from('sportsbook_oauth_connections')
      .insert({
        user_id: userId,
        sportsbook_name: sportsbook,
        connection_status: 'pending',
        oauth_state: state,
        sync_frequency: 'daily'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string): Promise<OAuthConnection> {
    // Find the connection by state
    const { data: connection, error: findError } = await supabase
      .from('sportsbook_oauth_connections')
      .select('*')
      .eq('oauth_state', state)
      .eq('connection_status', 'pending')
      .single();

    if (findError || !connection) {
      throw new Error('Invalid OAuth state or connection not found');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(connection.sportsbook_name, code);
    
    // Update connection with tokens
    const { data: updatedConnection, error: updateError } = await supabase
      .from('sportsbook_oauth_connections')
      .update({
        oauth_code: code,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        connection_status: 'connected'
      })
      .eq('id', connection.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedConnection;
  }

  // Exchange authorization code for access tokens
  private async exchangeCodeForTokens(sportsbook: string, code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
  }> {
    const config = this.getOAuthConfig(sportsbook);
    if (!config) {
      throw new Error(`OAuth not supported for ${sportsbook}`);
    }

    // In a real implementation, this would make a server-side call to exchange the code
    // For now, we'll simulate the token exchange
    const response = await fetch(`${this.OAUTH_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.client_id,
        client_secret: import.meta.env.VITE_CLIENT_SECRET,
        code: code,
        redirect_uri: this.REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    };
  }

  // Sync bets from sportsbook using OAuth
  async syncBetsFromSportsbook(connectionId: string): Promise<SyncResult> {
    try {
      const { data: connection, error: connectionError } = await supabase
        .from('sportsbook_oauth_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        throw new Error('Connection not found');
      }

      if (connection.connection_status !== 'connected') {
        throw new Error('Connection not active');
      }

      // Check if token needs refresh
      if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
        await this.refreshAccessToken(connectionId);
      }

      // Sync bets using web scraping approach (like Pikkit)
      const syncResult = await this.scrapeBetsFromSportsbook(connection);

      // Update last sync time
      await supabase
        .from('sportsbook_oauth_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connectionId);

      return syncResult;
    } catch (error: any) {
      console.error('Failed to sync bets:', error);
      return {
        success: false,
        bets_synced: 0,
        error: error.message
      };
    }
  }

  // Web scraping approach similar to Pikkit
  private async scrapeBetsFromSportsbook(connection: OAuthConnection): Promise<SyncResult> {
    // This would be implemented as a server-side function that:
    // 1. Uses the access token to authenticate with the sportsbook
    // 2. Scrapes bet data from the user's account
    // 3. Parses and normalizes the data
    // 4. Stores it in our database

    // For now, we'll simulate the scraping process
    const response = await fetch(`${this.OAUTH_BASE_URL}/scrape-bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${connection.access_token}`
      },
      body: JSON.stringify({
        sportsbook: connection.sportsbook_name,
        user_id: connection.user_id,
        last_sync: connection.last_sync_at
      })
    });

    if (!response.ok) {
      throw new Error('Failed to scrape bets from sportsbook');
    }

    const data = await response.json();
    return {
      success: true,
      bets_synced: data.bets_synced || 0,
      last_sync_time: new Date().toISOString()
    };
  }

  // Refresh access token
  private async refreshAccessToken(connectionId: string): Promise<void> {
    const { data: connection, error } = await supabase
      .from('sportsbook_oauth_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !connection?.refresh_token) {
      throw new Error('Connection not found or no refresh token');
    }

    const config = this.getOAuthConfig(connection.sportsbook_name);
    if (!config) {
      throw new Error(`OAuth not supported for ${connection.sportsbook_name}`);
    }

    const response = await fetch(`${this.OAUTH_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.client_id,
        client_secret: import.meta.env.VITE_CLIENT_SECRET,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    
    await supabase
      .from('sportsbook_oauth_connections')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
      })
      .eq('id', connectionId);
  }

  // Get user's OAuth connections
  async getUserOAuthConnections(userId: string): Promise<OAuthConnection[]> {
    const { data, error } = await supabase
      .from('sportsbook_oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Handle table not existing gracefully
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('OAuth connections table not yet created');
        return [];
      }
      throw error;
    }
    return data || [];
  }

  // Disconnect OAuth connection
  async disconnectOAuthConnection(connectionId: string): Promise<void> {
    await supabase
      .from('sportsbook_oauth_connections')
      .update({ connection_status: 'disconnected' })
      .eq('id', connectionId);
  }

  // Get supported sportsbooks for OAuth
  getSupportedSportsbooks(): Array<{ value: string; label: string; oauth_available: boolean }> {
    return [
      { value: 'draftkings', label: 'DraftKings', oauth_available: true },
      { value: 'fanduel', label: 'FanDuel', oauth_available: true },
      { value: 'betmgm', label: 'BetMGM', oauth_available: true },
      { value: 'caesars', label: 'Caesars Sportsbook', oauth_available: true },
      { value: 'bet365', label: 'Bet365', oauth_available: false },
      { value: 'pointsbet', label: 'PointsBet', oauth_available: false },
      { value: 'betrivers', label: 'BetRivers', oauth_available: false },
      { value: 'unibet', label: 'Unibet', oauth_available: false },
      { value: 'fox_bet', label: 'FOX Bet', oauth_available: false }
    ];
  }
}

export const sportsbookOAuthService = new SportsbookOAuthService();
