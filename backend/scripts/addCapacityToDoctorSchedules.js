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
-- Add max_patients column: maximum patients allowed per time slot
-- Default 1 preserves existing behavior (one patient per slot)
ALTER TABLE public.doctor_schedules 
  ADD COLUMN IF NOT EXISTS max_patients INTEGER NOT NULL DEFAULT 1 
  CHECK (max_patients >= 1);

-- Add current_appointment column: current count of booked appointments for this slot
ALTER TABLE public.doctor_schedules 
  ADD COLUMN IF NOT EXISTS current_appointment INTEGER NOT NULL DEFAULT 0 
  CHECK (current_appointment >= 0);

-- Backfill: set current_appointment based on existing appointments per schedule
-- (counts non-CANCELLED appointments)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT ds.id, COUNT(a.id) as cnt
    FROM public.doctor_schedules ds
    LEFT JOIN public.appointments a ON a.schedule_id = ds.id 
      AND a.status != 'CANCELLED'
    GROUP BY ds.id
  LOOP
    UPDATE public.doctor_schedules 
    SET current_appointment = r.cnt 
    WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill: set is_booked = true for slots that are already at capacity
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT ds.id
    FROM public.doctor_schedules ds
    WHERE ds.current_appointment >= ds.max_patients
  LOOP
    UPDATE public.doctor_schedules 
    SET is_booked = true 
    WHERE id = r.id;
  END LOOP;
END $$;
`;

const verifySql = `
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'doctor_schedules'
  AND column_name IN ('max_patients', 'current_appointment')
ORDER BY column_name;
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

    console.log('Executing migration SQL...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    console.log('\n--- Verifying new columns ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('WARNING: New columns not found!');
    } else {
      for (const row of verifyResult.rows) {
        console.log(`✅ Column '${row.column_name}': type=${row.data_type}, default=${row.column_default}, nullable=${row.is_nullable}`);
      }
    }

    // Show sample data
    console.log('\n--- Sample schedule data ---');
    const sampleResult = await client.query(`
      SELECT ds.id, ds.available_date, ds.start_time, ds.end_time, 
             ds.max_patients, ds.current_appointment, ds.is_booked
      FROM public.doctor_schedules ds
      ORDER BY ds.created_at DESC
      LIMIT 5
    `);

    for (const row of sampleResult.rows) {
      console.log(`  ${row.available_date} ${row.start_time}-${row.end_time} | max=${row.max_patients} | current=${row.current_appointment} | booked=${row.is_booked}`);
    }

    console.log('\nMigration verification complete.');
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
