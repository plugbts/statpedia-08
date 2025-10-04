# 🚀 Deploy Insights Functions to Supabase

## Option 1: Manual Deployment via Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Navigate to your project
   - Go to SQL Editor

2. **Run the SQL Script**
   - Copy and paste the contents of `deploy-insights-functions.sql`
   - Click "Run" to execute

3. **Verify Functions are Created**
   - Go to Database → Functions
   - You should see these functions:
     - `get_game_insights`
     - `get_player_insights` 
     - `get_moneyline_insights`
     - `get_prediction_analytics_summary`

## Option 2: Command Line Deployment

If you have psql installed and configured:

```bash
# Get your database URL
npx supabase status --output env | grep DATABASE_URL

# Run the SQL script
psql "YOUR_DATABASE_URL" -f deploy-insights-functions.sql
```

## Option 3: Test the Functions

After deployment, you can test the functions:

```sql
-- Test game insights
SELECT * FROM get_game_insights('nfl', 7) LIMIT 3;

-- Test player insights  
SELECT * FROM get_player_insights('nfl', 7) LIMIT 3;

-- Test moneyline insights
SELECT * FROM get_moneyline_insights('nfl', 7) LIMIT 2;

-- Test analytics summary
SELECT * FROM get_prediction_analytics_summary('nfl', 30);
```

## What This Deploys

✅ **4 Database Functions** for insights analytics  
✅ **Mock Data** (ready for real data integration)  
✅ **Proper Permissions** for authenticated users  
✅ **Test Queries** to verify functionality  

## Next Steps

1. Deploy the functions using one of the methods above
2. Test your insights tab in the application
3. The functions will return mock data initially
4. Later, you can update them to use real data from your tables

## Troubleshooting

If you get permission errors:
- Make sure you're logged in as the project owner
- Check that RLS policies allow function execution
- Verify the functions are created in the `public` schema

The insights tab should work immediately after deploying these functions! 🎉
