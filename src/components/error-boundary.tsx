import React from "react";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  info?: React.ErrorInfo;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console; could be wired to a logging service

    console.error("ErrorBoundary caught an error:", error, info);
    this.setState({ info });
  }

  handleRetry = () => {
    // Simple reset; for persistent errors, a full reload helps during dev
    this.setState({ hasError: false, error: undefined, info: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, info } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) return children;

    if (fallback) return <>{fallback}</>;

    const isDev = (import.meta as any)?.env?.DEV;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="max-w-lg w-full border border-border/50 rounded-lg p-4 bg-card shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The page crashed while rendering. You can try again or reload the app.
          </p>
          {isDev && error && (
            <div className="mb-4 p-2 rounded bg-muted/50 overflow-auto text-xs">
              <div className="font-mono text-destructive mb-1">{error.message}</div>
              {error.stack && (
                <pre className="whitespace-pre-wrap font-mono text-muted-foreground">
                  {error.stack}
                </pre>
              )}
              {info?.componentStack && (
                <pre className="whitespace-pre-wrap font-mono text-muted-foreground mt-2">
                  {info.componentStack}
                </pre>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={this.handleRetry} variant="outline">
              Try again
            </Button>
            <Button size="sm" onClick={this.handleReload}>
              Reload app
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
