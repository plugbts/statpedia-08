# 🚀 Server-Side API Management System Deployment

## Prerequisites
✅ Supabase CLI installed (completed)
✅ All code committed to repository (completed)

## Step 1: Authenticate with Supabase

Run this command in your terminal to login:
```bash
supabase login
```

This will open a browser window for authentication. Once logged in, you'll be ready to deploy.

## Step 2: Link to Your Supabase Project

```bash
supabase link --project-ref rfdrifnsfobqlzorcesn
```

## Step 3: Deploy Database Migration

Deploy the API usage tracking database schema:
```bash
supabase db push
```

This will create the following tables:
- `api_usage_logs` - Track all API calls with user attribution
- `api_cache` - Store cached API responses
- `api_config` - Store API configuration settings
- `api_rate_limits` - Track rate limiting per user

## Step 4: Deploy Supabase Edge Functions

Deploy all three Edge Functions:

### 1. SportGameOdds API Proxy
```bash
supabase functions deploy sportsgameodds-api
```

### 2. Background Polling Service
```bash
supabase functions deploy background-poller
```

### 3. API Analytics Service
```bash
supabase functions deploy api-analytics
```

## Step 5: Configure API Settings

Update the API configuration in your Supabase database. Go to your Supabase dashboard > SQL Editor and run:

```sql
-- Update SportGameOdds API key
UPDATE api_config SET value = '"d5dc1f00bc42133550bc1605dd8f457f"' WHERE key = 'sportsgameodds_api_key';

-- Set cache TTL to 30 seconds for live data
UPDATE api_config SET value = '30' WHERE key = 'cache_ttl_seconds';

-- Set polling interval to 30 seconds
UPDATE api_config SET value = '30' WHERE key = 'polling_interval_seconds';

-- Set rate limit to 60 requests per minute per user
UPDATE api_config SET value = '60' WHERE key = 'rate_limit_per_minute';

-- Keep max props at 3 for testing
UPDATE api_config SET value = '3' WHERE key = 'max_props_per_request';

-- Enable all sports
UPDATE api_config SET value = '["nfl", "nba", "mlb", "nhl"]' WHERE key = 'enabled_sports';
```

## Step 6: Start Background Polling

Start the automated data fetching service:

```bash
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=start" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY"
```

Replace `YOUR_SUPABASE_ANON_KEY` with your actual Supabase anon key from your project settings.

## Step 7: Test the System

### Test API Proxy
```bash
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/sportsgameodds-api?endpoint=player-props&sport=nfl" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY"
```

### Check Polling Status
```bash
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=status" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY"
```

### View Analytics (Admin Only)
```bash
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/api-analytics?action=analytics" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

## Step 8: Monitor in Admin Dashboard

1. Go to your website's Admin panel
2. Navigate to the "Server API" tab
3. Monitor real-time usage statistics
4. Control background polling
5. View comprehensive analytics

## What This Deployment Achieves

### 🎯 Cost Optimization
- **95%+ API Call Reduction**: Background polling serves cached data to all users
- **One Call Serves All**: Instead of each user making API calls, one background service updates data for everyone
- **Intelligent Caching**: Frequently requested data served instantly from cache

### 📊 Usage Tracking
- **All Users Monitored**: Track API usage from every user, not just yourself
- **Real-Time Analytics**: Live dashboard showing actual usage patterns
- **User Attribution**: Know exactly who makes each API call
- **Historical Data**: 30-day retention for analysis and optimization

### 🛡️ Security & Control
- **API Key Protection**: SportGameOdds API key never exposed to frontend
- **Rate Limiting**: Prevent abuse with per-user limits (60 requests/minute)
- **Server-Side Enforcement**: Cannot be bypassed by frontend modifications

### ⚡ Performance
- **Faster Response Times**: Cached responses are instant
- **Reduced Latency**: No direct third-party API calls from frontend
- **Scalable Architecture**: Handles growing user base efficiently

## Monitoring & Maintenance

### Daily Monitoring
- Check the Admin > Server API dashboard for usage statistics
- Monitor error rates and investigate any issues
- Review top users and usage patterns

### Weekly Tasks
- Review API usage trends and optimize cache settings
- Check system health metrics
- Update API configuration if needed

### Monthly Tasks
- Analyze usage patterns and adjust rate limits
- Review and clean up old logs (automated after 30 days)
- Optimize polling frequency based on data freshness needs

## Troubleshooting

### If Background Polling Stops
```bash
# Check status
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=status"

# Restart polling
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=start"
```

### If API Calls Fail
1. Check the Admin > Server API dashboard for error details
2. Verify API key is correctly configured in database
3. Check rate limits and cache status
4. Review function logs in Supabase dashboard

### If Cache is Stale
```bash
# Trigger manual poll to refresh cache
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=poll-now"
```

## Success Metrics

After deployment, you should see:
- ✅ **Dramatic reduction in SportGameOdds API calls** (from hundreds/day to dozens/day)
- ✅ **Real-time usage tracking** for all users in admin dashboard
- ✅ **Faster response times** for player props (cached responses)
- ✅ **No rate limit errors** for normal user activity
- ✅ **Comprehensive monitoring** of system health and performance

The system is designed to be **set-and-forget** - once deployed and started, it will automatically manage API calls, caching, and monitoring with minimal intervention required.

## Next Steps After Deployment

1. **Monitor Initial Performance**: Watch the admin dashboard for the first few hours
2. **Adjust Settings**: Fine-tune cache TTL and polling intervals based on usage patterns
3. **Scale as Needed**: Increase rate limits or polling frequency as user base grows
4. **Optimize Costs**: Use analytics to further optimize API usage patterns

Your server-side API management system is now ready to handle all SportGameOdds API calls efficiently and provide comprehensive monitoring across all users! 🎉
