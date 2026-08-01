import bcrypt from 'bcrypt';
import * as userModel from '../models/userModel.js';
import * as patientProfileModel from '../models/patientProfileModel.js';

const SALT_ROUNDS = 10;

/**
 * Register a new patient user.
 *
 * Steps:
 *  1. Hash the password using bcrypt.
 *  2. Insert into the `users` table (role = 'PATIENT').
 *  3. Extract the newly created user.id.
 *  4. Insert into `patient_profiles` table with the user_id as foreign key.
 *  5. If step 4 fails, rollback by deleting the orphan user record.
 *
 * @param {Object} registrationData - The complete registration payload.
 * @returns {Object} - The created user and patient profile.
 */
export const registerPatient = async (registrationData) => {
  const {
    // Credentials
    username,
    email,
    password_hash: plainPassword,
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

  // 1. Hash the password
  const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

  // 2. Insert into users table
  const newUser = await userModel.create({
    username,
    email,
    password_hash: passwordHash,
    role: 'PATIENT',
    terms_accepted,
  });

  const userId = newUser.id;

  // 3. Insert into patient_profiles table
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

    return { user: newUser, profile: patientProfile };
  } catch (profileError) {
    // 4. Rollback: delete the orphan user record if profile creation fails
    await userModel.remove(userId);
    throw profileError;
  }
};