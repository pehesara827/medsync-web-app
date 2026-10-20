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
    // ── 1. Create payment-slips bucket ────────────────────────────────
    console.log('Creating "payment-slips" storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('payment-slips', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    });

    if (bucketError) {
      // If bucket already exists, that's fine
      if (bucketError.message?.includes('already exists')) {
        console.log('✅ Bucket "payment-slips" already exists.');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Bucket "payment-slips" created successfully.');
    }

    // ── 2. Create storage RLS policies via SQL ────────────────────────
    console.log('\nCreating storage policies...');
    await pgClient.connect();

    const storagePolicies = [
      {
        name: 'payment_slips_insert_authenticated',
        cmd: 'INSERT',
        using: null,
        withCheck: `bucket_id = 'payment-slips'`,
      },
      {
        name: 'payment_slips_select_authenticated',
        cmd: 'SELECT',
        using: `bucket_id = 'payment-slips'`,
        withCheck: null,
      },
    ];

    for (const p of storagePolicies) {
      const usingClause = p.using ? `USING (${p.using})` : '';
      const checkClause = p.withCheck ? `WITH CHECK (${p.withCheck})` : '';

      const sql = `
        DROP POLICY IF EXISTS "${p.name}" ON storage.objects;
        CREATE POLICY "${p.name}"
        ON storage.objects
        FOR ${p.cmd}
        TO authenticated
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

    // ── 3. Verify bucket exists ───────────────────────────────────────
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const paymentSlipsBucket = buckets.find((b) => b.name === 'payment-slips');
    if (paymentSlipsBucket) {
      console.log('\n✅ Bucket "payment-slips" verified:');
      console.log(`  - ID: ${paymentSlipsBucket.id}`);
      console.log(`  - Public: ${paymentSlipsBucket.public}`);
      console.log(`  - File size limit: ${paymentSlipsBucket.file_size_limit || 'default'}`);
    } else {
      console.log('\n❌ Bucket "payment-slips" not found!');
    }

    console.log('\nStorage setup complete.');
  } catch (error) {
    console.error('Failed to set up storage:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await pgClient.end();
  }
}

main();