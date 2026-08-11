import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.SUPABASE_DB_URL;

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

// Helper: a patient's own profile id based on auth.uid()
const PATIENT_ID = `(SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())`;

const policies = [
  // ── specialties ───────────────────────────────────────────────────
  {
    table: 'specialties',
    name: 'specialties_select_all',
    cmd: 'SELECT',
    using: `true`,
    withCheck: null,
  },

  // ── patient_profiles ──────────────────────────────────────────────
  {
    table: 'patient_profiles',
    name: 'patient_profiles_select_own',
    cmd: 'SELECT',
    using: `user_id = auth.uid()`,
    withCheck: null,
  },

  // ── beneficiaries ─────────────────────────────────────────────────
  {
    table: 'beneficiaries',
    name: 'beneficiaries_select_own',
    cmd: 'SELECT',
    using: `patient_id = ${PATIENT_ID}`,
    withCheck: null,
  },
  {
    table: 'beneficiaries',
    name: 'beneficiaries_insert_own',
    cmd: 'INSERT',
    using: null,
    withCheck: `patient_id = ${PATIENT_ID}`,
  },

  // ── doctor_profiles ───────────────────────────────────────────────
  {
    table: 'doctor_profiles',
    name: 'doctor_profiles_select_approved',
    cmd: 'SELECT',
    using: `is_approved = true`,
    withCheck: null,
  },

  // ── doctor_schedules ──────────────────────────────────────────────
  {
    table: 'doctor_schedules',
    name: 'doctor_schedules_select_available',
    cmd: 'SELECT',
    using: `is_booked = false`,
    withCheck: null,
  },
  {
    table: 'doctor_schedules',
    name: 'doctor_schedules_update_book',
    cmd: 'UPDATE',
    using: `is_booked = false`,
    withCheck: `is_booked = true`,
  },

  // ── appointments ──────────────────────────────────────────────────
  {
    table: 'appointments',
    name: 'appointments_select_own',
    cmd: 'SELECT',
    using: `patient_id = ${PATIENT_ID}`,
    withCheck: null,
  },
  {
    table: 'appointments',
    name: 'appointments_insert_own',
    cmd: 'INSERT',
    using: null,
    withCheck: `patient_id = ${PATIENT_ID}`,
  },

  // ── payments ──────────────────────────────────────────────────────
  {
    table: 'payments',
    name: 'payments_select_own',
    cmd: 'SELECT',
    using: `appointment_id IN (SELECT id FROM public.appointments WHERE patient_id = ${PATIENT_ID})`,
    withCheck: null,
  },
  {
    table: 'payments',
    name: 'payments_insert_own',
    cmd: 'INSERT',
    using: null,
    withCheck: `appointment_id IN (SELECT id FROM public.appointments WHERE patient_id = ${PATIENT_ID})`,
  },
];

async function main() {
  try {
    await client.connect();
    console.log('Connected.\n');

    for (const p of policies) {
      const policyName = `${p.table}_${p.name}`;
      const usingClause = p.using ? `USING (${p.using})` : '';
      const checkClause = p.withCheck ? `WITH CHECK (${p.withCheck})` : '';

      const sql = `
        DROP POLICY IF EXISTS "${policyName}" ON public.${p.table};
        CREATE POLICY "${policyName}"
        ON public.${p.table}
        FOR ${p.cmd}
        TO authenticated
        ${usingClause}
        ${checkClause};
      `;

      try {
        await client.query(sql);
        console.log(`✅ Created policy: ${policyName}`);
      } catch (err) {
        console.log(`❌ Failed policy: ${policyName} — ${err.message}`);
      }
    }

    console.log('\n--- Verifying policies ---');
    const verify = await client.query(`
      SELECT tablename, policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN (
          'specialties', 'patient_profiles', 'beneficiaries', 'doctor_profiles',
          'doctor_schedules', 'appointments', 'payments'
        )
      ORDER BY tablename, policyname;
    `);
    for (const row of verify.rows) {
      const roles = Array.isArray(row.roles) ? row.roles.join(', ') : String(row.roles);
      console.log(`  ${row.tablename} / ${row.policyname} (${row.cmd}) -> ${roles}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\nConnection closed.');
  }
}

main();