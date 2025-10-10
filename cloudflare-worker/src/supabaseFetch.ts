export async function supabaseFetch(env: any, path: string, options: RequestInit = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Ensure body is properly JSON stringified if it's an object or array
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  const res = await fetch(url, { ...options, headers, body });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Supabase fetch failed: ${res.status} ${res.statusText}`, text);
    throw new Error(`Supabase fetch failed: ${res.status} ${res.statusText}`);
  }

  try {
    const text = await res.text();
    if (!text || text.trim() === '') {
      console.log(`✅ supabaseFetch returned empty response for ${path}`);
      return null;
    }
    const data = JSON.parse(text);
    console.log(`✅ supabaseFetch returned ${Array.isArray(data) ? data.length : 0} rows for ${path}`);
    return data;
  } catch (err) {
    console.error("❌ Failed to parse Supabase JSON:", err);
    throw err;
  }
}
