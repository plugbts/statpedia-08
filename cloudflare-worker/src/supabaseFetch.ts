export async function supabaseFetch(env: any, table: string, { method = "GET", body, query = "", headers = {} }: { method?: string; body?: any; query?: string; headers?: Record<string, string> } = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;

  const res = await fetch(url, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(method === "POST" && body ? { Prefer: "resolution=merge-duplicates" } : {}),
      ...headers, // Merge custom headers
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Supabase ${method} ${table} failed:`, {
      status: res.status,
      statusText: res.statusText,
      url: url,
      method: method,
      table: table,
      responseText: text,
      headers: Object.fromEntries(res.headers.entries())
    });
    throw new Error(`Supabase ${method} ${table} failed: ${res.status} ${res.statusText} - ${text}`);
  }

  // Handle empty responses (common for successful inserts)
  const contentLength = res.headers.get('content-length');
  if (contentLength === '0' || contentLength === null) {
    console.log(`✅ Supabase ${method} ${table} successful (empty response)`);
    return null; // Empty response indicates success
  }

  const text = await res.text();
  if (text.trim() === '') {
    console.log(`✅ Supabase ${method} ${table} successful (empty text response)`);
    return null; // Empty response indicates success
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn(`⚠️ Failed to parse JSON response: ${text}`);
    return text;
  }
}
