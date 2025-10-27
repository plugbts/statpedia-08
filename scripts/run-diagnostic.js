// Minimal diagnostic runner for StatPedia worker
// Usage: WORKER_BASE_URL=https://... node scripts/run-diagnostic.js

import fetch from 'node-fetch';

(async () => {
  const base = process.env.WORKER_BASE_URL;
  if (!base) {
    console.error('Please set WORKER_BASE_URL environment variable');
    process.exit(2);
  }

  // Endpoint expected to exist in worker to run diagnosticPersistProps
  const url = `${base.replace(/\/$/, '')}/api/diagnostic/persist-props`;
  console.log('Calling diagnostic endpoint:', url);

  try {
    const res = await fetch(url, { method: 'POST' });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response body:');
    console.log(text);
  } catch (err) {
    console.error('Diagnostic request failed:', err.message);
    console.error('\nIf this endpoint is not exposed by your worker, run diagnosticPersistProps locally or through the worker code.');
    process.exit(1);
  }
})();
