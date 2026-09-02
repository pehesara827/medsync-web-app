import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

// Mirrors backend/migrations/manual_appointments.sql.
// doctor_id is NULLable so the FK's ON DELETE SET NULL behaviour works —
// doctor_name is snapshot-copied at booking time, so the row must survive
// doctor deletion.
const sql = `
-- 0. Trigger helper (the updated_at trigger below depends on it)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create manual_appointments table
CREATE TABLE IF NOT EXISTS public.manual_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Patient details (typed by admin; deliberately NOT a patient_profiles FK)
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  patient_phone TEXT NULL,
  patient_gender TEXT NULL,
  patient_date_of_birth DATE NULL,

  -- Doctor + scheduling
  doctor_id UUID NULL,
  doctor_name TEXT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NULL,
  remarks TEXT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT manual_appointments_doctor_id_fkey
    FOREIGN KEY (doctor_id) REFERENCES public.doctor_profiles (id) ON DELETE SET NULL,
  CONSTRAINT manual_appointments_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'PENDING'::VARCHAR,
        'CONFIRMED'::VARCHAR,
        'COMPLETED'::VARCHAR,
        'CANCELLED'::VARCHAR
      ])::TEXT[]
    )
  )
);

-- 2. Index for doctor + date lookups
CREATE INDEX IF NOT EXISTS idx_manual_appointments_doctor_date
  ON public.manual_appointments USING btree (doctor_id, appointment_date);

-- 3. Auto-update trigger
DROP TRIGGER IF EXISTS trg_manual_appointments_updated_at ON public.manual_appointments;
CREATE TRIGGER trg_manual_appointments_updated_at
  BEFORE UPDATE ON public.manual_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Force PostgREST (Supabase schema cache) to pick up the new table
NOTIFY pgrst, 'reload schema';
`;

const verifySql = `
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'manual_appointments'
ORDER BY ordinal_position;
`;

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.');

    console.log('Executing manual_appointments table creation SQL...');
    await client.query(sql);
    console.log('manual_appointments table created successfully!');

    console.log('\n--- Verifying manual_appointments table ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('❌ manual_appointments table not found!');
      process.exitCode = 1;
    } else {
      for (const row of verifyResult.rows) {
        console.log(
          `✅ Column '${row.column_name}': type=${row.data_type}, default=${row.column_default || 'NULL'}, nullable=${row.is_nullable}`
        );
      }
    }

    console.log('\n--- Verifying indexes ---');
    const indexResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'manual_appointments'
      ORDER BY indexname;
    `);
    for (const row of indexResult.rows) {
      console.log(`✅ Index: ${row.indexname}`);
    }

    console.log('\n--- Verifying triggers ---');
    const triggerResult = await client.query(`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'manual_appointments';
    `);
    if (triggerResult.rows.length === 0) {
      console.log('  ⚠️  No triggers found on manual_appointments table.');
    } else {
      for (const row of triggerResult.rows) {
        console.log(`  ✅ ${row.trigger_name} (${row.event_manipulation})`);
      }
    }

    console.log('\nMigration complete. /api/admin/manual-appointments should now work.');
  } catch (error) {
    console.error('Failed to execute migration:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

main();
