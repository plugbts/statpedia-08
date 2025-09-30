import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useSync } from "@/hooks/use-sync";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SyncProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SyncProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
