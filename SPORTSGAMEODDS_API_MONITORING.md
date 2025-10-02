# SportsGameOdds API Usage Monitoring System

## Overview

This system provides comprehensive monitoring and cost tracking for SportsGameOdds API usage, similar to the Cloudflare R2 monitoring system. It tracks API calls, costs, cache performance, and provides plan recommendations based on actual usage patterns.

## Features

### 📊 **Real-time Usage Tracking**
- Track all API requests with detailed metadata
- Monitor response times and error rates
- Cache hit/miss ratio tracking
- User attribution for API calls

### 💰 **Cost Management**
- Real-time cost calculation based on [SportsGameOdds pricing](https://sportsgameodds.com/pricing/)
- Projected monthly costs
- Cost optimization recommendations
- Cache discount calculations

### 📈 **Plan Optimization**
- Usage vs. plan limit monitoring
- Automatic plan recommendations
- Growth projection analysis
- Cost savings calculations

### 🔍 **Analytics Dashboard**
- Usage trends and patterns
- Top users and endpoints
- Sport-specific usage analysis
- Performance metrics

## Database Schema

### Tables Created

1. **`api_usage_logs`** - Individual API call logs
2. **`api_usage_summary`** - Monthly usage summaries
3. **`api_plan_config`** - SportsGameOdds plan configurations
4. **`api_current_usage`** - Current month usage tracking

### Key Functions

- `log_api_usage()` - Log individual API calls
- `get_api_usage_stats()` - Get usage statistics
- `get_api_usage_vs_plan()` - Compare usage to plan limits
- `get_sportsgameodds_plan_recommendation()` - Get plan recommendations

## SportsGameOdds Pricing Integration

Based on the [official pricing page](https://sportsgameodds.com/pricing/), the system includes:

### Plan Tiers
- **Free Trial**: 1,000 requests/month - $0.00/request
- **Developer**: 5,000 requests/month - $0.002/request
- **Starter**: 10,000 requests/month - $0.001/request
- **Professional**: 100,000 requests/month - $0.0008/request
- **Business**: 500,000 requests/month - $0.0006/request
- **Enterprise**: 2,000,000 requests/month - $0.0004/request

### Cost Optimization
- Cache hit discounts (10-40% depending on plan)
- Effective cost calculations
- Projected monthly cost analysis
- Plan upgrade/downgrade recommendations

## Setup Instructions

### 1. Database Setup
```sql
-- Run the setup script
\i api-usage-tracking-setup.sql

-- Update with real pricing
\i api-real-pricing-update.sql
```

### 2. Environment Variables
```bash
# Add to your Supabase project
SPORTSGAMEODDS_API_KEY=your_api_key_here
```

### 3. Deploy Enhanced Function
```bash
# Deploy the enhanced API function
supabase functions deploy sportsgameodds-api-enhanced
```

### 4. Update Frontend
The admin panel is automatically integrated into the existing admin interface under the "API Usage" tab.

## Usage Monitoring

### Real-time Tracking
- All API calls are automatically logged
- User attribution via JWT tokens
- Response time and error tracking
- Cache performance monitoring

### Cost Analysis
- Per-request cost calculation
- Monthly cost projections
- Cache discount application
- Plan efficiency analysis

### Plan Recommendations
The system analyzes:
- Current usage patterns
- Growth projections
- Cost optimization opportunities
- Plan capacity utilization

## Admin Panel Features

### Overview Tab
- Key metrics dashboard
- Current plan usage with progress bars
- Cost projections and recommendations
- Cache performance indicators

### Usage Details Tab
- Detailed usage statistics
- Endpoint and sport breakdowns
- Response time analysis
- Error rate monitoring

### Plan Analysis Tab
- Available plan comparison
- Cost per request analysis
- Cache discount benefits
- Upgrade/downgrade recommendations

### Analytics Tab
- Usage trends and patterns
- Top users and endpoints
- Sport-specific analysis
- Performance metrics

## Integration Points

### Existing Systems
- Integrates with current admin panel
- Uses existing user authentication
- Leverages current Supabase setup
- Compatible with existing API functions

### Monitoring Integration
- Real-time usage tracking
- Automatic cost calculation
- Plan limit monitoring
- Performance analytics

## Benefits

### Cost Control
- Real-time cost tracking
- Plan optimization recommendations
- Cache performance monitoring
- Usage pattern analysis

### Performance Monitoring
- Response time tracking
- Error rate monitoring
- Cache hit ratio optimization
- User behavior analysis

### Business Intelligence
- Usage growth projections
- Plan efficiency analysis
- Cost optimization opportunities
- User engagement metrics

## Troubleshooting

### Common Issues

1. **"Failed to fetch" errors**
   - Check API key configuration
   - Verify rate limits
   - Monitor error rates in admin panel

2. **High costs**
   - Review cache hit rates
   - Consider plan upgrade
   - Optimize API call patterns

3. **Performance issues**
   - Monitor response times
   - Check cache configuration
   - Review error rates

### Monitoring Tools
- Admin panel provides real-time monitoring
- Usage analytics show trends
- Plan recommendations help optimization
- Cost projections prevent surprises

## Future Enhancements

### Planned Features
- Automated plan switching
- Advanced cost analytics
- Usage prediction models
- Integration with billing systems

### Scalability
- Handles high-volume usage
- Efficient database queries
- Real-time processing
- Comprehensive caching

## Support

For issues or questions:
1. Check the admin panel for real-time status
2. Review usage analytics for patterns
3. Use plan recommendations for optimization
4. Monitor cost projections for budgeting

---

**Note**: This system is designed to work alongside your existing R2 monitoring system, providing comprehensive cost and usage tracking across all your services.
