# 🌐 Setting Up Cloudflare Workers with Your Lovable Domain

## Option 1: Subdomain Approach (Easiest)

If your Lovable domain is something like `statpedia.lovable.app`, you can set up:

```
api.statpedia.lovable.app -> Cloudflare Worker
```

### Steps:
1. **Add your domain to Cloudflare**
   - Go to Cloudflare Dashboard
   - Add your Lovable domain as a site
   - Update nameservers in your domain registrar

2. **Configure the worker route**
   ```toml
   # In wrangler.toml
   routes = [
     { pattern = "api.statpedia.lovable.app/*", zone_name = "statpedia.lovable.app" }
   ]
   ```

3. **Deploy**
   ```bash
   wrangler deploy --env production
   ```

## Option 2: Path-based Approach

Use your existing domain with a specific path:

```
statpedia.lovable.app/api/player-props -> Cloudflare Worker
```

### Steps:
1. **Set up route matching**
   ```toml
   # In wrangler.toml
   routes = [
     { pattern = "statpedia.lovable.app/api/*", zone_name = "statpedia.lovable.app" }
   ]
   ```

## Option 3: Proxy Through Your Frontend (Simplest)

Keep using workers.dev for now and proxy through your Lovable frontend:

### Frontend Proxy Setup:
```typescript
// In your Lovable frontend
const API_BASE_URL = 'https://statpedia-player-props.lifesplugg.workers.dev';

// Your frontend handles the API calls
const response = await fetch(`${API_BASE_URL}/api/player-props?sport=nfl`);
```

## Recommendation: Start with workers.dev

For immediate testing, I recommend:

1. **Register the workers.dev subdomain** (takes 2 minutes)
2. **Test the worker** with the URL
3. **Update your frontend** to use the worker URL
4. **Later, set up custom domain** if needed

This gets you working immediately without domain configuration complexity!
