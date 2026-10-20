import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kektcetsfqwrdbeqmqbf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtla3RjZXRzZnF3cmRiZXFtcWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTE2NzcsImV4cCI6MjEwMDk2NzY3N30.fVq-7nIWeoyAwVt3T9PK0Q0IcECV7OetrXeQinhfH60';
const API = 'http://localhost:5000/api';

const stamp = Date.now().toString().slice(-6);
const creds = {
  username: `testdoc_${stamp}`,
  email: `testdoctor.${stamp}@medsync.test`,
  password: `TestDoc${stamp}!`,
  first_name: 'Test',
  last_name: `Doctor ${stamp}`,
  medical_license_no: `SLMC-TEST-${stamp}`,
  specialization: 'General Medicine',
  experience_years: 5,
  consultation_fee: 5000,
  education: 'MBBS - Test University',
  description: 'Auto-generated test doctor for login verification.',
};

console.log('--- STEP 1: Create doctor via POST /api/admin/doctors ---');
console.log('Payload:', JSON.stringify({ ...creds, password: '***hidden***' }));

const createRes = await fetch(`${API}/admin/doctors`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(creds),
});
const createBody = await createRes.json().catch(() => ({}));
console.log(`Create status: ${createRes.status}`);
console.log('Create response:', JSON.stringify(createBody, null, 2));

if (createRes.status !== 201) {
  console.error('CREATE FAILED — aborting login test.');
  process.exit(1);
}

const userId = createBody.user?.id;
const doctorId = createBody.profile?.id;
console.log(`\nCreated user_id=${userId} doctor_id=${doctorId} is_approved=${createBody.profile?.is_approved}`);

console.log('\n--- STEP 2: Login test (mirrors frontend Login.jsx) ---');
const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// 2a. RPC identifier -> email
const { data: rpcData, error: rpcError } = await supabase.rpc('get_email_by_identifier', {
  p_identifier: creds.email,
});
if (rpcError) {
  console.error('RPC FAILED:', rpcError.message);
  process.exit(1);
}
const resolved = Array.isArray(rpcData) ? rpcData[0] : rpcData;
console.log('RPC resolved:', JSON.stringify(resolved));
if (!resolved?.user_email) {
  console.error('RPC did not resolve the new doctor email — login cannot proceed.');
  process.exit(1);
}

// 2b. signInWithPassword
const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
  email: resolved.user_email,
  password: creds.password,
});
if (authError) {
  console.error('LOGIN FAILED:', authError.message);
  process.exit(1);
}
console.log('LOGIN SUCCESS!');
console.log(`  auth user id : ${signInData.user?.id}`);
console.log(`  email        : ${signInData.user?.email}`);
console.log(`  metadata role: ${signInData.user?.user_metadata?.role}`);
console.log(`  RPC role     : ${resolved.user_role}`);
console.log(`  session?     : ${!!signInData.session}`);

// 2c. Role + approval checks
const role = (resolved.user_role || signInData.user?.user_metadata?.role || '').toUpperCase();
console.log(`  role check (expect DOCTOR): ${role} ${role === 'DOCTOR' ? 'PASS' : 'FAIL'}`);

// 2d. Doctor profile resolvable via backend (GET /doctor/profile/:userId)
try {
  const r = await fetch(`${API}/doctor/profile/${userId}`);
  const b = await r.json().catch(() => ({}));
  console.log(`  GET /doctor/profile/:userId -> ${r.status}, isApproved=${b.doctor?.isApproved}`);
} catch (e) {
  console.log('  GET /doctor/profile check skipped:', e.message);
}

// 2e. Visible in approved list?
try {
  const r = await fetch(`${API}/doctors`);
  const b = await r.json().catch(() => ({}));
  const list = b.doctors || b.data?.doctors || [];
  const found = list.some((d) => d.id === doctorId);
  console.log(`  GET /doctors approved list -> ${r.status}, count=${list.length}, new doctor visible=${found}`);
} catch (e) {
  console.log('  GET /doctors check skipped:', e.message);
}

await supabase.auth.signOut().catch(() => {});

console.log('\n===== CREDENTIALS (use on Login page) =====');
console.log(`Email    : ${creds.email}`);
console.log(`Username : ${creds.username}`);
console.log(`Password : ${creds.password}`);
console.log(`License  : ${creds.medical_license_no}`);
console.log(`Doctor ID: ${doctorId}`);
console.log(`User ID  : ${userId}`);
console.log('Login URL: http://localhost:5173/login (identifier field accepts this email)');
console.log('Expected redirect after login: /doctor (DOCTOR role)');
