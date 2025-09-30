import { supabase } from '@/integrations/supabase/client';

export interface TrialEligibilityResult {
  isEligible: boolean;
  reason: string;
  abuseType: string;
}

export interface TrialUsageStats {
  ipCount: number;
  macCount: number;
  emailUsed: boolean;
  ipBlocked: boolean;
  macBlocked: boolean;
}

class TrialAbusePreventionService {
  // Get client IP address (in a real app, this would come from the server)
  private getClientIP(): string {
    // This is a placeholder - in production, you'd get this from the server
    // For now, we'll generate a mock IP based on browser fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Browser fingerprint', 2, 2);
    const fingerprint = canvas.toDataURL();
    
    // Generate a mock IP based on fingerprint hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to IP-like format (this is just for demo purposes)
    const ip1 = Math.abs(hash) % 255;
    const ip2 = Math.abs(hash >> 8) % 255;
    const ip3 = Math.abs(hash >> 16) % 255;
    const ip4 = Math.abs(hash >> 24) % 255;
    
    return `${ip1}.${ip2}.${ip3}.${ip4}`;
  }

  // Get MAC address (this is not possible in browsers for security reasons)
  // We'll use a combination of browser features to create a unique identifier
  private getClientMAC(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('MAC fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Create a hash of the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Convert to MAC-like format (6 pairs of hex digits)
    const mac = Math.abs(hash).toString(16).padStart(12, '0');
    return mac.match(/.{2}/g)?.join(':') || '00:00:00:00:00:00';
  }

  // Check if user is eligible for free trial
  async checkTrialEligibility(userId: string, email: string): Promise<TrialEligibilityResult> {
    try {
      // First, check if user has already used a free trial (simple check)
      const { data: existingTrial, error: trialError } = await supabase
        .from('user_trials')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (trialError && trialError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking existing trial:', trialError);
        // If there's an error, allow the trial to proceed (fail open)
        return {
          isEligible: true,
          reason: 'Eligible for free trial',
          abuseType: 'eligible'
        };
      }

      if (existingTrial) {
        return {
          isEligible: false,
          reason: 'Email has already used free trial',
          abuseType: 'email_limit'
        };
      }

      // Check IP and MAC limits (optional, fail open if errors)
      try {
        const ipAddress = this.getClientIP();
        const macAddress = this.getClientMAC();

        // Check IP limit
        const { count: ipCount } = await supabase
          .from('user_trials')
          .select('*', { count: 'exact', head: true })
          .eq('ip_address', ipAddress);

        if (ipCount && ipCount >= 2) {
          return {
            isEligible: false,
            reason: 'IP address has exceeded free trial limit',
            abuseType: 'ip_limit'
          };
        }

        // Check MAC limit
        const { count: macCount } = await supabase
          .from('user_trials')
          .select('*', { count: 'exact', head: true })
          .eq('mac_address', macAddress);

        if (macCount && macCount >= 2) {
          return {
            isEligible: false,
            reason: 'Device has exceeded free trial limit',
            abuseType: 'mac_limit'
          };
        }
      } catch (limitError) {
        console.warn('Error checking IP/MAC limits, allowing trial:', limitError);
        // Fail open - allow trial if we can't check limits
      }

      // All checks passed
      return {
        isEligible: true,
        reason: 'Eligible for free trial',
        abuseType: 'eligible'
      };
    } catch (error) {
      console.error('Error in checkTrialEligibility:', error);
      // Fail open - allow trial if there's an error
      return {
        isEligible: true,
        reason: 'Eligible for free trial',
        abuseType: 'eligible'
      };
    }
  }

  // Record trial usage
  async recordTrialUsage(userId: string): Promise<boolean> {
    try {
      const ipAddress = this.getClientIP();
      const macAddress = this.getClientMAC();
      const userAgent = navigator.userAgent;

      // Insert trial record directly
      const { error: trialError } = await supabase
        .from('user_trials')
        .insert({
          user_id: userId,
          plan_id: 'pro',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          status: 'active',
          ip_address: ipAddress,
          mac_address: macAddress,
          user_agent: userAgent
        });

      if (trialError) {
        console.error('Error recording trial usage:', trialError);
        return false;
      }

      // Update IP trial usage (optional)
      try {
        await supabase
          .from('ip_trial_usage')
          .upsert({
            ip_address: ipAddress,
            trial_count: 1,
            last_trial_at: new Date().toISOString()
          }, {
            onConflict: 'ip_address'
          });
      } catch (ipError) {
        console.warn('Error updating IP trial usage:', ipError);
      }

      // Update MAC trial usage (optional)
      try {
        await supabase
          .from('mac_trial_usage')
          .upsert({
            mac_address: macAddress,
            trial_count: 1,
            last_trial_at: new Date().toISOString()
          }, {
            onConflict: 'mac_address'
          });
      } catch (macError) {
        console.warn('Error updating MAC trial usage:', macError);
      }

      return true;
    } catch (error) {
      console.error('Error in recordTrialUsage:', error);
      return false;
    }
  }

  // Log abuse attempt
  async logAbuseAttempt(
    userId: string,
    email: string,
    abuseType: string,
    trialCount: number,
    blockedReason: string
  ): Promise<void> {
    try {
      const ipAddress = this.getClientIP();
      const macAddress = this.getClientMAC();
      const userAgent = navigator.userAgent;

      await supabase
        .rpc('log_trial_abuse', {
          p_user_id: userId,
          p_email: email,
          p_ip_address: ipAddress,
          p_mac_address: macAddress,
          p_user_agent: userAgent,
          p_abuse_type: abuseType,
          p_trial_count: trialCount,
          p_blocked_reason: blockedReason
        });
    } catch (error) {
      console.error('Error logging abuse attempt:', error);
    }
  }

  // Block IP address
  async blockIPAddress(ipAddress: string, reason: string = 'Free trial abuse detected'): Promise<void> {
    try {
      await supabase
        .rpc('block_ip_address', {
          p_ip_address: ipAddress,
          p_reason: reason
        });
    } catch (error) {
      console.error('Error blocking IP address:', error);
    }
  }

  // Block MAC address
  async blockMACAddress(macAddress: string, reason: string = 'Free trial abuse detected'): Promise<void> {
    try {
      await supabase
        .rpc('block_mac_address', {
          p_mac_address: macAddress,
          p_reason: reason
        });
    } catch (error) {
      console.error('Error blocking MAC address:', error);
    }
  }

  // Get trial usage statistics
  async getTrialUsageStats(userId: string, email: string): Promise<TrialUsageStats> {
    try {
      const ipAddress = this.getClientIP();
      const macAddress = this.getClientMAC();

      // Get IP count
      const { count: ipCount } = await supabase
        .from('user_trials')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ipAddress);

      // Get MAC count
      const { count: macCount } = await supabase
        .from('user_trials')
        .select('*', { count: 'exact', head: true })
        .eq('mac_address', macAddress);

      // Check if email has used trial
      const { data: emailTrial } = await supabase
        .from('user_trials')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Check if IP is blocked
      const { data: ipBlocked } = await supabase
        .from('ip_trial_usage')
        .select('is_blocked')
        .eq('ip_address', ipAddress)
        .single();

      // Check if MAC is blocked
      const { data: macBlocked } = await supabase
        .from('mac_trial_usage')
        .select('is_blocked')
        .eq('mac_address', macAddress)
        .single();

      return {
        ipCount: ipCount || 0,
        macCount: macCount || 0,
        emailUsed: !!emailTrial,
        ipBlocked: ipBlocked?.is_blocked || false,
        macBlocked: macBlocked?.is_blocked || false
      };
    } catch (error) {
      console.error('Error getting trial usage stats:', error);
      return {
        ipCount: 0,
        macCount: 0,
        emailUsed: false,
        ipBlocked: false,
        macBlocked: false
      };
    }
  }

  // Get abuse logs (admin only)
  async getAbuseLogs(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('trial_abuse_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting abuse logs:', error);
      return [];
    }
  }

  // Get IP trial usage (admin only)
  async getIPTrialUsage(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ip_trial_usage')
        .select('*')
        .order('last_trial_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting IP trial usage:', error);
      return [];
    }
  }

  // Get MAC trial usage (admin only)
  async getMACTrialUsage(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('mac_trial_usage')
        .select('*')
        .order('last_trial_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting MAC trial usage:', error);
      return [];
    }
  }
}

export const trialAbusePreventionService = new TrialAbusePreventionService();
