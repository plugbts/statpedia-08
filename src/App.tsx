import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSync } from "@/hooks/use-sync";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import PredictionDetail from "./pages/PredictionDetail";
import { Settings } from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { SubscriptionPlans } from "./components/auth/subscription-plans";
import { SupportCenter } from "./components/support/support-center";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const queryClient = new QueryClient();

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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

  // Log sync status
  console.log('Sync Status:', {
    isFullyConnected: sync.isFullyConnected,
    isLoveableConnected: sync.isLoveableConnected,
    isSupabaseConnected: sync.isSupabaseConnected,
    lastSync: sync.lastSync,
    error: sync.error,
  });

  return <>{children}</>;
};

const App = () => {
  // Initialize theme on app start
  useEffect(() => {
    const savedTheme = localStorage.getItem('statpedia-theme');
    const html = document.documentElement;
    
    if (savedTheme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      // Default to dark mode if no preference saved
      html.classList.remove('light');
      html.classList.add('dark');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SyncProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </SyncProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
