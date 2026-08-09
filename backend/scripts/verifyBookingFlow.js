import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Load frontend .env for the anon key (VITE_SUPABASE_ANON_KEY)
dotenv.config({ path: path.join(__dirname, '..', '..', 'frontend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_EMAIL = 'john@example.com';
const TEST_PASSWORD = 'password123';

async function main() {
  try {
    console.log('=== BOOKING FLOW VERIFICATION (anon key) ===\n');

    // 1. Sign in as test user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signInError) {
      console.log(`Could not sign in as ${TEST_EMAIL}: ${signInError.message}`);
      console.log('Will try to create a test user via service role...');

      const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'PATIENT' },
      });

      if (createError) {
        console.error(`Failed to create test user: ${createError.message}`);
        process.exit(1);
      }

      console.log(`Created test user: ${TEST_EMAIL} (${newUser.user.id})`);

      const uniqueSuffix = Date.now();
      const { data: profile, error: profileError } = await serviceClient
        .from('patient_profiles')
        .insert([{
          user_id: newUser.user.id,
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1990-01-01',
          gender: 'male',
          phone_number: `+1${uniqueSuffix}`,
          national_id_passport: `NID-${uniqueSuffix}`,
          emergency_contact_name: 'Jane Doe',
          emergency_contact_rel: 'Spouse',
          emergency_contact_phone: `+1${uniqueSuffix + 1}`,
        }])
        .select('id')
        .single();

      if (profileError) {
        console.error(`Failed to create patient profile: ${profileError.message}`);
        process.exit(1);
      }

      console.log(`Created patient profile: ${profile.id}`);

      const { data: signInData2, error: signInError2 } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signInError2) {
        console.error(`Failed to sign in: ${signInError2.message}`);
        process.exit(1);
      }

      console.log(`Signed in as ${TEST_EMAIL}\n`);
    } else {
      console.log(`Signed in as ${TEST_EMAIL}\n`);
    }

    // 2. Resolve patient profile id (create if missing)
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session.user;
    console.log(`Auth user id: ${user.id}`);

    let profile = null;
    const { data: profileData, error: profileError } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileData) {
      profile = profileData;
    }

    if (!profile) {
      // Create the patient profile via service role
      const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const uniqueSuffix = Date.now();
      const { data: newProfile, error: createProfileError } = await serviceClient
        .from('patient_profiles')
        .insert([{
          user_id: user.id,
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1990-01-01',
          gender: 'male',
          phone_number: `+1${uniqueSuffix}`,
          national_id_passport: `NID-${uniqueSuffix}`,
          emergency_contact_name: 'Jane Doe',
          emergency_contact_rel: 'Spouse',
          emergency_contact_phone: `+1${uniqueSuffix + 1}`,
        }])
        .select('id')
        .single();

      if (createProfileError) {
        console.error(`Failed to create patient profile: ${createProfileError.message}`);
        process.exit(1);
      }
      profile = newProfile;
      console.log(`Created patient profile: ${profile.id}`);
    }

    if (profileError && !profile) {
      console.error(`Failed to fetch patient profile: ${profileError.message}`);
      process.exit(1);
    }

    const patientId = profile.id;
    console.log(`Patient profile id: ${patientId}\n`);

    // 3. Fetch specializations
    const { data: specs, error: specsError } = await supabase
      .from('doctor_profiles')
      .select('specialization')
      .eq('is_approved', true);

    if (specsError) {
      console.error(`Failed to fetch specializations: ${specsError.message}`);
      process.exit(1);
    }
    const uniqueSpecs = [...new Set(specs.map((s) => s.specialization))];
    console.log(`Specializations: ${uniqueSpecs.join(', ')}`);

    // 4. Fetch doctors for Cardiology
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctor_profiles')
      .select('id, first_name, last_name, specialization')
      .eq('specialization', 'Cardiology')
      .eq('is_approved', true);

    if (doctorsError) {
      console.error(`Failed to fetch doctors: ${doctorsError.message}`);
      process.exit(1);
    }
    console.log(`Doctors for Cardiology: ${doctors.map((d) => `Dr. ${d.first_name} ${d.last_name}`).join(', ')}`);
    const doctorId = doctors[0].id;

    // 5. Fetch available time slots for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { data: slots, error: slotsError } = await supabase
      .from('doctor_schedules')
      .select('id, start_time, end_time, consultation_fee, is_booked')
      .eq('doctor_id', doctorId)
      .eq('available_date', dateStr)
      .eq('is_booked', false)
      .order('start_time');

    if (slotsError) {
      console.error(`Failed to fetch slots: ${slotsError.message}`);
      process.exit(1);
    }
    console.log(`Available slots for ${dateStr}: ${slots.length}`);
    for (const s of slots) {
      console.log(`   ${s.start_time} - ${s.end_time} (fee: ${s.consultation_fee})`);
    }

    if (slots.length < 3) {
      console.error('Not enough slots for testing all 3 scenarios');
      process.exit(1);
    }

    // TEST 1: Book as SELF
    console.log('\n=== TEST 1: Book as SELF ===');
    const slot1 = slots[0];
    const { data: appt1, error: appt1Error } = await supabase
      .from('appointments')
      .insert([{
        patient_id: patientId,
        booking_type: 'SELF',
        beneficiary_id: null,
        doctor_id: doctorId,
        schedule_id: slot1.id,
        appointment_date: dateStr,
        status: 'PENDING',
      }])
      .select('id, booking_type, beneficiary_id, doctor_id, schedule_id, appointment_date, status')
      .single();

    if (appt1Error) {
      console.error(`TEST 1 FAILED - appointment insert: ${appt1Error.message}`);
    } else {
      console.log(`Appointment created: ${appt1.id}`);
      console.log(`   booking_type: ${appt1.booking_type}, beneficiary_id: ${appt1.beneficiary_id}, status: ${appt1.status}`);

      const { error: sched1Error } = await supabase
        .from('doctor_schedules')
        .update({ is_booked: true })
        .eq('id', slot1.id);

      if (sched1Error) {
        console.error(`TEST 1 FAILED - schedule update: ${sched1Error.message}`);
      } else {
        console.log(`Schedule ${slot1.id} marked as booked`);

        const { error: pay1Error } = await supabase
          .from('payments')
          .insert([{
            appointment_id: appt1.id,
            amount: slot1.consultation_fee,
            payment_method: 'ONLINE_GATEWAY',
            payment_status: 'UNPAID',
          }]);

        if (pay1Error) {
          console.error(`TEST 1 FAILED - payment insert: ${pay1Error.message}`);
        } else {
          console.log(`Payment created for appointment ${appt1.id} (amount: ${slot1.consultation_fee}, method: ONLINE_GATEWAY)`);
          console.log('TEST 1 PASSED');
        }
      }
    }

    // TEST 2: Book for EXISTING beneficiary
    console.log('\n=== TEST 2: Book for EXISTING beneficiary ===');

    const { data: ben, error: benError } = await supabase
      .from('beneficiaries')
      .insert([{
        patient_id: patientId,
        full_name: 'Test Beneficiary',
        age: 25,
        gender: 'female',
        relationship: 'Daughter',
      }])
      .select('id, full_name, relationship')
      .single();

    if (benError) {
      console.error(`TEST 2 SETUP FAILED - create beneficiary: ${benError.message}`);
    } else {
      console.log(`Created beneficiary: ${ben.full_name} (${ben.relationship}) id=${ben.id}`);

      const { data: beneficiaries, error: benListError } = await supabase
        .from('beneficiaries')
        .select('id, full_name, relationship')
        .eq('patient_id', patientId);

      if (benListError) {
        console.error(`TEST 2 FAILED - fetch beneficiaries: ${benListError.message}`);
      } else {
        console.log(`Fetched ${beneficiaries.length} beneficiaries`);

        const slot2 = slots[1];
        const { data: appt2, error: appt2Error } = await supabase
          .from('appointments')
          .insert([{
            patient_id: patientId,
            booking_type: 'BENEFICIARY',
            beneficiary_id: ben.id,
            doctor_id: doctorId,
            schedule_id: slot2.id,
            appointment_date: dateStr,
            status: 'PENDING',
          }])
          .select('id, booking_type, beneficiary_id, doctor_id, schedule_id, appointment_date, status')
          .single();

        if (appt2Error) {
          console.error(`TEST 2 FAILED - appointment insert: ${appt2Error.message}`);
        } else {
          console.log(`Appointment created: ${appt2.id}`);
          console.log(`   booking_type: ${appt2.booking_type}, beneficiary_id: ${appt2.beneficiary_id}, status: ${appt2.status}`);

          const { error: sched2Error } = await supabase
            .from('doctor_schedules')
            .update({ is_booked: true })
            .eq('id', slot2.id);

          if (sched2Error) {
            console.error(`TEST 2 FAILED - schedule update: ${sched2Error.message}`);
          } else {
            const { error: pay2Error } = await supabase
              .from('payments')
              .insert([{
                appointment_id: appt2.id,
                amount: slot2.consultation_fee,
                payment_method: 'PAY_AT_RECEPTION',
                payment_status: 'UNPAID',
              }]);

            if (pay2Error) {
              console.error(`TEST 2 FAILED - payment insert: ${pay2Error.message}`);
            } else {
              console.log(`Payment created for appointment ${appt2.id} (method: PAY_AT_RECEPTION)`);
              console.log('TEST 2 PASSED');
            }
          }
        }
      }
    }

    // TEST 3: Add NEW beneficiary on the fly
    console.log('\n=== TEST 3: Add NEW beneficiary on the fly ===');

    const { data: newBen, error: newBenError } = await supabase
      .from('beneficiaries')
      .insert([{
        patient_id: patientId,
        full_name: 'New On-The-Fly Beneficiary',
        age: 30,
        gender: 'male',
        relationship: 'Son',
      }])
      .select('id')
      .single();

    if (newBenError) {
      console.error(`TEST 3 FAILED - create new beneficiary: ${newBenError.message}`);
    } else {
      console.log(`Created new beneficiary on the fly: id=${newBen.id}`);

      const slot3 = slots[2];
      const { data: appt3, error: appt3Error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: patientId,
          booking_type: 'BENEFICIARY',
          beneficiary_id: newBen.id,
          doctor_id: doctorId,
          schedule_id: slot3.id,
          appointment_date: dateStr,
          status: 'PENDING',
        }])
        .select('id, booking_type, beneficiary_id, doctor_id, schedule_id, appointment_date, status')
        .single();

      if (appt3Error) {
        console.error(`TEST 3 FAILED - appointment insert: ${appt3Error.message}`);
      } else {
        console.log(`Appointment created: ${appt3.id}`);
        console.log(`   booking_type: ${appt3.booking_type}, beneficiary_id: ${appt3.beneficiary_id}, status: ${appt3.status}`);

        const { error: sched3Error } = await supabase
          .from('doctor_schedules')
          .update({ is_booked: true })
          .eq('id', slot3.id);

        if (sched3Error) {
          console.error(`TEST 3 FAILED - schedule update: ${sched3Error.message}`);
        } else {
          const { error: pay3Error } = await supabase
            .from('payments')
            .insert([{
              appointment_id: appt3.id,
              amount: slot3.consultation_fee,
              payment_method: 'BANK_TRANSFER',
              payment_status: 'UNPAID',
            }]);

          if (pay3Error) {
            console.error(`TEST 3 FAILED - payment insert: ${pay3Error.message}`);
          } else {
            console.log(`Payment created for appointment ${appt3.id} (method: BANK_TRANSFER)`);
            console.log('TEST 3 PASSED');
          }
        }
      }
    }

    // VERIFY: Booked slots disappear from availability
    console.log('\n=== VERIFY: Booked slots disappear from availability ===');
    const { data: remainingSlots, error: remainingError } = await supabase
      .from('doctor_schedules')
      .select('id, start_time, is_booked')
      .eq('doctor_id', doctorId)
      .eq('available_date', dateStr)
      .eq('is_booked', false);

    if (remainingError) {
      console.error(`Verify failed: ${remainingError.message}`);
    } else {
      console.log(`Remaining available slots for ${dateStr}: ${remainingSlots.length} (was ${slots.length})`);
      console.log(`Booked slots: ${slots.length - remainingSlots.length} (should be 3)`);
      if (remainingSlots.length === slots.length - 3) {
        console.log('VERIFICATION PASSED - booked slots correctly removed from availability');
      } else {
        console.log('VERIFICATION FAILED - slot count mismatch');
      }
    }

    // FINAL DB STATE SUMMARY
    console.log('\n=== FINAL DB STATE ===');
    const { data: allAppts } = await supabase
      .from('appointments')
      .select('id, booking_type, beneficiary_id, doctor_id, schedule_id, appointment_date, status')
      .eq('patient_id', patientId);

    console.log(`Appointments for patient ${patientId}: ${allAppts.length}`);
    for (const a of allAppts) {
      console.log(`  ${a.id} | ${a.booking_type} | ben=${a.beneficiary_id || 'NULL'} | ${a.appointment_date} | ${a.status}`);
    }

    const { data: allPays } = await supabase
      .from('payments')
      .select('appointment_id, amount, payment_method, payment_status');

    console.log(`\nPayments: ${allPays.length}`);
    for (const p of allPays) {
      console.log(`  appt=${p.appointment_id} | ${p.amount} | ${p.payment_method} | ${p.payment_status}`);
    }

    console.log('\n=== ALL TESTS COMPLETE ===');

  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exitCode = 1;
  }
}

main();