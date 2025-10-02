# 🔧 Table Editor Solution - Avoid SQL JSON Errors

## 🚨 The Problem
The SQL keeps failing with JSON parsing errors, which means there's likely:
- An existing `api_config` table with different structure
- Or a trigger/function expecting JSON data
- Or RLS policies causing conflicts

## 🎯 Solution: Use Supabase Table Editor Instead

### **Step 1: Access Table Editor**
1. **Go to**: [Supabase Dashboard](https://supabase.com/dashboard)
2. **Select your project**
3. **Click "Table Editor"** (in left sidebar)

### **Step 2: Check if api_config table exists**
- **Look for** `api_config` in the table list
- **If it exists**: Click on it to see its structure
- **If it doesn't exist**: We'll create it

### **Step 3A: If api_config table EXISTS**
1. **Click on the `api_config` table**
2. **Look for a row** with key = `sportsgameodds_api_key`
3. **If row exists**: Click "Edit" and change the `value` to: `d5dc1f00bc42133550bc1605dd8f457f`
4. **If row doesn't exist**: Click "Insert" → "Insert row"
   - **key**: `sportsgameodds_api_key`
   - **value**: `d5dc1f00bc42133550bc1605dd8f457f`
   - **description**: `API key for SportGameOdds service`

### **Step 3B: If api_config table DOESN'T EXIST**
1. **Click "Create a new table"**
2. **Table name**: `api_config`
3. **Add columns**:
   - `id` (int8, primary key, auto-increment) ✅ Already added
   - `key` (text, unique, not null)
   - `value` (text, nullable)
   - `description` (text, nullable)
   - `created_at` (timestamptz, default: now())
   - `updated_at` (timestamptz, default: now())
4. **Click "Save"**
5. **Then insert the row** as described in Step 3A

### **Step 4: Verify the Fix**
After adding the API key row, test immediately:

```bash
curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/sportsgameodds-api?endpoint=player-props&sport=nfl" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI"
```

## 🔍 Alternative: Debug First
If you want to understand what's causing the JSON error, run `debug-database-issue.sql` in the SQL Editor first to see the existing table structure.

## 🎯 Why This Works
- **No SQL parsing issues** - using GUI instead
- **Visual confirmation** - you can see exactly what's being created/modified
- **Immediate feedback** - any errors are shown in the interface
- **Safer approach** - less likely to conflict with existing structures

## ✅ Success Indicators
After using the Table Editor approach:
1. **api_config table exists** with the API key row
2. **API test returns real data** instead of "Missing API key" error
3. **Player Props tab loads** in the frontend
4. **Admin dashboard works** for owner role

**This GUI approach completely avoids the SQL JSON parsing issues!**
