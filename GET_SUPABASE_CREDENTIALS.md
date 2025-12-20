# 🔑 How to Get Supabase Credentials

## Step 1: Get Database Connection String

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) in the left sidebar
3. Click **Database** in the settings menu
4. Scroll down to **Connection string** section
5. Click the **URI** tab
6. Copy the connection string (it looks like):
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   
   **OR** the direct connection:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

7. Replace `[YOUR-PASSWORD]` with your actual database password (the one you set when creating the project)

## Step 2: Get API Keys

1. Still in **Settings**, click **API** in the settings menu
2. You'll see:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon public** key: `eyJhbGc...` (long string starting with eyJ)
   - **service_role** key: `eyJhbGc...` (long string, keep this secret!)

3. Copy all three values

## Step 3: Add to .env.local

Add these lines to your `.env.local` file:

```env
# Supabase Database Connection
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase API
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (your service_role key)
```

**Important**: 
- Replace `[YOUR-PASSWORD]` with your actual database password
- Replace `[PROJECT-REF]` with your actual project reference (found in the URL)
- Keep the service_role key secret - never commit it to git!

## Quick Reference

Your Supabase project URL looks like:
- Dashboard: `https://supabase.com/dashboard/project/[PROJECT-REF]`
- API URL: `https://[PROJECT-REF].supabase.co`

The PROJECT-REF is the unique identifier for your project (usually 20 characters).

