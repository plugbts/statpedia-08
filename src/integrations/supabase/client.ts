// Stub file to prevent build errors
// This app now uses Hasura + Neon instead of Supabase

export const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase removed - use custom auth' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase removed - use custom auth' } }),
    signOut: () => Promise.resolve({ error: null })
  },
  from: (table: string) => ({
    select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
  }),
  rpc: () => Promise.resolve({ data: null, error: null })
};
