# Analytics System Deployment Guide

This guide walks you through deploying the comprehensive analytics system for StatPedia's prop matchup analysis.

## Overview

The analytics system provides:
- **PropMatchup-style rankings** with league-aware weighting
- **High-performance queries** using materialized views and indexes
- **Real-time refresh** capabilities with monitoring
- **TypeScript integration** for seamless frontend usage
- **Scalable architecture** supporting thousands of users

## Prerequisites

- Supabase project with `player_game_logs` and `proplines` tables
- Node.js/TypeScript environment for frontend components
- Admin access to run database migrations

## Deployment Steps

### 1. Database Setup

Run the migrations in order:

```bash
# 1. Core analytics system
supabase db push --file supabase/migrations/20250103_analytics_system.sql

# 2. Refresh logging
supabase db push --file supabase/migrations/20250103_analytics_refresh_logs.sql

# 3. Cron setup (optional - requires pg_cron extension)
supabase db push --file supabase/migrations/20250103_analytics_cron_setup.sql

# 4. Validation
supabase db push --file supabase/migrations/20250103_analytics_validation.sql
```

### 2. Edge Function Deployment

Deploy the analytics refresh function:

```bash
supabase functions deploy analytics-refresh
```

### 3. Frontend Integration

The TypeScript utilities and React components are already created:

- `src/lib/supabase.ts` - Supabase client setup
- `src/lib/leagues.ts` - League configurations and caps
- `src/lib/analytics.ts` - Analytics query functions
- `src/services/analytics-api-service.ts` - API service layer
- `src/components/analytics/` - React components

### 4. Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage Examples

### Basic Prop Matchups

```typescript
import { analyticsApi } from './src/services/analytics-api-service';

// Get top NFL props for today
const props = await analyticsApi.getProps({
  league: 'nfl',
  date: '2024-01-15',
  limit: 50
});

console.log(props.data); // Array of PropMatchup objects
```

### Game Matchups

```typescript
// Get game-level matchup grades
const games = await analyticsApi.getGames({
  league: 'nba',
  date: '2024-01-15'
});

console.log(games.data); // Array of GameMatchup objects
```

### React Component Usage

```tsx
import { AnalyticsDashboard } from './src/components/analytics/AnalyticsDashboard';

function App() {
  return (
    <div>
      <AnalyticsDashboard />
    </div>
  );
}
```

## Database Schema

### Materialized Views

1. **mv_player_baselines** - Rolling averages and season stats
2. **mv_team_prop_ranks** - Offense/defense rankings per prop type
3. **mv_team_pace** - Team pace proxies
4. **mv_prop_matchups** - Prop-level matchup grades
5. **mv_game_matchups** - Game-level matchup grades

### Key Functions

- `normalize_prop_type()` - Standardizes prop type names
- `refresh_analytics_views()` - Refreshes all materialized views
- `refresh_analytics_with_logging()` - Refresh with performance logging
- `get_latest_analytics_refresh()` - Get refresh status

### API View

- `player_props_api_view` - Normalized joins with date tolerance

## Refresh Strategy

### Automatic Refresh

The system supports multiple refresh strategies:

1. **Cron Jobs** (if pg_cron available):
   - Every 15 minutes during active hours (6 AM - 11 PM)
   - Every hour during peak hours (12 PM - 8 PM)
   - Daily deep refresh at 3 AM

2. **Edge Function**:
   - Callable via HTTP
   - Includes logging and error handling
   - Can be triggered by external schedulers

3. **Manual Refresh**:
   ```typescript
   await analyticsApi.refreshAnalytics();
   ```

### Monitoring

Check refresh status:

```sql
-- Get latest refresh info
select * from get_latest_analytics_refresh();

-- Get refresh history
select * from get_analytics_refresh_history(7); -- Last 7 days

-- Check refresh logs
select * from analytics_refresh_logs 
order by refreshed_at desc 
limit 10;
```

## Performance Optimization

### Indexes

The system creates optimized indexes for:
- Multi-column joins on `player_game_logs`
- Date-based queries on `proplines`
- League-specific filtering

### Query Optimization

- Materialized views are set with `fillfactor = 90`
- Concurrent refresh prevents blocking
- League-aware caps prevent large result sets

### League Caps

- NFL: 150 props
- NBA: 100 props
- MLB: 95 props
- NHL: 70 props

## Validation

Run the validation queries to ensure everything works:

```sql
-- Test basic functionality
select * from mv_prop_matchups 
where league = 'nfl' 
  and prop_date = current_date 
order by matchup_grade desc 
limit 10;

-- Check performance
explain analyze 
select * from mv_prop_matchups 
where league = 'nba' 
  and prop_date = '2024-01-15' 
  and matchup_grade > 70;
```

## Troubleshooting

### Common Issues

1. **Materialized views empty**:
   - Check if source tables have data
   - Run initial refresh manually
   - Verify date formats match

2. **Slow queries**:
   - Check if indexes were created
   - Verify materialized views are refreshed
   - Monitor query execution plans

3. **Refresh failures**:
   - Check `analytics_refresh_logs` for errors
   - Verify permissions on materialized views
   - Check for concurrent refresh conflicts

### Debug Queries

```sql
-- Check materialized view sizes
select 
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
from pg_matviews 
where matviewname like 'mv_%';

-- Check index usage
select 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
from pg_stat_user_indexes 
where tablename in ('player_game_logs', 'proplines');
```

## Production Checklist

- [ ] All migrations deployed successfully
- [ ] Materialized views populated with data
- [ ] Refresh schedule configured
- [ ] Edge function deployed and tested
- [ ] Frontend components integrated
- [ ] Performance tests passed
- [ ] Monitoring alerts configured
- [ ] Documentation updated

## API Endpoints

The system provides these equivalent API endpoints:

- `GET /analytics/props` - Get prop matchups
- `GET /analytics/games` - Get game matchups
- `GET /analytics/summary` - Get analytics summary
- `POST /analytics/refresh` - Trigger manual refresh

## Support

For issues or questions:
1. Check the validation queries output
2. Review the refresh logs
3. Test with sample data queries
4. Monitor performance metrics

The system is designed to handle high-traffic scenarios and provides comprehensive monitoring for production use.
