export async function supabaseFetch(env: any, path: string, options: RequestInit = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Supabase fetch failed: ${res.status} ${res.statusText}`, text);
    throw new Error(`Supabase fetch failed: ${res.status} ${res.statusText}`);
  }

  try {
    const data = await res.json();
    console.log(`✅ supabaseFetch returned ${Array.isArray(data) ? data.length : 0} rows for ${path}`);
    return data;
  } catch (err) {
    console.error("❌ Failed to parse Supabase JSON:", err);
    throw err;
  }
}
