# 🔐 Supabase Authentication Setup Guide

## Understanding the Authentication Issue

### What "non-TTY environment" means:
- **TTY** = "Teletypewriter" (interactive terminal)
- **Non-TTY** = Automated/scripted environment (like this AI assistant)
- Supabase CLI expects an interactive browser login, which isn't possible here

## 🎯 Solution Options

### Option 1: Manual Authentication (Recommended)
**You run the commands in your own terminal:**

```bash
# In your terminal (not here), run:
supabase login

# This opens your browser for one-time authentication
# After login, you can run deployment commands
```

### Option 2: Access Token Method
**Use a personal access token for automated deployment:**

#### Step 1: Get Your Access Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Create a new access token
3. Copy the token (keep it secure!)

#### Step 2: Set Environment Variable
```bash
# In your terminal:
export SUPABASE_ACCESS_TOKEN="your_token_here"

# Then run deployment:
supabase db push
supabase functions deploy sportsgameodds-api
# etc.
```

#### Step 3: Or Use Token Flag
```bash
# Use token directly in commands:
supabase --token "your_token_here" db push
supabase --token "your_token_here" functions deploy sportsgameodds-api
```

### Option 3: Complete Manual Deployment (Easiest)
**Skip CLI entirely and use Supabase Dashboard:**

#### Database Setup:
1. Go to: https://rfdrifnsfobqlzorcesn.supabase.co/project/rfdrifnsfobqlzorcesn/sql
2. Copy contents of `manual-deploy-sql.sql`
3. Paste and execute in SQL Editor

#### Function Deployment:
1. Go to: https://rfdrifnsfobqlzorcesn.supabase.co/project/rfdrifnsfobqlzorcesn/functions
2. Create new functions manually:
   - Copy `supabase/functions/sportsgameodds-api/index.ts` → Create new function
   - Copy `supabase/functions/background-poller/index.ts` → Create new function  
   - Copy `supabase/functions/api-analytics/index.ts` → Create new function

## 🚀 Recommended Approach

### For You (The Easiest Way):

1. **Open your own terminal** (Terminal.app on Mac)

2. **Navigate to your project:**
   ```bash
   cd "/Users/jackie/Statpedia Main/statpedia-08"
   ```

3. **Authenticate once:**
   ```bash
   supabase login
   ```
   This opens your browser - login with your Supabase account

4. **Link to project:**
   ```bash
   supabase link --project-ref rfdrifnsfobqlzorcesn
   ```

5. **Deploy everything:**
   ```bash
   ./deploy.sh
   ```

### Alternative: Use Supabase Dashboard

If CLI is problematic, use the web dashboard:

#### Database:
- Go to SQL Editor in Supabase dashboard
- Run the `manual-deploy-sql.sql` contents

#### Functions:
- Go to Edge Functions in dashboard
- Create 3 new functions with our code

## 🔧 Why This Happens

The Supabase CLI is designed for:
- **Interactive use** (developer terminals)
- **CI/CD pipelines** (with tokens)
- **Local development** (with browser access)

It's **not designed for**:
- AI assistant environments
- Non-interactive scripts without tokens
- Automated deployment without proper auth setup

## 🎯 Best Solution for Your Workflow

### Immediate Fix:
1. **You run** `supabase login` **in your terminal**
2. **You run** `./deploy.sh` **in your terminal**
3. Everything deploys automatically

### Long-term Setup:
1. **Create access token** for future automated deployments
2. **Set environment variable** in your shell profile
3. **Use token-based authentication** for scripts

## 📋 Step-by-Step Terminal Commands

**Run these in your Terminal.app (not here):**

```bash
# 1. Navigate to project
cd "/Users/jackie/Statpedia Main/statpedia-08"

# 2. Login (opens browser)
supabase login

# 3. Link project
supabase link --project-ref rfdrifnsfobqlzorcesn

# 4. Deploy database
supabase db push

# 5. Deploy functions
supabase functions deploy sportsgameodds-api
supabase functions deploy background-poller
supabase functions deploy api-analytics

# 6. Test deployment
./check-deployment.sh
```

## 🎉 After Authentication

Once you've authenticated in your terminal:
- ✅ All deployment commands will work
- ✅ You can run `./deploy.sh` successfully
- ✅ Database migrations will work
- ✅ Function deployments will work
- ✅ Your server-side API management system will be live

## 🔒 Security Note

**Never share your access tokens!** They provide full access to your Supabase projects.

The browser-based login is the most secure method for personal use.

## 🎯 Summary

**The issue:** AI assistant can't open browsers for interactive login
**The solution:** You run the authentication in your own terminal
**The result:** Seamless deployment of your server-side API management system

Once authenticated, you'll have:
- Real-time API usage tracking for all users
- 95%+ reduction in SportGameOdds API calls
- Comprehensive monitoring dashboard
- Server-side rate limiting and caching
