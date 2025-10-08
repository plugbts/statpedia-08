# 🔍 Cloudflare Worker Debugging Action Plan

## ✅ Completed Steps

### 1. **Environment Variables Verification**
- ✅ Confirmed Worker uses `SUPABASE_SERVICE_KEY` (service role key)
- ✅ Service role key has full read/write permissions and bypasses RLS
- ✅ Added environment variable debugging endpoint: `/debug-env`

### 2. **Enhanced Error Logging**
- ✅ Enhanced `supabaseFetch.ts` with detailed error logging
- ✅ Enhanced `insertProps.ts` with comprehensive error details
- ✅ Created `enhancedInsertProps.ts` with validation and debugging
- ✅ Added sample data logging for failed inserts

### 3. **Table Schema Verification**
- ✅ Verified `proplines` table schema matches insert data structure
- ✅ Verified `player_game_logs` table schema matches insert data structure
- ✅ Confirmed required fields: `player_id`, `player_name`, `team`, `opponent`, `prop_type`, `line`, `over_odds`, `under_odds`, `sportsbook`, `league`, `season`, `date`, `game_id`, `conflict_key`

### 4. **RLS Policies Fix**
- ✅ Identified conflicting RLS policies that require `auth.role() = 'authenticated'`
- ✅ Created `fix-rls-policies-for-worker.sql` to fix permissions
- ✅ Added RLS debugging endpoint: `/debug-rls`

### 5. **Batch Insert Optimization**
- ✅ Reduced batch size from 500 to 250 for better error isolation
- ✅ Added comprehensive error handling that continues processing other batches
- ✅ Enhanced validation before insertion
- ✅ Added detailed logging for each batch operation

## 🚀 New Debugging Endpoints

### `/debug-env` - Environment Variables Check
```bash
curl https://your-worker-url.workers.dev/debug-env
```
**Checks:**
- SUPABASE_URL presence and format
- SUPABASE_SERVICE_KEY presence and role verification
- SPORTSGAMEODDS_API_KEY presence
- Service key role verification

### `/debug-rls` - RLS Permissions Test
```bash
curl https://your-worker-url.workers.dev/debug-rls
```
**Tests:**
- Read access to proplines table
- Read access to player_game_logs table
- Insert capability with automatic cleanup

### `/debug-insertion` - Enhanced Insertion Test
```bash
curl https://your-worker-url.workers.dev/debug-insertion
```
**Features:**
- Tests enhanced insertion function
- Validates data structure before insertion
- Provides detailed error reporting
- Uses smaller batch sizes for better error isolation

## 🔧 Action Steps

### Step 1: Apply RLS Policy Fix
```bash
# Run the RLS policy fix
psql -h your-supabase-host -U postgres -d postgres -f fix-rls-policies-for-worker.sql
```

### Step 2: Test Environment Variables
```bash
curl https://your-worker-url.workers.dev/debug-env
```
**Expected Result:** All checks should show ✅

### Step 3: Test RLS Permissions
```bash
curl https://your-worker-url.workers.dev/debug-rls
```
**Expected Result:** All tests should show ✅ Success

### Step 4: Test Enhanced Insertion
```bash
curl https://your-worker-url.workers.dev/debug-insertion
```
**Expected Result:** Should show successful insertion with detailed logging

### Step 5: Test Real Ingestion
```bash
curl -X POST https://your-worker-url.workers.dev/ingest
```
**Expected Result:** Should show detailed logging of insertions with error details if any

## 🔍 Error Diagnosis Guide

### If `/debug-env` shows issues:
- ❌ **SUPABASE_SERVICE_KEY Missing**: Check wrangler.toml and environment variables
- ❌ **SERVICE_KEY_ROLE**: Ensure the key contains 'service_role' in the JWT payload

### If `/debug-rls` shows issues:
- ❌ **Read Failed**: Check if tables exist and RLS policies are correct
- ❌ **Insert Failed**: Run the RLS policy fix SQL script

### If `/debug-insertion` shows issues:
- ❌ **Validation Failed**: Check data structure matches schema exactly
- ❌ **Insert Failed**: Check RLS policies and database permissions

### Common Error Messages:

#### "Supabase POST proplines failed: 403 Forbidden"
- **Cause**: RLS policy blocking service role
- **Fix**: Apply `fix-rls-policies-for-worker.sql`

#### "Supabase POST proplines failed: 400 Bad Request"
- **Cause**: Data structure mismatch or missing required fields
- **Fix**: Check the sample data in error logs and verify schema

#### "Supabase POST proplines failed: 500 Internal Server Error"
- **Cause**: Database constraint violation or server error
- **Fix**: Check unique constraints and conflict_key format

## 📊 Enhanced Logging Features

### Before Insertion:
- ✅ Data validation with detailed error messages
- ✅ Sample data logging for debugging
- ✅ Batch size optimization (250 records per batch)

### During Insertion:
- ✅ Per-batch logging with success/failure status
- ✅ Detailed error information including sample data
- ✅ Response analysis (empty response = success)

### After Insertion:
- ✅ Summary statistics
- ✅ Error details with batch information
- ✅ Sample data from failed batches

## 🎯 Expected Improvements

1. **Better Error Visibility**: Every insert operation now logs detailed error information
2. **Faster Debugging**: New endpoints allow quick diagnosis of common issues
3. **Improved Reliability**: Smaller batch sizes and better error handling
4. **Data Validation**: Pre-insertion validation prevents malformed data
5. **RLS Compatibility**: Fixed policies ensure service role can insert data

## 🔄 Next Steps

1. **Deploy the updated Worker** with enhanced debugging
2. **Apply the RLS policy fix** to your Supabase database
3. **Test each debugging endpoint** to verify functionality
4. **Run a real ingestion** and monitor the enhanced logging
5. **Use the error details** to fix any remaining data structure issues

The Worker now provides comprehensive debugging capabilities that should help identify and resolve any silent insertion failures.
