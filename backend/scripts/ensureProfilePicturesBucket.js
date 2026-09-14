import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'profile-pictures';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — matches the profile page validation
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Ensures the "profile-pictures" bucket exists and (with --apply) normalises its
 * limits to what the patient profile page accepts: 2 MB, PNG/JPEG/WEBP.
 *
 * Policy note: the replaced picture is deleted by the backend with the service
 * role (see controllers/user_profile_controller.js), so this script
 * deliberately does NOT add an authenticated DELETE policy — that would let any
 * signed-in user delete other people's photos through the public anon key.
 *
 * Usage:
 *   node scripts/ensureProfilePicturesBucket.js          # report only
 *   node scripts/ensureProfilePicturesBucket.js --apply  # create / normalise
 */
const apply = process.argv.includes('--apply');

const main = async () => {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const existing = (buckets || []).find((bucket) => bucket.name === BUCKET);

  if (!existing) {
    console.log(`Bucket "${BUCKET}" is missing.`);
    if (!apply) {
      console.log('Re-run with --apply to create it.');
      return;
    }

    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    if (error) throw error;

    console.log(`✅ Created bucket "${BUCKET}".`);
    return;
  }

  console.log(`Bucket "${BUCKET}" already exists:`);
  console.log(`  - public: ${existing.public}`);
  console.log(`  - file size limit: ${existing.file_size_limit ?? 'none'}`);
  console.log(`  - allowed mime types: ${existing.allowed_mime_types ?? 'any'}`);

  const alreadyNormalised =
    existing.file_size_limit === MAX_BYTES &&
    Array.isArray(existing.allowed_mime_types) &&
    existing.allowed_mime_types.length === ALLOWED_MIME_TYPES.length &&
    ALLOWED_MIME_TYPES.every((type) => existing.allowed_mime_types.includes(type));

  if (alreadyNormalised) {
    console.log('✅ Limits already match the profile page requirements.');
    return;
  }

  if (!apply) {
    console.log(
      `\nLimits differ (expected ${MAX_BYTES} bytes, ${ALLOWED_MIME_TYPES.join(', ')}).\n` +
        'Re-run with --apply to update them.\n' +
        'Note: tightening the limit also affects the registration upload step.'
    );
    return;
  }

  const { error } = await supabase.storage.updateBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
  if (error) throw error;

  console.log('✅ Bucket limits updated.');
};

main().catch((error) => {
  console.error('Failed to ensure the profile-pictures bucket:', error.message || error);
  process.exitCode = 1;
});