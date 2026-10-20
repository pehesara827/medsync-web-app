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

    // 1. Check if updated_at column already exists (idempotent)
    console.log('--- Checking for existing "updated_at" column ---');
    const { rows: existingRows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'updated_at'
    `);

    if (existingRows.length > 0) {
      console.log('✅ Column "updated_at" already exists on appointments table. Nothing to do.');
      process.exitCode = 0;
      return;
    }

    // 2. Add the updated_at column
    console.log('\n--- Adding "updated_at" column ---');
    await client.query(`
      ALTER TABLE public.appointments
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);
    console.log('✅ Column "updated_at" added (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())');

    // 3. Backfill existing rows so updated_at = created_at
    console.log('\n--- Backfilling existing rows (updated_at = created_at) ---');
    const backfillResult = await client.query(`
      UPDATE public.appointments
        SET updated_at = created_at
        WHERE updated_at IS NULL OR updated_at != created_at;
    `);
    console.log(`✅ Backfilled ${backfillResult.rowCount} row(s).`);

    // 4. Create trigger to auto-update updated_at on any row change
    console.log('\n--- Creating auto-update trigger ---');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Trigger function "set_updated_at" created');

    await client.query(`
      DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
    `);
    await client.query(`
      CREATE TRIGGER trg_appointments_updated_at
      BEFORE UPDATE ON public.appointments
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
    `);
    console.log('✅ Trigger "trg_appointments_updated_at" created (auto-updates on every UPDATE)');

    // 5. Verify the new schema
    console.log('\n--- Verifying schema ---');
    const { rows: verifiedRows } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'appointments'
      ORDER BY ordinal_position;
    `);

    for (const col of verifiedRows) {
      const defaultVal = col.column_default ? ` default ${col.column_default.slice(0, 30)}...` : '';
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})${defaultVal}`);
    }

    const { rows: triggerRows } = await client.query(`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'appointments';
    `);

    console.log('\n--- Triggers ---');
    if (triggerRows.length > 0) {
      for (const t of triggerRows) {
        console.log(`  ✅ ${t.trigger_name} (${t.event_manipulation})`);
      }
    } else {
      console.log('  ⚠️  No triggers found on appointments table.');
    }

    console.log('\n✅ Migration complete. The "updated_at" column will now track the latest status change.');
  } catch (error) {
    console.error('Failed to add updated_at column:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();