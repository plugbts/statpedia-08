# Postman Collection - cURL Commands

Copy these cURL commands into Postman to quickly create the collection:

## SportsRadar Core APIs

### 1. NFL Schedule 2025
```bash
curl --request GET \
  --url 'https://api.sportradar.com/nfl/official/trial/v7/en/games/2025/REG/schedule.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

### 2. NBA Schedule 2025
```bash
curl --request GET \
  --url 'https://api.sportradar.com/nba/trial/v7/en/games/2025/REG/schedule.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

### 3. MLB Schedule 2025
```bash
curl --request GET \
  --url 'https://api.sportradar.com/mlb/trial/v7/en/games/2025/REG/schedule.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

### 4. NHL Schedule 2025
```bash
curl --request GET \
  --url 'https://api.sportradar.com/nhl/trial/v7/en/games/2025/REG/schedule.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

## SportsRadar Odds APIs

### 5. Books (Bookmakers)
```bash
curl --request GET \
  --url 'https://api.sportradar.com/oddscomparison/v1/en/books.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

### 6. NFL Player Props
```bash
curl --request GET \
  --url 'https://api.sportradar.com/oddscomparison/v1/en/sports/1/player_props.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

### 7. NBA Player Props
```bash
curl --request GET \
  --url 'https://api.sportradar.com/oddscomparison/v1/en/sports/2/player_props.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

### 8. Daily Schedules
```bash
curl --request GET \
  --url 'https://api.sportradar.com/oddscomparison/v1/en/schedules/2025-01-05.json' \
  --header 'accept: application/json' \
  --header 'x-api-key: onLEN0JXRxK7h3OmgCSPOnbkgVvodnrIx1lD4M4D'
```

## Statpedia Backend APIs

### 9. Get Player Props (NFL)
```bash
curl --request GET \
  --url 'http://localhost:8083/api/player-props?sport=nfl' \
  --header 'accept: application/json'
```

### 10. Get Player Props (NBA)
```bash
curl --request GET \
  --url 'http://localhost:8083/api/player-props?sport=nba' \
  --header 'accept: application/json'
```

## How to Use These in Postman

1. **Open Postman**
2. **Click "Import"** button
3. **Select "Raw text"** tab
4. **Copy and paste** any of the cURL commands above
5. **Click "Continue"** and then "Import"
6. **Repeat** for each command you want to add

## Quick Setup Steps

1. **Create Collection**: "Statpedia Sports APIs"
2. **Create Folders**: 
   - "SportsRadar Core APIs"
   - "SportsRadar Odds APIs"
   - "Statpedia Backend APIs"
3. **Import cURL commands** into appropriate folders
4. **Test the requests** to see which ones work

## Expected Results

### ✅ Should Work (200 status):
- NFL Schedule 2025
- NBA Schedule 2025
- MLB Schedule 2025
- NHL Schedule 2025

### ⚠️ May Not Work (403/502 status):
- Books (Bookmakers)
- NFL Player Props
- NBA Player Props
- Daily Schedules

### 🔧 Need Dev Server Running:
- Get Player Props (NFL)
- Get Player Props (NBA)

This approach will definitely work in Postman!
