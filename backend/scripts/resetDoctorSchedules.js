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

    // Step 1: Delete all existing schedules
    console.log('Step 1: Deleting all existing doctor_schedules...');
    const deleteResult = await client.query('DELETE FROM public.doctor_schedules;');
    console.log(`✅ Deleted ${deleteResult.rowCount} schedule(s) from doctor_schedules.\n`);

    // Step 2: Get all approved doctors
    console.log('Step 2: Fetching all approved doctors...');
    const doctorsResult = await client.query(`
      SELECT id, first_name, last_name, specialization
      FROM public.doctor_profiles
      WHERE is_approved = true
      ORDER BY id;
    `);

    if (doctorsResult.rows.length === 0) {
      console.log('⚠️  No approved doctors found. Exiting.');
      return;
    }

    console.log(`✅ Found ${doctorsResult.rows.length} approved doctor(s).\n`);

    // Step 3: Generate schedule slots for each doctor for the next 14 days
    console.log('Step 3: Generating schedule slots for the next 14 days...');
    
    const today = new Date();
    const scheduleValues = [];
    const defaultConsultationFee = 5000.00;

    for (const doctor of doctorsResult.rows) {
      const doctorId = doctor.id;
      const doctorName = `Dr. ${doctor.first_name} ${doctor.last_name}`;

      // Generate slots for the next 14 days
      for (let day = 1; day <= 14; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        // Morning slot: 09:00 - 09:30
        scheduleValues.push(`('${doctorId}', '${dateStr}', '09:00', '09:30', ${defaultConsultationFee}, false)`);
        
        // Mid-morning slot: 10:30 - 11:00
        scheduleValues.push(`('${doctorId}', '${dateStr}', '10:30', '11:00', ${defaultConsultationFee}, false)`);
        
        // Afternoon slot: 14:00 - 14:30
        scheduleValues.push(`('${doctorId}', '${dateStr}', '14:00', '14:30', ${defaultConsultationFee}, false)`);
        
        // Evening slot: 16:00 - 16:30
        scheduleValues.push(`('${doctorId}', '${dateStr}', '16:00', '16:30', ${defaultConsultationFee}, false)`);
      }

      console.log(`  - ${doctorName}: ${14 * 4} slots generated`);
    }

    // Step 4: Insert all schedules
    console.log(`\nStep 4: Inserting ${scheduleValues.length} schedule slots...`);
    const insertSql = `
      INSERT INTO public.doctor_schedules (doctor_id, available_date, start_time, end_time, consultation_fee, is_booked)
      VALUES ${scheduleValues.join(', ')}
      ON CONFLICT DO NOTHING;
    `;

    const insertResult = await client.query(insertSql);
    console.log(`✅ Inserted ${insertResult.rowCount} schedule slot(s).\n`);

    // Step 5: Verify the data
    console.log('Step 5: Verifying inserted data...');
    const verifyResult = await client.query(`
      SELECT 
        dp.first_name,
        dp.last_name,
        dp.specialization,
        COUNT(ds.id) as total_slots,
        MIN(ds.available_date) as earliest_date,
        MAX(ds.available_date) as latest_date
      FROM public.doctor_schedules ds
      JOIN public.doctor_profiles dp ON dp.id = ds.doctor_id
      GROUP BY dp.id, dp.first_name, dp.last_name, dp.specialization
      ORDER BY dp.first_name, dp.last_name;
    `);

    console.log('\n=== SCHEDULE SUMMARY ===');
    for (const row of verifyResult.rows) {
      console.log(`  Dr. ${row.first_name} ${row.last_name} (${row.specialization}): ${row.total_slots} slots (${row.earliest_date} to ${row.latest_date})`);
    }

    // Show sample schedules
    console.log('\n=== SAMPLE SCHEDULES (First 10) ===');
    const sampleResult = await client.query(`
      SELECT 
        ds.id,
        ds.available_date,
        ds.start_time,
        ds.end_time,
        ds.consultation_fee,
        ds.is_booked,
        dp.first_name,
        dp.last_name,
        dp.specialization
      FROM public.doctor_schedules ds
      JOIN public.doctor_profiles dp ON dp.id = ds.doctor_id
      ORDER BY ds.available_date, ds.start_time
      LIMIT 10;
    `);

    for (const row of sampleResult.rows) {
      console.log(`  ${row.available_date} ${row.start_time}-${row.end_time} | Dr. ${row.first_name} ${row.last_name} (${row.specialization}) | Fee: ${row.consultation_fee} | Booked: ${row.is_booked}`);
    }

    console.log('\n✅ Doctor schedules reset completed successfully!');
    console.log(`   Total doctors: ${doctorsResult.rows.length}`);
    console.log(`   Total schedule slots created: ${scheduleValues.length}`);
    console.log(`   Date range: ${today.toISOString().split('T')[0]} to ${new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);

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