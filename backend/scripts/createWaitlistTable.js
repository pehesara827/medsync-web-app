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

const sql = `
-- 1. Create Waitlist Table
-- Tracks patients waiting for a doctor's schedule slot when it's at full capacity
CREATE TABLE IF NOT EXISTS public.appointment_waitlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    schedule_id UUID NOT NULL,
    booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('SELF', 'BENEFICIARY')),
    beneficiary_id UUID DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' 
        CHECK (status IN ('WAITING', 'NOTIFIED', 'CONVERTED', 'EXPIRED', 'SKIPPED', 'CANCELLED')),
    notified_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT appointment_waitlists_patient_id_fkey FOREIGN KEY (patient_id) 
        REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    CONSTRAINT appointment_waitlists_doctor_id_fkey FOREIGN KEY (doctor_id) 
        REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    CONSTRAINT appointment_waitlists_schedule_id_fkey FOREIGN KEY (schedule_id) 
        REFERENCES public.doctor_schedules(id) ON DELETE CASCADE,
    CONSTRAINT appointment_waitlists_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) 
        REFERENCES public.beneficiaries(id) ON DELETE SET NULL
);

-- 2. Indexes for fast FIFO queries and lookups
CREATE INDEX IF NOT EXISTS idx_appointment_waitlists_schedule_status ON public.appointment_waitlists(schedule_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_appointment_waitlists_patient ON public.appointment_waitlists(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_waitlists_doctor ON public.appointment_waitlists(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_waitlists_status_expiry ON public.appointment_waitlists(status, expires_at);
`;

const verifySql = `
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'appointment_waitlists'
ORDER BY ordinal_position;
`;

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.');

    console.log('Executing appointment_waitlists table creation SQL...');
    await client.query(sql);
    console.log('Appointment waitlists table created successfully!');

    console.log('\n--- Verifying appointment_waitlists table ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('❌ appointment_waitlists table not found!');
    } else {
      for (const row of verifyResult.rows) {
        console.log(
          `✅ Column '${row.column_name}': type=${row.data_type}, default=${row.column_default || 'NULL'}, nullable=${row.is_nullable}`
        );
      }
    }

    // Verify indexes
    console.log('\n--- Verifying indexes ---');
    const indexResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = 'appointment_waitlists'
      ORDER BY indexname;
    `);

    for (const row of indexResult.rows) {
      console.log(`✅ Index: ${row.indexname}`);
    }

    console.log('\nWaitlist migration verification complete.');
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
