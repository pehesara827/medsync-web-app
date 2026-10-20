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
INSERT INTO public.specialties (name, description) VALUES
    ('Cardiology', 'Diagnosis and treatment of heart and blood vessel disorders.'),
    ('Neurology', 'Specializes in brain, spinal cord, and nervous system conditions.'),
    ('Pediatrics', 'Comprehensive medical care for infants, children, and adolescents.'),
    ('Dermatology', 'Treatment of skin, hair, and nail conditions.'),
    ('Orthopedic Surgery', 'Care for bones, joints, ligaments, tendons, and muscles.'),
    ('Obstetrics & Gynecology', 'Women reproductive health, pregnancy, and childbirth care.'),
    ('Psychiatry', 'Diagnosis and treatment of mental health and emotional disorders.'),
    ('Gastroenterology', 'Digestive system, stomach, liver, and intestinal health.'),
    ('Ophthalmology', 'Medical and surgical eye care.'),
    ('Otolaryngology (ENT)', 'Ear, nose, throat, and head/neck specialist care.'),
    ('Pulmonology', 'Respiratory system and lung conditions.'),
    ('Endocrinology', 'Hormone regulation, diabetes, and thyroid health.'),
    ('Oncology', 'Cancer diagnosis and treatment.'),
    ('General Surgery', 'Surgical procedures for abdominal organs, tissue, and trauma.'),
    ('Family Medicine', 'Primary care for patients of all ages.')
ON CONFLICT (name) DO NOTHING;
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

    // Execute insert SQL
    console.log('Inserting specialties...');
    const result = await client.query(sql);
    
    console.log('✅ Specialties inserted successfully!');
    console.log(`   Rows affected: ${result.rowCount}`);

    // Verify by fetching all specialties
    const verifyResult = await client.query(`
      SELECT id, name, description
      FROM public.specialties
      ORDER BY name;
    `);

    console.log(`\n--- Total Specialties in Database: ${verifyResult.rows.length} ---`);
    verifyResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name}`);
    });

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