import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env');
  process.exit(1);
}

const sql = `
-- 1. Add rating and review_count columns to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0 CHECK (review_count >= 0);
`;

// 2. Seed 12 sample doctors with ratings and review counts.
//    First create users (required FK), then create doctor_profiles.
const seedUsersSql = `
INSERT INTO public.users (id, username, email, password_hash, role, terms_accepted, is_verified)
VALUES
  (gen_random_uuid(), 'dr.sarah.chen', 'dr.sarah.chen@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.marcus.chen', 'dr.marcus.chen@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.emily.thorne', 'dr.emily.thorne@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.james.wilson', 'dr.james.wilson@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.priya.sharma', 'dr.priya.sharma@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.david.kim', 'dr.david.kim@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.aisha.patel', 'dr.aisha.patel@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.michael.brown', 'dr.michael.brown@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.sofia.garcia', 'dr.sofia.garcia@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.ahmed.hassan', 'dr.ahmed.hassan@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.laura.nguyen', 'dr.laura.nguyen@medsync.com', 'seed-hash', 'DOCTOR', true, true),
  (gen_random_uuid(), 'dr.robert.martinez', 'dr.robert.martinez@medsync.com', 'seed-hash', 'DOCTOR', true, true)
ON CONFLICT (email) DO NOTHING;
`;

const seedDoctorsSql = `
-- Look up specialty IDs dynamically by name
WITH spec_map AS (
  SELECT id, name FROM public.specialties
),
user_map AS (
  SELECT id, email FROM public.users WHERE role = 'DOCTOR'
)
INSERT INTO public.doctor_profiles (
  user_id,
  first_name,
  last_name,
  medical_license_no,
  specialization,
  specialty_id,
  experience_years,
  is_approved,
  doctor_image,
  rating,
  review_count
)
SELECT
  u.id,
  seed.first_name,
  seed.last_name,
  seed.license_no,
  seed.specialization,
  s.id,
  seed.experience_years,
  true,
  seed.image,
  seed.rating,
  seed.review_count
FROM (VALUES
  ('Sarah', 'Chen', 'LIC-2024-001', 'Cardiology', 12, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300', 4.9, 213, 'dr.sarah.chen@medsync.com'),
  ('Marcus', 'Chen', 'LIC-2024-002', 'Neurology', 15, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300', 4.7, 156, 'dr.marcus.chen@medsync.com'),
  ('Emily', 'Thorne', 'LIC-2024-003', 'Orthopedics', 10, 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=300', 5.0, 89, 'dr.emily.thorne@medsync.com'),
  ('James', 'Wilson', 'LIC-2024-004', 'Dermatology', 8, 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300', 4.6, 124, 'dr.james.wilson@medsync.com'),
  ('Priya', 'Sharma', 'LIC-2024-005', 'Ophthalmology', 14, 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300', 4.8, 178, 'dr.priya.sharma@medsync.com'),
  ('David', 'Kim', 'LIC-2024-006', 'General Medicine', 20, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300', 4.5, 267, 'dr.david.kim@medsync.com'),
  ('Aisha', 'Patel', 'LIC-2024-007', 'Pediatrics', 9, 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=300', 4.9, 132, 'dr.aisha.patel@medsync.com'),
  ('Michael', 'Brown', 'LIC-2024-008', 'Dentistry', 11, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300', 4.4, 98, 'dr.michael.brown@medsync.com'),
  ('Sofia', 'Garcia', 'LIC-2024-009', 'Cardiology', 16, 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&q=80&w=300', 4.8, 190, 'dr.sofia.garcia@medsync.com'),
  ('Ahmed', 'Hassan', 'LIC-2024-010', 'Neurology', 7, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300', 4.2, 76, 'dr.ahmed.hassan@medsync.com'),
  ('Laura', 'Nguyen', 'LIC-2024-011', 'General Medicine', 13, 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300', 4.7, 145, 'dr.laura.nguyen@medsync.com'),
  ('Robert', 'Martinez', 'LIC-2024-012', 'Orthopedics', 18, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300', 4.6, 112, 'dr.robert.martinez@medsync.com')
) AS seed(first_name, last_name, license_no, specialization, experience_years, image, rating, review_count, email)
JOIN spec_map s ON LOWER(s.name) = LOWER(seed.specialization)
JOIN user_map u ON u.email = seed.email
ON CONFLICT (medical_license_no) DO NOTHING;
`;

const verifySql = `
SELECT 
  dp.id,
  dp.first_name,
  dp.last_name,
  dp.specialization,
  dp.rating,
  dp.review_count,
  dp.doctor_image,
  s.name AS specialty_name
FROM public.doctor_profiles dp
LEFT JOIN public.specialties s ON s.id = dp.specialty_id
WHERE dp.rating IS NOT NULL
ORDER BY dp.rating DESC, dp.review_count DESC;
`;

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.');

    // Execute column addition SQL
    console.log('Adding rating and review_count columns...');
    await client.query(sql);
    console.log('✅ rating and review_count columns added to doctor_profiles.');

    // Execute user seed SQL
    console.log('\nSeeding doctor users...');
    const userResult = await client.query(seedUsersSql);
    console.log(`✅ ${userResult.rowCount} user(s) inserted.`);

    // Execute doctor seed SQL
    console.log('\nSeeding doctor profiles...');
    const doctorResult = await client.query(seedDoctorsSql);
    console.log(`✅ ${doctorResult.rowCount} doctor profile(s) inserted.`);

    // Verify columns exist
    console.log('\n--- Verifying Columns ---');
    const colCheck = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_profiles'
        AND column_name IN ('rating', 'review_count')
      ORDER BY column_name;
    `);

    for (const col of colCheck.rows) {
      console.log(`✅ doctor_profiles.${col.column_name} (${col.data_type}, default=${col.column_default})`);
    }

    // Verify seeded data
    console.log('\n--- Seeded Doctor Data ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('WARNING: No doctors found with rating data!');
    }

    for (const row of verifyResult.rows) {
      console.log(`✅ Dr. ${row.first_name} ${row.last_name} (${row.specialization || row.specialty_name}): rating=${row.rating}, reviews=${row.review_count}`);
    }

    console.log(`\nTotal doctors with ratings: ${verifyResult.rows.length}`);
    console.log('\nVerification complete.');
  } catch (error) {
    console.error('Failed to execute SQL queries:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

main();