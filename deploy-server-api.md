# Server-Side API Deployment Guide

## Overview
This deployment implements a complete server-side API management system for SportGameOdds API calls, including:

- **Centralized API Calls**: All SportGameOdds API requests go through Supabase Edge Functions
- **Server-Side Caching**: PostgreSQL-based caching with configurable TTL
- **Usage Tracking**: Comprehensive logging of all API calls with user attribution
- **Rate Limiting**: Per-user rate limiting to prevent abuse
- **Background Polling**: Automated data fetching to minimize API calls
- **Analytics Dashboard**: Real-time monitoring and analytics for admins

## Files Created/Modified

### Database Migration
- `supabase/migrations/20250102000001_api_usage_tracking.sql` - Database schema for API tracking

### Supabase Edge Functions
- `supabase/functions/sportsgameodds-api/index.ts` - Main API proxy with caching and rate limiting
- `supabase/functions/background-poller/index.ts` - Background polling service
- `supabase/functions/api-analytics/index.ts` - Analytics and monitoring API

### Frontend Services
- `src/services/backend-sportsgameodds-api.ts` - New backend API client
- `src/services/consistent-props-service.ts` - Updated to use backend API
- `src/components/admin/server-api-dashboard.tsx` - Admin dashboard component
- `src/pages/Admin.tsx` - Added server API tab

## Deployment Steps

### 1. Deploy Database Migration
```bash
# Run the migration to create API tracking tables
supabase db push
```

### 2. Deploy Supabase Functions
```bash
# Deploy the SportGameOdds API proxy function
supabase functions deploy sportsgameodds-api

# Deploy the background polling service
supabase functions deploy background-poller

# Deploy the analytics API
supabase functions deploy api-analytics
```

### 3. Configure Environment Variables
Ensure these environment variables are set in your Supabase project:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

### 4. Initialize API Configuration
The migration automatically creates default configuration. You can update it via the database:

```sql
-- Update SportGameOdds API key
UPDATE api_config SET value = '"your_new_api_key"' WHERE key = 'sportsgameodds_api_key';

-- Update cache TTL (in seconds)
UPDATE api_config SET value = '60' WHERE key = 'cache_ttl_seconds';

-- Update polling interval (in seconds)
UPDATE api_config SET value = '30' WHERE key = 'polling_interval_seconds';

-- Update rate limit (requests per minute per user)
UPDATE api_config SET value = '100' WHERE key = 'rate_limit_per_minute';

-- Update max props per request (for testing)
UPDATE api_config SET value = '3' WHERE key = 'max_props_per_request';

-- Update enabled sports
UPDATE api_config SET value = '["nfl", "nba", "mlb", "nhl"]' WHERE key = 'enabled_sports';
```

### 5. Start Background Polling
After deployment, start the background polling service:

```bash
# Call the background poller to start automated data fetching
curl -X GET "https://your-project.supabase.co/functions/v1/background-poller?action=start" \
  -H "apikey: your-anon-key"
```

## Features

### 1. Centralized API Management
- All SportGameOdds API calls go through the server
- Users never call the third-party API directly
- Consistent error handling and logging

### 2. Intelligent Caching
- PostgreSQL-based cache with configurable TTL
- Automatic cache invalidation
- Cache hit/miss tracking for optimization

### 3. Rate Limiting
- Per-user rate limiting (default: 60 requests/minute)
- Automatic rate limit enforcement
- Rate limit status in API responses

### 4. Background Polling
- Automated data fetching every 30 seconds (configurable)
- Reduces API calls by serving cached data to all users
- One API call updates data for everyone

### 5. Comprehensive Analytics
- Real-time usage statistics
- User attribution and top users tracking
- Error rate and performance monitoring
- Cache efficiency metrics

### 6. Admin Dashboard
- Real-time system health monitoring
- Background polling control
- Usage analytics and insights
- System configuration management

## API Endpoints

### SportGameOdds API Proxy
```
GET /functions/v1/sportsgameodds-api?endpoint=player-props&sport=nfl
```

### Background Polling Control
```
GET /functions/v1/background-poller?action=start
GET /functions/v1/background-poller?action=stop
GET /functions/v1/background-poller?action=poll-now
GET /functions/v1/background-poller?action=status
```

### Analytics API (Admin Only)
```
GET /functions/v1/api-analytics?action=analytics&start_date=2025-01-01&end_date=2025-01-02
GET /functions/v1/api-analytics?action=realtime
GET /functions/v1/api-analytics?action=health
GET /functions/v1/api-analytics?action=cleanup
```

## Benefits

### Cost Optimization
- **Reduced API Calls**: Background polling means one API call serves all users
- **Intelligent Caching**: Frequently requested data served from cache
- **Rate Limiting**: Prevents API abuse and unexpected costs

### Performance
- **Faster Response Times**: Cached data served instantly
- **Reduced Latency**: No direct third-party API calls from frontend
- **Scalability**: Server handles all API complexity

### Monitoring & Control
- **Real-time Analytics**: Track usage patterns and optimize
- **User Attribution**: Know exactly who is using the API
- **System Health**: Monitor cache, polling, and error rates
- **Admin Control**: Start/stop polling, view analytics, manage configuration

### Security
- **API Key Protection**: SportGameOdds API key never exposed to frontend
- **Rate Limiting**: Prevent abuse and ensure fair usage
- **User Authentication**: All requests attributed to authenticated users
- **Audit Trail**: Complete log of all API interactions

## Monitoring

The system provides comprehensive monitoring through:

1. **API Usage Logs**: Every request logged with user, endpoint, response time, cache status
2. **System Health**: Background polling status, cache health, configuration status
3. **Real-time Stats**: Recent activity, active cache entries, rate limit status
4. **Analytics Dashboard**: Usage trends, top users, error rates, performance metrics

## Maintenance

### Regular Tasks
- Monitor API usage through the admin dashboard
- Review error rates and investigate issues
- Clean up old logs (automated after 30 days)
- Update API configuration as needed

### Scaling Considerations
- Increase cache TTL for stable data
- Adjust polling frequency based on data freshness needs
- Monitor rate limits and adjust per-user limits
- Scale Supabase resources as user base grows

This server-side implementation ensures efficient, monitored, and controlled access to the SportGameOdds API while providing comprehensive analytics and management capabilities.
