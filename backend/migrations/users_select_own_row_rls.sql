-- users_select_own_row_rls.sql
--
-- RLS policy for public.users: allow each authenticated user to read their
-- own row. Required by frontend/src/components/ProtectedRoute.jsx, which
-- resolves the signed-in user's role via
--   supabase.from('users').select('role').eq('id', auth.uid())
-- RLS was enabled on public.users with NO policies, so that query returned
-- nothing and role resolution silently fell back to user_metadata.role.
-- This policy makes the primary path work for every role (PATIENT/DOCTOR/ADMIN).
--
-- Run in Supabase SQL editor or via psql with SUPABASE_DB_URL.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'users'
      and policyname = 'Allow authenticated users to read their own users row'
  ) then
    create policy "Allow authenticated users to read their own users row"
      on public.users
      for select
      to authenticated
      using (auth.uid() = id);
  end if;
end $$;