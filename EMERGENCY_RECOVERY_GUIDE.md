# 🚨 Emergency Recovery Guide

This guide provides step-by-step instructions for recovering from database issues, authentication problems, and data loss scenarios.

## 🚨 Emergency Contacts

- **Database Issues**: Check Supabase Dashboard first
- **Authentication Problems**: Use the backup recovery system
- **Data Loss**: Follow the rollback procedures below

## 🔧 Quick Recovery Steps

### 1. Database Connection Issues

If the database is not accessible:

```bash
# Check database health
node scripts/backup-automation.js health

# Create emergency backup
node scripts/backup-automation.js backup

# Check Supabase status
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/rest/v1/" \
  -H "apikey: YOUR_API_KEY"
```

### 2. Missing Tables

If the `profiles` table or other tables are missing:

1. **Use the Recovery Script**:
   - Go to Admin Panel → Backup Management → Recovery
   - Click "Export Recovery Script"
   - Run the SQL script in Supabase SQL Editor

2. **Manual Table Creation**:
   ```sql
   -- Create profiles table
   CREATE TABLE IF NOT EXISTS public.profiles (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
     display_name TEXT,
     subscription_tier TEXT DEFAULT 'free',
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
   );
   
   -- Enable RLS
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY "Users can view own profile"
   ON public.profiles FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can update own profile"
   ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can insert own profile"
   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

### 3. Authentication Issues

If users cannot log in:

1. **Check Rate Limiting**:
   - Clear browser localStorage
   - Use the "Reset Rate Limit" button in the login form
   - Wait 15 minutes for automatic reset

2. **Restore from Backup**:
   - Go to Admin Panel → Backup Management
   - Check if user backups are available
   - Use "Emergency Rollback" if needed

3. **Manual User Recovery**:
   ```javascript
   // In browser console
   localStorage.removeItem('statpedia_user_backup');
   localStorage.removeItem('statpedia_auth_backup');
   location.reload();
   ```

### 4. Data Loss Recovery

If user data is lost:

1. **Check Local Backups**:
   - User data is automatically backed up to localStorage
   - Check browser console for backup status

2. **Restore from Rollback Point**:
   - Go to Admin Panel → Backup Management → Rollback
   - Select a rollback point
   - Click "Emergency Rollback"

3. **Manual Data Recovery**:
   ```javascript
   // Check available backups
   console.log('User Backup:', localStorage.getItem('statpedia_user_backup'));
   console.log('Auth Backup:', localStorage.getItem('statpedia_auth_backup'));
   console.log('Database Backup:', localStorage.getItem('statpedia_database_backup'));
   ```

## 🛠️ Advanced Recovery Procedures

### Database Rollback

1. **Create Rollback Point** (before making changes):
   ```javascript
   // In Admin Panel
   await databaseRollbackService.createRollbackPoint('Before major changes');
   ```

2. **Perform Rollback**:
   ```javascript
   // Emergency rollback to latest point
   await databaseRollbackService.emergencyRollback();
   
   // Rollback to specific point
   await databaseRollbackService.rollbackToPoint('rollback_1234567890');
   ```

### Backup Management

1. **Create Manual Backup**:
   ```javascript
   // Full database backup
   await backupService.createDatabaseBackup();
   
   // User-specific backup
   await backupService.createUserBackup(userId);
   ```

2. **Export/Import Backups**:
   ```javascript
   // Export backup
   const backupData = backupService.exportBackup();
   
   // Import backup
   backupService.importBackup(backupData);
   ```

### Monitoring and Alerts

1. **Check System Health**:
   ```javascript
   const health = await databaseRollbackService.getDatabaseHealth();
   console.log('Database Status:', health.status);
   console.log('Issues:', health.issues);
   ```

2. **Backup Status**:
   ```javascript
   const status = backupService.getBackupStatus();
   console.log('Backup Status:', status);
   ```

## 📋 Recovery Checklist

### Before Making Changes
- [ ] Create rollback point
- [ ] Create full backup
- [ ] Test changes in development
- [ ] Have recovery plan ready

### During Issues
- [ ] Check database health
- [ ] Verify backup availability
- [ ] Check error logs
- [ ] Test authentication
- [ ] Verify data integrity

### After Recovery
- [ ] Verify all systems working
- [ ] Test user authentication
- [ ] Check data consistency
- [ ] Create new backup
- [ ] Document what happened
- [ ] Update recovery procedures

## 🔍 Troubleshooting Common Issues

### Issue: "Could not find the table 'public.profiles'"
**Solution**: Run the recovery script or manually create the profiles table

### Issue: "Rate limit exceeded"
**Solution**: Wait 15 minutes or use the reset button

### Issue: "Invalid login credentials"
**Solution**: Check if user exists, verify email confirmation

### Issue: "Database connection failed"
**Solution**: Check Supabase status, verify API keys

### Issue: "Backup not found"
**Solution**: Check localStorage, create new backup

## 📞 Support Escalation

If the above procedures don't resolve the issue:

1. **Document the Problem**:
   - Screenshot error messages
   - Note what you were doing when it happened
   - Check browser console for errors

2. **Gather Information**:
   - Database health status
   - Available backups
   - Error logs
   - User ID (if applicable)

3. **Contact Support**:
   - Provide all gathered information
   - Include steps you've already tried
   - Specify urgency level

## 🔄 Regular Maintenance

### Daily
- [ ] Check database health
- [ ] Verify backups are working
- [ ] Monitor error logs

### Weekly
- [ ] Test backup restoration
- [ ] Clean old backups
- [ ] Update recovery procedures

### Monthly
- [ ] Full system backup
- [ ] Test emergency procedures
- [ ] Review and update documentation

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Database Backup Best Practices](https://supabase.com/docs/guides/database/backups)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Remember**: Always test recovery procedures in a development environment before using them in production!
