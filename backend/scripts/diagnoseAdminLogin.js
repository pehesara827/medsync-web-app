// ─────────────────────────────────────────────────────────────────────────────
// diagnoseAdminLogin.js  (READ-ONLY — no data is modified)
// Reproduces the exact login path of frontend/src/PublicSite/pages/Login.jsx
// to find why POST /auth/v1/token?grant_type=password returns 400:
//   1. Lists every public.users row with an ADMIN-ish role.
//   2. For each, checks the matching auth.users account (exists? confirmed?).
//   3. Calls the get_email_by_identifier RPC like Login.jsx does.
//   4. Hits the password-grant endpoint with a DUMMY password to capture the
//      exact Supabase error code (invalid_credentials vs email_not_confirmed).
//
// Run: node scripts/diagnoseAdminLogin.js [emailToTest]
// ─────────────────────────────────────────────────────────────────────────────
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);
const emailArg = process.argv[2];

async function tokenGrantProbe(email) {
  // Same HTTP call supabase-js makes at Login.jsx:44 — with a dummy password.
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: supabaseKey },
      body: JSON.stringify({ email, password: '__dummy_password_probe__' }),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, code: json.error_code || json.error || json.code, msg: json.msg || json.error_description || json.message };
  } catch (e) {
    return { status: 'ERR', code: null, msg: e.message };
  }
}

async function main() {
  console.log('=== ADMIN LOGIN DIAGNOSIS (read-only) ===\n');

  // 1. Every ADMIN-ish row in public.users
  const { data: adminRows, error: adminErr } = await supabase
    .from('users')
    .select('id, username, email, role, is_verified, created_at')
    .ilike('role', '%admin%');
  if (adminErr) {
    console.error('Error querying public.users:', adminErr.message);
  }

  console.log('--- public.users ADMIN rows ---');
  if (!adminRows || adminRows.length === 0) {
    console.log('  (none found)');
  }
  for (const u of adminRows || []) {
    console.log(`  • ${u.email} | role=${u.role} | id=${u.id}`);

    // 2. Does the auth account exist for this id?
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(u.id);
    if (authErr) {
      console.log(`    auth.users: ❌ lookup failed -> ${authErr.message}`);
    } else if (!authData?.user) {
      console.log('    auth.users: ❌ NO MATCHING AUTH USER (orphan public.users row — cause of 400)');
    } else {
      const au = authData.user;
      console.log(`    auth.users: ✅ exists | email=${au.email} | confirmed=${au.email_confirmed_at ? 'YES' : 'NO'} | banned=${au.banned_until && au.banned_until > new Date().toISOString() ? 'YES' : 'no'}`);
      console.log(`    created_at=${au.created_at} | last_sign_in_at=${au.last_sign_in_at || 'never'}`);
      if ((au.email || '').toLowerCase() !== (u.email || '').toLowerCase()) {
        console.log(`    ⚠️ EMAIL MISMATCH: public.users.email (${u.email}) vs auth.users.email (${au.email})`);
      }
    }
  }

  // 3. Replicate Login.jsx step 1 — the RPC lookup
  const probes = [...new Set([
    ...(emailArg ? [emailArg] : []),
    ...(adminRows || []).map((u) => u.email),
    'admin@medsync.io',
  ])].filter(Boolean);

  console.log('\n--- RPC get_email_by_identifier (same as Login.jsx step 1) ---');
  for (const identifier of probes) {
    const { data, error } = await supabase.rpc('get_email_by_identifier', { p_identifier: identifier });
    if (error) {
      console.log(`  "${identifier}" -> RPC ERROR: ${error.message}`);
      continue;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.user_email) {
      console.log(`  "${identifier}" -> ❌ NO ROW RETURNED ("User not found." in UI)`);
    } else {
      console.log(`  "${identifier}" -> user_email=${row.user_email} | user_role=${row.user_role}`);
      // 4. Probe the token endpoint with a dummy password for the exact code
      const probe = await tokenGrantProbe(row.user_email);
      console.log(`      password-grant probe (dummy pw) -> HTTP ${probe.status} | code=${probe.code} | msg=${probe.msg}`);
    }
  }

  console.log('\nLegend: HTTP 400 invalid_credentials -> wrong password OR auth user missing.');
  console.log('        HTTP 400 email_not_confirmed -> auth account exists but is unconfirmed.');

  // 5. Optional REAL password verification: node scripts/diagnoseAdminLogin.js <email> <password>
  const passwordArg = process.argv[3];
  if (emailArg && passwordArg) {
    console.log(`\n--- REAL password grant for ${emailArg} ---`);
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: supabaseKey },
        body: JSON.stringify({ email: emailArg, password: passwordArg }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.access_token) {
        const meta = json.user?.user_metadata || {};
        console.log(`  ✅ HTTP 200 — LOGIN WORKS | role in metadata=${meta.role || '(none)'} | name=${[meta.first_name, meta.last_name].filter(Boolean).join(' ') || '(none)'}`);
      } else {
        console.log(`  ❌ HTTP ${res.status} | code=${json.error_code || json.error} | msg=${json.msg || json.error_description || json.message}`);
      }
    } catch (e) {
      console.log(`  ❌ Request failed: ${e.message}`);
    }
  }
}

main();