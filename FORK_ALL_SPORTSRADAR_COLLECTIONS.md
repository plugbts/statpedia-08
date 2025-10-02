# Fork All SportsRadar Collections Guide

This guide will help you systematically fork all SportsRadar Media API collections from their official workspace into your Statpedia workspace.

## 🎯 Your Target Workspace
**Statpedia Workspace:** https://lifesplugg-9889449.postman.co/workspace/Statpedia~4f4e954c-f368-4c54-b419-e3b4206b3f36

## 🔗 SportsRadar Source Workspace
**SportsRadar Media APIs:** https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview

## 📋 Collections to Fork

Based on the [SportsRadar Media APIs workspace](https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview), here are the main collections you should fork:

### 1. Core Sports APIs
- **NFL Official API**
- **NBA Official API** 
- **MLB Official API**
- **NHL Official API**
- **NCAAFB (College Football) API**
- **NCAAMB (College Basketball) API**

### 2. Odds & Betting APIs
- **SportsRadar Odds Comparison Player Props v2**
- **SportsRadar Odds Comparison API**
- **Betting APIs**

### 3. Additional Sports APIs
- **Soccer/Football APIs**
- **Tennis APIs**
- **Golf APIs**
- **Racing APIs**

## 🚀 Step-by-Step Forking Process

### Step 1: Access SportsRadar Workspace
1. **Open the SportsRadar workspace:**
   ```
   https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview
   ```

2. **Sign in to your Postman account** if not already signed in

### Step 2: Fork Each Collection

For each collection you want to fork:

1. **Click on the collection name** to open it
2. **Click the "Fork" button** (usually in the top right)
3. **In the fork dialog:**
   - **Label:** Give it a descriptive name (e.g., "SportsRadar NFL API (Forked)")
   - **Workspace:** Select "Statpedia" workspace
   - **Watch original collection:** ✅ Check this to get updates
4. **Click "Fork Collection"**

### Step 3: Priority Collections to Fork First

Start with these essential collections for your player props backend:

#### 🏈 **NFL Collection**
- **Name:** SportsRadar NFL Official API
- **Use Case:** NFL schedules, teams, players, games
- **Priority:** HIGH ⭐⭐⭐

#### 🏀 **NBA Collection**  
- **Name:** SportsRadar NBA Official API
- **Use Case:** NBA schedules, teams, players, games
- **Priority:** HIGH ⭐⭐⭐

#### ⚾ **MLB Collection**
- **Name:** SportsRadar MLB Official API  
- **Use Case:** MLB schedules, teams, players, games
- **Priority:** HIGH ⭐⭐⭐

#### 🏒 **NHL Collection**
- **Name:** SportsRadar NHL Official API
- **Use Case:** NHL schedules, teams, players, games  
- **Priority:** HIGH ⭐⭐⭐

#### 🎯 **Odds & Player Props Collection**
- **Name:** SportsRadar Odds Comparison Player Props v2
- **Use Case:** Player props, odds, betting markets
- **Priority:** CRITICAL ⭐⭐⭐⭐⭐

### Step 4: Configure Environment Variables

After forking, set up these environment variables in your Statpedia workspace:

```json
{
  "sportsradar_api_key": "onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D",
  "base_url": "https://api.sportradar.com",
  "current_year": "2025",
  "current_season": "REG",
  "current_date": "2025-01-05"
}
```

### Step 5: Test Forked Collections

After forking each collection:

1. **Open the forked collection** in your workspace
2. **Select your environment** (Statpedia Development)
3. **Test a few key endpoints** to ensure they work
4. **Document which endpoints are working** vs. which need different permissions

## 🔧 Automation Script

Here's a checklist to systematically fork all collections:

### Core Sports APIs Checklist
- [ ] NFL Official API
- [ ] NBA Official API
- [ ] MLB Official API
- [ ] NHL Official API
- [ ] NCAAFB API
- [ ] NCAAMB API

### Odds & Betting APIs Checklist
- [ ] SportsRadar Odds Comparison Player Props v2
- [ ] SportsRadar Odds Comparison API
- [ ] Betting APIs

### Additional Sports APIs Checklist
- [ ] Soccer/Football APIs
- [ ] Tennis APIs
- [ ] Golf APIs
- [ ] Racing APIs

## 📊 Expected Results

### ✅ Working Collections (Should work with your API key):
- NFL Official API (schedules, teams, hierarchy)
- NBA Official API (schedules, teams, hierarchy)
- MLB Official API (schedules, teams, hierarchy)
- NHL Official API (schedules, teams, hierarchy)

### ⚠️ Collections Requiring Different Permissions:
- Odds Comparison APIs (may return 403/502)
- Player Props APIs (may return 403/502)
- Betting APIs (may require special permissions)

### 🔧 Collections for Development:
- Use working collections for your player props backend
- Test endpoints before implementing in code
- Monitor API usage and rate limits

## 💡 Pro Tips

1. **Fork with Watching:** Always check "Watch original collection" to get updates
2. **Organize by Sport:** Create folders in your workspace to organize by sport
3. **Test Before Using:** Always test endpoints in Postman before using in code
4. **Document Working Endpoints:** Keep track of which endpoints work with your API key
5. **Set Up Monitors:** Use Postman monitors to track API health
6. **Share with Team:** Export collections for team collaboration

## 🎯 Next Steps After Forking

1. **Test all forked collections** with your API key
2. **Document working vs. non-working endpoints**
3. **Update your backend code** to use verified working endpoints
4. **Set up automated testing** with Postman collection runner
5. **Monitor API health** with Postman monitors
6. **Integrate with your player props system**

## 🚨 Important Notes

- **API Key:** Use your existing SportsRadar API key: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
- **Rate Limits:** Be aware of API rate limits and usage quotas
- **Permissions:** Some endpoints may require different API permissions
- **Updates:** Forked collections will receive updates from the original
- **Testing:** Always test in Postman before implementing in production code

This systematic approach will give you access to all SportsRadar APIs in your workspace for comprehensive testing and development! 🚀
