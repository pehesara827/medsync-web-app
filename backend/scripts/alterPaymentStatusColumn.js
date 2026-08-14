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
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'payment_status'
    `);

    if (currentRows.length === 0) {
      console.log('❌ Column "payment_status" not found in payments table!');
      process.exitCode = 1;
      return;
    }

    const current = currentRows[0];
    console.log(`  payment_status: ${current.data_type}(${current.character_maximum_length})`);

    // Alter the column to VARCHAR(30)
    console.log('\n--- Altering payment_status VARCHAR(20) → VARCHAR(30) ---');
    const alterSql = `
      ALTER TABLE public.payments
        ALTER COLUMN payment_status TYPE VARCHAR(30);
    `;

    await client.query(alterSql);
    console.log('✅ Column altered to VARCHAR(30)');

    // Verify the new definition
    console.log('\n--- Verified column definition ---');
    const { rows: verifiedRows } = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'payment_status'
    `);

    if (verifiedRows.length > 0) {
      const verified = verifiedRows[0];
      console.log(`  payment_status: ${verified.data_type}(${verified.character_maximum_length})`);
      console.log(`\n✅ Migration complete. The column can now store "PENDING_SLIP_VERIFICATION" (24 chars).`);
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