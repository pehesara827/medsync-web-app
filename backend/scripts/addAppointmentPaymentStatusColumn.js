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

// Resolve the direct DB host (db.<ref>.supabase.co) to this project's regional
// session-mode pooler. The direct hostname only publishes AAAA (IPv6) records
// right now, which many networks (including this dev box) cannot reach, while
// the pooler hostname resolves over IPv4. This mirrors the credentials exactly.
const poolerHost = 'aws-0-ap-southeast-2.pooler.supabase.com';
const parsed = new URL(dbUrl);
const ref = parsed.hostname.replace('db.', '').replace('.supabase.co', '');
const poolerUrl = `${parsed.protocol}//${parsed.username}.${ref}:${parsed.password}@${poolerHost}:${parsed.port}${parsed.pathname}`;

const client = new Client({
  connectionString: poolerUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.\n');

    console.log('--- Checking for existing "payment_status" column ---');
    const { rows: existingRows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'payment_status'
    `);

    if (existingRows.length > 0) {
      console.log('Column "payment_status" already exists on appointments. Nothing to do.');
      process.exitCode = 0;
      return;
    }

    console.log('\n--- Adding "payment_status" column ---');
    await client.query(`
      ALTER TABLE public.appointments
        ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
        CONSTRAINT appointments_payment_status_check
        CHECK (payment_status IN ('UNPAID', 'PAID'));
    `);
    console.log("Column 'payment_status' added (VARCHAR(20), NOT NULL, DEFAULT 'UNPAID')");

    console.log('\n--- Backfilling payment_status from payments table ---');
    const backfillResult = await client.query(`
      UPDATE public.appointments a
        SET payment_status = COALESCE(p.payment_status, 'UNPAID')
        FROM payments p
        WHERE p.appointment_id = a.id
          AND p.payment_status = 'PAID';
    `);
    console.log('Backfilled ' + backfillResult.rowCount + ' appointment(s) to PAID.');

    console.log('\n--- Verifying schema ---');
    const { rows: verifiedRows } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'payment_status';
    `);

    if (verifiedRows.length > 0) {
      const c = verifiedRows[0];
      console.log(
        '  payment_status: ' + c.data_type + ' (nullable: ' + c.is_nullable + ') default ' + c.column_default
      );
      console.log('\nMigration complete. The admin QR confirm flow can now mark appointments as PAID.');
    } else {
      console.error('Could not verify the new column.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Failed to add payment_status column:');
    console.error('Error: ' + error.message);
    if (error.detail) console.error('Detail: ' + error.detail);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();