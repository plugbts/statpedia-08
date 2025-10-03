// Minimal imports for testing
import { useState, useEffect } from "react";

// const queryClient = new QueryClient();

// Settings Wrapper Component - temporarily commented out
/*
const SettingsWrapper = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState('user');

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
    });

    return () => subscription.unsubscribe();
  }, []);

  return <Settings user={user} userRole={userRole} />;
};
*/

// Support Center Wrapper Component - temporarily commented out
/*
const SupportCenterWrapper = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState('user');

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
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SupportCenter 
      userRole={userRole}
      userEmail={user?.email || ''}
      userName={user?.user_metadata?.display_name || user?.email?.split('@')[0] || ''}
    />
  );
};
*/

// Sync Provider Component - temporarily commented out
/*
const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const sync = useSync({
    enableLoveableSync: true,
    enableSupabaseRealtime: true,
    tables: [
      {
        table: 'profiles',
        onInsert: () => {},
        onUpdate: () => {},
        onDelete: () => {},
      },
      {
        table: 'bet_tracking',
        onInsert: () => {},
        onUpdate: () => {},
        onDelete: () => {},
      },
    ],
  });

  // Initialize email cron service
  const emailCron = useEmailCron();


  return <>{children}</>;
};
*/

const App = () => {
  // Initialize theme immediately
  useEffect(() => {
    const savedTheme = localStorage.getItem('statpedia-theme');
    const html = document.documentElement;
    
    if (savedTheme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
  }, []);

  // Temporary simplified version for debugging
  return (
    <div style={{ padding: '20px', color: 'white', backgroundColor: 'black', minHeight: '100vh' }}>
      <h1>Statpedia App Loading...</h1>
      <p>If you see this, the React app is working but there might be an issue with the main components.</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );

  // Original complex version - commented out for debugging
  /*
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
                <Route path="/subscription" element={<SubscriptionPlans onSubscriptionSuccess={() => {}} />} />
                <Route path="/support" element={<SupportCenterWrapper />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SyncProvider>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
  */
};

export default App;
