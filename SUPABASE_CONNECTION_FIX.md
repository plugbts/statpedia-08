# 🔧 Supabase Connection String Fix

The connection string format might need to be updated. Supabase offers different connection modes:

## Connection String Formats

### 1. Direct Connection (Port 5432)
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 2. Connection Pooler (Port 6543) - Recommended
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 3. Session Mode Pooler
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true
```

## How to Get the Correct Connection String

1. Go to your Supabase dashboard
2. Settings → Database
3. Scroll to "Connection string"
4. Try the **Connection pooling** tab (recommended for serverless)
5. Copy the URI format

## Current Issue

The connection string might be using the wrong format. The pooler connection is usually more reliable and faster.

## Quick Fix

Update `.env.local` with the pooler connection string from your Supabase dashboard.

