import React from "react";

/**
 * DevBanner: Shows live environment info to verify you're on the latest dev build
 * - Visible only in development (import.meta.env.DEV)
 * - Displays current time, frontend origin, and API base
 */
export const DevBanner: React.FC = () => {
  if (!(import.meta as any).env?.DEV) return null;

  const now = new Date();
  const frontend = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
  const apiBase = (import.meta as any).env?.VITE_API_BASE || "http://localhost:3001";

  return (
    <div className="w-full bg-yellow-500/10 border-b border-yellow-500/30 text-xs text-yellow-600 px-3 py-1 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-semibold">DEV BUILD</span>
        <span>{now.toLocaleDateString()} {now.toLocaleTimeString()}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Frontend: <span className="font-mono">{frontend}</span></span>
        <span>API: <span className="font-mono">{apiBase}</span></span>
      </div>
    </div>
  );
};

export default DevBanner;
