import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const base = (over) => ({
  username: 'fixtest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
  email: 'fixtest.' + Date.now() + '.' + Math.random().toString(36).slice(2, 6) + '@medsync.test',
  password: 'TestPass123',
  terms_accepted: true,
  first_name: 'Fix',
  last_name: 'Tester',
  date_of_birth: '1990-01-01',
  gender: 'male',
  phone_number: '+1555' + Math.random().toString().slice(2, 12),
  national_id_passport: 'FIX' + Math.random().toString().slice(2, 12),
  emergency_contact_name: 'EC',
  emergency_contact_rel: 'Spouse',
  emergency_contact_phone: '+1444' + Math.random().toString().slice(2, 12),
  ...over,
});

const created = [];
const call = async (label, payload) => {
  const r = await fetch('http://localhost:5001/api/auth/register/patient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await r.text();
  let body = {};
  try { body = JSON.parse(txt); } catch {}
  console.log(`[${label}] status=${r.status} message="${body.message || ''}"`);
  if (r.status === 201 && body.user?.email) created.push(body.user.email);
  return r.status;
};

(async () => {
  // A: valid -> 201
  const a = base();
  await call('valid', a);
  // B: duplicate email -> 422
  await call('dup-email', { ...base(), email: a.email });
  // C: duplicate phone -> 409
  await call('dup-phone', { ...base(), phone_number: a.phone_number });
  // D: invalid date -> 400 (was 500)
  await call('bad-date', { ...base(), date_of_birth: 'not-a-date' });
  // E: missing first_name -> 400 (was 500)
  await call('missing-firstname', { ...base(), first_name: null });
  // F: missing password -> 400
  await call('missing-pwd', { ...base(), password: '' });
  // G: short password -> 400
  await call('short-pwd', { ...base(), password: '12' });

  // cleanup
  for (const email of created) {
    const { data: u } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = (u?.users || []).find((x) => x.email === email);
    if (user) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      console.log('deleted', email, error ? error.message : 'ok');
    }
  }
})();
