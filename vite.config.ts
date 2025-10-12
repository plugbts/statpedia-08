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
      configResolved() {
        // Polyfill handled in index.html
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
    // StatPedia API endpoints
    'import.meta.env.VITE_GRAPHQL_ENDPOINT': JSON.stringify("https://statpedia-proxy.statpedia.workers.dev/v1/graphql"),
    'import.meta.env.VITE_AUTH_ENDPOINT': JSON.stringify("https://statpedia-auth.statpedia.workers.dev"),
    'import.meta.env.VITE_STORAGE_ENDPOINT': JSON.stringify("https://statpedia-storage.statpedia.workers.dev"),
    'import.meta.env.VITE_HASURA_CONSOLE': JSON.stringify("https://graphql-engine-latest-statpedia.onrender.com/console"),
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
