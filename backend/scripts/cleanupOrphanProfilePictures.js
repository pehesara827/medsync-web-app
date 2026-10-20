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
const FOLDER = 'avatars';
const PAGE_SIZE = 100;
const DELETE_BATCH = 100;

/**
 * Turns a public bucket URL back into the storage object path, or null when the
 * URL does not point into this bucket.
 */
const storagePathFromUrl = (url) => {
  if (typeof url !== 'string') return null;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  if (!url.includes(marker)) return null;

  const encoded = url.split(marker)[1].split('?')[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

/** Lists every object stored under the avatars folder (paginated). */
const listAvatarObjects = async () => {
  const objects = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(FOLDER, { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) throw error;
    if (!data || data.length === 0) break;

    // Entries without metadata are placeholder folders, not files.
    objects.push(...data.filter((object) => object.id));

    if (data.length < PAGE_SIZE) break;
  }

  return objects;
};

/** Collects every object path still referenced by a profile row. */
const collectReferencedPaths = async () => {
  const referenced = new Set();

  const { data: patients, error: patientError } = await supabase
    .from('patient_profiles')
    .select('profile_picture_url');
  if (patientError) throw patientError;

  (patients || []).forEach((row) => {
    const objectPath = storagePathFromUrl(row.profile_picture_url);
    if (objectPath) referenced.add(objectPath);
  });

  // Doctor avatars are editable by admins and may live in the same bucket, so
  // never treat those files as orphans.
  const { data: doctors, error: doctorError } = await supabase
    .from('doctor_profiles')
    .select('doctor_image');
  if (doctorError) throw doctorError;

  (doctors || []).forEach((row) => {
    const objectPath = storagePathFromUrl(row.doctor_image);
    if (objectPath) referenced.add(objectPath);
  });

  return referenced;
};

/**
 * Deletes profile pictures that no patient (or doctor) profile references any
 * more — the leftovers from re-uploading a picture, or from registrations that
 * were later changed.
 *
 * Usage:
 *   node scripts/cleanupOrphanProfilePictures.js           # dry run (default)
 *   node scripts/cleanupOrphanProfilePictures.js --apply   # delete them
 */
const apply = process.argv.includes('--apply');

const main = async () => {
  const referenced = await collectReferencedPaths();
  const objects = await listAvatarObjects();

  const orphans = objects.filter(
    (object) => !referenced.has(`${FOLDER}/${object.name}`)
  );

  console.log(`Objects in ${BUCKET}/${FOLDER}: ${objects.length}`);
  console.log(`Referenced by a profile      : ${objects.length - orphans.length}`);
  console.log(`Orphaned                     : ${orphans.length}\n`);

  orphans.forEach((object) => {
    const sizeKb = object.metadata?.size ? ` — ${Math.round(object.metadata.size / 1024)} KB` : '';
    console.log(`  • ${object.name}${sizeKb}`);
  });

  if (orphans.length === 0) {
    console.log('\nNothing to clean up.');
    return;
  }

  if (!apply) {
    console.log('\nDry run — re-run with --apply to delete the files listed above.');
    return;
  }

  let deleted = 0;
  for (let index = 0; index < orphans.length; index += DELETE_BATCH) {
    const paths = orphans
      .slice(index, index + DELETE_BATCH)
      .map((object) => `${FOLDER}/${object.name}`);

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw error;

    deleted += paths.length;
    console.log(`Deleted ${deleted}/${orphans.length}...`);
  }

  console.log(`\n✅ Removed ${deleted} orphaned profile picture(s).`);
};

main().catch((error) => {
  console.error('Failed to clean up orphaned profile pictures:', error.message || error);
  process.exitCode = 1;
});