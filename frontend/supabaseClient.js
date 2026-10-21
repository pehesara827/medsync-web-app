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

/**
 * Returns fetch headers carrying the current Supabase access token as a
 * Bearer token, so protected backend routes (requireAuth) can validate it.
 * Returns an empty object when no session exists (caller should handle 401).
 */
export const getAuthHeaders = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAvailable ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
