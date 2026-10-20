import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Tab-session-only auth: refresh/access tokens live in sessionStorage.
// Closing the tab or browser discards the session, so patients, doctors,
// and admins must enter credentials on every new tab/browser session.
// Refreshes inside the same tab keep working.
export const clearLegacyPersistentAuthTokens = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* storage unavailable */
  }
};

clearLegacyPersistentAuthTokens();

const sessionStorageAvailable =
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAvailable ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
