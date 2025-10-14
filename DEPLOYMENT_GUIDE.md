# 🚀 StatPedia Deployment Guide

This guide covers deploying your StatPedia application with the new authentication system and analytics features.

## 📋 Prerequisites

✅ **Code committed to git** (completed)  
✅ **Application builds successfully** (verified)  
✅ **Authentication system working** (verified)  
✅ **Analytics system integrated** (verified)  

## 🎯 Deployment Options

### Option 1: Vercel (Recommended)
- **Best for**: Vite React apps with serverless functions
- **Benefits**: Zero-config, global CDN, automatic HTTPS
- **Setup**: ~5 minutes

### Option 2: Netlify
- **Best for**: Static sites with serverless functions
- **Benefits**: Great DX, form handling, edge functions
- **Setup**: ~5 minutes

### Option 3: Render
- **Best for**: Full-stack apps with databases
- **Benefits**: Database hosting, background jobs
- **Setup**: ~10 minutes

---

## 🚀 Quick Deployment (Vercel)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
./deploy-vercel.sh
```

### Step 4: Set Environment Variables
In your Vercel dashboard, add these environment variables:

```
VITE_AUTH_ENDPOINT=https://your-auth-endpoint.com
NEON_DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-super-secret-jwt-key
```

---

## 🚀 Quick Deployment (Netlify)

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify
```bash
netlify login
```

### Step 3: Deploy
```bash
./deploy-netlify.sh
```

### Step 4: Set Environment Variables
In your Netlify dashboard, add these environment variables:

```
VITE_AUTH_ENDPOINT=https://your-auth-endpoint.com
NEON_DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-super-secret-jwt-key
```

---

## 🔧 Manual Deployment Steps

If you prefer manual deployment:

### 1. Build the Application
```bash
npm run build
```

### 2. Deploy Frontend
- Upload the `dist/` folder to your hosting provider
- Configure environment variables
- Set up custom domain (optional)

### 3. Deploy API Server
Your API server (`src/server/api-server.ts`) needs to be deployed separately:

**For Vercel:**
- Vercel automatically detects and deploys serverless functions
- No additional setup needed

**For Netlify:**
- Netlify Functions automatically handle serverless functions
- No additional setup needed

**For other platforms:**
- Deploy as a Node.js application
- Set up environment variables
- Configure reverse proxy if needed

---

## 🌐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AUTH_ENDPOINT` | Auth service endpoint | `https://auth.statpedia.com` |
| `NEON_DATABASE_URL` | Neon database connection | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-key` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3001` |
| `NODE_ENV` | Environment | `production` |

---

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/
```

### 2. Authentication Test
```bash
# Test signup
curl -X POST https://your-app.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test User"}'

# Test login
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Frontend Test
- Visit your deployed URL
- Try signing up with a new account
- Test the player props interface
- Verify analytics are loading

---

## 🔍 Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Loading
- Check variable names match exactly (case-sensitive)
- Restart deployment after adding variables
- Verify variables are set for the correct environment (production/preview)

### API Routes Not Working
- Check if serverless functions are enabled
- Verify function file structure matches platform requirements
- Check function logs in platform dashboard

### Database Connection Issues
- Verify `NEON_DATABASE_URL` is correct
- Check if database allows connections from platform IPs
- Test connection string locally

---

## 📊 Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Authentication flow works (signup/login)
- [ ] Player props data loads correctly
- [ ] Analytics features are functional
- [ ] API endpoints respond correctly
- [ ] Database connections are stable
- [ ] Environment variables are set
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Performance monitoring set up

---

## 🎯 Production Optimizations

### Performance
- Enable gzip compression
- Set up CDN caching
- Optimize images and assets
- Implement code splitting

### Security
- Set up CORS policies
- Implement rate limiting
- Enable security headers
- Set up monitoring/alerting

### Monitoring
- Set up error tracking (Sentry)
- Monitor performance metrics
- Track user analytics
- Set up uptime monitoring

---

## 🚀 Advanced Deployment

### Custom Domain Setup

1. **Add domain in platform dashboard**
2. **Update DNS records:**
   ```
   Type: CNAME
   Name: www
   Value: your-app.vercel.app
   
   Type: A
   Name: @
   Value: 76.76.19.61
   ```
3. **Enable SSL certificate**
4. **Test domain resolution**

### CI/CD Pipeline

For automated deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 🎉 Success!

Your StatPedia application is now deployed with:

✅ **Full authentication system**  
✅ **Player analytics integration**  
✅ **Responsive UI with 3D cards**  
✅ **Real-time data processing**  
✅ **Secure API endpoints**  
✅ **Production-ready infrastructure**  

**Next steps:**
1. Monitor application performance
2. Gather user feedback
3. Iterate on features
4. Scale as needed

---

## 📞 Support

If you encounter issues:

1. **Check platform logs** for error details
2. **Verify environment variables** are set correctly
3. **Test locally** to isolate issues
4. **Check platform documentation** for specific requirements

Your StatPedia application is ready to serve users worldwide! 🌍
