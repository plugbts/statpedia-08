# Hasura Cron Job Setup for Player Analytics Enrichment

This document provides complete instructions for setting up a Hasura cron job to automatically refresh player analytics data.

## 🎯 Overview

The cron job will automatically call our enrichment function every day at 4 AM UTC to:
- Refresh hit rates, streaks, and rolling averages
- Update opponent data and defensive rankings
- Keep the `player_analytics` table current with fresh data

## 📋 Prerequisites

- ✅ Hasura instance running and accessible
- ✅ `refresh_enrichment()` function deployed to database
- ✅ Enrichment webhook server running
- ✅ Admin access to Hasura Console

## 🚀 Step-by-Step Setup

### Step 1: Access Hasura Console

1. Open your Hasura Console: https://graphql-engine-latest-statpedia.onrender.com/console
2. Navigate to **Events** → **Cron Triggers**
3. Click **"Create"** to add a new cron trigger

### Step 2: Configure the Cron Trigger

Use these exact settings:

**Basic Configuration:**
- **Name:** `refresh_enrichment_nightly`
- **Webhook URL:** `https://your-domain.com/refresh-enrichment` (replace with your actual domain)
- **Schedule:** `0 4 * * *` (Every day at 4 AM UTC)

**Payload:**
```json
{}
```

**Retry Configuration:**
- **Number of retries:** `3`
- **Timeout:** `300` seconds (5 minutes)
- **Tolerance:** `21600` seconds (6 hours)

**Headers:**
- `Content-Type: application/json`
- `User-Agent: Hasura-Cron-Trigger`

### Step 3: Save and Test

1. Click **"Create"** to save the cron trigger
2. Click **"Invoke Now"** to test it immediately
3. Check the execution logs to verify it worked

## 🧪 Testing

### Manual Webhook Test
```bash
curl -X POST "https://your-domain.com/refresh-enrichment" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Test-Request" \
  -d '{}'
```

### Expected Response
```json
{
  "success": true,
  "message": "Enrichment refresh completed successfully",
  "data": {
    "players_processed": 679,
    "analytics_updated": 679,
    "execution_time_ms": 82,
    "webhook_execution_time_ms": 648
  },
  "timestamp": "2025-10-14T14:52:23.306Z"
}
```

## 📊 Monitoring

### Hasura Console
1. Go to **Events** → **Cron Triggers**
2. Click on your trigger name
3. View execution history and logs
4. Check for any failed executions

### Database Monitoring
```sql
-- Check recent analytics updates
SELECT 
  COUNT(*) as total_records,
  MAX(last_updated) as last_refresh,
  COUNT(CASE WHEN last_updated > NOW() - INTERVAL '1 day' THEN 1 END) as updated_today
FROM public.player_analytics;

-- Check specific player analytics
SELECT 
  player_name, 
  prop_type, 
  season_hit_rate_2025,
  l5_hit_rate,
  current_streak,
  last_updated
FROM public.player_analytics
ORDER BY last_updated DESC
LIMIT 10;
```

## 🔧 Alternative Schedules

### Every 6 Hours (More Frequent)
- **Schedule:** `0 */6 * * *`
- **Use case:** For active seasons with frequent games

### Weekly (Less Frequent)
- **Schedule:** `0 0 * * 0` (Sunday at midnight)
- **Use case:** For off-season or testing

### Custom Schedule
Use standard cron syntax:
- `0 4 * * *` - Daily at 4 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Weekly on Monday
- `0 0 1 * *` - Monthly on 1st day

## 🛠 Troubleshooting

### Common Issues

**1. Webhook Timeout**
- Increase timeout in retry configuration
- Check webhook server performance
- Monitor database query execution time

**2. Failed Executions**
- Check Hasura Console logs
- Verify webhook URL is accessible
- Ensure database connection is stable

**3. No Analytics Updates**
- Check if `refresh_enrichment()` function exists
- Verify database permissions
- Check for errors in function execution

### Debug Commands

```bash
# Test webhook manually
curl -X GET "https://your-domain.com/refresh-enrichment"

# Check webhook server health
curl "https://your-domain.com/health"

# Test database function directly
psql $NEON_DATABASE_URL -c "SELECT * FROM public.refresh_enrichment();"
```

## 📈 Performance Metrics

### Expected Performance
- **Players Processed:** ~679 players
- **Execution Time:** ~80-200ms
- **Analytics Updated:** All player-prop combinations
- **Frequency:** Daily at 4 AM UTC

### Optimization Tips
1. **Batch Processing:** Function processes players in batches of 10
2. **Error Handling:** Continues processing if individual players fail
3. **Logging:** Detailed progress logs every 10 players
4. **Retries:** Automatic retry on failure with exponential backoff

## 🔒 Security Considerations

1. **Webhook Authentication:** Consider adding API keys or JWT tokens
2. **Rate Limiting:** Implement rate limiting on webhook endpoint
3. **CORS:** Configure appropriate CORS settings
4. **Monitoring:** Set up alerts for failed executions

## 📝 Maintenance

### Regular Tasks
1. **Monitor execution logs** weekly
2. **Check analytics freshness** daily
3. **Review performance metrics** monthly
4. **Update schedules** based on season activity

### Backup and Recovery
1. **Function backup:** Keep SQL function in version control
2. **Metadata backup:** Export Hasura metadata regularly
3. **Data backup:** Regular database backups
4. **Webhook backup:** Keep webhook server code in version control

## 🎉 Success Indicators

You'll know the cron job is working when:
- ✅ Analytics are updated daily
- ✅ No "–" or "N/A" placeholders in frontend
- ✅ Real hit rates, streaks, and opponent data displayed
- ✅ Consistent execution times in Hasura logs
- ✅ No failed executions in monitoring

## 📞 Support

If you encounter issues:
1. Check Hasura Console execution logs
2. Review webhook server logs
3. Test database function manually
4. Verify all environment variables are set
5. Check network connectivity between Hasura and webhook

---

**Last Updated:** 2025-10-14  
**Version:** 1.0  
**Status:** ✅ Ready for Production
