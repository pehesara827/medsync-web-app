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
const backendUrl = 'http://localhost:5000';

let passed = 0;
let failed = 0;

const check = (name, condition, detail = '') => {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${detail}`);
  }
};

// Format a Date to HH:MM:SS
const toTimeStr = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

async function main() {
  let tempScheduleId = null;
  let originalSchedule = null;

  try {
    console.log('=== TESTING DOCTOR SCHEDULE MANAGER ===\n');

    // ── 1. Find a test doctor ──────────────────────────────────────
    console.log('--- Finding test doctor ---');
    const { data: doctor, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('id, first_name, last_name')
      .limit(1)
      .single();

    if (doctorError || !doctor) {
      console.error('❌ No doctor found. Run seedTestDoctor.js first.');
      process.exit(1);
    }
    console.log(`  ✅ Found doctor: ${doctor.first_name} ${doctor.last_name} (${doctor.id})`);

    // ── 2. Create a temporary "active" schedule slot for today ─────
    console.log('\n--- Creating temporary active schedule slot ---');
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const today = now.toISOString().split('T')[0];

    const { data: tempSchedule, error: insertError } = await supabase
      .from('doctor_schedules')
      .insert({
        doctor_id: doctor.id,
        available_date: today,
        start_time: toTimeStr(start),
        end_time: toTimeStr(end),
        consultation_fee: 5000.0,
        is_booked: false,
        max_patients: 5,
        current_appointment: 2,
        delay_minutes: 0,
        is_delayed: false,
      })
      .select('id, available_date, start_time, end_time, max_patients, current_appointment, is_booked, delay_minutes, is_delayed')
      .single();

    if (insertError || !tempSchedule) {
      console.error('❌ Failed to create temp schedule:', insertError?.message);
      process.exit(1);
    }
    tempScheduleId = tempSchedule.id;
    console.log(`  ✅ Temp schedule created: ${tempSchedule.available_date} ${tempSchedule.start_time}-${tempSchedule.end_time} (id: ${tempScheduleId})`);

    // ── 3. GET /api/doctor/session/current/:doctorId ───────────────
    console.log('\n--- Testing GET /api/doctor/session/current/:doctorId ---');
    let res = await fetch(`${backendUrl}/api/doctor/session/current/${doctor.id}`);
    let data = await res.json();
    check('Returns 200', res.status === 200, `(got ${res.status})`);
    check('Has currentTime', data.session?.currentTime, JSON.stringify(data.session));
    check('Has scheduledStart', data.session?.scheduledStart, JSON.stringify(data.session));
    check('Has scheduledEnd', data.session?.scheduledEnd, JSON.stringify(data.session));
    check('isDelayed is false initially', data.session?.isDelayed === false, `(got ${data.session?.isDelayed})`);
    check('delayMinutes is 0 initially', data.session?.delayMinutes === 0, `(got ${data.session?.delayMinutes})`);

    // ── 4. POST /api/doctor/session/delay/:doctorId { minutes: 30 } ─
    console.log('\n--- Testing POST /api/doctor/session/delay/:doctorId (30 min) ---');
    res = await fetch(`${backendUrl}/api/doctor/session/delay/${doctor.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: 30 }),
    });
    data = await res.json();
    check('Returns 200', res.status === 200, `(got ${res.status})`);
    check('isDelayed is true', data.session?.isDelayed === true, `(got ${data.session?.isDelayed})`);
    check('delayMinutes is 30', data.session?.delayMinutes === 30, `(got ${data.session?.delayMinutes})`);
    check('delayReportedAt is set', Boolean(data.session?.delayReportedAt), `(got ${data.session?.delayReportedAt})`);

    // Verify DB row
    const { data: dbRow } = await supabase
      .from('doctor_schedules')
      .select('delay_minutes, is_delayed, delay_reported_at')
      .eq('id', tempScheduleId)
      .single();
    check('DB delay_minutes = 30', dbRow?.delay_minutes === 30, `(got ${dbRow?.delay_minutes})`);
    check('DB is_delayed = true', dbRow?.is_delayed === true, `(got ${dbRow?.is_delayed})`);
    check('DB delay_reported_at set', Boolean(dbRow?.delay_reported_at), `(got ${dbRow?.delay_reported_at})`);

    // ── 5. POST with { minutes: 0 } clears the delay ───────────────
    console.log('\n--- Testing POST /api/doctor/session/delay/:doctorId (0 min clears) ---');
    res = await fetch(`${backendUrl}/api/doctor/session/delay/${doctor.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: 0 }),
    });
    data = await res.json();
    check('Returns 200', res.status === 200, `(got ${res.status})`);
    check('isDelayed is false', data.session?.isDelayed === false, `(got ${data.session?.isDelayed})`);
    check('delayMinutes is 0', data.session?.delayMinutes === 0, `(got ${data.session?.delayMinutes})`);
    check('delayReportedAt is null', data.session?.delayReportedAt === null, `(got ${data.session?.delayReportedAt})`);

    // ── 6. POST with invalid minutes returns 400 ───────────────────
    console.log('\n--- Testing validation (negative minutes) ---');
    res = await fetch(`${backendUrl}/api/doctor/session/delay/${doctor.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: -5 }),
    });
    data = await res.json();
    check('Returns 400', res.status === 400, `(got ${res.status})`);
    check('Has error message', Boolean(data.message), JSON.stringify(data));

    // ── 7. GET /api/doctor/schedule/:doctorId (capacity data) ──────
    console.log('\n--- Testing GET /api/doctor/schedule/:doctorId ---');
    res = await fetch(`${backendUrl}/api/doctor/schedule/${doctor.id}`);
    data = await res.json();
    check('Returns 200', res.status === 200, `(got ${res.status})`);
    const found = (data.schedules || []).find((s) => s.id === tempScheduleId);
    check('Temp schedule appears in list', Boolean(found), `(count: ${(data.schedules || []).length})`);
    check('Has max_patients', found?.max_patients === 5, `(got ${found?.max_patients})`);
    check('Has current_appointment', found?.current_appointment === 2, `(got ${found?.current_appointment})`);

    // ── 8. PUT /api/doctor/schedules/:scheduleId (update capacity) ─
    console.log('\n--- Testing PUT /api/doctor/schedules/:scheduleId (max_patients: 8) ---');
    res = await fetch(`${backendUrl}/api/doctor/schedules/${tempScheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_patients: 8 }),
    });
    data = await res.json();
    check('Returns 200', res.status === 200, `(got ${res.status})`);
    check('maxPatients is 8', data.schedule?.maxPatients === 8, `(got ${data.schedule?.maxPatients})`);
    check('currentAppointment is 2', data.schedule?.currentAppointment === 2, `(got ${data.schedule?.currentAppointment})`);
    check('isBooked is false (2 < 8)', data.schedule?.isBooked === false, `(got ${data.schedule?.isBooked})`);

    // ── 9. PUT with max_patients below current count → is_booked true ─
    console.log('\n--- Testing PUT with max_patients below current count ---');
    res = await fetch(`${backendUrl}/api/doctor/schedules/${tempScheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_patients: 1 }),
    });
    data = await res.json();
    check('Returns 200', res.status === 200, `(got ${res.status})`);
    check('isBooked is true (2 >= 1)', data.schedule?.isBooked === true, `(got ${data.schedule?.isBooked})`);

    // ── 10. PUT with invalid max_patients returns 400 ──────────────
    console.log('\n--- Testing PUT validation (max_patients: 0) ---');
    res = await fetch(`${backendUrl}/api/doctor/schedules/${tempScheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_patients: 0 }),
    });
    data = await res.json();
    check('Returns 400', res.status === 400, `(got ${res.status})`);
    check('Has error message', Boolean(data.message), JSON.stringify(data));

    // ── 11. GET session for a doctor with no active slot → 404 ─────
    console.log('\n--- Testing GET session with no active slot (404) ---');
    // Delete temp slot first so there's no active session
    await supabase.from('doctor_schedules').delete().eq('id', tempScheduleId);
    tempScheduleId = null;

    res = await fetch(`${backendUrl}/api/doctor/session/current/${doctor.id}`);
    data = await res.json();
    check('Returns 404', res.status === 404, `(got ${res.status})`);
    check('Has error message', Boolean(data.message), JSON.stringify(data));

    // ── Summary ────────────────────────────────────────────────────
    console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);
    console.log('✅ All schedule manager tests passed!');
  } catch (error) {
    console.error('\nTest failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup: remove temp schedule if still present
    if (tempScheduleId) {
      await supabase.from('doctor_schedules').delete().eq('id', tempScheduleId);
      console.log('\n🧹 Cleaned up temporary schedule.');
    }
  }
}

main();