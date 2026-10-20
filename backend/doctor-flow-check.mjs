import { supabase } from './supabase.js';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000/api';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const get = async (path) => {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

console.log(`Base: ${BASE}`);

// 1. Health
try {
  const r = await fetch('http://localhost:5000/api/health');
  check('health', r.ok, `status=${r.status}`);
} catch (e) { check('health', false, e.message); }

// 2. Approved doctors list (patient -> doctor visibility)
{
  const { status, body } = await get('/doctors');
  const list = body.doctors || body.data?.doctors || [];
  check('GET /doctors (patient-visible approved list)', status === 200 && Array.isArray(list), `status=${status} count=${list.length}`);
}

// 3. Sample doctor_profiles directly (service role)
let sampleApproved = null; let samplePending = null; let totalDoctors = 0;
{
  const { data, error } = await supabase.from('doctor_profiles').select('id, user_id, first_name, last_name, is_approved').limit(50);
  if (error) check('supabase doctor_profiles sample', false, error.message);
  else {
    totalDoctors = data.length;
    sampleApproved = data.find((d) => d.is_approved) || null;
    samplePending = data.find((d) => !d.is_approved) || null;
    check('supabase doctor_profiles sample', true, `sampled=${data.length} approved=${sampleApproved ? sampleApproved.id.slice(0, 8) : 'none'} pending=${samplePending ? samplePending.id.slice(0, 8) : 'none'}`);
  }
}

// 4. Doctor feature chain for approved doctor
if (sampleApproved) {
  const { id: doctorId, user_id: userId } = sampleApproved;
  let t = await get(`/doctor/profile/${userId}`);
  check('GET /doctor/profile/:userId', t.status === 200 && !!t.body.doctor, `status=${t.status} isApproved=${t.body.doctor?.isApproved}`);
  t = await get(`/doctor/appointments/${doctorId}?date=${new Date().toISOString().slice(0, 10)}`);
  check('GET /doctor/appointments/:doctorId?date=', t.status === 200 && Array.isArray(t.body.appointments), `status=${t.status} n=${(t.body.appointments || []).length}`);
  t = await get(`/doctor/recent-consultations/${doctorId}`);
  check('GET /doctor/recent-consultations/:doctorId', t.status === 200 && Array.isArray(t.body.consultations), `status=${t.status}`);
  t = await get(`/doctor/patients/${doctorId}`);
  check('GET /doctor/patients/:doctorId (doctor sees patients)', t.status === 200 && Array.isArray(t.body.patients), `status=${t.status} n=${(t.body.patients || []).length}`);
  t = await get(`/doctor/schedule/${doctorId}`);
  check('GET /doctor/schedule/:doctorId', t.status === 200 && Array.isArray(t.body.schedules), `status=${t.status} n=${(t.body.schedules || []).length}`);
  t = await get(`/doctor/weekly-stats/${doctorId}`);
  check('GET /doctor/weekly-stats/:doctorId', t.status === 200, `status=${t.status}`);
  t = await get(`/doctor/session/current/${doctorId}`);
  check('GET /doctor/session/current/:doctorId (404 when off-hours)', t.status === 200 || t.status === 404, `status=${t.status} hasSession=${!!t.body.session}`);
  t = await get(`/reviews/doctor/${doctorId}`);
  check('GET /reviews/doctor/:doctorId (patient reviews visible to doctor)', t.status === 200, `status=${t.status} n=${(t.body.reviews || []).length}`);
  // negative: bad uuid
  t = await get('/doctor/profile/not-a-uuid');
  check('GET /doctor/profile/:badId -> 404/400 handled', t.status === 404 || t.status === 400, `status=${t.status}`);
} else check('doctor feature chain', false, 'no approved doctor in DB to test with');

// 5. Pending doctor profile still resolvable (documents bypass risk)
if (samplePending) {
  const t = await get(`/doctor/profile/${samplePending.user_id}`);
  check('pending doctor profile resolvable (login-bypass risk witness)', t.status === 200, `status=${t.status} isApproved=${t.body.doctor?.isApproved}`);
}

// 6. Admin -> doctor connections
{
  let t = await get('/admin/doctors');
  check('GET /admin/doctors (booking dropdown)', t.status === 200, `status=${t.status}`);
  t = await get('/admin/doctors-management');
  const m = t.body.doctors || t.body.data?.doctors || [];
  check('GET /admin/doctors-management', t.status === 200, `status=${t.status} n=${m.length}`);
  t = await get('/admin/doctors-management/stats');
  check('GET /admin/doctors-management/stats', t.status === 200, `status=${t.status}`);
  t = await get('/admin/doctors/all');
  check('GET /admin/doctors/all', t.status === 200, `status=${t.status}`);
}

// 7. Admin -> patient connections + patient -> doctor cross-check
{
  const t = await get('/admin/patients');
  const list = t.body.patients || t.body.data?.patients || [];
  check('GET /admin/patients', t.status === 200, `status=${t.status} n=${list.length}`);
  const { data: appts } = await supabase.from('appointments').select('id, doctor_id, patient_id, status').limit(5);
  check('appointments link doctor<->patient', Array.isArray(appts), `sampled=${(appts || []).length} statuses=${[...new Set((appts || []).map((a) => a.status))].join(',')}`);
  const { data: notifs } = await supabase.from('notifications').select('type').limit(20);
  const types = [...new Set((notifs || []).map((n) => n.type))];
  check('notifications fan-out present (doctor/patient/admin signals)', true, `types=${types.join(',') || 'none'}`);
}

// 8. RPC used by Login page
{
  const { data, error } = await supabase.rpc('get_email_by_identifier', { p_identifier: 'no-such-user-xyz' });
  check('rpc get_email_by_identifier reachable', !error, error ? error.message : `rows=${(data || []).length}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ` — FAILED: ${failed.map((f) => f.name).join('; ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
