# 🔧 Deployment Troubleshooting Guide

## Database Migration Failed? Here's How to Fix It

### 🎯 Quick Fix: Manual Database Setup

If `supabase db push` is failing, you can set up the database manually:

#### 1. Go to Your Supabase SQL Editor
Visit: https://rfdrifnsfobqlzorcesn.supabase.co/project/rfdrifnsfobqlzorcesn/sql

#### 2. Run the Manual Setup SQL
Copy and paste the contents of `manual-deploy-sql.sql` into the SQL editor and execute it.

This will create:
- ✅ `api_usage_logs` table - Track all API calls
- ✅ `api_cache` table - Store cached responses  
- ✅ `api_config` table - Store configuration
- ✅ `api_rate_limits` table - Track rate limiting
- ✅ All indexes and RLS policies
- ✅ Helper functions for cleanup and analytics
- ✅ Default configuration values

### 🚀 Alternative: Deploy Functions Only

If database setup works but functions fail:

#### 1. Authenticate with Supabase
```bash
supabase login
```

#### 2. Link to Project
```bash
supabase link --project-ref rfdrifnsfobqlzorcesn
```

#### 3. Deploy Functions Individually
```bash
# Deploy API proxy
supabase functions deploy sportsgameodds-api

# Deploy background poller
supabase functions deploy background-poller

# Deploy analytics API
supabase functions deploy api-analytics
```

### 🔍 Common Issues & Solutions

#### Issue: "Cannot connect to Docker daemon"
**Solution**: You don't need Docker for deployment. Use manual SQL setup above.

#### Issue: "Access token not provided"
**Solution**: 
```bash
supabase login
```
This opens your browser for authentication.

#### Issue: "Project not found"
**Solution**: 
```bash
supabase projects list
supabase link --project-ref rfdrifnsfobqlzorcesn
```

#### Issue: "Migration conflicts"
**Solution**: Use the manual SQL setup instead of migrations.

#### Issue: "Function deployment fails"
**Solution**: Check function syntax:
```bash
supabase functions serve sportsgameodds-api --no-verify-jwt
```

### 📋 Manual Deployment Checklist

#### ✅ Step 1: Database Setup
- [ ] Go to Supabase SQL Editor
- [ ] Run `manual-deploy-sql.sql` contents
- [ ] Verify tables created successfully

#### ✅ Step 2: Deploy Functions
- [ ] `supabase login`
- [ ] `supabase link --project-ref rfdrifnsfobqlzorcesn`
- [ ] `supabase functions deploy sportsgameodds-api`
- [ ] `supabase functions deploy background-poller`
- [ ] `supabase functions deploy api-analytics`

#### ✅ Step 3: Test Functions
```bash
# Test API proxy
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/sportsgameodds-api?endpoint=player-props&sport=nfl" \
  -H "apikey: YOUR_ANON_KEY"

# Test background poller
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=status" \
  -H "apikey: YOUR_ANON_KEY"
```

#### ✅ Step 4: Start Background Polling
```bash
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=start" \
  -H "apikey: YOUR_ANON_KEY"
```

### 🎯 Verify Deployment Success

#### Check Database Tables
In Supabase dashboard > Table Editor, you should see:
- `api_usage_logs`
- `api_cache`
- `api_config`
- `api_rate_limits`

#### Check Functions
In Supabase dashboard > Edge Functions, you should see:
- `sportsgameodds-api`
- `background-poller`
- `api-analytics`

#### Check Configuration
In `api_config` table, you should see:
- `sportsgameodds_api_key`
- `cache_ttl_seconds`
- `polling_interval_seconds`
- `rate_limit_per_minute`
- `max_props_per_request`
- `enabled_sports`

### 🚨 Still Having Issues?

#### Debug Steps:
1. **Check Supabase project permissions**
   - Ensure you're the owner/admin of the project
   - Verify project ID is correct: `rfdrifnsfobqlzorcesn`

2. **Check function logs**
   - Go to Supabase dashboard > Edge Functions
   - Click on function name > Logs tab
   - Look for error messages

3. **Test with curl**
   - Get your anon key from project settings
   - Test each function individually
   - Check response status and error messages

4. **Verify database connection**
   - Check if you can create simple tables in SQL editor
   - Verify RLS policies are working

### 🎉 Success Indicators

Once deployed successfully, you should see:
- ✅ **Real-time API usage tracking** in Admin > Server API tab
- ✅ **Background polling active** (check poller status)
- ✅ **Cached responses** (faster prop loading)
- ✅ **Rate limiting working** (check headers in API responses)
- ✅ **Reduced SportGameOdds API calls** (monitor in dashboard)

### 📞 Need Help?

If you're still having issues:
1. Check the function logs in Supabase dashboard
2. Verify your project permissions
3. Try the manual SQL setup approach
4. Test functions individually with curl

The manual approach bypasses migration issues and should work in all cases!

## 🎯 Expected Results After Deployment

Once everything is working:
- **95%+ reduction in SportGameOdds API calls**
- **Real-time usage tracking for all users**
- **Intelligent caching serving data instantly**
- **Rate limiting preventing abuse**
- **Comprehensive analytics dashboard**

Your server-side API management system will be fully operational! 🚀
