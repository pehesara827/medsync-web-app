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
  email: 'dr.sarah.chen@medsync.test',
  password: 'Doctor@123',
  username: 'dr_sarah_chen',
  first_name: 'Sarah',
  last_name: 'Chen',
  medical_license_no: 'LIC-MEDSYNC-2026-001',
  specialization: 'Cardiology',
  experience_years: 12,
  doctor_image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
};

async function main() {
  try {
    console.log('=== SEEDING TEST DOCTOR ===\n');

    // 1. Check if the user already exists
    const { data: existingUsers, error: searchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', TEST_DOCTOR.email);

    if (searchError) {
      console.error('Error checking existing user:', searchError.message);
    }

    let userId;
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`ℹ️ User already exists: ${TEST_DOCTOR.email} (${userId})`);
    } else {
      // 2. Create auth user with role DOCTOR
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
        console.error('Error creating auth user:', authError.message);
        process.exit(1);
      }

      userId = authUser.user.id;
      console.log(`✅ Auth user created: ${TEST_DOCTOR.email} (${userId})`);
    }

    // 3. Check if doctor profile already exists
    const { data: existingProfile } = await supabase
      .from('doctor_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let doctorId;
    if (existingProfile) {
      doctorId = existingProfile.id;
      console.log(`ℹ️ Doctor profile already exists: ${doctorId}`);
    } else {
      // 4. Get Cardiology specialty_id
      const { data: specialty, error: specialtyError } = await supabase
        .from('specialties')
        .select('id')
        .eq('name', 'Cardiology')
        .maybeSingle();

      if (specialtyError) {
        console.error('Error fetching specialty:', specialtyError.message);
      }

      // 5. Insert into doctor_profiles
      const { data: doctorProfile, error: profileError } = await supabase
        .from('doctor_profiles')
        .insert([
          {
            user_id: userId,
            first_name: TEST_DOCTOR.first_name,
            last_name: TEST_DOCTOR.last_name,
            medical_license_no: TEST_DOCTOR.medical_license_no,
            specialization: TEST_DOCTOR.specialization,
            specialty_id: specialty?.id || null,
            experience_years: TEST_DOCTOR.experience_years,
            is_approved: true,
            doctor_image: TEST_DOCTOR.doctor_image,
            rating: 4.8,
            review_count: 25,
            consultation_fee: 5000.00,
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

    // 6. Insert test schedules for the next 7 days
    const { data: existingSchedules } = await supabase
      .from('doctor_schedules')
      .select('id')
      .eq('doctor_id', doctorId)
      .limit(1);

    if (existingSchedules && existingSchedules.length > 0) {
      console.log('ℹ️ Schedules already exist for this doctor. Skipping schedule creation.');
    } else {
      const today = new Date();
      const schedules = [];

      for (let day = 1; day <= 7; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        // Morning slot
        schedules.push({
          doctor_id: doctorId,
          available_date: dateStr,
          start_time: '09:00',
          end_time: '09:30',
          consultation_fee: 5000.00,
          is_booked: false,
        });
        // Mid-morning slot
        schedules.push({
          doctor_id: doctorId,
          available_date: dateStr,
          start_time: '10:30',
          end_time: '11:00',
          consultation_fee: 5000.00,
          is_booked: false,
        });
        // Afternoon slot
        schedules.push({
          doctor_id: doctorId,
          available_date: dateStr,
          start_time: '14:00',
          end_time: '14:30',
          consultation_fee: 5000.00,
          is_booked: false,
        });
      }

      const { error: scheduleError } = await supabase
        .from('doctor_schedules')
        .insert(schedules);

      if (scheduleError) {
        console.error('Error creating schedules:', scheduleError.message);
      } else {
        console.log(`✅ Inserted ${schedules.length} schedule slots for the next 7 days`);
      }
    }

    // 7. Verify
    console.log('\n=== VERIFICATION ===');
    const { data: verifyProfile } = await supabase
      .from('doctor_profiles')
      .select('id, first_name, last_name, specialization, is_approved, rating, consultation_fee')
      .eq('id', doctorId)
      .single();

    if (verifyProfile) {
      console.log(`Doctor: Dr. ${verifyProfile.first_name} ${verifyProfile.last_name}`);
      console.log(`Specialization: ${verifyProfile.specialization}`);
      console.log(`Approved: ${verifyProfile.is_approved}`);
      console.log(`Rating: ${verifyProfile.rating}`);
      console.log(`Consultation Fee: ${verifyProfile.consultation_fee}`);
    }

    const { data: verifySchedules } = await supabase
      .from('doctor_schedules')
      .select('available_date, start_time, end_time, is_booked')
      .eq('doctor_id', doctorId)
      .order('available_date', { ascending: true })
      .limit(5);

    console.log('\n--- Sample Schedules ---');
    for (const s of verifySchedules || []) {
      console.log(`  ${s.available_date} ${s.start_time}-${s.end_time} | Booked: ${s.is_booked}`);
    }

    console.log('\n=== TEST DOCTOR CREDENTIALS ===');
    console.log(`Email: ${TEST_DOCTOR.email}`);
    console.log(`Password: ${TEST_DOCTOR.password}`);
    console.log('\nUse these credentials to log in and test the doctor dashboard.');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exitCode = 1;
  }
}

main();