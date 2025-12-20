# 🚀 Supabase Migration Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: statpedia (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start

4. Wait for project to be created (2-3 minutes)

## Step 2: Get Connection Strings

Once your project is ready:

1. Go to **Settings** → **Database**
2. Find **Connection string** section
3. Copy the **URI** connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

4. Go to **Settings** → **API**
5. Copy:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)
   - **service_role key**: `eyJhbGc...` (long string, keep secret!)

## Step 3: Update Environment Variables

Add to `.env.local`:

```env
# Supabase Database Connection
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase API
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGc... (anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service_role key)

# Keep Neon for now (during migration)
NEON_DATABASE_URL=postgresql://... (your existing Neon URL)
```

## Step 4: Test Connection

```bash
tsx scripts/setup-supabase-connection.ts
```

This will:
- Test the database connection
- Check required extensions
- Show existing tables (if any)

## Step 5: Migrate Schema and Data

```bash
tsx scripts/migrate-to-supabase.ts
```

This will:
- Export schema from Neon
- Apply schema to Supabase
- Migrate all data
- Verify data integrity

## Step 6: Update Code

The following files have been updated to support Supabase:
- ✅ `src/db/index.ts` - Database connection
- ✅ `drizzle.config.ts` - Drizzle config

They now support both Neon and Supabase (priority: Supabase > Neon).

## Step 7: Enable Required Extensions

In Supabase SQL Editor, run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable crypto extension (for auth)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable trigram extension (for search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

## Step 8: Set Up Supabase Auth (Optional)

If migrating auth to Supabase:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)
4. Update auth service code

## Step 9: Test Everything

```bash
# Test database connection
tsx scripts/setup-supabase-connection.ts

# Test API server
npm run dev:full

# Test a query
curl http://localhost:3001/api/props-list?limit=5
```

## Migration Checklist

- [ ] Supabase project created
- [ ] Connection strings added to `.env.local`
- [ ] Connection tested
- [ ] Schema migrated
- [ ] Data migrated
- [ ] Data verified
- [ ] Code updated
- [ ] API server tested
- [ ] Frontend tested

## Rollback Plan

If something goes wrong:

1. Keep `NEON_DATABASE_URL` in `.env.local`
2. Remove `SUPABASE_DATABASE_URL` temporarily
3. Code will automatically fall back to Neon
4. Fix issues and try again

## Next Steps After Migration

1. **Update Hasura** (if using):
   - Point Hasura to Supabase database
   - Update connection string in Hasura config

2. **Migrate Auth** (if desired):
   - Set up Supabase Auth
   - Migrate user accounts
   - Update frontend auth hooks

3. **Set up Edge Functions** (optional):
   - Move Cloudflare Workers to Supabase Edge Functions
   - Update API endpoints

4. **Monitor**:
   - Check Supabase dashboard for usage
   - Monitor API response times
   - Verify data integrity

## Support

If you encounter issues:

1. Check Supabase dashboard logs
2. Verify connection strings
3. Check IP whitelist in Supabase settings
4. Review migration script output

