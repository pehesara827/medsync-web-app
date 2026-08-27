// ─────────────────────────────────────────────────────────────────────────────
// _feature_test.mjs
// Validates all admin backend features using ISOLATED test data.
// Every created row is deleted in the finally block — no real data is mutated.
// Run: node scripts/_feature_test.mjs   (backend server must be on :5000)
// ─────────────────────────────────────────────────────────────────────────────
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const base = 'http://localhost:5000';

let passed = 0;
let failed = 0;
function assert(cond, label) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

const cleanup = {
  users: [],
  patientProfiles: [],
  doctorProfiles: [],
  schedules: [],
  appointments: [],
  payments: [],
  waitlists: [],
};

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

// Robust "latest notification for a user+type" lookup (handles 0..N rows).
async function latestNotif(userId, type) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

function suffix() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

async function createUser(role, prefix) {
  const s = suffix();
  const email = `${prefix}.${s}@medsynctest.local`;
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: `${prefix}${s}`,
      email,
      password_hash: 'test-hash',
      role,
      terms_accepted: true,
      is_verified: true,
    })
    .select()
    .single();
  if (error) throw error;
  cleanup.users.push(data.id);
  return data;
}

async function createTestPatient() {
  const user = await createUser('PATIENT', 'testpat');
  const { data, error } = await supabase
    .from('patient_profiles')
    .insert({
      user_id: user.id,
      first_name: 'Test',
      last_name: 'Patient',
      phone_number: '+1555' + Math.random().toString().slice(2, 12),
      date_of_birth: '1990-01-01',
      gender: 'male',
      national_id_passport: 'NID' + Math.random().toString().slice(2, 12),
      emergency_contact_name: 'EC Test',
      emergency_contact_rel: 'Spouse',
      emergency_contact_phone: '+1444' + Math.random().toString().slice(2, 12),
    })
    .select()
    .single();
  if (error) throw error;
  cleanup.patientProfiles.push(data.id);
  return data;
}

async function createTestDoctor() {
  const user = await createUser('DOCTOR', 'testdr');
  const { data, error } = await supabase
    .from('doctor_profiles')
    .insert({
      user_id: user.id,
      first_name: 'Test',
      last_name: 'Doctor',
      medical_license_no: 'TLIC' + suffix(),
      specialization: 'Test Medicine',
      experience_years: 3,
      is_approved: false,
      consultation_fee: 5000,
      rating: 4.0,
      review_count: 0,
      description: 'Initial bio',
      education: 'MBBS',
    })
    .select()
    .single();
  if (error) throw error;
  cleanup.doctorProfiles.push(data.id);
  return data;
}

async function createAppointment(doctorId, scheduleId, patientId, dateStr, status) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      booking_type: 'SELF',
      doctor_id: doctorId,
      schedule_id: scheduleId,
      appointment_date: dateStr,
      status,
    })
    .select()
    .single();
  if (error) throw error;
  cleanup.appointments.push(data.id);
  return data;
}

async function createPayment(appointmentId, method, status) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      appointment_id: appointmentId,
      amount: 5000,
      payment_method: method,
      payment_status: status,
    })
    .select()
    .single();
  if (error) throw error;
  cleanup.payments.push(data.id);
  return data;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  ADMIN BACKEND FEATURE TESTS (isolated test data)');
  console.log('════════════════════════════════════════════════════════════\n');

  // Shared fixtures reused across sections.
  let patient = null;
  let doctor = null;
  let schedule = null;

  try {
    // ── 0. Base fixtures ────────────────────────────────────────────────
    console.log('── 0. Creating isolated test fixtures ─────────────────────');
    patient = await createTestPatient();
    doctor = await createTestDoctor();
    console.log(`  ✅ patient=${patient.id.slice(0, 8)} doctor=${doctor.id.slice(0, 8)}`);

    // Create a schedule via the API (also tests POST /api/admin/schedules).
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split('T')[0];

    const creRes = await api('POST', '/api/admin/schedules', {
      doctor_id: doctor.id,
      available_date: dateStr,
      start_time: '10:00',
      end_time: '11:00',
      consultation_fee: 5000,
      max_patients: 5,
    });
    assert(creRes.status === 201 && creRes.json?.success === true, 'POST /api/admin/schedules -> 201');
    schedule = creRes.json?.data;
    assert(schedule && schedule.id, 'Created schedule returns id');
    cleanup.schedules.push(schedule.id);
    console.log(`  ✅ schedule=${schedule.id.slice(0, 8)} date=${dateStr}`);

    // ── A. PAYMENTS ─────────────────────────────────────────────────────
    console.log('\n── A. Payments & Bank Slip Verification ─────────────────');

    // A0. GET list (read-only, generic)
    const listRes = await api('GET', '/api/admin/payments?page=1&pageSize=5');
    assert(listRes.status === 200 && listRes.json?.success === true, 'GET /api/admin/payments -> success');
    assert(
      Array.isArray(listRes.json?.data?.payments) &&
        typeof listRes.json.data.total !== 'undefined',
      'GET payments returns payments[] + total'
    );

    // A1. verify-slip APPROVED
    const appt1 = await createAppointment(doctor.id, schedule.id, patient.id, dateStr, 'PENDING');
    const pay1 = await createPayment(appt1.id, 'BANK_TRANSFER', 'PENDING_SLIP_VERIFICATION');
    const approveRes = await api('PATCH', `/api/admin/payments/${pay1.id}/verify-slip`, {
      status: 'APPROVED',
      transactionId: 'TRX-TEST-01',
    });
    assert(approveRes.status === 200 && approveRes.json?.success === true, 'verify-slip APPROVED -> 200');

    const { data: pay1After } = await supabase.from('payments').select('*').eq('id', pay1.id).single();
    assert(pay1After.payment_status === 'PAID', 'payment_status -> PAID');
    assert(pay1After.paid_at !== null, 'paid_at set');
    assert(pay1After.transaction_id === 'TRX-TEST-01', 'transaction_id recorded');

    const { data: appt1After } = await supabase.from('appointments').select('*').eq('id', appt1.id).single();
    assert(appt1After.status === 'CONFIRMED', 'linked appointment -> CONFIRMED');

    const notif1 = await latestNotif(patient.user_id, 'PAYMENT_RECEIVED');
    assert(notif1 && notif1.type === 'PAYMENT_RECEIVED', 'PAYMENT_RECEIVED notification created');

    // A2. verify-slip REJECTED
    const appt2 = await createAppointment(doctor.id, schedule.id, patient.id, dateStr, 'PENDING');
    const pay2 = await createPayment(appt2.id, 'BANK_TRANSFER', 'PENDING_SLIP_VERIFICATION');
    const rejRes = await api('PATCH', `/api/admin/payments/${pay2.id}/verify-slip`, {
      status: 'REJECTED',
      rejectionReason: 'Unreadable slip',
    });
    assert(rejRes.status === 200 && rejRes.json?.success === true, 'verify-slip REJECTED -> 200');

    const { data: pay2After } = await supabase.from('payments').select('*').eq('id', pay2.id).single();
    assert(pay2After.payment_status === 'UNPAID', 'REJECTED payment_status -> UNPAID');

    const notif2 = await latestNotif(patient.user_id, 'GENERAL');
    assert(notif2 && notif2.type === 'GENERAL', 'REJECTED -> GENERAL notification created');

    // A3. collect-reception
    const appt3 = await createAppointment(doctor.id, schedule.id, patient.id, dateStr, 'PENDING');
    const pay3 = await createPayment(appt3.id, 'PAY_AT_RECEPTION', 'UNPAID');
    const colRes = await api('PATCH', `/api/admin/payments/${pay3.id}/collect-reception`, {});
    assert(colRes.status === 200 && colRes.json?.success === true, 'collect-reception -> 200');

    const { data: pay3After } = await supabase.from('payments').select('*').eq('id', pay3.id).single();
    assert(pay3After.payment_status === 'PAID' && pay3After.paid_at !== null, 'collect-reception -> PAID + paid_at');

    const { data: appt3After } = await supabase.from('appointments').select('*').eq('id', appt3.id).single();
    assert(appt3After.status === 'CONFIRMED', 'collect-reception appointment -> CONFIRMED');

    // A4. Payment error handling
    let e = await api('PATCH', '/api/admin/payments/not-a-uuid/verify-slip', { status: 'APPROVED' });
    assert(e.status === 400 && e.json?.success === false, 'verify-slip invalid UUID -> 400');
    e = await api('PATCH', '/api/admin/payments/00000000-0000-0000-0000-000000000000/verify-slip', { status: 'APPROVED' });
    assert(e.status === 404 && e.json?.success === false, 'verify-slip unknown id -> 404');
    e = await api('PATCH', `/api/admin/payments/${pay1.id}/verify-slip`, { status: 'MAYBE' });
    assert(e.status === 400 && e.json?.success === false, 'verify-slip bad status -> 400');


    // ── B. SCHEDULES & CAPACITY MANAGEMENT ───────────────────────────────
    console.log('\n── B. Schedules & Capacity Management ───────────────────');

    // B1. GET all schedules list (read-only)
    const schedList = await api('GET', '/api/admin/schedules/all');
    assert(schedList.status === 200 && schedList.json?.success === true, 'GET /api/admin/schedules/all -> success');
    const schedRows = schedList.json?.data?.schedules || [];
    assert(Array.isArray(schedRows) && schedRows.length > 0, 'schedules list non-empty');
    const firstSched = schedRows[0];
    assert(
      typeof firstSched.capacityRatio === 'number' &&
        typeof firstSched.isDelayed === 'boolean' &&
        typeof firstSched.doctorName !== 'undefined',
      'schedule row has capacityRatio, isDelayed, doctorName'
    );

    // B2. broadcast-delay triggers SESSION_DELAY notifications
    const delayAppt = await createAppointment(doctor.id, schedule.id, patient.id, dateStr, 'CONFIRMED');
    const delayRes = await api('POST', `/api/admin/schedules/${schedule.id}/broadcast-delay`, {
      minutes: 15,
    });
    assert(delayRes.status === 200 && delayRes.json?.success === true, 'broadcast-delay -> 200');
    assert(delayRes.json?.data?.notifiedCount >= 1, `broadcast-delay notified ${delayRes.json?.data?.notifiedCount} user(s)`);

    const { data: schedAfter } = await supabase
      .from('doctor_schedules')
      .select('is_delayed, delay_minutes, delay_reported_at')
      .eq('id', schedule.id)
      .single();
    assert(schedAfter.is_delayed === true, 'schedule is_delayed -> true');
    assert(schedAfter.delay_minutes === 15, 'schedule delay_minutes -> 15');
    assert(schedAfter.delay_reported_at !== null, 'delay_reported_at set');

    const delayNotif = await latestNotif(patient.user_id, 'SESSION_DELAY');
    assert(delayNotif && delayNotif.type === 'SESSION_DELAY', 'SESSION_DELAY notification created');

    // B3. emergency-cancel
    const cancelAppt = await createAppointment(doctor.id, schedule.id, patient.id, dateStr, 'CONFIRMED');
    const cancelRes = await api('DELETE', `/api/admin/schedules/${schedule.id}/emergency-cancel`);
    assert(cancelRes.status === 200 && cancelRes.json?.success === true, 'emergency-cancel -> 200');
    assert(cancelRes.json?.data?.cancelledAppointments >= 1, 'emergency-cancel cancelled >= 1 appointment');

    const { data: cancelledAppts } = await supabase
      .from('appointments')
      .select('status')
      .eq('schedule_id', schedule.id)
      .eq('status', 'CANCELLED');
    assert(cancelledAppts && cancelledAppts.length >= 1, 'linked appointment(s) -> CANCELLED');

    const cancelNotif = await latestNotif(patient.user_id, 'APPOINTMENT_CANCELLED');
    assert(cancelNotif && cancelNotif.type === 'APPOINTMENT_CANCELLED', 'APPOINTMENT_CANCELLED notification created');

    // B4. Schedule error handling
    e = await api('POST', `/api/admin/schedules/not-a-uuid/broadcast-delay`, { minutes: 10 });
    assert(e.status === 400 && e.json?.success === false, 'broadcast-delay invalid UUID -> 400');
    e = await api('DELETE', '/api/admin/schedules/00000000-0000-0000-0000-000000000000/emergency-cancel');
    assert(e.status === 404 && e.json?.success === false, 'emergency-cancel unknown id -> 404');
    e = await api('POST', '/api/admin/schedules', {});
    assert(e.status === 400 && e.json?.success === false, 'create schedule missing fields -> 400');


    // ── C. DOCTOR ADMINISTRATION ─────────────────────────────────────────
    console.log('\n── C. Doctor Administration ──────────────────────────────');

    // C1. GET all doctors
    const docList = await api('GET', '/api/admin/doctors/all');
    assert(docList.status === 200 && docList.json?.success === true, 'GET /api/admin/doctors/all -> success');
    const docRows = docList.json?.data?.doctors || [];
    assert(docRows.length > 0, 'doctors list non-empty');
    assert(
      typeof docRows[0].isVerified === 'boolean' &&
        typeof docRows[0].isApproved === 'boolean' &&
        typeof docRows[0].email !== 'undefined',
      'doctor row has isVerified, isApproved, email'
    );

    // C2. approve toggle + notification
    const approveDocRes = await api('PATCH', `/api/admin/doctors/${doctor.id}/approve`, {
      isApproved: true,
    });
    assert(approveDocRes.status === 200 && approveDocRes.json?.success === true, 'approve doctor -> 200');
    assert(approveDocRes.json?.data?.doctor?.isApproved === true, 'doctor isApproved -> true');

    const { data: docAfter } = await supabase
      .from('doctor_profiles')
      .select('is_approved')
      .eq('id', doctor.id)
      .single();
    assert(docAfter.is_approved === true, 'doctor_profiles.is_approved -> true');

    const docNotif = await latestNotif(doctor.user_id, 'GENERAL');
    assert(docNotif && docNotif.type === 'GENERAL', 'GENERAL notification sent to doctor');

    // C3. Update doctor info
    const infoRes = await api('PUT', `/api/admin/doctors/${doctor.id}/info`, {
      consultation_fee: 7500,
      experience_years: 5,
      description: 'Updated bio',
      education: 'MD, Fellowship',
    });
    assert(infoRes.status === 200 && infoRes.json?.success === true, 'update doctor info -> 200');
    assert(infoRes.json?.data?.doctor?.consultationFee === 7500, 'consultationFee -> 7500');
    assert(infoRes.json?.data?.doctor?.experienceYears === 5, 'experienceYears -> 5');

    const { data: docAfterInfo } = await supabase
      .from('doctor_profiles')
      .select('consultation_fee, experience_years, description, education')
      .eq('id', doctor.id)
      .single();
    assert(docAfterInfo.consultation_fee === 7500, 'DB consultation_fee -> 7500');
    assert(docAfterInfo.experience_years === 5, 'DB experience_years -> 5');
    assert(docAfterInfo.description === 'Updated bio', 'DB description updated');
    assert(docAfterInfo.education === 'MD, Fellowship', 'DB education updated');

    // C4. Doctor error handling
    e = await api('PATCH', '/api/admin/doctors/not-a-uuid/approve', { isApproved: true });
    assert(e.status === 400 && e.json?.success === false, 'approve invalid UUID -> 400');
    e = await api('PUT', `/api/admin/doctors/${doctor.id}/info`, {});
    assert(e.status === 400 && e.json?.success === false, 'update doctor empty body -> 400');
    e = await api('PUT', '/api/admin/doctors/00000000-0000-0000-0000-000000000000/info', { consultation_fee: 100 });
    assert(e.status === 404 && e.json?.success === false, 'update doctor unknown id -> 404');


    // ── D. WAITLIST HANDLING ─────────────────────────────────────────────
    console.log('\n── D. Waitlist Handling ─────────────────────────────────');

    // Create a fresh schedule via API for waitlist testing (previous one may be
    // marked delayed/cancelled by the earlier sections).
    const creRes2 = await api('POST', '/api/admin/schedules', {
      doctor_id: doctor.id,
      available_date: dateStr,
      start_time: '14:00',
      end_time: '15:00',
      consultation_fee: 5000,
      max_patients: 3,
    });
    const waitSched = creRes2.json?.data;
    assert(waitSched && waitSched.id, 'created waitlist schedule');
    cleanup.schedules.push(waitSched.id);

    // A second patient so the FIFO unique(patient_id, schedule_id) constraint
    // allows two distinct waitlist entries on the same schedule.
    const patient2 = await createTestPatient();

    // Create waitlist entries (two, to test FIFO ordering)
    const wl1 = await supabase
      .from('appointment_waitlists')
      .insert({
        patient_id: patient.id,
        doctor_id: doctor.id,
        schedule_id: waitSched.id,
        booking_type: 'SELF',
        status: 'WAITING',
      })
      .select()
      .single();
    if (wl1.error) throw wl1.error;
    cleanup.waitlists.push(wl1.data.id);

    const wl2 = await supabase
      .from('appointment_waitlists')
      .insert({
        patient_id: patient2.id,
        doctor_id: doctor.id,
        schedule_id: waitSched.id,
        booking_type: 'SELF',
        status: 'WAITING',
      })
      .select()
      .single();
    if (wl2.error) throw wl2.error;
    cleanup.waitlists.push(wl2.data.id);

    // D1. GET FIFO queue
    const wlList = await api('GET', `/api/admin/waitlists/${waitSched.id}`);
    assert(wlList.status === 200 && wlList.json?.success === true, 'GET waitlists -> success');
    const wlRows = wlList.json?.data?.waitlist || [];
    assert(wlRows.length === 2, 'waitlist returns 2 entries');
    assert(
      new Date(wlRows[0].createdAt) <= new Date(wlRows[1].createdAt),
      'FIFO order by created_at ascending'
    );
    assert(wlRows[0].patientName && wlRows[0].patientUserId, 'waitlist row has patient join');

    // D2. manual-notify
    const notifyRes = await api('POST', `/api/admin/waitlists/${wl1.data.id}/manual-notify`, {});
    assert(notifyRes.status === 200 && notifyRes.json?.success === true, 'manual-notify -> 200');

    const { data: wl1After } = await supabase
      .from('appointment_waitlists')
      .select('status, expires_at, notified_at')
      .eq('id', wl1.data.id)
      .single();
    assert(wl1After.status === 'NOTIFIED', 'waitlist status -> NOTIFIED');
    assert(wl1After.notified_at !== null, 'notified_at set');
    const expiresInMs = new Date(wl1After.expires_at) - new Date(wl1After.notified_at);
    const allowedDeltaMs = 30 * 60 * 1000;
    assert(
      Math.abs(expiresInMs - allowedDeltaMs) < 60 * 1000,
      `expires_at ≈ now + 30 min (delta ${Math.round(expiresInMs / 1000)}s)`
    );

    const wlNotif = await latestNotif(patient.user_id, 'WAITLIST_OFFER');
    assert(wlNotif && wlNotif.type === 'WAITLIST_OFFER', 'WAITLIST_OFFER notification created');

    // D3. Waitlist error handling
    e = await api('GET', '/api/admin/waitlists/not-a-uuid');
    assert(e.status === 400 && e.json?.success === false, 'waitlist invalid UUID -> 400');
    e = await api('POST', '/api/admin/waitlists/00000000-0000-0000-0000-000000000000/manual-notify', {});
    assert(e.status === 404 && e.json?.success === false, 'manual-notify unknown id -> 404');

    // ── E. Notification type compliance (only 6 allowed types used) ──────
    console.log('\n── E. Notification type compliance ───────────────────────');
    const allowedTypes = [
      'WAITLIST_OFFER',
      'APPOINTMENT_CONFIRMED',
      'APPOINTMENT_CANCELLED',
      'SESSION_DELAY',
      'PAYMENT_RECEIVED',
      'GENERAL',
    ];
    const { data: createdNotifTypes } = await supabase
      .from('notifications')
      .select('type')
      .in('user_id', [patient.user_id, doctor.user_id]);
    const seen = new Set((createdNotifTypes || []).map((n) => n.type));
    const allValid = (createdNotifTypes || []).every((n) => allowedTypes.includes(n.type));
    assert(allValid, 'all created notifications use valid type enum');


    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('════════════════════════════════════════════════════════════\n');
    if (failed > 0) {
      console.log('❌ Some assertions failed. See details above.');
      process.exitCode = 1;
    } else {
      console.log('✅ ALL ADMIN FEATURE TESTS PASSED');
    }
  } catch (error) {
    console.error('\n❌ Test crashed:', error);
    process.exitCode = 1;
  } finally {
    // ── Cleanup: delete every test-created row ───────────────────────────
    console.log('\n── Cleanup ──────────────────────────────────────────────');
    const delTable = async (table, ids) => {
      if (!ids || ids.length === 0) return 0;
      let n = 0;
      for (const id of ids) {
        try {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (!error) n++;
        } catch {}
      }
      return n;
    };

    await delTable('appointment_waitlists', cleanup.waitlists);
    await delTable('payments', cleanup.payments);
    await delTable('appointments', cleanup.appointments);
    await delTable('doctor_schedules', cleanup.schedules);
    await delTable('doctor_profiles', cleanup.doctorProfiles);
    await delTable('patient_profiles', cleanup.patientProfiles);
    await delTable('users', cleanup.users);

    // Cleanup notifications referencing test users (not FK-linked, only via user_id)
    for (const uid of [...cleanup.users]) {
      try {
        await supabase.from('notifications').delete().eq('user_id', uid);
      } catch {}
    }

    console.log('  ✅ Test data cleaned up');
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});

