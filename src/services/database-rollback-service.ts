// Database rollback and recovery service
import { supabase } from '@/integrations/supabase/client';
import { backupService, DatabaseBackup } from './backup-service';

export interface RollbackOptions {
  backupId?: string;
  rollbackTo?: string; // ISO timestamp
  tables?: string[]; // Specific tables to rollback
  dryRun?: boolean; // Preview changes without applying
}

export interface RollbackResult {
  success: boolean;
  message: string;
  affectedTables: string[];
  rollbackTimestamp: string;
  errors?: string[];
}

class DatabaseRollbackService {
  private readonly ROLLBACK_LOG_KEY = 'statpedia_rollback_log';

  // Create a rollback point
  async createRollbackPoint(description: string): Promise<string | null> {
    try {
      console.log('🔄 Creating rollback point:', description);
      
      const backup = await backupService.createDatabaseBackup();
      if (!backup) {
        throw new Error('Failed to create backup');
      }

      const rollbackPoint = {
        id: `rollback_${Date.now()}`,
        description,
        backup,
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      };

      // Store rollback point
      const rollbackLog = this.getRollbackLog();
      rollbackLog.push(rollbackPoint);
      
      // Keep only last 10 rollback points
      if (rollbackLog.length > 10) {
        rollbackLog.splice(0, rollbackLog.length - 10);
      }
      
      localStorage.setItem(this.ROLLBACK_LOG_KEY, JSON.stringify(rollbackLog));
      
      console.log('✅ Rollback point created:', rollbackPoint.id);
      return rollbackPoint.id;
    } catch (error) {
      console.error('❌ Error creating rollback point:', error);
      return null;
    }
  }

  // Get rollback log
  getRollbackLog(): any[] {
    try {
      const log = localStorage.getItem(this.ROLLBACK_LOG_KEY);
      return log ? JSON.parse(log) : [];
    } catch (error) {
      console.error('❌ Error reading rollback log:', error);
      return [];
    }
  }

  // Rollback to specific point
  async rollbackToPoint(rollbackId: string, options: RollbackOptions = {}): Promise<RollbackResult> {
    try {
      console.log('🔄 Rolling back to point:', rollbackId);
      
      const rollbackLog = this.getRollbackLog();
      const rollbackPoint = rollbackLog.find((point: any) => point.id === rollbackId);
      
      if (!rollbackPoint) {
        return {
          success: false,
          message: 'Rollback point not found',
          affectedTables: [],
          rollbackTimestamp: new Date().toISOString()
        };
      }

      if (options.dryRun) {
        return {
          success: true,
          message: 'Dry run completed - no changes made',
          affectedTables: ['profiles', 'promo_codes', 'user_trials', 'promo_code_usage'],
          rollbackTimestamp: new Date().toISOString()
        };
      }

      // Perform rollback
      const success = await backupService.restoreDatabase(rollbackPoint.backup);
      
      if (success) {
        // Log the rollback
        this.logRollback(rollbackId, 'success', 'Database rolled back successfully');
        
        return {
          success: true,
          message: 'Database rolled back successfully',
          affectedTables: ['profiles', 'promo_codes', 'user_trials', 'promo_code_usage'],
          rollbackTimestamp: new Date().toISOString()
        };
      } else {
        this.logRollback(rollbackId, 'error', 'Failed to restore database');
        
        return {
          success: false,
          message: 'Failed to restore database',
          affectedTables: [],
          rollbackTimestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('❌ Error during rollback:', error);
      this.logRollback(rollbackId, 'error', error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        affectedTables: [],
        rollbackTimestamp: new Date().toISOString()
      };
    }
  }

  // Emergency rollback - restore from latest backup
  async emergencyRollback(): Promise<RollbackResult> {
    try {
      console.log('🚨 Performing emergency rollback');
      
      const rollbackLog = this.getRollbackLog();
      if (rollbackLog.length === 0) {
        return {
          success: false,
          message: 'No rollback points available',
          affectedTables: [],
          rollbackTimestamp: new Date().toISOString()
        };
      }

      // Get the most recent rollback point
      const latestPoint = rollbackLog[rollbackLog.length - 1];
      
      return await this.rollbackToPoint(latestPoint.id);
    } catch (error) {
      console.error('❌ Error during emergency rollback:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        affectedTables: [],
        rollbackTimestamp: new Date().toISOString()
      };
    }
  }

  // Log rollback operation
  private logRollback(rollbackId: string, status: 'success' | 'error', message: string): void {
    const logEntry = {
      rollbackId,
      status,
      message,
      timestamp: new Date().toISOString()
    };

    console.log('📝 Rollback log:', logEntry);
    
    // Store in localStorage for debugging
    const existingLog = localStorage.getItem('statpedia_rollback_operations');
    const operations = existingLog ? JSON.parse(existingLog) : [];
    operations.push(logEntry);
    
    // Keep only last 50 operations
    if (operations.length > 50) {
      operations.splice(0, operations.length - 50);
    }
    
    localStorage.setItem('statpedia_rollback_operations', JSON.stringify(operations));
  }

  // Get database health status
  async getDatabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    lastBackup?: string;
    rollbackPoints: number;
  }> {
    try {
      const issues: string[] = [];
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

      // Check if profiles table exists and is accessible
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
          
        if (error) {
          issues.push('Profiles table not accessible');
          status = 'critical';
        }
      } catch (e) {
        issues.push('Profiles table does not exist');
        status = 'critical';
      }

      // Check if promo_codes table exists and is accessible
      try {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('count')
          .limit(1);
          
        if (error) {
          issues.push('Promo codes table not accessible');
          status = status === 'healthy' ? 'degraded' : status;
        }
      } catch (e) {
        issues.push('Promo codes table does not exist');
        status = status === 'healthy' ? 'degraded' : status;
      }

      // Check backup status
      const backupStatus = backupService.getBackupStatus();
      if (!backupStatus.userBackup && !backupStatus.databaseBackup) {
        issues.push('No recent backups available');
        status = status === 'healthy' ? 'degraded' : status;
      }

      // Check rollback points
      const rollbackLog = this.getRollbackLog();
      if (rollbackLog.length === 0) {
        issues.push('No rollback points available');
        status = status === 'healthy' ? 'degraded' : status;
      }

      return {
        status,
        issues,
        lastBackup: backupStatus.lastBackup,
        rollbackPoints: rollbackLog.length
      };
    } catch (error) {
      console.error('❌ Error checking database health:', error);
      
      return {
        status: 'critical',
        issues: ['Unable to check database health'],
        rollbackPoints: 0
      };
    }
  }

  // Create recovery script
  generateRecoveryScript(): string {
    return `
-- Statpedia Database Recovery Script
-- Generated: ${new Date().toISOString()}

-- Step 1: Check if profiles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE 'Creating profiles table...';
        
        CREATE TABLE public.profiles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
            display_name TEXT,
            subscription_tier TEXT DEFAULT 'free',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view own profile"
        ON public.profiles FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can update own profile"
        ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert own profile"
        ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Profiles table created successfully';
    ELSE
        RAISE NOTICE 'Profiles table already exists';
    END IF;
END $$;

-- Step 2: Check if promo_codes table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'promo_codes') THEN
        RAISE NOTICE 'Creating promo_codes table...';
        
        CREATE TABLE public.promo_codes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'free_trial')),
            discount_value INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT true,
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Promo codes table created successfully';
    ELSE
        RAISE NOTICE 'Promo codes table already exists';
    END IF;
END $$;

-- Step 3: Check if user_trials table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_trials') THEN
        RAISE NOTICE 'Creating user_trials table...';
        
        CREATE TABLE public.user_trials (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            plan_id VARCHAR(50) NOT NULL,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'User trials table created successfully';
    ELSE
        RAISE NOTICE 'User trials table already exists';
    END IF;
END $$;

-- Step 4: Check if promo_code_usage table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'promo_code_usage') THEN
        RAISE NOTICE 'Creating promo_code_usage table...';
        
        CREATE TABLE public.promo_code_usage (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            promo_code VARCHAR(50) NOT NULL,
            used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            discount_type VARCHAR(20) NOT NULL,
            discount_value INTEGER NOT NULL
        );
        
        RAISE NOTICE 'Promo code usage table created successfully';
    ELSE
        RAISE NOTICE 'Promo code usage table already exists';
    END IF;
END $$;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON user_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trials_status ON user_trials(status);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_id ON promo_code_usage(user_id);

RAISE NOTICE 'Database recovery completed successfully';
    `;
  }

  // Export recovery script
  exportRecoveryScript(): void {
    const script = this.generateRecoveryScript();
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statpedia-recovery-${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const databaseRollbackService = new DatabaseRollbackService();
