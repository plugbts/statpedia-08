import React, { useEffect, useState } from "react";

const Diagnostics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/diagnostics/analytics-status")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((e) => {
        setError(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", fontFamily: "monospace" }}>
      <h2>Analytics Diagnostics</h2>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {data && (
        <pre style={{ background: "#f6f8fa", padding: 16, borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      <div style={{ marginTop: 24, color: "#888", fontSize: 14 }}>
        <div>• <b>unknownTeams</b>: Should be 0 if all joins are healthy.</div>
        <div>• <b>analyticsPropsCount</b>: Should be nonzero after enrichment.</div>
        <div>• <b>playerGameLogsCount</b> / <b>playerAnalyticsCount</b>: Should be nonzero if logs/enrichment are present.</div>
        <div>• Table errors mean the table is missing in your DB.</div>
      </div>
    </div>
  );
};

export default Diagnostics;
