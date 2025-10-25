# Legacy Supabase Scripts

This folder contains legacy scripts and Supabase Edge Functions that reference `@supabase/supabase-js`.

They are retained for reference only and are not part of the active ingestion or API runtime. The current stack is:

- Cloudflare Worker (player props): SGO-only, no database writes in worker.
- Auth: `cloudflare/auth-worker-simplified.js` (no Supabase).
- Storage/Proxy workers: no Supabase.

If you need to run any of these scripts, do so in isolation and be aware they expect a Supabase project and keys.
