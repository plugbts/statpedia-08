import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Add polyfill plugin for Node.js globals
    {
      name: 'node-polyfill',
      configResolved(config) {
        // Ensure process is available globally
        if (typeof globalThis.process === 'undefined') {
          globalThis.process = {
            env: { NODE_ENV: 'development' },
            version: 'v16.0.0',
            versions: { node: '16.0.0' },
            platform: 'browser',
            browser: true
          };
        }
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['fsevents'],
  },
  build: {
    rollupOptions: {
      external: ['fsevents'],
    },
  },
  define: {
    // Ensure environment variables are available
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://rfdrifnsfobqlzorcesn.supabase.co"),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI"),
    'import.meta.env.VITE_LOVEABLE_PROJECT_ID': JSON.stringify("statpedia-08"),
    'import.meta.env.VITE_LOVEABLE_API_URL': JSON.stringify("https://api.loveable.dev"),
    // Sportsbook API keys
    'import.meta.env.VITE_FANDUEL_API_KEY': JSON.stringify(""),
    'import.meta.env.VITE_DRAFTKINGS_API_KEY': JSON.stringify(""),
    'import.meta.env.VITE_BETMGM_API_KEY': JSON.stringify(""),
    'import.meta.env.VITE_CAESARS_API_KEY': JSON.stringify(""),
    'import.meta.env.VITE_POINTSBET_API_KEY': JSON.stringify(""),
    // Comprehensive polyfill for process to prevent ReferenceError
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env': JSON.stringify({ NODE_ENV: 'development' }),
    'process': JSON.stringify({ 
      env: { NODE_ENV: 'development' },
      version: 'v16.0.0',
      versions: { node: '16.0.0' },
      platform: 'browser',
      browser: true
    }),
    'global': 'globalThis',
  },
}));
