export async function supabaseFetch(env: any, table: string, { method = "GET", body, query = "" } = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query}`;

  const res = await fetch(url, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(method === "POST" ? { Prefer: "resolution=merge-duplicates" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Supabase ${method} ${table} failed:`, text);
    throw new Error(text);
  }

  return res.json();
}
