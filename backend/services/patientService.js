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

  const userId = authUser.id;

  // 2. Insert into patient_profiles table
  try {
    const patientProfile = await patientProfileModel.create({
      user_id: userId,
      profile_picture_url: profile_picture_url || null,
      first_name,
      last_name,
      date_of_birth,
      gender: gender || null,
      phone_number,
      national_id_passport,
      emergency_contact_name,
      emergency_contact_rel,
      emergency_contact_phone,
      alt_contact_phone: alt_contact_phone || null,
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
