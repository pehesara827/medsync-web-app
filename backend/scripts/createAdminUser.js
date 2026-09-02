// ─────────────────────────────────────────────────────────────────────────────
// createAdminUser.js
// Provisions an ADMIN account so the shared role-based login (/login) can
// authenticate admins, exactly like it does for patients and doctors:
//   1. Creates the Supabase auth user (email/password, email pre-confirmed)
//      with user_metadata.role = 'ADMIN' (admin-sidebar reads first/last name
//      from metadata for the display name).
//   2. Ensures the matching public.users row exists with role = 'ADMIN' so
//      `get_email_by_identifier` and ProtectedRoute can resolve the role.
//
// Usage (from the backend folder):
//   node scripts/createAdminUser.js                       # uses defaults below
//   node scripts/createAdminUser.js --email admin@medsync.io --password 'S3cret!'
//        --first-name System --last-name Admin
//   node scripts/createAdminUser.js --reset-password      # also updates an
//                                                         # existing account's password
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

// ── CLI argument parsing (--key value pairs) ────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// ── Admin credentials (defaults mirror seedTestDoctor.js style) ─────────────
const ADMIN = {
  email: args['email'] || 'admin@medsync.io',
  password: args['password'] || 'Admin@123',
  first_name: args['first-name'] || 'System',
  last_name: args['last-name'] || 'Admin',
};
ADMIN.username = args['username'] || ADMIN.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
const resetPassword = args['reset-password'] === true;

// ── Basic validation (Supabase rejects shorter passwords anyway) ────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!EMAIL_RE.test(ADMIN.email)) {
  console.error(`Invalid email: ${ADMIN.email}`);
  process.exit(1);
}
if (typeof ADMIN.password !== 'string' || ADMIN.password.length < 8) {
  console.error('Password must be at least 8 characters long.');
  process.exit(1);
}

async function main() {
  try {
    console.log('=== PROVISIONING ADMIN ACCOUNT ===\n');

    // 1. Check if the public.users row already exists for this email
    const { data: existingUsers, error: searchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', ADMIN.email);

    if (searchError) {
      console.error('Error checking existing user:', searchError.message);
    }

    let userId;
    const alreadyExists = existingUsers && existingUsers.length > 0;

    if (alreadyExists) {
      // Account already provisioned — reuse its id (public.users.id is
      // linked to the auth.users id across this project).
      userId = existingUsers[0].id;
      console.log(`ℹ️ Admin already exists: ${ADMIN.email} (${userId})`);

      // Optional: rotate the password of the existing auth user
      if (resetPassword) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { password: ADMIN.password }
        );
        if (updateError) {
          console.error('Error resetting password:', updateError.message);
        } else {
          console.log('✅ Password updated for existing admin account');
        }
      }
    } else {
      // 2. Create the auth user with role ADMIN in user_metadata
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN.email,
        password: ADMIN.password,
        email_confirm: true,
        user_metadata: {
          username: ADMIN.username,
          role: 'ADMIN',
          first_name: ADMIN.first_name,
          last_name: ADMIN.last_name,
          terms_accepted: true,
        },
      });

      if (authError) {
        console.error('Error creating auth user:', authError.message);
        process.exit(1);
      }

      userId = authUser.user.id;
      console.log(`✅ Auth user created: ${ADMIN.email} (${userId})`);
    }

    // 3. Ensure the public.users row exists with role = 'ADMIN'
    //    (safe against projects that auto-insert it via an auth trigger)
    const { data: userRow } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!userRow) {
      const { error: insertError } = await supabase.from('users').insert({
        id: userId,
        username: ADMIN.username,
        email: ADMIN.email,
        // Real password verification is handled by Supabase Auth; this column
        // is legacy/optional in this project.
        password_hash: 'supabase-auth-managed',
        role: 'ADMIN',
        terms_accepted: true,
        is_verified: true,
      });

      if (insertError) {
        console.error('Error creating users row:', insertError.message);
        process.exit(1);
      }
      console.log('✅ public.users row created with role ADMIN');
    } else if ((userRow.role || '').toUpperCase() !== 'ADMIN') {
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'ADMIN' })
        .eq('id', userId);

      if (roleError) {
        console.error('Error updating role:', roleError.message);
        process.exit(1);
      }
      console.log(`✅ Role updated: ${userRow.role} -> ADMIN`);
    } else {
      console.log('ℹ️ public.users row already has role ADMIN');
    }

    // 4. Verify
    console.log('\n=== VERIFICATION ===');
    const { data: verifyRow } = await supabase
      .from('users')
      .select('id, username, email, role, is_verified')
      .eq('id', userId)
      .single();

    if (verifyRow) {
      console.log(`Admin: ${ADMIN.first_name} ${ADMIN.last_name} (@${verifyRow.username})`);
      console.log(`Email: ${verifyRow.email}`);
      console.log(`Role: ${verifyRow.role}`);
      console.log(`Verified: ${verifyRow.is_verified}`);
    }

    console.log('\n=== ADMIN CREDENTIALS ===');
    console.log(`Email: ${ADMIN.email}`);
    console.log(`Password: ${!alreadyExists || resetPassword ? ADMIN.password : '(unchanged — rerun with --reset-password to set it)'}`);
    console.log('\nLog in at /login with these credentials; the shared role-based');
    console.log('login will redirect ADMIN accounts to the admin dashboard.');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exitCode = 1;
  }
}

main();
