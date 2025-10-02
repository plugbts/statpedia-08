# Manual Postman Collection Setup

Since the JSON import might not be working, here's how to manually create the collection in Postman:

## Step 1: Create New Collection

1. **Open Postman**
2. **Click "Collections"** in the left sidebar
3. **Click "Create Collection"** button
4. **Name**: "Statpedia Sports APIs"
5. **Description**: "Comprehensive collection for Statpedia project APIs"
6. **Click "Create"**

## Step 2: Create Folders

Create these folders in your collection:

### Folder 1: "SportsRadar Core APIs"
### Folder 2: "SportsRadar Odds APIs" 
### Folder 3: "Statpedia Backend APIs"

## Step 3: Add Requests to Each Folder

### SportsRadar Core APIs Folder

#### Request 1: NFL Schedule 2025
- **Method**: GET
- **URL**: `https://api.sportradar.com/nfl/official/trial/v7/en/games/2025/REG/schedule.json`
- **Headers**:
  - `x-api-key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
  - `accept`: `application/json`

#### Request 2: NBA Schedule 2025
- **Method**: GET
- **URL**: `https://api.sportradar.com/nba/trial/v7/en/games/2025/REG/schedule.json`
- **Headers**:
  - `x-api-key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
  - `accept`: `application/json`

#### Request 3: MLB Schedule 2025
- **Method**: GET
- **URL**: `https://api.sportradar.com/mlb/trial/v7/en/games/2025/REG/schedule.json`
- **Headers**:
  - `x-api-key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
  - `accept`: `application/json`

#### Request 4: NHL Schedule 2025
- **Method**: GET
- **URL**: `https://api.sportradar.com/nhl/trial/v7/en/games/2025/REG/schedule.json`
- **Headers**:
  - `x-api-key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
  - `accept`: `application/json`

### SportsRadar Odds APIs Folder

#### Request 1: Books (Bookmakers)
- **Method**: GET
- **URL**: `https://api.sportradar.com/oddscomparison/v1/en/books.json`
- **Headers**:
  - `x-api-key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
  - `accept`: `application/json`

#### Request 2: NFL Player Props
- **Method**: GET
- **URL**: `https://api.sportradar.com/oddscomparison/v1/en/sports/1/player_props.json`
- **Headers**:
  - `x-api-key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
  - `accept`: `application/json`

#### Request 3: NBA Player Props
- **Method**: GET
- **URL**: `https://api.sportradar.com/oddscomparison/v1/en/sports/2/player_props.json`
- **Headers**:
  - `x-api-key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
  - `accept`: `application/json`

### Statpedia Backend APIs Folder

#### Request 1: Get Player Props (NFL)
- **Method**: GET
- **URL**: `http://localhost:8083/api/player-props?sport=nfl`
- **Headers**:
  - `accept`: `application/json`

#### Request 2: Get Player Props (NBA)
- **Method**: GET
- **URL**: `http://localhost:8083/api/player-props?sport=nba`
- **Headers**:
  - `accept`: `application/json`

## Step 4: Test the Requests

### Test SportsRadar Core APIs (Should work - 200 status)
1. **NFL Schedule 2025** - Should return 200 with weeks data
2. **NBA Schedule 2025** - Should return 200 with games data
3. **MLB Schedule 2025** - Should return 200 with games data
4. **NHL Schedule 2025** - Should return 200 with games data

### Test SportsRadar Odds APIs (May not work - 403/502 status)
1. **Books (Bookmakers)** - May return 403 (Authentication Error)
2. **NFL Player Props** - May return 502 (Bad Gateway)
3. **NBA Player Props** - May return 502 (Bad Gateway)

### Test Statpedia Backend APIs (Need dev server running)
1. **Get Player Props (NFL)** - Need to start `npm run dev` first
2. **Get Player Props (NBA)** - Need to start `npm run dev` first

## Step 5: Create Environment Variables (Optional)

1. **Click "Environments"** in left sidebar
2. **Click "Create Environment"**
3. **Name**: "Statpedia Development"
4. **Add Variables**:
   - `base_url`: `https://api.sportradar.com`
   - `api_key`: `onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D`
   - `current_year`: `2025`
5. **Save** and select as active

## Step 6: Fork SportsRadar Collections

### Fork SportsRadar Media APIs
1. Go to: https://www.postman.com/sportradar-media-apis/sportradar-media-apis/overview
2. Click "Fork" button
3. Select your workspace
4. Name: "SportsRadar Media APIs (Forked)"

### Fork SportsRadar Odds Player Props v2
1. Go to: https://www.postman.com/sportradar-media-apis/sportradar-media-apis/collection/8eu5kcm/sportradar-odds-comparison-player-props-v2
2. Click "Fork" button
3. Select your workspace
4. Name: "SportsRadar Odds Player Props v2 (Forked)"

## Expected Results

### ✅ Working (200 status):
- NFL Schedule: 18 weeks of games
- NBA Schedule: 1,206 games
- MLB Schedule: 2,431 games
- NHL Schedule: 1,312 games

### ⚠️ Not Working (403/502 status):
- Books, Player Props, Daily Schedules

This manual setup will give you a working Postman collection to test all our APIs!
