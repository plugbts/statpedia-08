import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSync } from "@/hooks/use-sync";
import { useEmailCron } from "@/hooks/use-email-cron";
import Index from "./pages/Index";
import { Admin } from "./pages/Admin";
import PredictionDetail from "./pages/PredictionDetail";
import { Settings } from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { SubscriptionPlans } from "./components/auth/subscription-plans";
import { SupportCenter } from "./components/support/support-center";
import { UserProvider } from "@/contexts/user-context";
import { AuthProvider } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AnalyticsTest } from "@/components/debug/analytics-test";
import { AnalyticsDebug } from "@/components/debug/analytics-debug";
import { AnalyticsDebugTest } from "@/components/debug/analytics-debug-test";
import { AnalyticsUITest } from "@/components/debug/analytics-ui-test";
import { SimpleAnalyticsTest } from "@/components/debug/simple-analytics-test";
import { BasicTest } from "@/components/debug/basic-test";
import { SimpleHookTest } from "@/components/debug/simple-hook-test";
import AuthTest from "./pages/AuthTest";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const SettingsWrapper = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return <Settings user={user} />;
};

const SupportCenterWrapper = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return <SupportCenter user={user} />;
};

const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sync = useSync();
  const emailCron = useEmailCron();

  console.log('Sync Status:', sync.status);
  console.log('Email Cron Status:', emailCron.status);

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
        <AuthProvider>
          <UserProvider>
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
                <Route path="/debug/analytics" element={
                  <div className="container mx-auto py-8">
                    <h1 className="text-3xl font-bold mb-8">Analytics Debug</h1>
                    <AnalyticsTest />
                  </div>
                } />
                <Route path="/debug/analytics2" element={
                  <div className="container mx-auto py-8">
                    <AnalyticsDebug />
                  </div>
                } />
                <Route path="/debug/analytics3" element={
                  <div className="container mx-auto py-8">
                    <AnalyticsDebugTest />
                  </div>
                } />
                <Route path="/debug/analytics4" element={
                  <div className="container mx-auto py-8">
                    <AnalyticsUITest />
                  </div>
                } />
                <Route path="/debug/analytics5" element={
                  <div className="container mx-auto py-8">
                    <SimpleAnalyticsTest />
                  </div>
                } />
                <Route path="/debug/basic" element={
                  <div className="container mx-auto py-8">
                    <BasicTest />
                  </div>
                } />
                <Route path="/debug/hook" element={
                  <div className="container mx-auto py-8">
                    <SimpleHookTest />
                  </div>
                } />
                <Route path="/auth-test" element={<AuthTest />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </SyncProvider>
          </UserProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;