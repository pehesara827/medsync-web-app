import * as authUserModel from '../models/authUserModel.js';
import * as patientProfileModel from '../models/patientProfileModel.js';

/**
 * Register a new patient user.
 *
 * Steps:
 *  1. Create the account in Supabase's built-in `auth.users` table
 *     (email + password). Supabase securely hashes the password itself.
 *     The DB trigger `handle_new_user_registration` automatically syncs
 *     auth.users -> public.users, so we do NOT insert into `users` manually.
 *  2. Insert into `patient_profiles` with user_id as the foreign key.
 *  3. On any failure, roll back the records created in previous steps.
 *
 * @param {Object} registrationData - The complete registration payload.
 * @returns {Object} - The created user and patient profile.
 */
export const registerPatient = async (registrationData) => {
  const {
    // Credentials
    username,
    email,
    // Accept either `password` (preferred) or legacy `password_hash` key
    password,
    password_hash: legacyPassword,
    terms_accepted,

    // Profile fields
    profile_picture_url,
    first_name,
    last_name,
    date_of_birth,
    gender,
    phone_number,
    national_id_passport,
    emergency_contact_name,
    emergency_contact_rel,
    emergency_contact_phone,
    alt_contact_phone,
    home_address,
    blood_group,
  } = registrationData;

  const plainPassword = password || legacyPassword;

  if (!email || !plainPassword) {
    const error = new Error('Email and password are required.');
    error.status = 400;
    throw error;
  }

  if (plainPassword.length < 6) {
    const error = new Error('Password must be at least 6 characters long.');
    error.status = 400;
    throw error;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Please enter a valid email address.');
    error.status = 400;
    throw error;
  }

  // Normalise phone numbers to a consistent "+<digits>" format so DB
  // type/length issues can't surface as a raw 500.
  const normalizePhone = (value) => {
    if (!value) return value;
    const digits = String(value).replace(/[^\d]/g, '');
    return digits ? `+${digits}` : null;
  };

  const normalizedPhone = normalizePhone(phone_number);
  const normalizedEmergencyPhone = normalizePhone(emergency_contact_phone);
  const normalizedAltPhone = normalizePhone(alt_contact_phone);

  if (normalizedPhone && normalizedPhone.length > 20) {
    const error = new Error('Phone number is too long. Please check the number you entered.');
    error.status = 400;
    throw error;
  }

  // Validate/normalise date of birth into a Postgres-friendly YYYY-MM-DD string.
  let dob = date_of_birth || null;
  if (dob) {
    const parsed = new Date(`${dob}T00:00:00`);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob));
    if (!match) {
      const error = new Error('Please enter a valid date of birth (YYYY-MM-DD).');
      error.status = 400;
      throw error;
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31 || Number.isNaN(parsed.getTime())) {
      const error = new Error('Please enter a valid date of birth.');
      error.status = 400;
      throw error;
    }
    dob = `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  }

  // 1. Create the account in auth.users (email + password live here).
  //    The DB trigger `handle_new_user_registration` will automatically
  //    insert the matching row into public.users using the user metadata.
  const authUser = await authUserModel.createAuthUser({
    email,
    password: plainPassword,
    userMetadata: {
      username,
      role: 'PATIENT',
      first_name,
      last_name,
      terms_accepted,
    },
  });

  const userId = authUser && authUser.id;

  if (!userId) {
    // Auth user wasn't created properly (e.g. missing service role key or an
    // unexpected Supabase response). Report a clear 400/500 rather than a
    // raw FK violation downstream.
    const error = new Error(
      authUser
        ? 'User account could not be created (missing user id).'
        : 'Unable to create the account. Please try again later.'
    );
    error.status = 500;
    throw error;
  }

  // 2. Insert into patient_profiles table
  try {
    const patientProfile = await patientProfileModel.create({
      user_id: userId,
      profile_picture_url: profile_picture_url || null,
      first_name,
      last_name,
      date_of_birth: dob,
      gender: gender || null,
      phone_number: normalizedPhone,
      national_id_passport,
      emergency_contact_name,
      emergency_contact_rel,
      emergency_contact_phone: normalizedEmergencyPhone,
      alt_contact_phone: normalizedAltPhone,
      home_address: home_address || null,
      blood_group: blood_group || null,
    });

    return { user: { id: userId, username, email, role: 'PATIENT', terms_accepted }, profile: patientProfile };
  } catch (profileError) {
    // 3. Rollback: delete the auth.users record (the trigger will cascade
    //    or we rely on the trigger's cleanup for the users row)
    await authUserModel.deleteAuthUser(userId).catch(() => {});
    throw profileError;
  }
};
