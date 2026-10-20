import * as authUserModel from '../models/authUserModel.js';
import * as doctorProfileModel from '../models/doctorProfileModel.js';
import { supabase } from '../supabase.js';

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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Please enter a valid email address.');
    error.status = 400;
    throw error;
  }

  // Validate specialty_id early: must be a UUID and must exist, otherwise
  // the insert fails with a raw 23503 FK 500.
  let normalizedSpecialtyId = null;
  if (specialty_id !== undefined && specialty_id !== null && String(specialty_id).trim() !== '') {
    const trimmed = String(specialty_id).trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      const error = new Error('Selected specialty is invalid. Please choose a specialty from the list.');
      error.status = 400;
      throw error;
    }
    const { data: specialtyRow, error: specialtyError } = await supabase
      .from('specialties')
      .select('id')
      .eq('id', trimmed)
      .maybeSingle();
    if (specialtyError) throw specialtyError;
    if (!specialtyRow) {
      const error = new Error('Selected specialty does not exist. Please choose a specialty from the list.');
      error.status = 400;
      throw error;
    }
    normalizedSpecialtyId = trimmed;
  }

  // Pre-check duplicate medical license so we return 409, not a raw 500.
  if (medical_license_no && String(medical_license_no).trim() !== '') {
    const { data: existing, error: dupError } = await supabase
      .from('doctor_profiles')
      .select('id')
      .eq('medical_license_no', String(medical_license_no).trim())
      .maybeSingle();
    if (dupError) throw dupError;
    if (existing) {
      const error = new Error('Medical license number already exists. Please use a different value.');
      error.status = 409;
      error.code = '23505';
      error.details = 'Key (medical_license_no) already exists.';
      throw error;
    }
  }

  // 1. Create the account in auth.users (email + password live here).
  //    The DB trigger `handle_new_user_registration` will automatically
  //    insert the matching row into public.users using the user metadata.
  let authUser;
  try {
    authUser = await authUserModel.createAuthUser({
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
  } catch (authError) {
    // Map Supabase Auth errors to friendly HTTP statuses instead of 500.
    const msg = (authError.message || '').toLowerCase();
    if (authError.name === 'AuthApiError' || authError.__isAuthError) {
      if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        authError.status = 409;
        authError.message = 'A user with this email address has already been registered.';
      } else if (msg.includes('password')) {
        authError.status = 400;
      } else if (authError.status == null) {
        authError.status = 400;
      }
    } else if (/fetch failed|network|socket|hang up|timed out|timeout|econn|enotfound/i.test(authError.message || '')) {
      const err = new Error('Cannot reach the account service. Check your internet connection and try again.');
      err.status = 503;
      err.cause = authError;
      throw err;
    }
    throw authError;
  }

  const userId = authUser?.id;

  if (!userId) {
    const error = new Error('User account could not be created. Please try again later.');
    error.status = 500;
    throw error;
  }

  // 2. Insert into doctor_profiles table
  try {
    const doctorProfile = await doctorProfileModel.create({
      user_id: userId,
      first_name,
      last_name,
      medical_license_no,
      specialization,
      specialty_id: normalizedSpecialtyId,
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