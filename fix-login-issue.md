# Login Issue Fix

## Problem
The login is failing because the `profiles` table doesn't exist in the database. The authentication process tries to fetch user profile data after successful login, but the table is missing.

## Solution
The auth page has been updated to handle the missing profiles table gracefully. However, to fully fix the issue, the profiles table needs to be created.

## Manual Fix (Run in Supabase SQL Editor)

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

## Alternative: Use Supabase Dashboard
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run the above SQL script
4. Test login again

## Current Status
- Auth page updated to handle missing profiles table
- Login should work with default 'free' subscription
- Full functionality requires profiles table creation
