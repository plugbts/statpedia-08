# Nightly Job Edge Function

This Supabase Edge Function runs the nightly data pipeline that:

1. **Ingests PlayerGameLogs** (last 24h) → `playergamelogs` table
2. **Ingests PropLines** (last 24h) → `proplines` table  
3. **Precomputes Analytics** → `playeranalytics` table

## 🚀 Deployment

### 1. Deploy the Edge Function

```bash
# From project root
supabase functions deploy nightly-job
```

### 2. Set Environment Variables

```bash
# Set required environment variables
supabase secrets set SPORTSGAMEODDS_API_KEY=your_api_key_here
```

### 3. Test the Function

```bash
# Test manually
supabase functions invoke nightly-job

# Test with curl
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/nightly-job' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json'
```

## ⏰ Scheduling

### Option 1: Supabase Cron (Recommended)

Create a cron job in your Supabase dashboard:

1. Go to Database → Extensions
2. Enable `pg_cron` extension
3. Create a cron job:

```sql
-- Schedule to run daily at 5 AM UTC
SELECT cron.schedule(
  'nightly-job',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/nightly-job',
    headers := '{"Authorization": "Bearer your-service-role-key"}'::jsonb
  );
  $$
);
```

### Option 2: External Cron Service

Use a service like cron-job.org or GitHub Actions:

```yaml
# .github/workflows/nightly-job.yml
name: Nightly Job
on:
  schedule:
    - cron: '0 5 * * *'  # 5 AM UTC daily
  workflow_dispatch:

jobs:
  nightly-job:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Nightly Job
        run: |
          curl -X POST '${{ secrets.SUPABASE_FUNCTION_URL }}' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}' \
            -H 'Content-Type: application/json'
```

### Option 3: AWS Lambda + EventBridge

```javascript
// lambda/nightly-job-trigger.js
exports.handler = async (event) => {
  const response = await fetch('https://your-project-ref.supabase.co/functions/v1/nightly-job', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify(await response.json())
  };
};
```

## 📊 Monitoring

### View Logs

```bash
# View function logs
supabase functions logs nightly-job

# Follow logs in real-time
supabase functions logs nightly-job --follow
```

### Check Database

```sql
-- Check recent game logs
SELECT COUNT(*) FROM playergamelogs 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Check recent prop lines
SELECT COUNT(*) FROM proplines 
WHERE created_at > NOW() - INTERVAL '1 day';

-- Check recent analytics
SELECT COUNT(*) FROM playeranalytics 
WHERE last_computed_at > NOW() - INTERVAL '1 day';
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SPORTSGAMEODDS_API_KEY` | API key for SportsGameOdds | Yes |
| `SUPABASE_URL` | Your Supabase project URL | Auto-set |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for database access | Auto-set |

### Customization

Edit `index.ts` to modify:

- **Leagues**: Change the `LEAGUES` array
- **Time Window**: Modify the `since` calculation (currently 24h)
- **Batch Size**: Adjust API request limits
- **Rate Limiting**: Change delays between requests

## 🛠️ Troubleshooting

### Common Issues

1. **Function Timeout**: Increase timeout in Supabase dashboard
2. **API Rate Limits**: Add longer delays between requests
3. **Memory Issues**: Process data in smaller batches
4. **Database Permissions**: Ensure service role has proper RLS bypass

### Debug Mode

Add debug logging:

```typescript
console.log('🔍 Debug: Processing', league, 'with', rows.length, 'records');
```

### Manual Trigger

```bash
# Trigger manually for testing
supabase functions invoke nightly-job --method POST
```

## 📈 Performance

- **Typical Runtime**: 2-5 minutes
- **Memory Usage**: ~128MB
- **Timeout**: 300 seconds (5 minutes)
- **Concurrent Requests**: Limited by API rate limits

## 🔒 Security

- Uses service role key for database access
- API key stored as encrypted secret
- CORS enabled for web requests
- Input validation on all API calls

## 📚 Related Files

- `nightlyJob.js` - Local version for development
- `scripts/simple-nightly-job.js` - Node.js version
- `supabase/migrations/` - Database schema
- `package.json` - NPM scripts for local testing
