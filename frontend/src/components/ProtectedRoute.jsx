import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

/**
 * ProtectedRoute
 *
 * Guards a route by:
 *  1. Checking for an active Supabase session (persisted across reloads).
 *  2. Resolving the user's role from `public.users` (falling back to
 *     `user_metadata.role` if the row isn't found yet).
 *  3. Allowing access only if the role is in `allowedRoles`.
 *
 * Usage:
 *   <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
 *     <Route path="/patient" element={<PatientLayout />} />
 *   </Route>
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const resolveSession = async () => {
      try {
        // 1. Get the current session (persisted in localStorage by Supabase)
        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData?.session ?? null;

        if (!isMounted) return;
        setSession(currentSession);

        if (!currentSession) {
          setLoading(false);
          return;
        }

        // 2. Resolve the user's role from public.users
        const { data: userRow, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          // Fall back to the role stored in auth user metadata
          setRole(currentSession.user.user_metadata?.role ?? null);
        } else {
          setRole(userRow?.role ?? currentSession.user.user_metadata?.role ?? null);
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setRole(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    resolveSession();

    // 3. Keep the guard in sync with auth state changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (!newSession) {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Show a loading state while resolving the session/role
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-10 w-10 animate-spin text-[#00a8cc]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // No active session -> redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Session exists but role doesn't match -> redirect home
  const normalizedRole = (role || '').toUpperCase();
  if (!allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/" replace />;
  }

  // Authorized -> render the nested routes
  return <Outlet />;
}