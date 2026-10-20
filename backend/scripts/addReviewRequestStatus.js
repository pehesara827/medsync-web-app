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

    // ── notifications.type: allow 'REVIEW_REQUEST' ───────────────────
    console.log('--- Migrating notifications.type CHECK to include REVIEW_REQUEST ---');
    await client.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'public'
            AND t.relname = 'notifications'
            AND c.contype = 'c'
        LOOP
          IF pg_get_constraintdef(
            (SELECT oid FROM pg_constraint WHERE conname = r.conname
              AND conrelid = 'public.notifications'::regclass LIMIT 1)
          ) ILIKE '%WAITLIST_OFFER%APPOINTMENT_CONFIRMED%' THEN
            EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT ' || quote_ident(r.conname);
            RAISE NOTICE 'Dropped notifications constraint: %', r.conname;
          END IF;
        END LOOP;
      END $$;
    `);
    await client.query(`
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_type_check
        CHECK (type IN (
          'WAITLIST_OFFER',
          'WAITLIST_EXPIRED',
          'APPOINTMENT_CONFIRMED',
          'APPOINTMENT_CANCELLED',
          'APPOINTMENT_MISSED',
          'SESSION_DELAY',
          'PAYMENT_RECEIVED',
          'REVIEW_REQUEST',
          'GENERAL'
        ));
    `);
    console.log("✅ notifications.type now allows 'REVIEW_REQUEST'");

    // ── Verify ──────────────────────────────────────────────────────
    const { rows } = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'public.notifications'::regclass
        AND contype = 'c'
        AND conname ILIKE '%type%'
      ORDER BY conname;
    `);
    console.log('\n--- CHECK constraints ---');
    for (const r of rows) console.log(`  ✅ ${r.conname}: ${r.def}`);
  } catch (error) {
    // ADD CONSTRAINT fails with 42710 if it already exists (idempotent rerun)
    if (error.code === '42710') {
      console.log('✅ Constraint already exists — nothing to do.');
    } else {
      console.error('Migration failed:');
      console.error(`Error: ${error.message}`);
      if (error.detail) console.error(`Detail: ${error.detail}`);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();
