# 🚀 Complete Supabase Migration Plan

## Overview
Migrating the entire StatPedia infrastructure from Neon + Custom Auth + Cloudflare Workers to Supabase.

## Current Architecture
- **Database**: Neon PostgreSQL
- **GraphQL**: Hasura (connected to Neon)
- **Auth**: Custom auth service
- **API**: Express server (local)
- **Workers**: Cloudflare Workers
- **ORM**: Drizzle

## Target Architecture
- **Database**: Supabase PostgreSQL
- **GraphQL**: Supabase PostgREST + GraphQL (or keep Hasura)
- **Auth**: Supabase Auth
- **API**: Express server (connect to Supabase) OR Supabase Edge Functions
- **Storage**: Supabase Storage (if needed)
- **ORM**: Drizzle (compatible with Supabase)

## Migration Steps

### Phase 1: Supabase Setup ✅
1. Create Supabase project (if not exists)
2. Get connection strings
3. Set up environment variables

### Phase 2: Database Migration
1. Export current schema from Neon
2. Create migration scripts
3. Apply schema to Supabase
4. Migrate data from Neon to Supabase
5. Verify data integrity

### Phase 3: Code Updates
1. Update database connection (Drizzle)
2. Update environment variables
3. Update API server connections
4. Update all database queries

### Phase 4: Auth Migration
1. Set up Supabase Auth
2. Migrate user accounts
3. Update auth service
4. Update frontend auth hooks

### Phase 5: Testing & Verification
1. Test database connections
2. Test auth flows
3. Test API endpoints
4. Verify data integrity

## Environment Variables to Update

### Current (Neon):
```env
NEON_DATABASE_URL=postgresql://...
DATABASE_URL=postgresql://...
```

### New (Supabase):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## Files to Update

1. `src/db/index.ts` - Database connection
2. `drizzle.config.ts` - Drizzle config
3. `src/server/api-server.ts` - API server
4. `src/lib/auth/auth-service.ts` - Auth service
5. All scripts using `NEON_DATABASE_URL`
6. `.env.local` - Environment variables

## Migration Scripts Needed

1. `scripts/export-neon-schema.ts` - Export schema
2. `scripts/migrate-to-supabase.ts` - Data migration
3. `scripts/verify-migration.ts` - Verification

## Rollback Plan

- Keep Neon database active during migration
- Run both databases in parallel initially
- Switch traffic gradually
- Keep Neon as backup for 30 days

