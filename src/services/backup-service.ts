// Comprehensive backup and rollback service for user data and authentication
import { supabase } from '@/integrations/supabase/client';

export interface UserBackup {
  id: string;
  email: string;
  display_name?: string;
  subscription_tier: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  bankroll: number;
  total_bets: number;
  won_bets: number;
  total_predictions: number;
  won_predictions: number;
  karma: number;
  created_at: string;
  updated_at: string;
  backup_timestamp: string;
}

export interface AuthBackup {
  user_id: string;
  email: string;
  last_sign_in: string;
  email_confirmed: boolean;
  backup_timestamp: string;
}

export interface DatabaseBackup {
  profiles: UserBackup[];
  auth_users: AuthBackup[];
  promo_codes: any[];
  user_trials: any[];
  promo_code_usage: any[];
  backup_timestamp: string;
  backup_version: string;
}

class BackupService {
  private readonly BACKUP_KEY = 'statpedia_user_backup';
  private readonly AUTH_BACKUP_KEY = 'statpedia_auth_backup';
  private readonly DATABASE_BACKUP_KEY = 'statpedia_database_backup';
  private readonly BACKUP_VERSION = '1.0.0';

  // Create user data backup
  async createUserBackup(userId: string): Promise<UserBackup | null> {
    try {
      console.log('🔄 Creating user backup for:', userId);
      
      // Get user profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return null;
      }

      const backup: UserBackup = {
        ...profile,
        backup_timestamp: new Date().toISOString()
      };

      // Store in localStorage as fallback
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
      
      console.log('✅ User backup created successfully');
      return backup;
    } catch (error) {
      console.error('❌ Error creating user backup:', error);
      return null;
    }
  }

  // Restore user data from backup
  async restoreUserData(userId: string): Promise<boolean> {
    try {
      console.log('🔄 Restoring user data for:', userId);
      
      // Try to get backup from localStorage first
      const backupData = localStorage.getItem(this.BACKUP_KEY);
      if (!backupData) {
        console.log('⚠️ No local backup found');
        return false;
      }

      const backup: UserBackup = JSON.parse(backupData);
      
      // Verify backup is for the correct user
      if (backup.user_id !== userId) {
        console.error('❌ Backup user ID mismatch');
        return false;
      }

      // Check if backup is recent (within 7 days)
      const backupAge = Date.now() - new Date(backup.backup_timestamp).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (backupAge > maxAge) {
        console.warn('⚠️ Backup is older than 7 days, may be outdated');
      }

      // Restore profile data
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          display_name: backup.display_name,
          subscription_tier: backup.subscription_tier,
          subscription_start_date: backup.subscription_start_date,
          subscription_end_date: backup.subscription_end_date,
          bankroll: backup.bankroll,
          total_bets: backup.total_bets,
          won_bets: backup.won_bets,
          total_predictions: backup.total_predictions,
          won_predictions: backup.won_predictions,
          karma: backup.karma,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error restoring user data:', error);
        return false;
      }

      console.log('✅ User data restored successfully');
      return true;
    } catch (error) {
      console.error('❌ Error restoring user data:', error);
      return false;
    }
  }

  // Create authentication backup
  async createAuthBackup(user: any): Promise<AuthBackup | null> {
    try {
      console.log('🔄 Creating auth backup for:', user.email);
      
      const backup: AuthBackup = {
        user_id: user.id,
        email: user.email,
        last_sign_in: user.last_sign_in_at || new Date().toISOString(),
        email_confirmed: user.email_confirmed_at ? true : false,
        backup_timestamp: new Date().toISOString()
      };

      // Store in localStorage
      localStorage.setItem(this.AUTH_BACKUP_KEY, JSON.stringify(backup));
      
      console.log('✅ Auth backup created successfully');
      return backup;
    } catch (error) {
      console.error('❌ Error creating auth backup:', error);
      return null;
    }
  }

  // Restore authentication data
  async restoreAuthData(): Promise<AuthBackup | null> {
    try {
      console.log('🔄 Restoring auth data');
      
      const backupData = localStorage.getItem(this.AUTH_BACKUP_KEY);
      if (!backupData) {
        console.log('⚠️ No auth backup found');
        return null;
      }

      const backup: AuthBackup = JSON.parse(backupData);
      
      // Check if backup is recent (within 30 days for auth)
      const backupAge = Date.now() - new Date(backup.backup_timestamp).getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (backupAge > maxAge) {
        console.warn('⚠️ Auth backup is older than 30 days');
        return null;
      }

      console.log('✅ Auth data restored successfully');
      return backup;
    } catch (error) {
      console.error('❌ Error restoring auth data:', error);
      return null;
    }
  }

  // Create full database backup (admin function)
  async createDatabaseBackup(): Promise<DatabaseBackup | null> {
    try {
      console.log('🔄 Creating full database backup');
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return null;
      }

      // Get all promo codes
      const { data: promoCodes, error: promoError } = await supabase
        .from('promo_codes')
        .select('*');

      if (promoError) {
        console.error('❌ Error fetching promo codes:', promoError);
        return null;
      }

      // Get all user trials
      const { data: userTrials, error: trialsError } = await supabase
        .from('user_trials')
        .select('*');

      if (trialsError) {
        console.error('❌ Error fetching user trials:', trialsError);
        return null;
      }

      // Get all promo code usage
      const { data: promoUsage, error: usageError } = await supabase
        .from('promo_code_usage')
        .select('*');

      if (usageError) {
        console.error('❌ Error fetching promo code usage:', usageError);
        return null;
      }

      const backup: DatabaseBackup = {
        profiles: profiles?.map(p => ({
          ...p,
          backup_timestamp: new Date().toISOString()
        })) || [],
        auth_users: [], // Note: auth.users is not directly accessible
        promo_codes: promoCodes || [],
        user_trials: userTrials || [],
        promo_code_usage: promoUsage || [],
        backup_timestamp: new Date().toISOString(),
        backup_version: this.BACKUP_VERSION
      };

      // Store in localStorage (for small datasets)
      localStorage.setItem(this.DATABASE_BACKUP_KEY, JSON.stringify(backup));
      
      console.log('✅ Database backup created successfully');
      return backup;
    } catch (error) {
      console.error('❌ Error creating database backup:', error);
      return null;
    }
  }

  // Restore database from backup
  async restoreDatabase(backup: DatabaseBackup): Promise<boolean> {
    try {
      console.log('🔄 Restoring database from backup');
      
      // Restore profiles
      if (backup.profiles.length > 0) {
        const { error: profilesError } = await supabase
          .from('profiles')
          .upsert(backup.profiles.map(p => ({
            user_id: p.user_id,
            display_name: p.display_name,
            subscription_tier: p.subscription_tier,
            subscription_start_date: p.subscription_start_date,
            subscription_end_date: p.subscription_end_date,
            bankroll: p.bankroll,
            total_bets: p.total_bets,
            won_bets: p.won_bets,
            total_predictions: p.total_predictions,
            won_predictions: p.won_predictions,
            karma: p.karma,
            updated_at: new Date().toISOString()
          })));

        if (profilesError) {
          console.error('❌ Error restoring profiles:', profilesError);
          return false;
        }
      }

      // Restore promo codes
      if (backup.promo_codes.length > 0) {
        const { error: promoError } = await supabase
          .from('promo_codes')
          .upsert(backup.promo_codes);

        if (promoError) {
          console.error('❌ Error restoring promo codes:', promoError);
          return false;
        }
      }

      // Restore user trials
      if (backup.user_trials.length > 0) {
        const { error: trialsError } = await supabase
          .from('user_trials')
          .upsert(backup.user_trials);

        if (trialsError) {
          console.error('❌ Error restoring user trials:', trialsError);
          return false;
        }
      }

      // Restore promo code usage
      if (backup.promo_code_usage.length > 0) {
        const { error: usageError } = await supabase
          .from('promo_code_usage')
          .upsert(backup.promo_code_usage);

        if (usageError) {
          console.error('❌ Error restoring promo code usage:', usageError);
          return false;
        }
      }

      console.log('✅ Database restored successfully');
      return true;
    } catch (error) {
      console.error('❌ Error restoring database:', error);
      return false;
    }
  }

  // Get backup status
  getBackupStatus(): {
    userBackup: boolean;
    authBackup: boolean;
    databaseBackup: boolean;
    lastBackup?: string;
  } {
    const userBackup = !!localStorage.getItem(this.BACKUP_KEY);
    const authBackup = !!localStorage.getItem(this.AUTH_BACKUP_KEY);
    const databaseBackup = !!localStorage.getItem(this.DATABASE_BACKUP_KEY);
    
    let lastBackup: string | undefined;
    if (userBackup) {
      try {
        const backup = JSON.parse(localStorage.getItem(this.BACKUP_KEY) || '{}');
        lastBackup = backup.backup_timestamp;
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return {
      userBackup,
      authBackup,
      databaseBackup,
      lastBackup
    };
  }

  // Clear all backups
  clearAllBackups(): void {
    localStorage.removeItem(this.BACKUP_KEY);
    localStorage.removeItem(this.AUTH_BACKUP_KEY);
    localStorage.removeItem(this.DATABASE_BACKUP_KEY);
    console.log('🗑️ All backups cleared');
  }

  // Export backup data
  exportBackup(): string | null {
    try {
      const userBackup = localStorage.getItem(this.BACKUP_KEY);
      const authBackup = localStorage.getItem(this.AUTH_BACKUP_KEY);
      const databaseBackup = localStorage.getItem(this.DATABASE_BACKUP_KEY);
      
      const exportData = {
        userBackup: userBackup ? JSON.parse(userBackup) : null,
        authBackup: authBackup ? JSON.parse(authBackup) : null,
        databaseBackup: databaseBackup ? JSON.parse(databaseBackup) : null,
        exportTimestamp: new Date().toISOString(),
        version: this.BACKUP_VERSION
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Error exporting backup:', error);
      return null;
    }
  }

  // Import backup data
  importBackup(backupData: string): boolean {
    try {
      const data = JSON.parse(backupData);
      
      if (data.userBackup) {
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(data.userBackup));
      }
      
      if (data.authBackup) {
        localStorage.setItem(this.AUTH_BACKUP_KEY, JSON.stringify(data.authBackup));
      }
      
      if (data.databaseBackup) {
        localStorage.setItem(this.DATABASE_BACKUP_KEY, JSON.stringify(data.databaseBackup));
      }

      console.log('✅ Backup imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Error importing backup:', error);
      return false;
    }
  }
}

export const backupService = new BackupService();
