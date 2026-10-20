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
-- Add doctor_image column to doctor_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctor_profiles'
      AND column_name = 'doctor_image'
  ) THEN
    ALTER TABLE public.doctor_profiles
      ADD COLUMN doctor_image TEXT DEFAULT NULL;
    RAISE NOTICE 'Column doctor_image added to doctor_profiles';
  ELSE
    RAISE NOTICE 'Column doctor_image already exists in doctor_profiles';
  END IF;
END $$;
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

    console.log('Adding doctor_image column to doctor_profiles...');
    await client.query(sql);
    console.log('✅ doctor_image column is present on doctor_profiles.');

    // Verify
    const verify = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'doctor_profiles'
        AND column_name = 'doctor_image';
    `);

    if (verify.rows.length > 0) {
      const col = verify.rows[0];
      console.log(`✅ Verified: doctor_profiles.doctor_image (${col.data_type}, nullable=${col.is_nullable})`);
    } else {
      console.log('❌ Column not found after migration!');
      process.exitCode = 1;
    }
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