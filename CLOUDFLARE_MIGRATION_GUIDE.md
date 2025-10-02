# 🚀 Cloudflare Workers + R2 Migration Guide

## Overview

This guide helps you migrate from Supabase Edge Functions to Cloudflare Workers + R2 for unlimited scalability and no resource restrictions.

## 🎯 Benefits of Migration

### ✅ **Removed Restrictions:**
- **No WORKER_LIMIT errors** (128MB vs variable allocation)
- **No size limits** (unlimited vs 500KB limit)
- **No timeout restrictions** (30s vs 10s timeout)
- **No event processing limits** (unlimited vs 15 events)
- **No prop processing limits** (unlimited vs 50 props)

### 🚀 **Performance Improvements:**
- **Global Edge Network** (200+ locations vs single region)
- **Zero Cold Starts** (instant execution)
- **Better Caching** (R2 storage vs database queries)
- **Higher Concurrency** (unlimited vs Supabase limits)

### 💰 **Cost Benefits:**
- **Pay-per-request** pricing model
- **No database query costs** for caching
- **Better resource utilization**

## 📋 Migration Steps

### Step 1: Set Up Cloudflare Account

1. **Create Cloudflare Account**
   - Go to [cloudflare.com](https://cloudflare.com)
   - Sign up for a free account
   - Verify your email

2. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

### Step 2: Deploy Cloudflare Worker

1. **Navigate to the worker directory**
   ```bash
   cd cloudflare-worker
   ```

2. **Run the deployment script**
   ```bash
   ./deploy.sh
   ```

3. **Update configuration**
   - Replace `your-subdomain` in URLs with your actual Cloudflare subdomain
   - Update API keys in `wrangler.toml`

### Step 3: Update Frontend

1. **Update the API service URL**
   ```typescript
   // In src/services/cloudflare-player-props-api.ts
   this.baseUrl = 'https://statpedia-player-props.your-actual-subdomain.workers.dev';
   ```

2. **Test the integration**
   - The player props tab should now use Cloudflare Workers
   - Check browser console for success messages

### Step 4: Remove Supabase Dependencies

1. **Remove Supabase function**
   ```bash
   supabase functions delete sportsgameodds-api
   ```

2. **Clean up backend service**
   - Remove `src/services/backend-sportsgameodds-api.ts`
   - Update any remaining references

## 🔧 Configuration

### Environment Variables (in wrangler.toml)

```toml
[vars]
SPORTSGAMEODDS_API_KEY = "d5dc1f00bc42133550bc1605dd8f457f"
CACHE_TTL_SECONDS = "300"  # 5 minutes
MAX_EVENTS_PER_REQUEST = "100"  # Much higher than Supabase's 15
MAX_PROPS_PER_REQUEST = "500"   # Much higher than Supabase's 50
```

### R2 Bucket Configuration

- **Bucket Name**: `statpedia-player-props-cache`
- **Purpose**: Store cached player props data
- **TTL**: 5 minutes (configurable)

### KV Namespace Configuration

- **Namespace**: `API_ANALYTICS`
- **Purpose**: Store API usage analytics and metrics
- **Data**: Request counts, response times, error rates

## 🧪 Testing

### Test Endpoints

1. **Health Check**
   ```bash
   curl https://statpedia-player-props.your-subdomain.workers.dev/api/health
   ```

2. **Player Props (NFL)**
   ```bash
   curl "https://statpedia-player-props.your-subdomain.workers.dev/api/player-props?sport=nfl"
   ```

3. **Force Refresh**
   ```bash
   curl "https://statpedia-player-props.your-subdomain.workers.dev/api/player-props?sport=nfl&force_refresh=true"
   ```

### Expected Response

```json
{
  "success": true,
  "data": [
    {
      "playerName": "Cooper Kupp",
      "propType": "Receiving Yards",
      "line": 75.5,
      "overOdds": -110,
      "underOdds": -110,
      "sportsbooks": ["DraftKings", "FanDuel"],
      "gameDate": "2024-10-03T20:00:00Z",
      "teamAbbr": "LAR",
      "opponentAbbr": "SF",
      "confidence": 0.8,
      "expectedValue": 0.05
    }
  ],
  "cached": false,
  "cacheKey": "player-props-nfl",
  "responseTime": 1250,
  "totalEvents": 25,
  "totalProps": 150
}
```

## 📊 Monitoring

### Cloudflare Dashboard

1. **Workers & Pages**
   - View request counts
   - Monitor response times
   - Check error rates

2. **R2 Object Storage**
   - Monitor cache usage
   - View storage costs
   - Check cache hit rates

3. **Analytics**
   - API usage patterns
   - Performance metrics
   - Error tracking

### Custom Analytics

The worker logs analytics to KV storage:
- Request counts by sport
- Average response times
- Cache hit rates
- Error rates

## 🔄 Rollback Plan

If you need to rollback to Supabase:

1. **Restore Supabase function**
   ```bash
   supabase functions deploy sportsgameodds-api
   ```

2. **Update frontend**
   ```typescript
   // Revert to backendSportsGameOddsAPI
   import { backendSportsGameOddsAPI } from '@/services/backend-sportsgameodds-api';
   ```

3. **Test functionality**
   - Verify player props loading
   - Check for any errors

## 🎉 Expected Results

After migration, you should see:

### ✅ **Performance Improvements**
- **Faster response times** (global edge network)
- **Higher reliability** (no resource limits)
- **Better scalability** (unlimited concurrent requests)

### ✅ **Feature Improvements**
- **More player props** (no processing limits)
- **More sportsbooks** (no data size limits)
- **Better caching** (R2 storage)

### ✅ **Operational Improvements**
- **No WORKER_LIMIT errors**
- **No timeout issues**
- **No authentication complexity**
- **Better monitoring and analytics**

## 🆘 Troubleshooting

### Common Issues

1. **Worker not deploying**
   - Check Cloudflare authentication: `wrangler whoami`
   - Verify API keys in `wrangler.toml`

2. **R2 bucket access issues**
   - Ensure bucket exists: `wrangler r2 bucket list`
   - Check bucket permissions in Cloudflare dashboard

3. **Frontend not connecting**
   - Verify Worker URL in `cloudflare-player-props-api.ts`
   - Check CORS headers in Worker response

4. **API errors**
   - Check Worker logs in Cloudflare dashboard
   - Verify SportGameOdds API key is correct

### Support

- **Cloudflare Workers Docs**: [workers.cloudflare.com](https://workers.cloudflare.com)
- **R2 Storage Docs**: [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2)
- **Wrangler CLI Docs**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler)

## 🎯 Next Steps

1. **Deploy the Worker** using the provided scripts
2. **Test the integration** with your frontend
3. **Monitor performance** in Cloudflare dashboard
4. **Optimize caching** based on usage patterns
5. **Scale up** as needed (no limits!)

The migration removes all the restrictions you were experiencing with Supabase Edge Functions and provides a much more robust, scalable solution for your player props API! 🚀
