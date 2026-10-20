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

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.\n');

    // Step 1: Drop consultation_fee column from doctor_profiles
    console.log('Step 1: Dropping consultation_fee column from doctor_profiles...');
    const dropColumnSql = `
      ALTER TABLE public.doctor_profiles 
      DROP COLUMN IF EXISTS consultation_fee;
    `;
    await client.query(dropColumnSql);
    console.log('✅ consultation_fee column dropped from doctor_profiles.\n');

    // Step 2: Verify the column is removed
    console.log('Step 2: Verifying doctor_profiles columns...');
    const colCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_profiles'
      ORDER BY ordinal_position;
    `);

    const columns = colCheck.rows.map((r) => r.column_name);
    console.log('doctor_profiles columns:', columns.join(', '));

    if (columns.includes('consultation_fee')) {
      console.log('❌ consultation_fee still exists in doctor_profiles!');
      process.exitCode = 1;
    } else {
      console.log('✅ consultation_fee successfully removed from doctor_profiles.');
    }

    // Step 3: Verify consultation_fee still exists in doctor_schedules
    console.log('\nStep 3: Verifying consultation_fee in doctor_schedules...');
    const scheduleColCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_schedules'
        AND column_name = 'consultation_fee';
    `);

    if (scheduleColCheck.rows.length > 0) {
      console.log('✅ consultation_fee still exists in doctor_schedules.');
    } else {
      console.log('❌ consultation_fee NOT found in doctor_schedules!');
      process.exitCode = 1;
    }

    // Step 4: Show sample schedule fees
    console.log('\nStep 4: Sample schedule consultation fees...');
    const sampleResult = await client.query(`
      SELECT 
        ds.available_date,
        ds.start_time,
        ds.consultation_fee,
        dp.first_name,
        dp.last_name
      FROM public.doctor_schedules ds
      JOIN public.doctor_profiles dp ON dp.id = ds.doctor_id
      WHERE ds.is_booked = false
      ORDER BY ds.available_date, ds.start_time
      LIMIT 5;
    `);

    for (const row of sampleResult.rows) {
      console.log(`  ${row.available_date} ${row.start_time} | Dr. ${row.first_name} ${row.last_name} | Fee: Rs. ${row.consultation_fee}`);
    }

    console.log('\n✅ Migration complete. consultation_fee now sourced from doctor_schedules.');
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