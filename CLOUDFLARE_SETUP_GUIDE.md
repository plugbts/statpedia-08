# 🚀 Cloudflare Setup Guide for StatPedia

This guide sets up Cloudflare Workers for authentication, R2 storage, and GraphQL proxy/caching for your StatPedia platform.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Lovable       │    │   Cloudflare     │    │   Hasura        │
│   Frontend      │◄──►│   Workers        │◄──►│   GraphQL       │
│                 │    │                  │    │   (Render)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Cloudflare R2  │
                       │   File Storage   │
                       └──────────────────┘
```

## 🔧 Setup Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Run Setup Script

```bash
cd cloudflare
chmod +x setup-cloudflare.sh
./setup-cloudflare.sh
```

### 4. Manual Setup (Alternative)

If the script doesn't work, set up manually:

#### Create KV Namespace
```bash
wrangler kv:namespace create CACHE
```

#### Create R2 Bucket
```bash
wrangler r2 bucket create statpedia-player-images
```

#### Deploy Workers
```bash
# Deploy authentication worker
wrangler deploy --name statpedia-auth auth-worker.js

# Deploy storage worker
wrangler deploy --name statpedia-storage storage-worker.js

# Deploy proxy worker
wrangler deploy --name statpedia-proxy proxy-worker.js
```

## 🔑 Authentication Worker

**Endpoint**: `https://statpedia-auth.your-subdomain.workers.dev`

### Features:
- ✅ JWT token generation with Hasura claims
- ✅ Supabase integration for user management
- ✅ CORS support
- ✅ Token refresh functionality

### API Endpoints:
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user
- `GET /auth/hasura-token` - Get Hasura-compatible token

### JWT Claims Structure:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "https://hasura.io/jwt/claims": {
    "x-hasura-default-role": "user",
    "x-hasura-allowed-roles": ["user"],
    "x-hasura-user-id": "user-id",
    "x-hasura-email": "user@example.com",
    "x-hasura-display-name": "Display Name"
  }
}
```

## 📁 Storage Worker

**Endpoint**: `https://statpedia-storage.your-subdomain.workers.dev`

### Features:
- ✅ File upload to R2 bucket
- ✅ File download with caching headers
- ✅ Authentication required for uploads/deletes
- ✅ Automatic file URL generation

### API Endpoints:
- `GET /{key}` - Download file
- `POST /{key}` - Upload file
- `DELETE /{key}` - Delete file

### Usage Examples:
```javascript
// Upload player headshot
const response = await fetch('https://storage.statpedia.com/players/123/headshot', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'image/jpeg'
  },
  body: imageFile
});

// Get file URL
const fileUrl = 'https://storage.statpedia.com/players/123/headshot';
```

## 🌐 GraphQL Proxy Worker

**Endpoint**: `https://statpedia-proxy.your-subdomain.workers.dev`

### Features:
- ✅ Intelligent caching for GraphQL queries
- ✅ Rate limiting for mutations
- ✅ JWT validation
- ✅ Cache invalidation on mutations
- ✅ CORS support

### Caching Strategy:
- **Queries (GET)**: Cached for 5 minutes
- **Mutations (POST)**: Not cached, invalidate related cache
- **Rate Limiting**: 100 mutations per minute per IP

### Usage:
```javascript
// Query (cached)
const response = await fetch('https://api.statpedia.com/v1/graphql?query={leagues{id name}}');

// Mutation (not cached)
const response = await fetch('https://api.statpedia.com/v1/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    query: 'mutation { insert_leagues_one(object: {name: "NBA"}) { id } }'
  })
});
```

## 🏷️ DNS Configuration

Set up custom domains in Cloudflare:

### DNS Records:
```
auth.statpedia.com     CNAME    statpedia-auth.your-subdomain.workers.dev
storage.statpedia.com  CNAME    statpedia-storage.your-subdomain.workers.dev
api.statpedia.com      CNAME    statpedia-proxy.your-subdomain.workers.dev
```

### Enable Orange Cloud:
- ✅ Enable proxy (orange cloud) for all domains
- ✅ Configure SSL/TLS settings
- ✅ Set up caching rules

## 📊 Caching Rules

Configure in Cloudflare Dashboard:

### GraphQL API Caching:
- **Path**: `api.statpedia.com/v1/graphql`
- **GET requests**: Cache for 5 minutes
- **POST requests**: Bypass cache
- **Edge Cache TTL**: 5 minutes

### Storage Caching:
- **Path**: `storage.statpedia.com/*`
- **Cache Level**: Cache Everything
- **Edge Cache TTL**: 1 year (for images)

## 🔧 Environment Variables

Update `wrangler.toml` with your values:

```toml
[vars]
JWT_SECRET = "your-super-secret-jwt-key"
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_ANON_KEY = "your-supabase-anon-key"
HASURA_GRAPHQL_ENDPOINT = "https://graphql-engine-latest-statpedia.onrender.com"
```

## 🎨 Lovable Frontend Integration

### Install Dependencies:
```bash
npm install @supabase/supabase-js
```

### Use the Integration:
```javascript
import { useAuth, useGraphQL, useStorage } from './cloudflare/frontend-integration.js';

// In your React component
function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { query, mutation } = useGraphQL();
  const { uploadFile, getFileUrl } = useStorage();

  // Use the services in your components
}
```

### Example Components:
- `<LoginForm />` - Authentication form
- `<PlayerImageUpload />` - File upload component
- `<GraphQLQuery />` - GraphQL data display

## 🚀 Production Deployment

### 1. Update Environment Variables
```bash
wrangler secret put JWT_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

### 2. Configure Custom Domains
- Set up DNS records in Cloudflare
- Enable SSL certificates
- Configure caching rules

### 3. Monitor Performance
- Use Cloudflare Analytics
- Monitor Worker performance
- Track cache hit rates

## 🔍 Testing

### Test Authentication:
```bash
curl -X POST https://auth.statpedia.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Test Storage:
```bash
curl -X POST https://storage.statpedia.com/test-file \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@image.jpg"
```

### Test GraphQL:
```bash
curl -X POST https://api.statpedia.com/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{leagues{id name}}"}'
```

## 🎯 Benefits

### Performance:
- ✅ Edge caching for GraphQL queries
- ✅ Global CDN for file storage
- ✅ Reduced latency with Workers

### Security:
- ✅ JWT-based authentication
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation

### Scalability:
- ✅ Serverless architecture
- ✅ Auto-scaling Workers
- ✅ Global edge deployment
- ✅ Pay-per-request pricing

Your StatPedia platform now has enterprise-grade authentication, storage, and API proxy capabilities! 🚀
