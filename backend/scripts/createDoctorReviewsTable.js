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
-- Doctor Reviews Table
-- Stores patient ratings and comments for doctors, linked to a specific appointment
CREATE TABLE IF NOT EXISTS public.doctor_reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    review_comment TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT doctor_reviews_pkey PRIMARY KEY (id),
    CONSTRAINT doctor_reviews_appointment_id_key UNIQUE (appointment_id),
    CONSTRAINT doctor_reviews_appointment_id_fkey FOREIGN KEY (appointment_id)
        REFERENCES public.appointments(id) ON DELETE CASCADE,
    CONSTRAINT doctor_reviews_doctor_id_fkey FOREIGN KEY (doctor_id)
        REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    CONSTRAINT doctor_reviews_patient_id_fkey FOREIGN KEY (patient_id)
        REFERENCES public.patient_profiles(id) ON DELETE CASCADE
);

-- Indexes for fast doctor review lookups
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id
    ON public.doctor_reviews(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_patient_id
    ON public.doctor_reviews(patient_id);

-- Trigger function to auto-update doctor rating stats
CREATE OR REPLACE FUNCTION public.update_doctor_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.doctor_profiles
    SET rating = (
        SELECT COALESCE(AVG(rating), 5.0)
        FROM public.doctor_reviews
        WHERE doctor_id = COALESCE(NEW.doctor_id, OLD.doctor_id)
    ),
    review_count = (
        SELECT COUNT(*)
        FROM public.doctor_reviews
        WHERE doctor_id = COALESCE(NEW.doctor_id, OLD.doctor_id)
    )
    WHERE id = COALESCE(NEW.doctor_id, OLD.doctor_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate doctor rating on insert/update/delete
DROP TRIGGER IF EXISTS trigger_update_doctor_rating_stats ON public.doctor_reviews;
CREATE TRIGGER trigger_update_doctor_rating_stats
AFTER INSERT OR DELETE OR UPDATE ON public.doctor_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_doctor_rating_stats();
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
    AND table_name = 'doctor_reviews'
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

    console.log('Executing doctor_reviews table creation SQL...');
    await client.query(sql);
    console.log('doctor_reviews table created successfully!');

    console.log('\n--- Verifying doctor_reviews table ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('❌ doctor_reviews table not found!');
    } else {
      for (const row of verifyResult.rows) {
        console.log(
          `✅ ${row.table_name}.${row.column_name}: type=${row.data_type}, default=${row.column_default || 'NULL'}, nullable=${row.is_nullable}`
        );
      }
    }

    // Verify indexes
    console.log('\n--- Verifying indexes ---');
    const indexResult = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = 'doctor_reviews'
      ORDER BY indexname;
    `);

    for (const row of indexResult.rows) {
      console.log(`✅ Index: ${row.tablename}.${row.indexname}`);
    }

    // Verify trigger
    console.log('\n--- Verifying trigger ---');
    const triggerResult = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'doctor_reviews';
    `);

    for (const row of triggerResult.rows) {
      console.log(`✅ Trigger: ${row.trigger_name} (${row.event_manipulation})`);
    }

    console.log('\nDoctor reviews migration verification complete.');
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