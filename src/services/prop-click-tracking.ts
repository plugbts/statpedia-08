/**
 * Prop Click Tracking Service
 * 
 * Tracks user interactions with player props for analytics
 */

import { supabase } from '@/integrations/supabase/client';

export interface PropClickData {
  propId: string;
  userId?: string;
  sessionId?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  userAgent?: string;
}

export const propClickTracking = {
  /**
   * Track a click on a prop
   */
  async trackClick(data: PropClickData): Promise<void> {
    try {
      // Get device type from viewport width
      const deviceType = data.deviceType || getDeviceType();
      
      // Get or create session ID
      const sessionId = data.sessionId || getSessionId();
      
      // Get user agent
      const userAgent = data.userAgent || navigator.userAgent;
      
      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      const userId = data.userId || user?.id || null;
      
      // Insert click record via direct SQL (bypassing RLS for public tracking)
      const { error } = await supabase.rpc('track_prop_click', {
        p_prop_id: data.propId,
        p_user_id: userId,
        p_session_id: sessionId,
        p_device_type: deviceType,
        p_user_agent: userAgent
      });
      
      if (error) {
        console.error('Error tracking prop click:', error);
      }
    } catch (error) {
      // Fail silently - don't break user experience if tracking fails
      console.warn('Failed to track prop click:', error);
    }
  },
  
  /**
   * Batch track multiple clicks (for performance)
   */
  async trackClicksBatch(clicks: PropClickData[]): Promise<void> {
    try {
      const sessionId = getSessionId();
      const deviceType = getDeviceType();
      const userAgent = navigator.userAgent;
      const { data: { user } } = await supabase.auth.getUser();
      
      const clickRecords = clicks.map(click => ({
        prop_id: click.propId,
        user_id: click.userId || user?.id || null,
        session_id: click.sessionId || sessionId,
        device_type: click.deviceType || deviceType,
        user_agent: click.userAgent || userAgent,
      }));
      
      // Note: This requires a custom RPC function in Supabase
      const { error } = await supabase.rpc('track_prop_clicks_batch', {
        p_clicks: clickRecords
      });
      
      if (error) {
        console.error('Error batch tracking prop clicks:', error);
      }
    } catch (error) {
      console.warn('Failed to batch track prop clicks:', error);
    }
  },
  
  /**
   * Get top clicked prop types (for analytics dashboard)
   */
  async getTopClickedPropTypes(league?: string, timeRange: '24h' | '7d' | '30d' | 'all' = 'all') {
    try {
      const { data, error } = await supabase.rpc('get_top_clicked_prop_types', {
        p_league: league || null,
        p_time_range: timeRange
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching top clicked prop types:', error);
      return [];
    }
  },
  
  /**
   * Get user's prop preferences
   */
  async getUserPropPreferences(userId: string) {
    try {
      const { data, error } = await supabase.rpc('get_user_prop_preferences', {
        p_user_id: userId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user prop preferences:', error);
      return [];
    }
  }
};

// Helper functions
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('statpedia_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('statpedia_session_id', sessionId);
  }
  return sessionId;
}

