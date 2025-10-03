// Session guard component to protect routes and handle session errors
import React, { useEffect, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, LogOut, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SessionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  onSessionError?: (error: string) => void;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
  onSessionError
}) => {
  const { user, isLoading, isValid, error, refreshSession, signOut } = useSession();
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      setRetryCount(0);
    } catch (err) {
      console.error('Session refresh failed:', err);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } catch (err) {
      toast({
        title: "Sign Out Failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (error && onSessionError) {
      onSessionError(error);
    }
  }, [error, onSessionError]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Loading session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If user is not authenticated, show error
  if (!isValid || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Session Error
            </CardTitle>
            <CardDescription>
              Your session has expired or is invalid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleRefreshSession}
                disabled={isRefreshing}
                className="w-full"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
              </Button>

              {retryCount > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Retry attempt: {retryCount}
                </p>
              )}

              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              <p>If the problem persists, please try:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Refreshing the page</li>
                <li>Clearing your browser cache</li>
                <li>Signing in again</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
};
