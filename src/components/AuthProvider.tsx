import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/services/auth';

// AuthProvider ensures authentication state is tracked and session is kept in sync
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getSession } = useAuthStore(); // Pulls the session retrieval method from the auth store

  useEffect(() => {
    // 1. Perform an initial check to load the current session
    getSession();

    // 2. Subscribe to Supabase auth state changes (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getSession(); // Refresh session whenever an auth state change occurs
    });

    // 3. Cleanup subscription on unmount to prevent memory leaks
    return () => {
      subscription.unsubscribe();
    };
  }, [getSession]); // Run effect when `getSession` changes

  // Render the child components inside the provider
  return <>{children}</>;
}
