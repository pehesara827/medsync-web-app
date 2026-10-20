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

// The doctor to set max_patients = 5 (first doctor in the system)
// We'll pick the first approved doctor
const MAX_PATIENTS = 5;

async function main() {
  try {
    console.log('=== SETTING DOCTOR MAX_PATIENTS TO 5 ===\n');

    // 1. Fetch all approved doctors
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctor_profiles')
      .select('id, first_name, last_name, specialization')
      .eq('is_approved', true)
      .order('first_name')
      .limit(1);

    if (doctorsError) {
      console.error('Error fetching doctors:', doctorsError.message);
      process.exit(1);
    }

    if (!doctors || doctors.length === 0) {
      console.error('No approved doctors found.');
      process.exit(1);
    }

    const doctor = doctors[0];
    const doctorName = `Dr. ${doctor.first_name} ${doctor.last_name}`;
    console.log(`Selected doctor: ${doctorName} (${doctor.specialization})`);
    console.log(`Doctor ID: ${doctor.id}`);
    console.log(`Setting max_patients = ${MAX_PATIENTS} for all schedule slots...\n`);

    // 2. Fetch all schedules for this doctor
    const { data: schedules, error: schedulesError } = await supabase
      .from('doctor_schedules')
      .select('id, available_date, start_time, end_time, is_booked, max_patients, current_appointment')
      .eq('doctor_id', doctor.id)
      .order('available_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError.message);
      process.exit(1);
    }

    console.log(`Found ${schedules?.length || 0} schedule slots for ${doctorName}\n`);

    // 3. Update all schedules to max_patients = 5
    let updatedCount = 0;
    for (const schedule of schedules || []) {
      const { error: updateError } = await supabase
        .from('doctor_schedules')
        .update({ max_patients: MAX_PATIENTS })
        .eq('id', schedule.id);

      if (updateError) {
        console.error(`Error updating schedule ${schedule.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} schedule slots to max_patients = ${MAX_PATIENTS}\n`);

    // 4. Verify the update
    console.log('--- Verification ---');
    const { data: verifySchedules, error: verifyError } = await supabase
      .from('doctor_schedules')
      .select('available_date, start_time, end_time, max_patients, current_appointment, is_booked')
      .eq('doctor_id', doctor.id)
      .order('available_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(10);

    if (verifyError) {
      console.error('Error verifying schedules:', verifyError.message);
    } else {
      for (const s of verifySchedules || []) {
        console.log(`  ${s.available_date} ${s.start_time}-${s.end_time} | max=${s.max_patients} | current=${s.current_appointment} | booked=${s.is_booked}`);
      }
    }

    console.log('\n=== RESULT ===');
    console.log(`The doctor with max_patients = ${MAX_PATIENTS} is: ${doctorName}`);
    console.log(`Specialization: ${doctor.specialization}`);
    console.log(`Doctor ID: ${doctor.id}`);
    console.log(`\nWhen ${MAX_PATIENTS} patients book a slot, it will automatically disappear from the patient booking form.`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exitCode = 1;
  }
}

main();