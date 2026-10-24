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

    // Check the current column definition
    console.log('--- Current column definition ---');
    const { rows: currentRows } = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'patient_profiles'
        AND column_name = 'national_id_passport'
    `);

    if (currentRows.length === 0) {
      console.log('❌ Column "national_id_passport" not found in patient_profiles table!');
      process.exitCode = 1;
      return;
    }

    const current = currentRows[0];
    console.log(`  national_id_passport: ${current.data_type}(${current.character_maximum_length}) nullable=${current.is_nullable}`);

    if (current.is_nullable === 'YES') {
      console.log('\n✅ Column is already nullable — no change needed.');
      await client.end();
      return;
    }

    // Drop the NOT NULL constraint so patient registration can proceed when a
    // national ID / passport number is not provided (the registration form does
    // not collect this field, so inserting NULL previously raised 23502, which
    // the error middleware surfaced as HTTP 400 "Failing row contains (...)").
    console.log('\n--- Dropping NOT NULL constraint on national_id_passport ---');
    const alterSql = `
      ALTER TABLE public.patient_profiles
        ALTER COLUMN national_id_passport DROP NOT NULL;
    `;

    await client.query(alterSql);
    console.log('✅ NOT NULL constraint dropped');

    // Verify the new definition
    console.log('\n--- Verified column definition ---');
    const { rows: verifiedRows } = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'patient_profiles'
        AND column_name = 'national_id_passport'
    `);

    if (verifiedRows.length > 0) {
      const verified = verifiedRows[0];
      console.log(`  national_id_passport: ${verified.data_type}(${verified.character_maximum_length}) nullable=${verified.is_nullable}`);
      console.log('\n✅ Migration complete. Patient registration without a national ID will no longer raise 400.');
    } else {
      console.log('❌ Could not verify the altered column.');
      process.exitCode = 1;
    }

  } catch (error) {
    console.error('Failed to alter column:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();
