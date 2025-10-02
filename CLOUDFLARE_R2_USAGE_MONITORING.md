# Cloudflare R2 Usage Monitoring System

This system provides comprehensive monitoring and tracking of Cloudflare R2 storage usage, costs, and plan limits for the Statpedia application.

## 🎯 Features

### ✅ **Real-time Usage Tracking**
- Automatic logging of all R2 operations (GET, PUT, DELETE, HEAD, LIST)
- Real-time cost calculation based on Cloudflare R2 pricing
- Persistent storage in Supabase database
- Never resets values - always tracks cumulative usage

### ✅ **Admin Panel Integration**
- Dedicated "R2 Usage" tab in the admin panel
- Real-time usage statistics and cost analysis
- Visual progress bars showing usage vs plan limits
- Color-coded alerts for approaching limits

### ✅ **Comprehensive Analytics**
- Daily usage summaries
- Operation breakdown by type
- Cost projections and trends
- Historical usage data

### ✅ **Plan Management**
- Configurable R2 plan limits
- Usage percentage calculations
- Days remaining estimates
- Cost projections

## 🏗️ Architecture

### Database Schema

The system uses several Supabase tables:

1. **`r2_usage_logs`** - Individual operation logs
2. **`r2_usage_summary`** - Daily aggregated usage data
3. **`r2_plan_config`** - Plan configuration and pricing
4. **`r2_current_usage`** - Current month usage tracking

### Components

1. **Database Migration** (`supabase/migrations/20250103000001_cloudflare_r2_usage_tracking.sql`)
2. **R2 Usage Service** (`src/services/cloudflare-r2-usage-service.ts`)
3. **Admin Panel Component** (`src/components/admin/cloudflare-r2-usage-panel.tsx`)
4. **Enhanced Cloudflare Worker** (`cloudflare-worker/src/index-with-r2-tracking.ts`)

## 🚀 Setup Instructions

### 1. Database Setup

Run the database migration to create the necessary tables:

```bash
# Apply the migration
supabase db push
```

### 2. Cloudflare Worker Setup

#### Option A: Use the Enhanced Deployment Script

```bash
cd cloudflare-worker
export SUPABASE_SERVICE_KEY="your_supabase_service_key_here"
./deploy-with-r2-tracking.sh
```

#### Option B: Manual Setup

1. **Update wrangler.toml** with Supabase credentials:
```toml
[env.production.vars]
SUPABASE_URL = "https://rfdrifnsfobqlzorcesn.supabase.co"
SUPABASE_SERVICE_KEY = "your_supabase_service_key_here"
```

2. **Replace the worker code**:
```bash
cp src/index-with-r2-tracking.ts src/index.ts
```

3. **Deploy**:
```bash
wrangler deploy --env production
```

### 3. Frontend Integration

The R2 usage panel is automatically integrated into the admin tab. No additional setup required.

## 📊 Usage Monitoring

### Admin Panel Features

#### Overview Tab
- **Plan Status Cards**: Shows usage vs limits for each bucket
- **Progress Bars**: Visual representation of usage percentages
- **Quick Stats**: Total requests, data transfer, and costs
- **Color-coded Alerts**: Green (low), Yellow (moderate), Orange (high), Red (critical)

#### Usage Details Tab
- **Operation Breakdown**: GET, PUT, DELETE, HEAD, LIST operations
- **Data Transfer**: Total and average response sizes
- **Cost Analysis**: Detailed cost breakdown per bucket

#### Cost Analysis Tab
- **Plan Configuration**: Current pricing and limits
- **Cost Projection**: Estimated monthly costs
- **Usage Trends**: Historical cost patterns

#### Usage History Tab
- **Daily Summaries**: Usage data for the last 30 days
- **Trend Analysis**: Patterns and growth over time

### Real-time Monitoring

The system automatically tracks:
- **Storage Usage**: Bytes stored in R2 buckets
- **Class A Operations**: PUT and DELETE operations
- **Class B Operations**: GET, HEAD, and LIST operations
- **Egress**: Data transferred out of R2
- **Costs**: Calculated based on Cloudflare R2 pricing

## 💰 Cost Calculation

The system calculates costs based on current Cloudflare R2 pricing:

- **Storage**: $0.015 per GB per month
- **Class A Operations**: $4.5 per million operations (PUT, DELETE)
- **Class B Operations**: $0.36 per million operations (GET, HEAD, LIST)
- **Egress**: $0.09 per GB

## 🔧 Configuration

### Plan Configuration

Update the plan configuration in the database:

```sql
UPDATE r2_plan_config SET 
  base_storage_gb = 10.0,
  base_class_a_operations = 1000000,
  base_class_b_operations = 10000000,
  base_egress_gb = 1.0
WHERE plan_name = 'Free Tier';
```

### Environment Variables

Required environment variables for the Cloudflare Worker:

```bash
SUPABASE_URL=https://rfdrifnsfobqlzorcesn.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
```

## 📈 Monitoring and Alerts

### Usage Thresholds

The system provides color-coded alerts:
- **🟢 Green (0-50%)**: Low usage, no concerns
- **🟡 Yellow (50-75%)**: Moderate usage, monitor closely
- **🟠 Orange (75-90%)**: High usage, consider optimization
- **🔴 Red (90%+)**: Critical usage, immediate action needed

### Cost Monitoring

- **Real-time cost tracking**: Every operation is logged with calculated cost
- **Monthly projections**: Estimated costs based on current usage patterns
- **Historical trends**: Track cost growth over time

## 🔄 Data Persistence

### Never Resets Values

The system is designed to never reset usage values:
- **Cumulative tracking**: All usage is cumulative across months
- **Historical data**: Complete history of all operations
- **Persistent storage**: Data stored in Supabase database
- **Backup and recovery**: Data is backed up with your Supabase instance

### Data Retention

- **Usage logs**: Individual operation logs (configurable retention)
- **Daily summaries**: Aggregated daily data (permanent)
- **Current usage**: Monthly tracking (resets monthly for billing)
- **Plan config**: Configuration data (permanent)

## 🛠️ Troubleshooting

### Common Issues

1. **R2 usage not logging**
   - Check Supabase service key configuration
   - Verify Cloudflare Worker deployment
   - Check browser console for errors

2. **Admin panel not showing data**
   - Ensure user has admin/owner role
   - Check database permissions
   - Verify RLS policies

3. **Cost calculations seem incorrect**
   - Verify plan configuration in database
   - Check pricing updates from Cloudflare
   - Review operation logging accuracy

### Debug Mode

Enable debug logging in the Cloudflare Worker by adding:

```typescript
console.log('R2 Usage Log:', usageLog);
```

## 📚 API Reference

### R2 Usage Service Methods

```typescript
// Log R2 usage
await cloudflareR2UsageService.logUsage('GET', bytesTransferred, requestCount, costUsd);

// Get usage statistics
const stats = await cloudflareR2UsageService.getUsageStats(bucketName, startDate, endDate);

// Get usage vs plan limits
const usageVsPlan = await cloudflareR2UsageService.getUsageVsPlan(bucketName);

// Get current usage
const currentUsage = await cloudflareR2UsageService.getCurrentUsage();
```

### Database Functions

```sql
-- Log R2 usage
SELECT log_r2_usage('bucket-name', 'GET', 1024, 1, 0.001);

-- Get usage statistics
SELECT * FROM get_r2_usage_stats('bucket-name', '2024-01-01', '2024-01-31');

-- Get usage vs plan
SELECT * FROM get_r2_usage_vs_plan('bucket-name');
```

## 🎉 Benefits

### ✅ **Cost Control**
- Real-time cost tracking prevents surprise bills
- Usage alerts help optimize before hitting limits
- Historical data enables better planning

### ✅ **Performance Monitoring**
- Track API usage patterns
- Identify optimization opportunities
- Monitor cache hit rates

### ✅ **Operational Insights**
- Understand usage patterns
- Plan for scaling needs
- Optimize resource allocation

### ✅ **Never Lose Data**
- Persistent storage in Supabase
- Complete historical record
- Backup and recovery capabilities

## 🚀 Next Steps

1. **Deploy the system** using the provided scripts
2. **Configure your Supabase service key** in the Cloudflare Worker
3. **Monitor usage** in the admin panel
4. **Set up alerts** for approaching limits
5. **Optimize usage** based on insights

The system will automatically start tracking all R2 operations and provide comprehensive monitoring and cost analysis for your Cloudflare R2 usage!
