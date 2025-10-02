# Postman Fork Guide - SportsRadar Collections

This guide will help you fork the official SportsRadar collections and set up our comprehensive API testing environment.

## Step 1: Fork SportsRadar Collections

### 1.1 Fork SportsRadar Media APIs Collection

1. **Go to SportsRadar Media APIs workspace:**
   ```
   https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview
   ```

2. **Click "Fork" button** on the main collection

3. **Select your workspace:** Choose "Statpedia" workspace

4. **Name it:** "SportsRadar Media APIs (Forked)"

5. **Click "Fork Collection"**

### 1.2 Fork SportsRadar Odds Player Props v2 Collection

1. **Go to the specific collection:**
   ```
   https://www.postman.com/sportradar-media-apis/sportradar-media-apis/collection/8eu5kcm/sportradar-odds-comparison-player-props-v2
   ```

2. **Click "Fork" button**

3. **Select your workspace:** Choose "Statpedia" workspace

4. **Name it:** "SportsRadar Odds Player Props v2 (Forked)"

5. **Click "Fork Collection"**

## Step 2: Import Our Comprehensive Collection

1. **Open your Postman workspace:**
   ```
   https://lifesplugg-9889449.postman.co/workspace/Statpedia~4f4e954c-f368-4c54-b419-e3b4206b3f36
   ```

2. **Click "Import"** button

3. **Upload `comprehensive-postman-collection.json`**

4. **Click "Import"**

## Step 3: Set Up Environment Variables

1. **Click "Environments"** in the left sidebar

2. **Click "Create Environment"**

3. **Name:** "Statpedia Development"

4. **Add these variables:**
   ```
   base_url: https://api.sportradar.com
   sportsradar_api_key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D
   sportsgameodds_api_key: your_sportsgameodds_api_key_here
   current_year: 2025
   current_date: 2025-01-05
   dev_server_url: http://localhost:8084
   ```

5. **Save** and **Set as Active**

## Step 4: Test the Collections

### 4.1 Test SportsRadar Core APIs (Should work - 200 status)

1. **NFL Schedule 2025** - Should return 18 weeks of games
2. **NBA Schedule 2025** - Should return games data
3. **MLB Schedule 2025** - Should return games data
4. **NHL Schedule 2025** - Should return games data

### 4.2 Test SportsRadar Odds APIs (May not work - 403/502 status)

1. **Books (Bookmakers)** - May return 403 (Authentication Error)
2. **NFL Player Props** - May return 502 (Bad Gateway)
3. **NBA Player Props** - May return 502 (Bad Gateway)
4. **Daily Schedules** - May return 403/502

### 4.3 Test Our Backend APIs (Need dev server running)

1. **Health Check** - Should return 200 (if dev server is running)
2. **Get Player Props (NFL)** - Should return player props data
3. **Get Player Props (NBA)** - Should return player props data
4. **Test SportsRadar Backend** - Should return backend status

## Step 5: Set Up Automated Tests

### 5.1 Add Tests to Working Endpoints

For each working endpoint, add this test script:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.not.be.null;
});

pm.test("Response time is less than 5000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});
```

### 5.2 Add Tests for Player Props Endpoints

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has player props", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
    pm.expect(jsonData.length).to.be.greaterThan(0);
});

pm.test("Player props have required fields", function () {
    const jsonData = pm.response.json();
    if (jsonData.length > 0) {
        const prop = jsonData[0];
        pm.expect(prop).to.have.property('playerName');
        pm.expect(prop).to.have.property('propType');
        pm.expect(prop).to.have.property('line');
        pm.expect(prop).to.have.property('overOdds');
        pm.expect(prop).to.have.property('underOdds');
    }
});
```

## Step 6: Set Up Collection Runner

1. **Click on "Statpedia Complete API Collection"**

2. **Click "Run"** button

3. **Select which requests to run:**
   - ✅ SportsRadar Core APIs (all)
   - ⚠️ SportsRadar Odds APIs (test but expect some failures)
   - 🔧 Statpedia Backend APIs (if dev server is running)

4. **Click "Run Statpedia Complete API Collection"**

5. **Review results** and note which endpoints are working

## Step 7: Set Up Monitors (Optional)

1. **Click "Monitors"** in the left sidebar

2. **Click "Create Monitor"**

3. **Name:** "Statpedia API Health Check"

4. **Select Collection:** "Statpedia Complete API Collection"

5. **Frequency:** Every 5 minutes

6. **Environment:** "Statpedia Development"

7. **Click "Create Monitor"**

## Expected Results

### ✅ Working Endpoints (200 status):
- NFL Schedule 2025
- NBA Schedule 2025
- MLB Schedule 2025
- NHL Schedule 2025
- Our Backend APIs (when dev server is running)

### ⚠️ Endpoints Requiring Different Permissions:
- Books (Bookmakers)
- Player Props
- Daily Schedules

### 🔧 Backend Endpoints:
- Health Check
- Get Player Props (all sports)
- Test SportsRadar Backend
- Get API Usage Stats

## Troubleshooting

### If SportsRadar APIs return 403:
- The API key may have expired
- Check if you need different permissions
- Verify the endpoint URLs are correct

### If Backend APIs return 404:
- Make sure the dev server is running on port 8084
- Check if the API endpoints are implemented
- Verify the URL structure

### If Collection Import fails:
- Make sure the JSON file is valid
- Try importing individual requests instead
- Check Postman version compatibility

## Next Steps

1. **Use the working endpoints** in our backend code
2. **Set up automated testing** for continuous integration
3. **Monitor API health** with Postman monitors
4. **Share collections** with your team
5. **Document working endpoints** for future reference

This setup will give you a comprehensive testing environment for all our APIs! 🚀
