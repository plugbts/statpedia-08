# TheRundown.io API Integration Setup Guide

## Overview
This guide will help you integrate TheRundown.io API as a secondary data source alongside SportsRadar, creating a robust dual-system for sports betting data.

## Step 1: Get TheRundown.io API Key

### Option 1: RapidAPI (Recommended)
1. **Go to RapidAPI**: https://rapidapi.com/therundown/api/therundown
2. **Subscribe to a plan**:
   - **Basic Plan**: Free tier with limited requests
   - **Pro Plan**: $9.99/month with higher limits
   - **Ultra Plan**: $49.99/month for production use

3. **Get your API key** from the RapidAPI dashboard
4. **Test the API** using RapidAPI's built-in testing tool

### Option 2: Direct API (Enterprise)
1. **Contact TheRundown.io**: https://therundown.io/contact
2. **Request enterprise access** for direct API integration
3. **Get dedicated API key** and custom rate limits

## Step 2: Update API Configuration

### Update TheRundown API Service
Edit `src/services/therundown-api.ts`:

```typescript
const THERUNDOWN_CONFIG = {
  // Replace with your actual API key
  API_KEY: 'your_actual_therundown_api_key_here',
  BASE_URL: 'https://therundown-v1.p.rapidapi.com',
  // ... rest of config
};
```

### Environment Variables (Optional)
Create `.env.local` file:
```bash
VITE_THERUNDOWN_API_KEY=your_actual_therundown_api_key_here
```

Then update the service:
```typescript
API_KEY: import.meta.env.VITE_THERUNDOWN_API_KEY || 'fallback_key',
```

## Step 3: Import Postman Collection

### Import the Collection
1. **Open Postman**
2. **Click "Import"**
3. **Select `therundown-postman-collection.json`**
4. **Click "Import"**

### Set Up Environment Variables
1. **Create new environment**: "Statpedia Dual APIs"
2. **Add these variables**:
   ```
   therundown_api_key: your_actual_therundown_api_key_here
   sportsradar_api_key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D
   current_date: 2025-01-05
   dev_server_url: http://localhost:8084
   ```
3. **Set as active environment**

## Step 4: Test the Integration

### Test Individual APIs
1. **Test SportsRadar endpoints** (should work):
   - NFL Schedule 2025 ✅
   - NFL Teams Hierarchy ✅
   - NBA Schedule 2025 ✅

2. **Test TheRundown endpoints** (need valid API key):
   - NFL Events
   - NBA Events
   - NFL Odds
   - NFL Player Props
   - Available Sportsbooks

### Test Dual System
1. **Open Dev Console** in your app
2. **Go to Testing Suite tab**
3. **Click "Test Dual System"**
4. **Check console logs** for results

Expected results:
```
🔄 Testing Dual Sports API System...
✅ SportsRadar: 80 props
✅ TheRundown: 45 props (if API key works)
🎯 COMBINED: 90 props
```

## Step 5: Verify Player Props Display

### Check Player Props Tab
1. **Navigate to Player Props tab**
2. **Select NFL sport**
3. **Look for props from both sources**
4. **Check console logs** for detailed information

### Expected Behavior
- **Primary source**: SportsRadar (if working)
- **Secondary source**: TheRundown (supplements or replaces)
- **Fallback**: Generated props (if both fail)
- **Smart optimization**: Limits total props based on UX/API efficiency

## Step 6: Monitor API Usage

### Dev Console Monitoring
- **Cache stats**: Shows cached data from both APIs
- **API usage**: Tracks calls to prevent rate limiting
- **Error logging**: Identifies API failures

### Rate Limiting Strategy
- **SportsRadar**: 1000 calls/month (trial)
- **TheRundown**: Varies by plan (100-10,000 calls/day)
- **Caching**: 10-minute cache reduces API calls
- **Smart limits**: Optimizes prop count per sport

## Step 7: Troubleshooting

### Common Issues

#### TheRundown API Returns 401/403
- **Check API key**: Ensure it's correct and active
- **Check subscription**: Verify your RapidAPI plan is active
- **Check headers**: Ensure `X-RapidAPI-Key` header is set

#### No Player Props Showing
1. **Check Dev Console logs**:
   ```javascript
   // Look for these messages
   "🔄 Testing Dual Sports API System..."
   "✅ SportsRadar: X props"
   "✅ TheRundown: X props"
   ```

2. **Test individual APIs**:
   - Click "Test SportsRadar API"
   - Click "Test TheRundown API"
   - Click "Test Dual System"

3. **Check network tab** for failed requests

#### Rate Limiting Issues
- **Reduce API calls**: Increase cache duration
- **Upgrade plan**: Get higher rate limits
- **Implement delays**: Add request throttling

### Debug Commands

#### Clear All Caches
```javascript
// In browser console
dualSportsAPI.clearCache();
```

#### Test Specific Sport
```javascript
// In browser console
dualSportsAPI.testBothAPIs('nfl').then(console.log);
```

#### Check Cache Stats
```javascript
// In browser console
console.log(dualSportsAPI.getCacheStats());
```

## Step 8: Production Considerations

### API Key Security
- **Use environment variables** for production
- **Never commit API keys** to version control
- **Rotate keys regularly** for security

### Error Handling
- **Graceful degradation**: App works even if APIs fail
- **User notifications**: Inform users of data limitations
- **Logging**: Monitor API health and usage

### Performance Optimization
- **Intelligent caching**: Balance freshness vs. API usage
- **Request batching**: Combine multiple requests when possible
- **CDN caching**: Cache static data (teams, sports) longer

## Expected Results

### Successful Integration
- **Player Props Tab**: Shows props from both APIs
- **Dev Console**: All tests pass with green checkmarks
- **Console Logs**: Detailed breakdown of data sources
- **Redundancy**: System works even if one API fails

### Performance Metrics
- **Load Time**: < 2 seconds for player props
- **API Calls**: < 50 calls per hour during normal usage
- **Cache Hit Rate**: > 80% for repeated requests
- **Error Rate**: < 5% for API calls

## Support

### Documentation Links
- **TheRundown.io Docs**: https://therundown.io/docs
- **RapidAPI Hub**: https://rapidapi.com/therundown/api/therundown
- **SportsRadar Docs**: https://developer.sportradar.com

### Contact Information
- **TheRundown Support**: support@therundown.io
- **RapidAPI Support**: https://rapidapi.com/support
- **Statpedia Issues**: Check Dev Console logs and browser console

---

## Quick Start Checklist

- [ ] Get TheRundown.io API key from RapidAPI
- [ ] Update `THERUNDOWN_CONFIG.API_KEY` in code
- [ ] Import `therundown-postman-collection.json` to Postman
- [ ] Set up environment variables in Postman
- [ ] Test individual APIs in Postman
- [ ] Test dual system in Dev Console
- [ ] Verify player props display in UI
- [ ] Monitor API usage and performance

**🎯 Goal**: Achieve 0/30 → 30/30 success rate in integration tests with real cached data from both APIs!
