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

// Test doctor credentials
const TEST_DOCTOR = {
  email: 'dr.alex.kumar@medsync.test',
  password: 'Doctor@123',
  username: 'dr_alex_kumar',
  first_name: 'Alex',
  last_name: 'Kumar',
  medical_license_no: 'LIC-MEDSYNC-2026-002',
  specialization: 'Dermatology',
  experience_years: 8,
  doctor_image: 'https://images.unsplash.com/photo-1612349476857-6ca8ce6e3a1f?auto=format&fit=crop&q=80&w=300',
};

// Test patient credentials
const TEST_PATIENT = {
  email: 'test.patient@medsync.test',
  password: 'Patient@123',
  username: 'test_patient_01',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1990-05-15',
  gender: 'Male',
  phone_number: '+94771234567',
  national_id_passport: '199015401234',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_rel: 'Spouse',
  emergency_contact_phone: '+94779876543',
  blood_group: 'O+',
  home_address: '123, Main Street, Colombo, Sri Lanka',
};

// Schedule plan for today + next 7 days.
// Each entry defines the slots for that day and which slots get appointments.
// statuses array aligns with the first N slots (booked). Empty array = all slots available.
const SCHEDULE_PLAN = [
  {
    daysFromToday: 0, // Today
    slots: [
      { start_time: '09:00:00', end_time: '09:30:00' },
      { start_time: '10:30:00', end_time: '11:00:00' },
      { start_time: '14:00:00', end_time: '14:30:00' },
      { start_time: '15:30:00', end_time: '16:00:00' },
    ],
    statuses: ['PENDING', 'CONFIRMED', 'COMPLETED', 'PENDING'],
  },
  {
    daysFromToday: 1, // Tomorrow
    slots: [
      { start_time: '08:00:00', end_time: '08:30:00' },
      { start_time: '09:30:00', end_time: '10:00:00' },
      { start_time: '11:00:00', end_time: '11:30:00' },
      { start_time: '14:30:00', end_time: '15:00:00' },
      { start_time: '16:00:00', end_time: '16:30:00' },
    ],
    statuses: ['CONFIRMED', 'PENDING', 'CONFIRMED'],
  },
  {
    daysFromToday: 2,
    slots: [
      { start_time: '09:00:00', end_time: '09:30:00' },
      { start_time: '10:00:00', end_time: '10:30:00' },
      { start_time: '11:30:00', end_time: '12:00:00' },
      { start_time: '15:00:00', end_time: '15:30:00' },
    ],
    statuses: ['PENDING', 'CONFIRMED'],
  },
  {
    daysFromToday: 3,
    slots: [
      { start_time: '08:30:00', end_time: '09:00:00' },
      { start_time: '10:00:00', end_time: '10:30:00' },
      { start_time: '13:00:00', end_time: '13:30:00' },
      { start_time: '14:30:00', end_time: '15:00:00' },
      { start_time: '16:30:00', end_time: '17:00:00' },
    ],
    statuses: ['CONFIRMED'],
  },
  {
    daysFromToday: 4,
    slots: [
      { start_time: '09:00:00', end_time: '09:30:00' },
      { start_time: '11:00:00', end_time: '11:30:00' },
      { start_time: '14:00:00', end_time: '14:30:00' },
      { start_time: '15:30:00', end_time: '16:00:00' },
    ],
    statuses: [], // All available
  },
  {
    daysFromToday: 5,
    slots: [
      { start_time: '08:00:00', end_time: '08:30:00' },
      { start_time: '09:30:00', end_time: '10:00:00' },
      { start_time: '11:30:00', end_time: '12:00:00' },
      { start_time: '14:00:00', end_time: '14:30:00' },
      { start_time: '16:00:00', end_time: '16:30:00' },
    ],
    statuses: [], // All available
  },
  {
    daysFromToday: 6,
    slots: [
      { start_time: '09:00:00', end_time: '09:30:00' },
      { start_time: '10:30:00', end_time: '11:00:00' },
      { start_time: '14:30:00', end_time: '15:00:00' },
    ],
    statuses: [], // All available
  },
  {
    daysFromToday: 7,
    slots: [
      { start_time: '08:30:00', end_time: '09:00:00' },
      { start_time: '10:00:00', end_time: '10:30:00' },
      { start_time: '11:30:00', end_time: '12:00:00' },
      { start_time: '15:00:00', end_time: '15:30:00' },
    ],
    statuses: [], // All available
  },
];

// Helper to format a Date as YYYY-MM-DD
function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

async function main() {
  try {
    console.log('=== SEEDING DOCTOR DASHBOARD TEST DATA ===\n');

    // ---------------------------------------------------------------
    // 1. Create / find the test doctor auth user
    // ---------------------------------------------------------------
    let doctorUserId;
    const { data: existingDoctorUsers, error: doctorSearchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', TEST_DOCTOR.email);

    if (doctorSearchError) {
      console.error('Error checking existing doctor user:', doctorSearchError.message);
    }

    if (existingDoctorUsers && existingDoctorUsers.length > 0) {
      doctorUserId = existingDoctorUsers[0].id;
      console.log(`ℹ️  Doctor user already exists: ${TEST_DOCTOR.email} (${doctorUserId})`);
    } else {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: TEST_DOCTOR.email,
        password: TEST_DOCTOR.password,
        email_confirm: true,
        user_metadata: {
          username: TEST_DOCTOR.username,
          role: 'DOCTOR',
          first_name: TEST_DOCTOR.first_name,
          last_name: TEST_DOCTOR.last_name,
          terms_accepted: true,
        },
      });

      if (authError) {
        console.error('Error creating doctor auth user:', authError.message);
        process.exit(1);
      }

      doctorUserId = authUser.user.id;
      console.log(`✅ Doctor auth user created: ${TEST_DOCTOR.email} (${doctorUserId})`);
    }

    // ---------------------------------------------------------------
    // 2. Create / find the doctor profile
    // ---------------------------------------------------------------
    let doctorId;
    const { data: existingDoctorProfile } = await supabase
      .from('doctor_profiles')
      .select('id')
      .eq('user_id', doctorUserId)
      .maybeSingle();

    if (existingDoctorProfile) {
      doctorId = existingDoctorProfile.id;
      console.log(`ℹ️  Doctor profile already exists: ${doctorId}`);
    } else {
      // Look up the specialty (fallback to null if not found)
      const { data: specialty } = await supabase
        .from('specialties')
        .select('id')
        .eq('name', TEST_DOCTOR.specialization)
        .maybeSingle();

      const { data: doctorProfile, error: profileError } = await supabase
        .from('doctor_profiles')
        .insert([
          {
            user_id: doctorUserId,
            first_name: TEST_DOCTOR.first_name,
            last_name: TEST_DOCTOR.last_name,
            medical_license_no: TEST_DOCTOR.medical_license_no,
            specialization: TEST_DOCTOR.specialization,
            specialty_id: specialty?.id || null,
            experience_years: TEST_DOCTOR.experience_years,
            is_approved: true,
            doctor_image: TEST_DOCTOR.doctor_image,
            rating: 4.7,
            review_count: 18,
            consultation_fee: 5000.0,
          },
        ])
        .select()
        .single();

      if (profileError) {
        console.error('Error creating doctor profile:', profileError.message);
        process.exit(1);
      }

      doctorId = doctorProfile.id;
      console.log(`✅ Doctor profile created: ${doctorId}`);
    }

    // ---------------------------------------------------------------
    // 3. Create / find the test patient auth user
    // ---------------------------------------------------------------
    let patientUserId;
    const { data: existingPatientUsers, error: patientSearchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', TEST_PATIENT.email);

    if (patientSearchError) {
      console.error('Error checking existing patient user:', patientSearchError.message);
    }

    if (existingPatientUsers && existingPatientUsers.length > 0) {
      patientUserId = existingPatientUsers[0].id;
      console.log(`ℹ️  Patient user already exists: ${TEST_PATIENT.email} (${patientUserId})`);
    } else {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: TEST_PATIENT.email,
        password: TEST_PATIENT.password,
        email_confirm: true,
        user_metadata: {
          username: TEST_PATIENT.username,
          role: 'PATIENT',
          first_name: TEST_PATIENT.first_name,
          last_name: TEST_PATIENT.last_name,
          terms_accepted: true,
        },
      });

      if (authError) {
        console.error('Error creating patient auth user:', authError.message);
        process.exit(1);
      }

      patientUserId = authUser.user.id;
      console.log(`✅ Patient auth user created: ${TEST_PATIENT.email} (${patientUserId})`);
    }

    // ---------------------------------------------------------------
    // 4. Create / find the patient profile
    // ---------------------------------------------------------------
    let patientId;
    const { data: existingPatientProfile } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_id', patientUserId)
      .maybeSingle();

    if (existingPatientProfile) {
      patientId = existingPatientProfile.id;
      console.log(`ℹ️  Patient profile already exists: ${patientId}`);
    } else {
      const { data: patientProfile, error: profileError } = await supabase
        .from('patient_profiles')
        .insert([
          {
            user_id: patientUserId,
            first_name: TEST_PATIENT.first_name,
            last_name: TEST_PATIENT.last_name,
            date_of_birth: TEST_PATIENT.date_of_birth,
            gender: TEST_PATIENT.gender,
            phone_number: TEST_PATIENT.phone_number,
            national_id_passport: TEST_PATIENT.national_id_passport,
            emergency_contact_name: TEST_PATIENT.emergency_contact_name,
            emergency_contact_rel: TEST_PATIENT.emergency_contact_rel,
            emergency_contact_phone: TEST_PATIENT.emergency_contact_phone,
            blood_group: TEST_PATIENT.blood_group,
            home_address: TEST_PATIENT.home_address,
          },
        ])
        .select()
        .single();

      if (profileError) {
        console.error('Error creating patient profile:', profileError.message);
        process.exit(1);
      }

      patientId = patientProfile.id;
      console.log(`✅ Patient profile created: ${patientId}`);
    }

    // ---------------------------------------------------------------
    // 5. Create schedules for today + next 7 days
    // ---------------------------------------------------------------
    console.log('\n📅 Creating schedules for the next 8 days...');

    const todayStr = toDateStr(new Date());

    for (const day of SCHEDULE_PLAN) {
      const date = new Date();
      date.setDate(date.getDate() + day.daysFromToday);
      const dateStr = toDateStr(date);
      const label = day.daysFromToday === 0 ? ' (Today)' : day.daysFromToday === 1 ? ' (Tomorrow)' : '';

      console.log(`\n📅 ${dateStr}${label}`);

      // Check for existing schedules for this date
      const { data: existingSchedules } = await supabase
        .from('doctor_schedules')
        .select('id, start_time')
        .eq('doctor_id', doctorId)
        .eq('available_date', dateStr);

      const existingScheduleTimes = new Set(
        (existingSchedules || []).map((s) => s.start_time)
      );

      const scheduleIds = [];
      for (const slot of day.slots) {
        if (existingScheduleTimes.has(slot.start_time)) {
          const existing = existingSchedules.find((s) => s.start_time === slot.start_time);
          scheduleIds.push(existing.id);
          console.log(`ℹ️  Schedule already exists: ${slot.start_time} (${existing.id})`);
        } else {
          const { data: newSchedule, error: scheduleError } = await supabase
            .from('doctor_schedules')
            .insert([
              {
                doctor_id: doctorId,
                available_date: dateStr,
                start_time: slot.start_time,
                end_time: slot.end_time,
                consultation_fee: 5000.0,
                is_booked: false,
              },
            ])
            .select()
            .single();

          if (scheduleError) {
            console.error(`Error creating schedule ${slot.start_time}:`, scheduleError.message);
            continue;
          }

          scheduleIds.push(newSchedule.id);
          console.log(`✅ Schedule created: ${slot.start_time} - ${slot.end_time} (${newSchedule.id})`);
        }
      }

      // ---------------------------------------------------------------
      // 6. Create appointments for booked slots (if any for this day)
      // ---------------------------------------------------------------
      if (day.statuses.length === 0) {
        console.log('📋 No appointments — all slots available for booking.');
        continue;
      }

      console.log('📋 Creating appointments...');

      for (let i = 0; i < day.statuses.length; i++) {
        const scheduleId = scheduleIds[i];
        const slot = day.slots[i];
        const status = day.statuses[i];

        if (!scheduleId) continue;

        // Check if an appointment already exists for this schedule
        const { data: existingAppt } = await supabase
          .from('appointments')
          .select('id')
          .eq('schedule_id', scheduleId)
          .maybeSingle();

        if (existingAppt) {
          console.log(`ℹ️  Appointment already exists for ${slot.start_time} (${existingAppt.id})`);
          continue;
        }

        // Create the appointment
        const { data: appointment, error: apptError } = await supabase
          .from('appointments')
          .insert([
            {
              patient_id: patientId,
              booking_type: 'SELF',
              beneficiary_id: null,
              doctor_id: doctorId,
              schedule_id: scheduleId,
              appointment_date: dateStr,
              status,
            },
          ])
          .select()
          .single();

        if (apptError) {
          console.error(`Error creating appointment for ${slot.start_time}:`, apptError.message);
          continue;
        }

        // Mark the schedule as booked
        await supabase
          .from('doctor_schedules')
          .update({ is_booked: true })
          .eq('id', scheduleId);

        // Create a payment record
        const isPaid = status === 'COMPLETED';
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([
            {
              appointment_id: appointment.id,
              amount: 5000.0,
              payment_method: 'PAY_AT_RECEPTION',
              payment_status: isPaid ? 'PAID' : 'UNPAID',
            },
          ]);

        if (paymentError) {
          console.error(`Error creating payment for appointment ${appointment.id}:`, paymentError.message);
        }

        const patientName = `${TEST_PATIENT.first_name} ${TEST_PATIENT.last_name}`;
        console.log(
          `✅ Appointment created: ${slot.start_time} | Status: ${status} | Patient: ${patientName} (${appointment.id})`
        );
      }
    }

    // ---------------------------------------------------------------
    // 7. Verification — fetch appointments for the full 8-day range
    // ---------------------------------------------------------------
    console.log('\n=== VERIFICATION ===');

    const lastDay = new Date();
    lastDay.setDate(lastDay.getDate() + 7);
    const lastDayStr = toDateStr(lastDay);

    const { data: verifyAppointments, error: verifyError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        appointment_date,
        status,
        doctor_schedules (
          start_time,
          end_time
        ),
        patient_profiles (
          first_name,
          last_name
        )
        `
      )
      .eq('doctor_id', doctorId)
      .gte('appointment_date', todayStr)
      .lte('appointment_date', lastDayStr);

    if (verifyError) {
      console.error('Verification query error:', verifyError.message);
    } else {
      // Group appointments by date
      const grouped = {};
      for (const appt of verifyAppointments || []) {
        const date = appt.appointment_date;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(appt);
      }

      const sortedDates = Object.keys(grouped).sort();
      console.log(
        `\n📊 Appointments for Dr. ${TEST_DOCTOR.first_name} ${TEST_DOCTOR.last_name} (${todayStr} → ${lastDayStr}):`
      );

      for (const date of sortedDates) {
        const appts = grouped[date].sort((a, b) => {
          const tA = a.doctor_schedules?.start_time || '';
          const tB = b.doctor_schedules?.start_time || '';
          return tA.localeCompare(tB);
        });

        const totalSlots = SCHEDULE_PLAN.find((d) => toDateStr(new Date(Date.now() + d.daysFromToday * 86400000)) === date)?.slots.length || appts.length;

        console.log(`\n  📅 ${date} (${appts.length}/${totalSlots} slots booked):`);
        appts.forEach((appt, idx) => {
          const time = appt.doctor_schedules?.start_time || '—';
          const patient = appt.patient_profiles
            ? `${appt.patient_profiles.first_name} ${appt.patient_profiles.last_name}`
            : '—';
          console.log(`    ${idx + 1}. ${time} | ${appt.status} | ${patient}`);
        });
      }
    }

    console.log('\n=== TEST DOCTOR CREDENTIALS ===');
    console.log(`Email: ${TEST_DOCTOR.email}`);
    console.log(`Password: ${TEST_DOCTOR.password}`);
    console.log('\n=== TEST PATIENT CREDENTIALS ===');
    console.log(`Email: ${TEST_PATIENT.email}`);
    console.log(`Password: ${TEST_PATIENT.password}`);
    console.log('\n✅ Seeding complete! Log in as the doctor to view the dashboard.');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exitCode = 1;
  }
}

main();