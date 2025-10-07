# Enhanced Analytics Guide

This guide explains the enhanced analytics system that joins PlayerGameLogs with PropLines to provide accurate betting analytics using real sportsbook lines.

## Overview

The enhanced analytics system provides comprehensive betting insights by:

1. **Real Line Comparison**: Compares actual game performance against real sportsbook lines
2. **Advanced Analytics**: Calculates hit rates, streaks, trends, and betting edges
3. **Betting Intelligence**: Provides Kelly Criterion and edge calculations for optimal betting
4. **Performance Tracking**: Tracks consistency, trends, and historical performance

## Key Features

### 🎯 Real Betting Line Analytics
- **Accurate Hit Rates**: Uses actual sportsbook lines from PropLines table
- **Historical Accuracy**: Compares actual performance vs. lines that were available
- **Multiple Timeframes**: L5, L10, L20, and season-long analytics
- **Direction-Specific**: Separate analytics for over and under bets

### 📊 Advanced Analytics Calculations
- **Hit Rate Analysis**: Percentage of times actual performance beat the line
- **Streak Tracking**: Current and longest streaks for over/under performance
- **Trend Analysis**: Recent performance vs. overall performance
- **Consistency Scoring**: Measures performance variability (0-100 scale)

### 💰 Betting Intelligence
- **Edge Calculation**: Difference between actual hit rate and implied probability
- **Kelly Criterion**: Optimal bet sizing based on edge and odds
- **Value Identification**: Identifies betting opportunities with positive expected value
- **Risk Assessment**: Consistency metrics for risk evaluation

## Analytics Calculations

### Hit Rate Calculations

```javascript
// Calculate hit rate for a specific direction and timeframe
const hitRate = calculateHitRate(data, 'over', 10); // Last 10 games
// Returns: { hits: 7, total: 10, hitRate: 70.0, percentage: 70 }
```

### Streak Analysis

```javascript
// Calculate current and longest streaks
const streak = calculateStreak(data, 'over');
// Returns: { currentStreak: 3, longestStreak: 8, streakDirection: 'over_hit' }
```

### Trend Analysis

```javascript
// Analyze recent performance vs overall
const trend = calculateTrend(data, 'over', 5); // Last 5 games
// Returns: { trend: 'improving', trendStrength: 25, recentHitRate: 80, overallHitRate: 65 }
```

### Betting Edge Calculation

```javascript
// Calculate betting edge vs implied probability
const edge = calculateEdge(hitRate, -110); // 65% hit rate vs -110 odds
// Returns: 5.5 (positive edge of 5.5%)
```

### Kelly Criterion

```javascript
// Calculate optimal bet sizing
const kelly = calculateKellyCriterion(hitRate, -110);
// Returns: 15.2 (bet 15.2% of bankroll)
```

## Database Schema Enhancements

### New PlayerAnalytics Fields

```sql
-- Performance metrics
avg_value_l5 DECIMAL(10,2)          -- Average actual value (last 5 games)
avg_value_l10 DECIMAL(10,2)         -- Average actual value (last 10 games)
avg_value_season DECIMAL(10,2)      -- Average actual value (season)

-- Consistency metrics
consistency_l10 DECIMAL(5,2)        -- Consistency score (last 10 games)
consistency_season DECIMAL(5,2)     -- Consistency score (season)

-- Trend analysis
trend VARCHAR(20)                   -- 'improving', 'declining', 'neutral'
trend_strength INTEGER              -- Trend strength (0-100)
trend_difference DECIMAL(5,2)       -- Performance difference

-- Betting intelligence
edge DECIMAL(5,2)                   -- Betting edge percentage
kelly_criterion DECIMAL(5,2)        -- Kelly criterion percentage
most_recent_over_odds INTEGER       -- Most recent over odds
most_recent_under_odds INTEGER      -- Most recent under odds

-- Metadata
games_with_lines INTEGER            -- Number of games with prop lines
```

### Database Functions

#### Get Player Analytics Summary
```sql
SELECT * FROM get_player_analytics_summary('player123', 'Passing Yards', 2025);
```

#### Get Top Performers
```sql
SELECT * FROM get_top_performers('Passing Yards', 'over', 2025, 5, 10);
```

#### Get Betting Opportunities
```sql
SELECT * FROM get_betting_opportunities(5.0, 60.0, 10, 2025, 20);
```

## Usage

### Manual Execution

```bash
# Run enhanced analytics precomputation
npm run precompute-analytics:enhanced

# Run for specific season
npm run precompute-analytics:enhanced:2024
npm run precompute-analytics:enhanced:2025

# Run complete nightly job (includes enhanced analytics)
npm run nightly-job
```

### Programmatic Usage

```javascript
import { 
  precomputeAnalytics, 
  getPlayerPropAnalytics, 
  getTopPerformers 
} from './scripts/enhanced-precompute-analytics.js';

// Run enhanced analytics precomputation
const results = await precomputeAnalytics(2025);

// Get analytics for specific player/prop
const analytics = await getPlayerPropAnalytics('player123', 'Passing Yards', 2025);

// Get top performers for a prop type
const topPerformers = await getTopPerformers('Passing Yards', 'over', 2025, 5, 10);
```

## Data Flow

```
PlayerGameLogs + PropLines → Join Query → Analytics Calculation → PlayerAnalytics
         ↓                        ↓              ↓                      ↓
    Actual Values            Real Betting    Hit Rate/Streak      Enhanced Analytics
    Game Dates              Lines/Odds      Trend Analysis        Betting Intelligence
    Player/Prop Data        Sportsbook      Consistency          Edge/Kelly Criterion
```

## Analytics Examples

### High-Value Betting Opportunity

```javascript
{
  player_name: "Josh Allen",
  prop_type: "Passing Yards",
  direction: "over",
  line: 275.5,
  season_pct: 68.2,        // 68.2% hit rate
  edge: 8.5,               // 8.5% positive edge
  kelly_criterion: 12.3,   // Bet 12.3% of bankroll
  consistency_l10: 85.2,   // High consistency
  trend: "improving",      // Recent improvement
  games_count: 15          // Sufficient sample size
}
```

### Consistent Performer

```javascript
{
  player_name: "Christian McCaffrey",
  prop_type: "Rushing Yards",
  direction: "over",
  line: 85.5,
  season_pct: 72.1,        // 72.1% hit rate
  edge: 4.2,               // 4.2% positive edge
  consistency_season: 92.8, // Very high consistency
  streak_current: 5,       // Current 5-game streak
  trend: "neutral"         // Stable performance
}
```

### Declining Performance

```javascript
{
  player_name: "Player X",
  prop_type: "Receiving Yards",
  direction: "over",
  line: 65.5,
  season_pct: 58.3,        // 58.3% hit rate
  edge: -2.1,              // Negative edge
  trend: "declining",      // Recent decline
  trend_strength: 35,      // Significant decline
  consistency_l10: 45.2    // Low recent consistency
}
```

## Performance Optimization

### Batch Processing
- Processes 25 player/prop combinations per batch
- Smaller batch size for complex joins
- Individual error handling per combination

### Database Optimization
- Efficient joins between PlayerGameLogs and PropLines
- Indexed columns for fast lookups
- Upsert operations prevent duplicates

### Memory Management
- Processes data in manageable chunks
- Cleans up processed data immediately
- Monitors memory usage during execution

## Monitoring and Logging

### Key Metrics to Monitor
- **Join Success Rate**: Percentage of successful PlayerGameLogs ↔ PropLines joins
- **Analytics Calculation Time**: Time per player/prop combination
- **Data Quality**: Number of games with available prop lines
- **Edge Distribution**: Distribution of calculated betting edges

### Log Output Example
```
🔄 Starting enhanced analytics precomputation for season 2025...
⏰ Started at: 2025-01-03T02:30:00.000Z
============================================================

📊 Fetching distinct player/prop combinations...
✅ Found 1,247 player/prop combinations to process

🔄 Processing batch 1/50
  📊 Processing Josh Allen - Passing Yards...
  ✅ Found 15 games with prop lines for Josh Allen - Passing Yards
  ✅ Calculated analytics for 2 directions for Josh Allen - Passing Yards
  📊 Processing Christian McCaffrey - Rushing Yards...
  ✅ Found 16 games with prop lines for Christian McCaffrey - Rushing Yards
  ✅ Calculated analytics for 2 directions for Christian McCaffrey - Rushing Yards

✅ Computed enhanced analytics for 2,494 player-prop-direction combinations
💾 Upserting enhanced analytics data...
✅ Successfully upserted 2,494/2,494 enhanced analytics records
🎉 Enhanced analytics precomputation completed successfully!
📊 Processed 2,494 records
```

## Error Handling

### Common Issues and Solutions

1. **Missing Prop Lines**
   - **Symptom**: Low number of games with available prop lines
   - **Solution**: Ensure PropLines ingestion is running regularly
   - **Prevention**: Check PropLines data freshness

2. **Join Failures**
   - **Symptom**: Failed joins between PlayerGameLogs and PropLines
   - **Solution**: Verify data consistency between tables
   - **Prevention**: Ensure proper normalization in both tables

3. **Calculation Errors**
   - **Symptom**: Invalid analytics calculations
   - **Solution**: Review data quality and validation logic
   - **Prevention**: Comprehensive data validation

### Debug Mode

Run with verbose logging:

```bash
DEBUG=true npm run precompute-analytics:enhanced
```

## Security Considerations

### Data Privacy
- No personal information is processed
- All data is public sports information
- Proper RLS policies on all tables

### API Security
- Uses existing Supabase authentication
- No external API calls in analytics calculation
- Secure database connections

## Future Enhancements

### Planned Features
- **Real-time Analytics**: Live updating during games
- **Machine Learning**: Predictive analytics using historical data
- **Advanced Metrics**: Additional betting intelligence metrics
- **Performance Dashboards**: Real-time analytics monitoring

### Scalability Improvements
- **Parallel Processing**: Process multiple players simultaneously
- **Caching Layer**: Cache frequently accessed analytics
- **Incremental Updates**: Only recalculate changed data
- **Distributed Computing**: Scale across multiple instances

This enhanced analytics system provides the foundation for sophisticated betting intelligence and player performance analysis, enabling data-driven decision making for sports betting and fantasy sports applications.
