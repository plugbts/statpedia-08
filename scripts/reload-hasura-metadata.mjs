#!/usr/bin/env node

import fetch from 'node-fetch';
import 'dotenv/config';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'https://graphql-engine-latest-statpedia.onrender.com';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET;

if (!HASURA_ADMIN_SECRET) {
  console.error('❌ Missing HASURA_ADMIN_SECRET');
  process.exit(1);
}

async function reloadMetadata() {
  console.log('🔄 Reloading Hasura metadata...\n');
  
  const response = await fetch(`${HASURA_ENDPOINT}/v1/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      type: 'reload_metadata',
      args: {
        reload_remote_schemas: true,
        reload_sources: true
      }
    }),
  });
  
  const result = await response.json();
  
  if (!response.ok || result.error) {
    throw new Error(result.error || result.message || `HTTP ${response.status}`);
  }
  
  console.log('✅ Hasura metadata reloaded successfully');
  console.log('✅ All database schema changes are now visible to GraphQL\n');
  
  return result;
}

reloadMetadata().catch((e) => {
  console.error('❌ Reload failed:', e);
  process.exit(1);
});

