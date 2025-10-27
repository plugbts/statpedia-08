// Minimal diagnostic runner for StatPedia worker (extended)
// Usage: WORKER_BASE_URL=https://... node scripts/run-diagnostic.js

const fetch = require('node-fetch');

(async () => {
  const base = process.env.WORKER_BASE_URL;
  if (!base) {
    console.error('Please set WORKER_BASE_URL environment variable');
    process.exit(2);
  }

  const endpoints = [
    { method: 'POST', path: '/api/diagnostic/persist-props', name: 'persist-props' },
    { method: 'POST', path: '/api/diagnostic/run', name: 'diagnostic-run' },
    { method: 'GET', path: '/api/diagnostic/status', name: 'diagnostic-status' }
  ];

  for (const ep of endpoints) {
    const url = `${base.replace(/\/$/, '')}${ep.path}`;
    console.log(`Calling ${ep.method} ${url}`);
    try {
      const res = await fetch(url, { method: ep.method, headers: { 'Content-Type': 'application/json' }, body: ep.method === 'GET' ? undefined : JSON.stringify({ dry_run: true }) });
      const text = await res.text();
      console.log('Status:', res.status);
      console.log('Response:', text);
    } catch (err) {
      console.error(`Request to ${url} failed:`, err.message);
    }
    console.log('---');
  }

  console.log('\nIf these endpoints are not exposed, you can run diagnosticPersistProps inside your worker runtime or call the diagnosticPersistProps helper directly.');
})();
