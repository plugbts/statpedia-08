# Statpedia Sync Setup Guide

This guide will help you connect your Statpedia project with your Loveable account for real-time code and UI synchronization, and ensure your Supabase account is properly connected.

## 🚀 Features

- **Real-time Code Sync**: Synchronize code changes with Loveable in real-time
- **Real-time UI Sync**: Synchronize UI changes with Loveable in real-time
- **Real-time Database Sync**: Real-time data synchronization with Supabase
- **Automatic Reconnection**: Handles connection drops and reconnects automatically
- **Sync Status Monitoring**: Visual indicators for connection status
- **Error Handling**: Comprehensive error handling and logging

## 📋 Prerequisites

1. **Loveable Account**: You need an active Loveable account
2. **Supabase Account**: You need an active Supabase account with a project
3. **Node.js**: Version 18 or higher
4. **Package Manager**: npm, yarn, or bun

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://rfdrifnsfobqlzorcesn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI

# Loveable Configuration
VITE_LOVEABLE_PROJECT_ID=statpedia-08
VITE_LOVEABLE_API_URL=https://api.loveable.dev
VITE_LOVEABLE_API_KEY=your_loveable_api_key_here

# Development Configuration
VITE_APP_ENV=development
VITE_APP_NAME=Statpedia
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3. Start Development Server

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

## 🔗 Loveable Integration

### Connecting to Loveable

1. **Sign in to Loveable**: Go to [Loveable](https://loveable.dev) and sign in to your account
2. **Create/Import Project**: Create a new project or import your existing Statpedia project
3. **Get API Key**: Obtain your API key from the Loveable dashboard
4. **Update Environment**: Add your API key to the `.env.local` file

### Real-time Sync Features

The integration provides:

- **Code Synchronization**: Automatically sync code changes
- **UI Synchronization**: Sync UI component changes
- **Configuration Sync**: Sync project configuration
- **WebSocket Connection**: Real-time bidirectional communication
- **Auto-reconnection**: Handles connection drops gracefully

## 🗄️ Supabase Integration

### Database Connection

Your Supabase project is already configured with:

- **Project ID**: `rfdrifnsfobqlzorcesn`
- **Database URL**: `https://rfdrifnsfobqlzorcesn.supabase.co`
- **Anon Key**: Already configured

### Real-time Features

- **Table Subscriptions**: Real-time updates for database tables
- **Row Level Security**: Secure data access
- **Authentication**: Built-in user authentication
- **Real-time Events**: INSERT, UPDATE, DELETE events

### Database Tables

The following tables are configured for real-time sync:

- `profiles` - User profiles and settings
- `bet_tracking` - Bet tracking and history
- `social_posts` - Social media posts
- `comments` - Comments on posts
- `user_predictions` - User predictions
- `promo_codes` - Promotional codes
- `friendships` - User relationships

## 🎯 Usage

### Using the Sync Hooks

```tsx
import { useSync } from '@/hooks/use-sync';

function MyComponent() {
  const sync = useSync({
    enableLoveableSync: true,
    enableSupabaseRealtime: true,
    onSyncSuccess: (event) => console.log('Sync successful:', event),
    onSyncError: (error) => console.error('Sync error:', error),
  });

  // Sync code changes
  const handleCodeChange = (code) => {
    sync.syncCode(code);
  };

  // Sync UI changes
  const handleUIChange = (ui) => {
    sync.syncUI(ui);
  };

  return (
    <div>
      <p>Loveable Connected: {sync.isLoveableConnected ? 'Yes' : 'No'}</p>
      <p>Supabase Connected: {sync.isSupabaseConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Using Table Sync

```tsx
import { useTableSync } from '@/hooks/use-sync';

function BetTracking() {
  const { isConnected, error } = useTableSync('bet_tracking', {
    onInsert: (payload) => console.log('New bet:', payload),
    onUpdate: (payload) => console.log('Bet updated:', payload),
    onDelete: (payload) => console.log('Bet deleted:', payload),
  });

  return (
    <div>
      <p>Real-time sync: {isConnected ? 'Active' : 'Inactive'}</p>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Sync Status Component

```tsx
import { SyncStatus } from '@/components/sync/sync-status';

function App() {
  return (
    <div>
      {/* Simple status indicator */}
      <SyncStatus />
      
      {/* Detailed status panel */}
      <SyncStatus showDetails={true} />
    </div>
  );
}
```

## 🔧 Configuration

### Sync Service Configuration

You can customize the sync behavior by modifying the sync service configuration:

```tsx
import { syncService } from '@/services/sync-service';

// Custom configuration
syncService.configure({
  enableLoveableSync: true,
  enableSupabaseRealtime: true,
  syncInterval: 5000, // 5 seconds
  maxRetries: 3,
});
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://rfdrifnsfobqlzorcesn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Pre-configured |
| `VITE_LOVEABLE_PROJECT_ID` | Loveable project ID | `statpedia-08` |
| `VITE_LOVEABLE_API_URL` | Loveable API URL | `https://api.loveable.dev` |
| `VITE_LOVEABLE_API_KEY` | Loveable API key | Required |

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check your internet connection
   - Verify API keys are correct
   - Check if services are running

2. **Sync Not Working**
   - Check browser console for errors
   - Verify environment variables
   - Check network connectivity

3. **Real-time Updates Not Appearing**
   - Verify Supabase RLS policies
   - Check table permissions
   - Verify WebSocket connection

### Debug Mode

Enable debug logging by setting:

```env
VITE_APP_ENV=development
```

This will show detailed sync logs in the browser console.

## 📚 API Reference

### Hooks

- `useSync()` - Main sync hook
- `useLoveableSync()` - Loveable-specific sync
- `useSupabaseRealtime()` - Supabase real-time sync
- `useTableSync()` - Single table sync
- `useMultipleTableSync()` - Multiple table sync

### Services

- `syncService` - Main sync service
- `loveableClient` - Loveable client
- `supabase` - Supabase client

### Components

- `SyncStatus` - Sync status indicator
- `SyncProvider` - Sync context provider

## 🚀 Deployment

### Production Setup

1. **Environment Variables**: Set production environment variables
2. **API Keys**: Use production API keys
3. **Build**: Run `npm run build`
4. **Deploy**: Deploy to your preferred platform

### Environment Variables for Production

```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_key
VITE_LOVEABLE_PROJECT_ID=your_production_project_id
VITE_LOVEABLE_API_URL=https://api.loveable.dev
VITE_LOVEABLE_API_KEY=your_production_loveable_key
VITE_APP_ENV=production
```

## 📞 Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify all environment variables are set
3. Check the network tab for failed requests
4. Review the sync status component

For additional help, refer to:
- [Loveable Documentation](https://docs.loveable.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)

## 🎉 You're All Set!

Your Statpedia project is now connected to both Loveable and Supabase with real-time synchronization capabilities. The sync system will automatically handle:

- Code changes synchronization
- UI updates synchronization
- Database real-time updates
- Connection management
- Error handling and recovery

Happy coding! 🚀
