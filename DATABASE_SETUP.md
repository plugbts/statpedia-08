# Database Setup Instructions

## Fixing "could not find table public.posts" Error

This error occurs when the database tables haven't been created yet. Follow these steps to fix it:

### Option 1: Apply Migrations via Supabase Dashboard

1. **Go to your Supabase project dashboard**
   - Visit: https://supabase.com/dashboard/project/rfdrifnsfobqlzorcesn
   - Navigate to the "SQL Editor" tab

2. **Apply the schema fix migration**
   - Copy the contents of `supabase/migrations/20250101000014_fix_schema_cache.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

3. **Verify tables are created**
   - Go to the "Table Editor" tab
   - You should see tables: `posts`, `user_profiles`, `comments`, `votes`, `friends`, etc.

### Option 2: Apply Migrations via CLI (if you have Supabase CLI)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref rfdrifnsfobqlzorcesn

# Apply migrations
supabase db push
```

### Option 3: Manual Table Creation

If the above methods don't work, you can manually create the essential tables:

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL to create the basic tables:

```sql
-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 150),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  karma INTEGER DEFAULT 0,
  roi_percentage NUMERIC(5, 2) DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view all posts" ON posts FOR SELECT USING (is_deleted = false);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
```

### Verification

After applying the migrations, test your application:

1. **Check the browser console** - the error should be gone
2. **Try creating a post** - it should work without errors
3. **Check the Supabase logs** - no more table not found errors

### Troubleshooting

If you're still getting errors:

1. **Check RLS policies** - Make sure Row Level Security is properly configured
2. **Verify API keys** - Ensure your Supabase URL and keys are correct
3. **Check network** - Make sure you can reach the Supabase API
4. **Clear browser cache** - Sometimes cached errors persist

### Need Help?

If you continue to have issues:

1. Check the Supabase project logs in the dashboard
2. Verify your environment variables are set correctly
3. Make sure your Supabase project is active and not paused
4. Contact Supabase support if the project seems to have issues

## Environment Variables

Make sure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=https://rfdrifnsfobqlzorcesn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

The anon key should be the same as the one in `src/integrations/supabase/client.ts`.
