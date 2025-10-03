import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useSync } from "@/hooks/use-sync";
import { useEmailCron } from "@/hooks/use-email-cron";
import { UserProvider } from "@/contexts/user-context";
import { useState, useEffect, Suspense, lazy, Component, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Custom Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: '#0a0a0a', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="text-white text-lg">Something went wrong</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error handler for dynamic imports
const handleDynamicImportError = (error: Error) => {
  console.error('Dynamic import error:', error);
  if (error.message.includes('Failed to fetch dynamically imported module')) {
    console.log('Reloading page to fetch latest modules...');
    window.location.reload();
  }
};

// Lazy load heavy components with error handling
const Index = lazy(() => import("./pages/Index").catch(handleDynamicImportError));
const Admin = lazy(() => import("./pages/Admin").catch(handleDynamicImportError));
const PredictionDetail = lazy(() => import("./pages/PredictionDetail").catch(handleDynamicImportError));
const Settings = lazy(() => import("./pages/Settings").then(module => ({ default: module.Settings })).catch(handleDynamicImportError));
const NotFound = lazy(() => import("./pages/NotFound").catch(handleDynamicImportError));
const SubscriptionPlans = lazy(() => import("./components/auth/subscription-plans").then(module => ({ default: module.SubscriptionPlans })).catch(handleDynamicImportError));
const SupportCenter = lazy(() => import("./components/support/support-center").then(module => ({ default: module.SupportCenter })).catch(handleDynamicImportError));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Settings Wrapper Component
const SettingsWrapper = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState('user');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load theme preference on app start
    const savedTheme = localStorage.getItem('statpedia-theme');
    if (savedTheme) {
      const html = document.documentElement;
      if (savedTheme === 'light') {
        html.classList.remove('dark');
        html.classList.add('light');
      } else {
        html.classList.remove('light');
        html.classList.add('dark');
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Determine user role based on email or metadata
        const email = session.user.email;
        if (email === 'plug@statpedia.com') {
          setUserRole('owner');
        } else if (email?.includes('admin')) {
          setUserRole('admin');
        } else if (email?.includes('mod')) {
          setUserRole('mod');
        } else {
          setUserRole('user');
        }
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Determine user role
        const email = session.user.email;
        if (email === 'plug@statpedia.com') {
          setUserRole('owner');
        } else if (email?.includes('admin')) {
          setUserRole('admin');
        } else if (email?.includes('mod')) {
          setUserRole('mod');
        } else {
          setUserRole('user');
        }
      } else {
        setUser(null);
        setUserRole('user');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <Settings user={user} userRole={userRole} />;
};

// Support Center Wrapper Component
const SupportCenterWrapper = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState('user');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Determine user role based on email or metadata
        const email = session.user.email;
        if (email === 'plug@statpedia.com') {
          setUserRole('owner');
        } else if (email?.includes('admin')) {
          setUserRole('admin');
        } else if (email?.includes('mod')) {
          setUserRole('mod');
        } else {
          setUserRole('user');
        }
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Determine user role
        const email = session.user.email;
        if (email === 'plug@statpedia.com') {
          setUserRole('owner');
        } else if (email?.includes('admin')) {
          setUserRole('admin');
        } else if (email?.includes('mod')) {
          setUserRole('mod');
        } else {
          setUserRole('user');
        }
      } else {
        setUser(null);
        setUserRole('user');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <SupportCenter 
      userRole={userRole}
      userEmail={user?.email || ''}
      userName={user?.user_metadata?.display_name || user?.email?.split('@')[0] || ''}
    />
  );
};

// Sync Provider Component
const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const sync = useSync({
    enableLoveableSync: true,
    enableSupabaseRealtime: true,
    onSyncSuccess: (event) => {
      console.log('Sync successful:', event);
    },
    onSyncError: (error) => {
      console.error('Sync error:', error);
    },
    tables: [
      {
        table: 'profiles',
        onInsert: (payload) => console.log('Profile created:', payload),
        onUpdate: (payload) => console.log('Profile updated:', payload),
        onDelete: (payload) => console.log('Profile deleted:', payload),
      },
      {
        table: 'bet_tracking',
        onInsert: (payload) => console.log('Bet created:', payload),
        onUpdate: (payload) => console.log('Bet updated:', payload),
        onDelete: (payload) => console.log('Bet deleted:', payload),
      },
    ],
  });

  // Initialize email cron service
  const emailCron = useEmailCron();

  // Log sync status
  console.log('Sync Status:', {
    isFullyConnected: sync.isFullyConnected,
    isLoveableConnected: sync.isLoveableConnected,
    isSupabaseConnected: sync.isSupabaseConnected,
    lastSync: sync.lastSync,
    error: sync.error,
  });

  // Log email cron status
  console.log('Email Cron Status:', emailCron.status);

  return <>{children}</>;
};

const App = () => {
  // Initialize theme on app start - run synchronously to prevent black screen
  const [themeInitialized, setThemeInitialized] = useState(false);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('statpedia-theme');
    const html = document.documentElement;
    
    // Ensure CSS variables are loaded before setting theme
    const initializeTheme = () => {
      if (savedTheme === 'light') {
        html.classList.remove('dark');
        html.classList.add('light');
      } else {
        // Default to dark mode if no preference saved
        html.classList.remove('light');
        html.classList.add('dark');
      }
      setThemeInitialized(true);
    };
    
    // Check if CSS is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeTheme);
    } else {
      initializeTheme();
    }
    
    return () => {
      document.removeEventListener('DOMContentLoaded', initializeTheme);
    };
  }, []);
  
  // Show loading until theme is initialized to prevent black screen
  if (!themeInitialized) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0a0a0a', // Fallback dark background
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <SyncProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary
                fallback={
                  <div style={{ 
                    minHeight: '100vh', 
                    backgroundColor: '#0a0a0a', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div className="text-white text-lg">Something went wrong</div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Reload Page
                    </button>
                  </div>
                }
                onError={(error) => {
                  console.error('App Error Boundary caught:', error);
                  if (error.message.includes('Failed to fetch dynamically imported module')) {
                    console.log('Reloading page due to dynamic import error...');
                    window.location.reload();
                  }
                }}
              >
                <Suspense fallback={
                  <div style={{ 
                    minHeight: '100vh', 
                    backgroundColor: '#0a0a0a', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/prediction-detail" element={<PredictionDetail />} />
                    <Route path="/settings" element={<SettingsWrapper />} />
                    <Route path="/subscription" element={<SubscriptionPlans onSubscriptionSuccess={(plan) => {
                      console.log('Subscription successful:', plan);
                      // Handle successful subscription
                    }} />} />
                    <Route path="/support" element={<SupportCenterWrapper />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </SyncProvider>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
