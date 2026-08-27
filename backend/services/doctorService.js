import * as authUserModel from '../models/authUserModel.js';
import * as doctorProfileModel from '../models/doctorProfileModel.js';

/**
 * Register a new doctor user.
 *
 * Steps:
 *  1. Create the account in Supabase's built-in `auth.users` table
 *     (email + password). Supabase securely hashes the password itself.
 *     The DB trigger `handle_new_user_registration` automatically syncs
 *     auth.users -> public.users, so we do NOT insert into `users` manually.
 *  2. Insert into `doctor_profiles` with user_id as the foreign key.
 *  3. On any failure, roll back the records created in previous steps.
 *
 * @param {Object} registrationData - The complete registration payload.
 * @returns {Object} - The created user and doctor profile.
 */
export const registerDoctor = async (registrationData, { isApproved = false } = {}) => {
  const {
    // Credentials
    username,
    email,
    // Accept either `password` (preferred) or legacy `password_hash` key
    password,
    password_hash: legacyPassword,
    terms_accepted,

    // Profile fields
    first_name,
    last_name,
    medical_license_no,
    specialization,
    specialty_id,
    experience_years,
    doctor_image,
    consultation_fee,
    education,
    description,
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
      role: 'DOCTOR',
      first_name,
      last_name,
      terms_accepted,
    },
  });

  const userId = authUser.id;

  // 2. Insert into doctor_profiles table
  try {
    const doctorProfile = await doctorProfileModel.create({
      user_id: userId,
      first_name,
      last_name,
      medical_license_no,
      specialization,
      specialty_id,
      experience_years,
      is_approved: isApproved,
      doctor_image,
      consultation_fee,
      education,
      description,
    });

    return {
      user: { id: userId, username, email, role: 'DOCTOR', terms_accepted },
      profile: doctorProfile,
    };
  } catch (profileError) {
    // 3. Rollback: delete the auth.users record (the trigger will cascade
    //    or we rely on the trigger's cleanup for the users row)
    await authUserModel.deleteAuthUser(userId).catch(() => {});
    throw profileError;
  }
};