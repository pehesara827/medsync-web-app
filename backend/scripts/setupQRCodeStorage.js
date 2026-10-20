import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const pgClient = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    console.log('Setting up QR Code storage...\n');

    // Step 1: Create qr-codes bucket
    console.log('1. Creating "qr-codes" storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('qr-codes', {
      public: true,
      fileSizeLimit: 1 * 1024 * 1024, // 1MB
      allowedMimeTypes: ['image/png'],
    });

    if (bucketError) {
      if (bucketError.message?.includes('already exists')) {
        console.log('✅ Bucket "qr-codes" already exists.');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Bucket "qr-codes" created successfully.');
    }

    // Step 2: Create storage RLS policies via SQL
    console.log('\n2. Creating storage policies...');
    await pgClient.connect();

    const storagePolicies = [
      {
        name: 'qr_codes_select_public',
        cmd: 'SELECT',
        using: `bucket_id = 'qr-codes'`,
        to: 'public',
      },
      {
        name: 'qr_codes_insert_authenticated',
        cmd: 'INSERT',
        withCheck: `bucket_id = 'qr-codes'`,
        to: 'authenticated',
      },
    ];

    for (const p of storagePolicies) {
      const usingClause = p.using ? `USING (${p.using})` : '';
      const checkClause = p.withCheck ? `WITH CHECK (${p.withCheck})` : '';
      const toClause = p.to ? `TO ${p.to}` : '';

      const sql = `
        DROP POLICY IF EXISTS "${p.name}" ON storage.objects;
        CREATE POLICY "${p.name}"
        ON storage.objects
        FOR ${p.cmd}
        ${toClause}
        ${usingClause}
        ${checkClause};
      `;

      try {
        await pgClient.query(sql);
        console.log(`✅ Created policy: ${p.name}`);
      } catch (err) {
        console.log(`❌ Failed policy: ${p.name} — ${err.message}`);
      }
    }

    // Step 3: Verify bucket exists
    console.log('\n3. Verifying bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const qrCodesBucket = buckets.find((b) => b.name === 'qr-codes');
    if (qrCodesBucket) {
      console.log('✅ Bucket "qr-codes" verified:');
      console.log(`  - ID: ${qrCodesBucket.id}`);
      console.log(`  - Public: ${qrCodesBucket.public}`);
      console.log(`  - File size limit: ${qrCodesBucket.file_size_limit || 'default'}`);
    } else {
      console.log('❌ Bucket "qr-codes" not found!');
    }

    console.log('\n✅ QR Code storage setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run: node backend/scripts/fixQRCodeIndex.js');
    console.log('2. Test appointment creation');
  } catch (error) {
    console.error('Failed to set up QR code storage:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await pgClient.end();
  }
}

main();