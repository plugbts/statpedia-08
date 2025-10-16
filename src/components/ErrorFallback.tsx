import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

// Theme-aware error fallback that matches the site's UI style
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  // Ensure stack is logged for debugging
  if (error) {
    console.error("App crashed:", error.stack || error.message || error);
  }

  const handleReload = () => {
    // Let devs optionally reset the boundary without full reload
    if (resetErrorBoundary) {
      try {
        resetErrorBoundary();
        return;
      } catch {
        // ignore reset errors and fallback to full reload
      }
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl border border-destructive/30 bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-destructive/30 bg-destructive/10">
          <h2 className="text-base font-semibold text-destructive">Something went wrong</h2>
          <p className="text-xs text-muted-foreground">
            A render error occurred. You can reload the app to recover.
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm">
            <span className="font-medium text-foreground">Error:</span>
            <span className="ml-2 text-destructive">{error?.message || "Unknown error"}</span>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs font-mono bg-muted/40 text-muted-foreground p-2 rounded">
              {(error?.stack || "").toString()}
            </pre>
          )}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleReload}>
              Reload app
            </Button>
            <Button size="sm" variant="outline" onClick={() => (window.location.href = "/")}>
              Go to home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
