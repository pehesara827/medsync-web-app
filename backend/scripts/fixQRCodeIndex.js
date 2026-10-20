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
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.');

    // Step 1: Drop the unique constraint if it exists
    console.log('\nDropping unique constraint...');
    const dropConstraintQuery = `
      ALTER TABLE appointments 
      DROP CONSTRAINT IF EXISTS appointments_qr_code_url_key;
    `;
    await client.query(dropConstraintQuery);
    console.log('✅ Dropped unique constraint on qr_code_url');

    // Step 2: Drop the unique index if it exists
    console.log('\nDropping unique index...');
    const dropIndexQuery = `
      DROP INDEX IF EXISTS appointments_qr_code_url_key;
    `;
    await client.query(dropIndexQuery);
    console.log('✅ Dropped unique index on qr_code_url');

    // Step 3: Verify the column no longer has unique constraint
    console.log('\nVerifying schema changes...');
    const verifyQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'qr_code_url';
    `;
    const verifyResult = await client.query(verifyQuery);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ qr_code_url column exists:');
      console.log('  ', verifyResult.rows[0]);
    } else {
      console.log('❌ qr_code_url column not found!');
    }

    // Step 4: Check for any remaining indexes on qr_code_url
    const indexQuery = `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'appointments'
        AND indexdef LIKE '%qr_code_url%';
    `;
    const indexResult = await client.query(indexQuery);
    
    if (indexResult.rows.length === 0) {
      console.log('✅ No indexes found on qr_code_url (as expected)');
    } else {
      console.log('⚠️  Found indexes on qr_code_url:');
      indexResult.rows.forEach(row => {
        console.log('  -', row.indexname, ':', row.indexdef);
      });
    }

    console.log('\n✅ Database migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: node backend/scripts/createStorageBuckets.js');
    console.log('2. Test appointment creation');
  } catch (error) {
    console.error('Failed to execute migration:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();