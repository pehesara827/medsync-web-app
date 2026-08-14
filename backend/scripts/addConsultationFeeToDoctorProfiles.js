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

    // Step 1: Add consultation_fee column to doctor_profiles if it doesn't exist
    console.log('Step 1: Adding consultation_fee column to doctor_profiles...');
    const alterTableSql = `
      ALTER TABLE public.doctor_profiles 
      ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2) DEFAULT 5000.00 CHECK (consultation_fee >= 0);
    `;
    await client.query(alterTableSql);
    console.log('✅ consultation_fee column added to doctor_profiles.\n');

    // Step 2: Update all doctors with a default consultation fee
    console.log('Step 2: Updating doctors with consultation fees...');
    const updateSql = `
      UPDATE public.doctor_profiles
      SET consultation_fee = 5000.00
      WHERE consultation_fee IS NULL OR consultation_fee = 0;
    `;
    const updateResult = await client.query(updateSql);
    console.log(`✅ Updated ${updateResult.rowCount} doctor(s) with consultation fee.\n`);

    // Step 3: Verify the data
    console.log('Step 3: Verifying doctor data...');
    const verifyResult = await client.query(`
      SELECT 
        id,
        first_name,
        last_name,
        experience_years,
        consultation_fee,
        specialization
      FROM public.doctor_profiles
      WHERE is_approved = true
      ORDER BY first_name, last_name;
    `);

    console.log('\n=== DOCTOR PROFILES DATA ===');
    for (const row of verifyResult.rows) {
      console.log(`  Dr. ${row.first_name} ${row.last_name} (${row.specialization})`);
      console.log(`    Experience: ${row.experience_years || 0} years`);
      console.log(`    Consultation Fee: Rs. ${row.consultation_fee?.toLocaleString() || '0'}`);
    }

    console.log(`\n✅ Total doctors: ${verifyResult.rows.length}`);
    console.log('\nVerification complete.');

  } catch (error) {
    console.error('Failed to execute SQL queries:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();