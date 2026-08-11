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

async function main() {
  try {
    await client.connect();
    console.log('Connected.\n');

    // 1. Insert a test doctor (using the first patient's user_id as the doctor's user_id for simplicity)
    // Look up the Cardiology specialty_id
    const specialtyRes = await client.query(`
      SELECT id, name FROM public.specialties WHERE name = 'Cardiology';
    `);
    const specialtyId = specialtyRes.rows[0]?.id;

    const doctorRes = await client.query(`
      INSERT INTO public.doctor_profiles (
        user_id, first_name, last_name, medical_license_no, specialization, specialty_id, experience_years, is_approved, doctor_image
      ) VALUES (
        '05deced5-e869-4b38-bda4-3faca83c0a23',
        'Sarah', 'Chen', 'LIC-2024-001', 'Cardiology', $1, 12, true,
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300'
      )
      ON CONFLICT (medical_license_no) DO NOTHING
      RETURNING id, first_name, last_name, specialization;
    `, [specialtyId]);

    let doctorId;
    if (doctorRes.rows.length > 0) {
      doctorId = doctorRes.rows[0].id;
      console.log(`✅ Doctor created: Dr. ${doctorRes.rows[0].first_name} ${doctorRes.rows[0].last_name} (${doctorRes.rows[0].specialization})`);
    } else {
      // Fetch existing doctor
      const existing = await client.query(`
        SELECT id, first_name, last_name, specialization FROM public.doctor_profiles WHERE medical_license_no = 'LIC-2024-001';
      `);
      doctorId = existing.rows[0].id;
      console.log(`ℹ️ Doctor already exists: Dr. ${existing.rows[0].first_name} ${existing.rows[0].last_name}`);
    }

    // 2. Insert test schedules for the next 7 days
    const today = new Date();
    const schedules = [];
    for (let day = 1; day <= 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      // Morning slot
      schedules.push(`('${doctorId}', '${dateStr}', '09:00', '09:30', 5000.00, false)`);
      // Mid-morning slot
      schedules.push(`('${doctorId}', '${dateStr}', '10:30', '11:00', 5000.00, false)`);
      // Afternoon slot
      schedules.push(`('${doctorId}', '${dateStr}', '14:00', '14:30', 5000.00, false)`);
    }

    const insertSchedules = `
      INSERT INTO public.doctor_schedules (doctor_id, available_date, start_time, end_time, consultation_fee, is_booked)
      VALUES ${schedules.join(', ')}
      ON CONFLICT DO NOTHING;
    `;

    await client.query(insertSchedules);
    console.log(`✅ Inserted ${schedules.length} schedule slots for the next 7 days`);

    // 3. Verify
    const verify = await client.query(`
      SELECT 
        ds.id, ds.available_date, ds.start_time, ds.end_time, ds.consultation_fee, ds.is_booked,
        dp.first_name, dp.last_name, dp.specialization
      FROM public.doctor_schedules ds
      JOIN public.doctor_profiles dp ON dp.id = ds.doctor_id
      WHERE ds.is_booked = false
      ORDER BY ds.available_date, ds.start_time
      LIMIT 10;
    `);

    console.log('\n=== AVAILABLE SCHEDULES ===');
    for (const row of verify.rows) {
      console.log(`  ${row.available_date} ${row.start_time}-${row.end_time} | Dr. ${row.first_name} ${row.last_name} (${row.specialization}) | Fee: ${row.consultation_fee} | Booked: ${row.is_booked}`);
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