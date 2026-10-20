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
-- Create Patient Favorite Doctors Table
-- Stores patient favorites for doctors with unique pairs and fast patient lookup
CREATE TABLE IF NOT EXISTS public.patient_favorite_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure a patient cannot favorite the same doctor more than once
    CONSTRAINT patient_doctor_unique UNIQUE (patient_id, doctor_id)
);

-- Create an index to speed up lookups by patient ID
CREATE INDEX IF NOT EXISTS idx_patient_favorite_doctors_patient 
ON public.patient_favorite_doctors(patient_id);
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
    console.log('Creating patient_favorite_doctors table...');
    await client.query(sql);
    console.log('✅ Table created successfully!');

    // Verify the table exists
    console.log('\n--- Verifying Table ---');
    const verifyResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'patient_favorite_doctors';
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Table patient_favorite_doctors exists in public schema.');
      
      // Check columns
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'patient_favorite_doctors'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable columns:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });

      // Check indexes
      const indexResult = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'patient_favorite_doctors';
      `);
      
      console.log('\nTable indexes:');
      indexResult.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
    } else {
      console.log('❌ Table patient_favorite_doctors NOT found!');
    }

    console.log('\nVerification complete.');
  } catch (error) {
    console.error('Failed to create table:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

main();