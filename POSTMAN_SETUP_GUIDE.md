# Statpedia Postman Collection Setup Guide

## Overview
This guide will help you set up a comprehensive Postman workspace for testing all Statpedia APIs, including SportsRadar, SportsGameOdds, and our custom backend endpoints.

## Step 1: Create Postman Workspace

1. **Open Postman** and sign in to your account
2. **Create New Workspace**:
   - Click "Workspaces" in the left sidebar
   - Click "Create Workspace"
   - Name: "Statpedia Sports APIs"
   - Description: "Comprehensive collection for Statpedia project APIs"
   - Visibility: Personal or Team (your choice)

## Step 2: Import Our Collection

1. **Import Collection**:
   - Click "Import" button
   - Select "File" tab
   - Upload `statpedia-postman-collection.json`
   - Click "Import"

2. **Verify Collection Structure**:
   - You should see "Statpedia Sports APIs" collection
   - Contains 4 main folders:
     - SportsRadar Core APIs
     - SportsRadar Odds & Player Props
     - SportsGameOdds APIs
     - Statpedia Custom APIs

## Step 3: Fork SportsRadar Collections

### Fork SportsRadar Media APIs Collection

1. **Navigate to SportsRadar Collection**:
   - Go to: https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview
   - Click "Fork" button
   - Select your "Statpedia Sports APIs" workspace
   - Name: "SportsRadar Media APIs (Forked)"
   - Click "Fork Collection"

2. **Set Up Environment Variables**:
   - In the forked collection, go to "Variables" tab
   - Add variable: `api_key` = `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
   - Save the collection

### Fork SportsRadar Odds Comparison Player Props v2

1. **Navigate to Odds Collection**:
   - Go to: https://www.postman.com/sportradar-media-apis/sportradar-media-apis/collection/8eu5kcm/sportradar-odds-comparison-player-props-v2
   - Click "Fork" button
   - Select your "Statpedia Sports APIs" workspace
   - Name: "SportsRadar Odds Player Props v2 (Forked)"
   - Click "Fork Collection"

2. **Set Up Environment Variables**:
   - Add variable: `api_key` = `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
   - Save the collection

## Step 4: Create Environment Variables

1. **Create New Environment**:
   - Click "Environments" in left sidebar
   - Click "Create Environment"
   - Name: "Statpedia Development"

2. **Add Variables**:
   ```
   Variable Name: base_url
   Initial Value: https://api.sportradar.com
   Current Value: https://api.sportradar.com

   Variable Name: sportsgameodds_base_url
   Initial Value: https://api.sportsgameodds.com
   Current Value: https://api.sportsgameodds.com

   Variable Name: sportsradar_api_key
   Initial Value: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D
   Current Value: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D

   Variable Name: sportsgameodds_api_key
   Initial Value: your_sportsgameodds_key_here
   Current Value: your_sportsgameodds_key_here

   Variable Name: current_year
   Initial Value: 2025
   Current Value: 2025

   Variable Name: current_date
   Initial Value: 2025-01-05
   Current Value: 2025-01-05
   ```

3. **Save Environment** and select it as active

## Step 5: Test Working Endpoints

### Test SportsRadar Core APIs (These should work)

1. **NFL Schedule 2025**:
   - Should return 200 status
   - Response should contain `weeks` array with games

2. **NBA Schedule 2025**:
   - Should return 200 status
   - Response should contain `games` array

3. **MLB Schedule 2025**:
   - Should return 200 status
   - Response should contain `games` array

### Test SportsRadar Odds APIs (These may return 403/502)

1. **Books (Bookmakers)**:
   - May return 403 (Authentication Error)
   - This is expected with trial keys

2. **NFL Player Props**:
   - May return 502 (Bad Gateway)
   - This indicates the endpoint structure is correct but may need different permissions

## Step 6: Document Working Endpoints

### Working Endpoints (200 Status)
- ✅ NFL Schedule: `/nfl/official/trial/v7/en/games/2025/REG/schedule.json`
- ✅ NBA Schedule: `/nba/trial/v7/en/games/2025/REG/schedule.json`
- ✅ MLB Schedule: `/mlb/trial/v7/en/games/2025/REG/schedule.json`
- ✅ NHL Schedule: `/nhl/trial/v7/en/games/2025/REG/schedule.json`

### Endpoints Requiring Different Permissions (403/502)
- ❌ Books: `/oddscomparison/v1/en/books.json`
- ❌ Player Props: `/oddscomparison/v1/en/sports/1/player_props.json`
- ❌ Daily Schedules: `/oddscomparison/v1/en/schedules/2025-01-05.json`

## Step 7: Update Our Backend

Based on the working endpoints, we'll update our SportsRadar backend to use only the confirmed working APIs and implement player props generation from the schedule data.

## Step 8: Test Our Custom APIs

1. **Start Statpedia Development Server**:
   ```bash
   npm run dev
   ```

2. **Test Custom Endpoints**:
   - Get Player Props (NFL): `http://localhost:8083/api/player-props?sport=nfl`
   - Test SportsRadar Backend: `http://localhost:8083/api/sportsradar/test`

## Step 9: Create Test Scripts

Create automated tests in Postman to verify our APIs are working correctly:

1. **Test Response Status**:
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });
   ```

2. **Test Response Structure**:
   ```javascript
   pm.test("Response has required fields", function () {
       const jsonData = pm.response.json();
       pm.expect(jsonData).to.have.property('games');
   });
   ```

3. **Test Data Quality**:
   ```javascript
   pm.test("Games array is not empty", function () {
       const jsonData = pm.response.json();
       pm.expect(jsonData.games).to.be.an('array');
       pm.expect(jsonData.games.length).to.be.greaterThan(0);
   });
   ```

## Step 10: Monitor and Debug

1. **Use Postman Console**:
   - View detailed request/response logs
   - Debug authentication issues
   - Monitor API rate limits

2. **Set Up Monitoring**:
   - Create collection runner for automated testing
   - Set up alerts for failed requests
   - Monitor API usage and performance

## Next Steps

1. **Fork the collections** as described above
2. **Test all endpoints** and document which ones work
3. **Update our backend** to use only working endpoints
4. **Implement player props generation** from schedule data
5. **Create automated tests** for our custom APIs

This setup will give us a comprehensive testing environment for all our APIs and ensure everything runs smoothly in production!
