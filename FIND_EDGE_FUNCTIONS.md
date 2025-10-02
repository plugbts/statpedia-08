# 🔍 How to Find Edge Functions in Supabase Dashboard

## The "Invalid Path" Error

This happens when:
1. **Edge Functions aren't enabled** on your project
2. **Wrong URL format**
3. **Navigation path changed** in Supabase dashboard

## 🎯 Multiple Ways to Access Edge Functions

### Method 1: Direct Dashboard Navigation
1. **Go to your main project dashboard:** https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn
2. **Look in the left sidebar** for one of these:
   - "Edge Functions"
   - "Functions" 
   - "Serverless Functions"
   - Under "Build" section → "Functions"

### Method 2: Alternative URLs to Try
Try these URLs one by one:
- https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/functions
- https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/edge-functions
- https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/serverless

### Method 3: Main Dashboard → Navigate
1. **Go to:** https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn
2. **Look for these sections in sidebar:**
   ```
   📊 Overview
   🔧 Table Editor  
   🔐 Authentication
   📝 Edge Functions  ← Look for this
   💾 Storage
   📈 Analytics
   ⚙️ Settings
   ```

## 🚨 If Edge Functions Aren't Available

### Check Your Supabase Plan
Edge Functions might require:
- **Pro plan** or higher
- **Enabled feature** in project settings

### Alternative: Use Supabase CLI
If dashboard doesn't work, we can deploy via CLI:

```bash
# Try CLI deployment instead
supabase functions deploy sportsgameodds-api
supabase functions deploy background-poller  
supabase functions deploy api-analytics
```

## 🎯 What to Look For

### ✅ Correct Edge Functions Page
You should see:
- **"Create function"** or **"New function"** button
- **List of existing functions** (if any)
- **TypeScript/Deno** code editor
- **Deploy** buttons

### ❌ Wrong Database Functions Page  
You'll see:
- **"Create function"** with **language dropdown** (plpgsql)
- **Return type** selection (void, bool, etc.)
- **SQL-style** function creation

## 🔧 Troubleshooting Steps

### Step 1: Check Project Access
Make sure you're logged into the correct Supabase account and have access to project `rfdrifnsfobqlzorcesn`.

### Step 2: Check Project Plan
Go to: https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/settings/billing
- Verify your plan supports Edge Functions

### Step 3: Enable Edge Functions
Go to: https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn/settings/api
- Look for Edge Functions settings

## 🎯 Alternative Deployment Methods

### Option 1: CLI Deployment (Recommended)
If dashboard doesn't work:
```bash
# Navigate to project
cd "/Users/jackie/Statpedia Main/statpedia-08"

# Deploy functions via CLI
supabase functions deploy sportsgameodds-api --no-verify-jwt
supabase functions deploy background-poller --no-verify-jwt
supabase functions deploy api-analytics --no-verify-jwt
```

### Option 2: Manual Function Creation
If you find the Edge Functions section:
1. **Create new function**
2. **Name:** `sportsgameodds-api`
3. **Paste code** from `supabase/functions/sportsgameodds-api/index.ts`
4. **Deploy**

## 📋 Next Steps

1. **Try the alternative URLs** above
2. **Check your project dashboard** navigation
3. **Verify Edge Functions are available** on your plan
4. **Use CLI deployment** as backup method

## 🎯 Success Indicators

Once you find the right section, you should be able to:
- ✅ Create functions with TypeScript code
- ✅ See import statements work
- ✅ Deploy without plpgsql errors
- ✅ Access functions at URLs like: `https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/sportsgameodds-api`
