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

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.\n');

    // ── doctor_schedules: delay columns ─────────────────────────────
    console.log('--- Ensuring doctor_schedules delay columns ---');
    await client.query(`
      ALTER TABLE public.doctor_schedules
        ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await client.query(`
      ALTER TABLE public.doctor_schedules
        ADD COLUMN IF NOT EXISTS delay_minutes INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE public.doctor_schedules
        ADD COLUMN IF NOT EXISTS delay_reported_at TIMESTAMPTZ DEFAULT NULL;
    `);
    console.log('✅ doctor_schedules delay columns ready');

    // ── Verify ──────────────────────────────────────────────────────
    const { rows } = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_schedules'
        AND column_name IN ('is_delayed', 'delay_minutes', 'delay_reported_at')
      ORDER BY column_name;
    `);
    console.log('\n--- Delay columns ---');
    for (const r of rows) console.log(`  ✅ ${r.column_name}: ${r.data_type} (default ${r.column_default})`);
  } catch (error) {
    console.error('Migration failed:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();
