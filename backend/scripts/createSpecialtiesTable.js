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
-- 1. Create Specialties Table
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add specialty_id foreign key to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES public.specialties(id);

-- 3. Seed sample specialties
INSERT INTO public.specialties (name, description) VALUES
    ('Cardiology', 'Diagnosis and treatment of heart and blood vessel disorders'),
    ('Neurology', 'Diagnosis and treatment of disorders of the nervous system'),
    ('Dermatology', 'Diagnosis and treatment of skin, hair, and nail conditions'),
    ('Orthopedics', 'Diagnosis and treatment of musculoskeletal system disorders'),
    ('Ophthalmology', 'Diagnosis and treatment of eye and vision disorders'),
    ('General Medicine', 'Primary care for a wide range of health conditions'),
    ('Dentistry', 'Diagnosis and treatment of oral health conditions'),
    ('Pediatrics', 'Medical care for infants, children, and adolescents')
ON CONFLICT (name) DO NOTHING;

-- 4. Migrate existing doctor_profiles.specialization strings to specialty_id
UPDATE public.doctor_profiles dp
SET specialty_id = s.id
FROM public.specialties s
WHERE dp.specialty_id IS NULL
  AND LOWER(dp.specialization) = LOWER(s.name);
`;

const verifySql = `
SELECT 
    s.id,
    s.name,
    s.description,
    COUNT(dp.id) AS doctor_count
FROM public.specialties s
LEFT JOIN public.doctor_profiles dp ON dp.specialty_id = s.id
GROUP BY s.id, s.name, s.description
ORDER BY s.name;
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

    // Execute table creation SQL
    console.log('Executing specialties table creation SQL...');
    await client.query(sql);
    console.log('✅ Specialties table created and seeded successfully!');

    // Run verification query
    console.log('\n--- Verifying Specialties ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('WARNING: No specialties found!');
    }

    for (const row of verifyResult.rows) {
      console.log(`✅ ${row.name} (${row.doctor_count} doctor(s))`);
    }

    // Verify specialty_id column exists on doctor_profiles
    const colCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_profiles'
        AND column_name = 'specialty_id';
    `);

    if (colCheck.rows.length > 0) {
      const col = colCheck.rows[0];
      console.log(`\n✅ Verified: doctor_profiles.specialty_id (${col.data_type}, nullable=${col.is_nullable})`);
    } else {
      console.log('\n❌ specialty_id column NOT found on doctor_profiles!');
      process.exitCode = 1;
    }

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