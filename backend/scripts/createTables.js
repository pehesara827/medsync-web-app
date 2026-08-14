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
-- 1. Create Beneficiaries Table
-- Stores saved family members/dependents linked to a primary patient account
CREATE TABLE IF NOT EXISTS public.beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age >= 0),
    gender VARCHAR(20) NOT NULL,
    relationship VARCHAR(50), -- e.g., 'Child', 'Parent', 'Spouse'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT beneficiaries_patient_id_fkey FOREIGN KEY (patient_id) 
        REFERENCES public.patient_profiles(id) ON DELETE CASCADE
);

-- 2. Create Doctor Schedules Table
-- Manages doctor availability, time slots, and consultation fees
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (consultation_fee >= 0),
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT doctor_schedules_doctor_id_fkey FOREIGN KEY (doctor_id) 
        REFERENCES public.doctor_profiles(id) ON DELETE CASCADE
);

-- 3. Create Appointments Table
-- Core table storing bookings for either Self or Beneficiaries
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('SELF', 'BENEFICIARY')),
    beneficiary_id UUID DEFAULT NULL,
    doctor_id UUID NOT NULL,
    schedule_id UUID NOT NULL,
    appointment_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    qr_code_url TEXT UNIQUE DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) 
        REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    CONSTRAINT appointments_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) 
        REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
    CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) 
        REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    CONSTRAINT appointments_schedule_id_fkey FOREIGN KEY (schedule_id) 
        REFERENCES public.doctor_schedules(id) ON DELETE CASCADE
);

-- 4. Create Payments Table
-- Handles initial payment state and tracks payment methods selected in the UI
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('ONLINE_GATEWAY', 'PAY_AT_RECEPTION', 'BANK_TRANSFER')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'PENDING_SLIP_VERIFICATION')),
    transaction_id VARCHAR(100) DEFAULT NULL,
    receipt_slip_url TEXT DEFAULT NULL,
    paid_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_appointment_id_fkey FOREIGN KEY (appointment_id) 
        REFERENCES public.appointments(id) ON DELETE CASCADE
);

-- 5. Create Patient Favorite Doctors Table
-- Stores patient favorites for doctors with unique pairs and fast patient lookup
CREATE TABLE IF NOT EXISTS public.patient_favorite_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT patient_doctor_unique UNIQUE (patient_id, doctor_id),
    CONSTRAINT patient_favorite_doctors_patient_id_fkey FOREIGN KEY (patient_id)
        REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    CONSTRAINT patient_favorite_doctors_doctor_id_fkey FOREIGN KEY (doctor_id)
        REFERENCES public.doctor_profiles(id) ON DELETE CASCADE
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_beneficiaries_patient ON public.beneficiaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_schedules_doctor_date ON public.doctor_schedules(doctor_id, available_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_favorite_doctors_patient ON public.patient_favorite_doctors(patient_id);
`;

const verifySql = `
SELECT 
    t.table_name,
    string_agg(
        DISTINCT kcu.column_name || ' -> ' || ccu.table_name || '.' || ccu.column_name,
        ', ' ORDER BY kcu.column_name || ' -> ' || ccu.table_name || '.' || ccu.column_name
    ) AS foreign_keys
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc 
    ON tc.table_schema = t.table_schema 
    AND tc.table_name = t.table_name 
    AND tc.constraint_type = 'FOREIGN KEY'
LEFT JOIN information_schema.key_column_usage kcu 
    ON kcu.constraint_schema = tc.constraint_schema 
    AND kcu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_schema = tc.constraint_schema 
    AND ccu.constraint_name = tc.constraint_name
WHERE t.table_schema = 'public'
    AND t.table_name IN ('beneficiaries', 'doctor_schedules', 'appointments', 'payments', 'patient_favorite_doctors')
GROUP BY t.table_name
ORDER BY t.table_name;
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
    console.log('Executing table creation SQL...');
    const createResult = await client.query(sql);
    console.log('Tables created successfully!');
    if (createResult && Array.isArray(createResult) && createResult.length) {
      console.log(`Executed ${createResult.length} statement(s).`);
    } else {
      console.log('All SQL statements executed successfully.');
    }

    // Run verification query
    console.log('\n--- Verifying Database Schema ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('WARNING: No tables found in the public schema!');
    }

    const expectedTables = ['beneficiaries', 'doctor_schedules', 'appointments', 'payments', 'patient_favorite_doctors'];
    const foundTables = verifyResult.rows.map((r) => r.table_name);

    for (const table of expectedTables) {
      if (foundTables.includes(table)) {
        console.log(`✅ Table '${table}' exists in public schema.`);
      } else {
        console.log(`❌ Table '${table}' NOT FOUND in public schema!`);
      }
    }

    console.log('\n--- Foreign Key Constraints ---');
    for (const row of verifyResult.rows) {
      const fks = row.foreign_keys || 'None';
      console.log(`Table '${row.table_name}': ${fks}`);
      if (!fks || fks === 'None') {
        console.log(`  ⚠️  No foreign keys detected for '${row.table_name}'.`);
      }
    }

    // Check specifically for expected FK constraints
    console.log('\n--- Foreign Key Summary ---');
    const fkChecks = [
      { table: 'beneficiaries', expected: 'patient_id -> patient_profiles.id' },
      { table: 'doctor_schedules', expected: 'doctor_id -> doctor_profiles.id' },
      { table: 'appointments', expected: 'patient_id -> patient_profiles.id' },
      { table: 'appointments', expected: 'doctor_id -> doctor_profiles.id' },
      { table: 'payments', expected: 'appointment_id -> appointments.id' },
      { table: 'patient_favorite_doctors', expected: 'patient_id -> patient_profiles.id' },
      { table: 'patient_favorite_doctors', expected: 'doctor_id -> doctor_profiles.id' },
    ];

    for (const check of fkChecks) {
      const row = verifyResult.rows.find((r) => r.table_name === check.table);
      const fks = row && row.foreign_keys ? row.foreign_keys : '';
      if (fks.includes(check.expected.split(' -> ')[0])) {
        console.log(`✅ FK on '${check.table}.${check.expected.split(' -> ')[0]}' is present.`);
      } else {
        console.log(`❌ FK on '${check.table}.${check.expected.split(' -> ')[0]}' NOT found!`);
      }
    }

    console.log('\nVerification complete.');
  } catch (error) {
    console.error('Failed to execute SQL queries:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

main();