// backend/scripts/testConfirmScan.js
// End-to-end test for the Admin "Scan QR" confirm flow:
//   1. GET  /api/admin/scan/:id          -> full detail card (status PENDING / UNPAID)
//   2. POST /api/admin/scan/:id/confirm  -> status COMPLETED + payment_status PAID
//   3. GET  /api/admin/scan/:id          -> detail card reflects COMPLETED / PAID
//   4. POST confirm again                -> 409 (already completed)
//   5. Direct DB check of the appointments row
// Usage: node scripts/testConfirmScan.js <appointmentId>
import 'dotenv/config';

const BASE = process.env.TEST_API_BASE || 'http://localhost:5000/api';
const appointmentId = process.argv[2];

if (!appointmentId) {
  console.error('Usage: node scripts/testConfirmScan.js <appointmentId>');
  process.exit(1);
}

const showDetail = (appt) => {
  console.log(`   Verification code : ${appt.verificationCode}`);
  console.log(`   Patient           : ${appt.patient.name} (${appt.patient.relationship})`);
  console.log(`   Doctor            : ${appt.doctor.name} · ${appt.doctor.specialty}`);
  console.log(`   Schedule          : ${appt.dateLabel} · ${appt.timeLabel}`);
  console.log(`   Queue number      : ${appt.queueNumber}`);
  console.log(`   Appointment status: ${appt.status}`);
  console.log(`   Payment           : ${appt.payment.status} · ${appt.payment.method || '—'} · LKR ${appt.payment.amount ?? '—'}`);
};

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

let failed = 0;
const assert = (cond, label) => {
  console.log(`   ${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failed += 1;
};

console.log(`\n── 1. Scan QR (GET /admin/scan/${appointmentId.slice(0, 8)}…) ──`);
const getRes = await fetch(`${BASE}/admin/scan/${appointmentId}`);
console.log(`   HTTP ${getRes.status}`);
if (!getRes.ok) {
  console.error('   Scan failed — aborting.');
  process.exit(1);
}
const detail = (await getRes.json()).data.appointment;
showDetail(detail);
assert(detail.status === 'PENDING', 'status starts as PENDING');
assert(detail.payment.status === 'UNPAID', 'payment starts as UNPAID');

console.log('\n── 2. Confirm (POST /admin/scan/:id/confirm) ──');
const confirmRes = await fetch(`${BASE}/admin/scan/${appointmentId}/confirm`, { method: 'POST' });
console.log(`   HTTP ${confirmRes.status}`);
const confirmJson = await confirmRes.json();
console.log(`   Response: ${JSON.stringify(confirmJson.data?.appointment || confirmJson)}`);
assert(confirmRes.status === 200, 'confirm returns 200');
assert(confirmJson.data?.appointment?.status === 'COMPLETED', 'status -> COMPLETED');
assert(confirmJson.data?.appointment?.payment_status === 'PAID', 'payment_status -> PAID');

console.log('\n── 3. Re-scan QR (detail card reflects the change) ──');
const regetRes = await fetch(`${BASE}/admin/scan/${appointmentId}`);
const redetail = (await regetRes.json()).data.appointment;
console.log(`   Appointment status: ${redetail.status}`);
console.log(`   Payment           : ${redetail.payment.status}`);
assert(redetail.status === 'COMPLETED', 're-scan shows COMPLETED');
assert(redetail.payment.status === 'PAID', 're-scan shows PAID');

console.log('\n── 4. Double-confirm guard ──');
const again = await fetch(`${BASE}/admin/scan/${appointmentId}/confirm`, { method: 'POST' });
const againJson = await again.json().catch(() => ({}));
console.log(`   HTTP ${again.status} · ${againJson.message || ''}`);
assert(again.status === 409, 'second confirm returns 409 already-completed');

console.log('\n── 5. Direct DB verification ──');
const { data: row, error } = await supabase
  .from('appointments')
  .select('id, status, payment_status')
  .eq('id', appointmentId)
  .maybeSingle();
if (error) {
  console.log(`   ❌ DB error: ${error.message}`);
  failed += 1;
} else {
  console.log(`   DB row: ${JSON.stringify(row)}`);
  assert(row?.status === 'COMPLETED', 'DB appointments.status = COMPLETED');
  assert(row?.payment_status === 'PAID', 'DB appointments.payment_status = PAID');
}

console.log(failed === 0 ? '\n🎉 ALL CHECKS PASSED' : `\n💥 ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
