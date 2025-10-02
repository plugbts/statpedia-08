# 🔧 How to Access Supabase SQL Editor

## 🚨 "Invalid Path" Error Fix

The direct URL might not work. Here are the correct ways to access the SQL Editor:

### Method 1: Navigate Through Dashboard (Recommended)

1. **Go to main dashboard:** https://supabase.com/dashboard
2. **Find your project:** Look for "statpedia-08" or project ID `rfdrifnsfobqlzorcesn`
3. **Click on your project**
4. **In the left sidebar, look for:**
   - "SQL Editor" 
   - "Database" → "SQL Editor"
   - "Tools" → "SQL Editor"

### Method 2: Alternative URLs to Try

Try these URLs one by one:
- https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/sql
- https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/sql/new
- https://app.supabase.com/project/rfdrifnsfobqlzorcesn/sql
- https://app.supabase.com/project/rfdrifnsfobqlzorcesn/sql/new

### Method 3: Use Table Editor Instead

If SQL Editor isn't accessible, you can use the Table Editor:

1. **Go to:** https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/editor
2. **Look for existing tables** like `api_config`
3. **If `api_config` table exists:**
   - Click on it
   - Add a new row with:
     - key: `sportsgameodds_api_key`
     - value: `"d5dc1f00bc42133550bc1605dd8f457f"`
     - description: `SportGameOdds API key`

## 🎯 Alternative: Use Terminal/CLI Method

If dashboard access is problematic, we can use the CLI:

```bash
# Connect to your database directly
supabase db reset --linked

# Then run the manual SQL
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f manual-deploy-sql.sql
```

## 🔍 Check What Tables Exist

First, let's see what's already in your database. Try this simpler approach:

### Step 1: Check Current Tables
Go to: https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/editor

Look for these tables:
- `api_config`
- `api_cache` 
- `api_usage_logs`
- `api_rate_limits`

### Step 2: If Tables Don't Exist
We need to create them manually through the Table Editor or find another way to run SQL.

## 🚀 Simplified Manual Fix

If you can access the Table Editor but not SQL Editor:

### Create `api_config` Table:
1. **Go to Table Editor**
2. **Create New Table** named `api_config`
3. **Add columns:**
   - `id` (uuid, primary key, default: gen_random_uuid())
   - `key` (text, unique)
   - `value` (jsonb)
   - `description` (text)
   - `updated_at` (timestamptz, default: now())

### Add API Key Row:
1. **Insert new row:**
   - key: `sportsgameodds_api_key`
   - value: `"d5dc1f00bc42133550bc1605dd8f457f"`
   - description: `SportGameOdds API key`

## 🎯 Quick Test

After creating the config, test if it works:

```bash
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/sportsgameodds-api?endpoint=player-props&sport=nfl" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc2NjI5MjQsImV4cCI6MjA0MzIzODkyNH0.Wd-Zt0QFJVIWBVTmhHWPGOhHNJzrNpRhPKjdTZFRhWE" \
  -H "Authorization: Bearer [your-user-token]"
```

## 📋 Navigation Path Summary

**Correct path:** Dashboard → Your Project → SQL Editor (or Table Editor)

**Not:** Direct URL (which might be blocked or changed)

Try the dashboard navigation method first - it's the most reliable way to access the SQL Editor.
