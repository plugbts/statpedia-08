# Edge Function Deployment Guide

Complete guide for deploying the nightly job as a Supabase Edge Function with cron scheduling.

## 🎯 Overview

This guide covers deploying the nightly data pipeline as a serverless Edge Function that runs automatically at 5 AM UTC daily:

1. **Ingest PlayerGameLogs** (last 24h) → `playergamelogs` table
2. **Ingest PropLines** (last 24h) → `proplines` table  
3. **Precompute Analytics** → `playeranalytics` table

## 📁 Files Created

- `nightlyJob.js` - Local development version
- `supabase/functions/nightly-job/index.ts` - Edge Function implementation
- `supabase/functions/nightly-job/README.md` - Function documentation
- `deploy-nightly-job.sh` - Automated deployment script
- `setup-nightly-cron.sql` - Cron job setup SQL
- `EDGE_FUNCTION_DEPLOYMENT_GUIDE.md` - This guide

## 🚀 Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
# Make script executable and run
chmod +x deploy-nightly-job.sh
./deploy-nightly-job.sh
```

### Option 2: Manual Deployment

```bash
# 1. Deploy the function
supabase functions deploy nightly-job

# 2. Set API key
supabase secrets set SPORTSGAMEODDS_API_KEY=your_api_key_here

# 3. Test the function
supabase functions invoke nightly-job
```

## ⏰ Cron Setup

### Step 1: Enable Extensions

In your Supabase SQL Editor, run:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;
```

### Step 2: Create Cron Job

```sql
-- Replace YOUR-PROJECT-REF and YOUR-SERVICE-ROLE-KEY
SELECT cron.schedule(
  'nightly-job',
  '0 5 * * *',  -- 5 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/nightly-job',
    headers := '{"Authorization": "Bearer YOUR-SERVICE-ROLE-KEY"}'::jsonb
  );
  $$
);
```

### Step 3: Verify Setup

```sql
-- Check cron job was created
SELECT * FROM cron.job WHERE jobname = 'nightly-job';

-- Check job status
SELECT * FROM check_nightly_job_status();
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | How to Set |
|----------|-------------|------------|
| `SPORTSGAMEODDS_API_KEY` | API key for data ingestion | `supabase secrets set` |
| `SUPABASE_URL` | Project URL | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Auto-set by Supabase |

### Customization Options

Edit `supabase/functions/nightly-job/index.ts`:

```typescript
// Change leagues
const LEAGUES = ["nfl", "nba", "mlb", "nhl"]

// Change time window (currently 24 hours)
const since = new Date(Date.now() - 24*60*60*1000).toISOString()

// Change batch size
const url = `...?limit=100...`

// Change rate limiting
await new Promise(resolve => setTimeout(resolve, 100))
```

## 📊 Monitoring & Logs

### View Function Logs

```bash
# View recent logs
supabase functions logs nightly-job

# Follow logs in real-time
supabase functions logs nightly-job --follow

# View logs with timestamps
supabase functions logs nightly-job --follow --timestamp
```

### Check Database Records

```sql
-- Check recent game logs
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT prop_type) as unique_props
FROM playergamelogs 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Check recent prop lines
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT sportsbook) as sportsbooks,
  AVG(over_odds) as avg_over_odds
FROM proplines 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Check recent analytics
SELECT 
  COUNT(*) as total_records,
  AVG(season_pct) as avg_hit_rate,
  COUNT(DISTINCT player_id) as unique_players
FROM playeranalytics 
WHERE last_computed_at > NOW() - INTERVAL '1 day';
```

### Manual Triggers

```bash
# Trigger via CLI
supabase functions invoke nightly-job

# Trigger via curl
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/nightly-job' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json'

# Trigger via SQL (if monitoring functions are set up)
SELECT trigger_nightly_job();
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Function Timeout
**Problem**: Function times out after 5 minutes  
**Solution**: 
- Increase timeout in Supabase dashboard
- Process data in smaller batches
- Add more delays between API calls

#### 2. API Rate Limits
**Problem**: Getting 429 Too Many Requests  
**Solution**:
```typescript
// Increase delay between requests
await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
```

#### 3. Memory Issues
**Problem**: Function runs out of memory  
**Solution**:
- Process leagues sequentially instead of in parallel
- Reduce batch sizes
- Clear large arrays after processing

#### 4. Database Permissions
**Problem**: RLS blocking upserts  
**Solution**: Ensure service role key has proper permissions

### Debug Mode

Add debug logging to the function:

```typescript
console.log('🔍 Debug: Processing', league, 'with', rows.length, 'records')
console.log('🔍 Debug: API Response:', JSON.stringify(data, null, 2))
```

### Health Checks

Create a simple health check endpoint:

```typescript
// Add to index.ts
if (req.method === 'GET') {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

## 🔄 Alternative Deployment Options

### GitHub Actions

```yaml
# .github/workflows/nightly-job.yml
name: Nightly Job
on:
  schedule:
    - cron: '0 5 * * *'  # 5 AM UTC
  workflow_dispatch:

jobs:
  nightly-job:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Nightly Job
        run: |
          curl -X POST '${{ secrets.SUPABASE_FUNCTION_URL }}' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}'
```

### AWS Lambda + EventBridge

```javascript
// lambda/handler.js
exports.handler = async (event) => {
  const response = await fetch(process.env.SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    }
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify(await response.json())
  };
};
```

### External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [SetCronJob](https://www.setcronjob.com)

## 📈 Performance Optimization

### Batch Processing

```typescript
// Process in smaller batches
const BATCH_SIZE = 50
for (let i = 0; i < results.length; i += BATCH_SIZE) {
  const batch = results.slice(i, i + BATCH_SIZE)
  await supabase.from('playeranalytics').upsert(batch)
  await new Promise(resolve => setTimeout(resolve, 100))
}
```

### Parallel Processing

```typescript
// Process leagues in parallel (be careful with rate limits)
const leaguePromises = LEAGUES.map(league => ingestLeague(league))
const results = await Promise.all(leaguePromises)
```

### Memory Management

```typescript
// Clear large arrays after processing
results.length = 0  // Clear array
// Force garbage collection (if available)
if (global.gc) global.gc()
```

## 🔒 Security Best Practices

1. **Environment Variables**: Store sensitive data in Supabase secrets
2. **API Keys**: Rotate API keys regularly
3. **Permissions**: Use service role key only for backend operations
4. **Rate Limiting**: Implement proper rate limiting
5. **Input Validation**: Validate all API responses
6. **Error Handling**: Don't expose sensitive error details

## 📚 Related Documentation

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Cron Expression Guide](https://crontab.guru/)
- [SportsGameOdds API](https://sportsgameodds.com/docs)

## 🎉 Success Metrics

After successful deployment, you should see:

- ✅ Function deploys without errors
- ✅ Cron job appears in `cron.job` table
- ✅ Daily runs at 5 AM UTC
- ✅ New records in `playergamelogs`, `proplines`, and `playeranalytics`
- ✅ Function logs show successful completion
- ✅ No timeout or memory errors

The nightly job is now fully automated and will keep your analytics data fresh! 🚀
