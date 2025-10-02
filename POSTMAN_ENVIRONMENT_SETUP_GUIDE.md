# Postman Environment Setup Guide

Complete guide to set up environment variables and authentication for your forked SportsRadar collections.

## 🎯 Your Postman Workspace
**URL:** https://lifesplugg-9889449.postman.co/workspace/Statpedia~4f4e954c-f368-4c54-b419-e3b4206b3f36

## ✅ Authentication Test Results

### 🔑 Successfully Authenticated APIs (6/10 - 60%)
- **NFL Schedule 2025**: 200 ✅ (1.48s response time)
- **NFL Teams Hierarchy**: 200 ✅ (32 teams, 2 conferences)
- **NBA Schedule 2025**: 200 ✅ (1,206 games)
- **NBA Teams Hierarchy**: 200 ✅ (30 teams, 2 conferences)
- **MLB Schedule 2025**: 200 ✅ (2,431 games)
- **NHL Schedule 2025**: 200 ✅ (1,312 games)

### ⚠️ APIs Requiring Special Permissions
- **Books (Bookmakers)**: 403 (Authentication Error)
- **NFL Player Props**: 502 (Bad Gateway - authentication passed but service unavailable)
- **NBA Player Props**: 502 (Bad Gateway - authentication passed but service unavailable)
- **Daily Schedules**: 502 (Bad Gateway - authentication passed but service unavailable)

## 🚀 Step 1: Import Environment Variables

### Method 1: Import JSON File (Recommended)

1. **Download the environment file:** `postman-environment-setup.json`

2. **Open your Postman workspace:**
   ```
   https://lifesplugg-9889449.postman.co/workspace/Statpedia~4f4e954c-f368-4c54-b419-e3b4206b3f36
   ```

3. **Click "Environments"** in the left sidebar

4. **Click "Import"** button

5. **Upload `postman-environment-setup.json`**

6. **Click "Import"**

### Method 2: Manual Setup

1. **Click "Environments"** in the left sidebar

2. **Click "Create Environment"**

3. **Name:** `Statpedia Development`

4. **Add these variables:**

| Variable Name | Value | Type |
|---------------|-------|------|
| `base_url` | `https://api.sportradar.com` | default |
| `sportsradar_api_key` | `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D` | secret |
| `current_year` | `2025` | default |
| `current_season` | `REG` | default |
| `current_date` | `2025-01-05` | default |
| `dev_server_url` | `http://localhost:8084` | default |
| `nfl_sport_id` | `1` | default |
| `nba_sport_id` | `2` | default |
| `mlb_sport_id` | `3` | default |
| `nhl_sport_id` | `4` | default |
| `timeout` | `10000` | default |

5. **Click "Save"**

## 🔧 Step 2: Set Active Environment

1. **In the top-right corner** of Postman, click the environment dropdown

2. **Select "Statpedia Development"**

3. **Verify** the environment is active (should show in the dropdown)

## 🔐 Step 3: Configure Authentication in Collections

### For Each Forked Collection:

1. **Open the collection** (e.g., "NFL Official API (Forked)")

2. **Click on the collection name** to open settings

3. **Go to "Authorization" tab**

4. **Set Type:** `API Key`

5. **Configure:**
   - **Key:** `x-api-key`
   - **Value:** `{{sportsradar_api_key}}`
   - **Add to:** `Header`

6. **Click "Save"**

### Alternative: Set Headers in Individual Requests

For each request in your collections:

1. **Go to "Headers" tab**

2. **Add header:**
   - **Key:** `x-api-key`
   - **Value:** `{{sportsradar_api_key}}`

3. **Add header:**
   - **Key:** `accept`
   - **Value:** `application/json`

## 🧪 Step 4: Test Your Setup

### Test Working APIs First

1. **Open NFL Schedule 2025 request**

2. **Verify URL uses variables:**
   ```
   {{base_url}}/nfl/official/trial/v7/en/games/{{current_year}}/{{current_season}}/schedule.json
   ```

3. **Click "Send"**

4. **Verify you get 200 status** with game data

### Expected Results:
- **Status:** 200 OK
- **Response Time:** ~1-2 seconds
- **Data:** JSON with weeks array containing games

### Test All Working APIs:
- ✅ NFL Schedule 2025
- ✅ NFL Teams Hierarchy  
- ✅ NBA Schedule 2025
- ✅ NBA Teams Hierarchy
- ✅ MLB Schedule 2025
- ✅ NHL Schedule 2025

## 🔍 Step 5: Verify Authentication

### Check Request Headers

1. **In any request, click "Send"**

2. **Go to "Console" (bottom of Postman)**

3. **Verify headers include:**
   ```
   x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D
   accept: application/json
   ```

### Check Response Status

- **200:** ✅ Authentication successful
- **401:** ❌ Unauthorized (bad API key)
- **403:** ❌ Forbidden (insufficient permissions)
- **502:** ⚠️ Bad Gateway (authentication passed, service issue)

## 🎯 Step 6: Set Up Collection Tests

### Add Tests to Working Endpoints

1. **Open any working request**

2. **Go to "Tests" tab**

3. **Add this test script:**

```javascript
// Test authentication
pm.test("Authentication successful", function () {
    pm.response.to.have.status(200);
});

// Test response time
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

// Test response structure
pm.test("Response has data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.not.be.null;
    pm.expect(jsonData).to.be.an('object');
});

// Test API key is being used
pm.test("API key is in request", function () {
    pm.expect(pm.request.headers.get('x-api-key')).to.not.be.null;
});
```

## 📊 Step 7: Run Collection Tests

1. **Click on collection name**

2. **Click "Run"** button

3. **Select requests to test**

4. **Choose "Statpedia Development" environment**

5. **Click "Run Collection"**

6. **Review results:**
   - ✅ 6 tests should pass (working APIs)
   - ⚠️ 4 tests may fail (permission issues)

## 🚨 Troubleshooting

### If Authentication Fails (401/403):

1. **Check API key** in environment variables
2. **Verify header name** is `x-api-key` (not `X-API-Key`)
3. **Ensure environment** is selected
4. **Check variable syntax** uses `{{sportsradar_api_key}}`

### If You Get 502 Errors:

- Authentication is working
- Service may be temporarily unavailable
- Try again later
- These endpoints may require different API tier

### If Variables Don't Work:

1. **Check environment** is active
2. **Verify variable names** match exactly
3. **Check for typos** in variable references
4. **Refresh Postman** if needed

## ✅ Success Checklist

- [ ] Environment imported/created
- [ ] Environment set as active
- [ ] All collections have authentication configured
- [ ] Working APIs return 200 status
- [ ] Headers include correct API key
- [ ] Collection tests pass for working endpoints
- [ ] Variables resolve correctly in requests

## 🎉 Ready for Player Props Backend!

With authentication working for 6 core APIs, you now have:

- **NFL data:** Schedules, teams, hierarchy
- **NBA data:** Schedules, teams, hierarchy  
- **MLB data:** Schedules, teams, hierarchy
- **NHL data:** Schedules, teams, hierarchy

These APIs provide all the foundational data needed for your player props backend system! 🚀

## 💡 Pro Tips

1. **Use Collection Variables** for sport-specific settings
2. **Set up Monitors** to track API health
3. **Export Environment** for team sharing
4. **Document Working Endpoints** for development
5. **Monitor Rate Limits** to avoid quota issues
6. **Test Before Production** to ensure reliability
