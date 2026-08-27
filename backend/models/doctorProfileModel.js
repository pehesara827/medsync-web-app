import { supabase } from '../supabase.js';

/**
 * Doctor profile data model.
 *
 * Thin wrapper around the public `doctor_profiles` table, following the same
 * convention as the other model files (e.g. `userModel.js`, `appointmentModel.js`).
 * Used by `services/doctorService.js` when registering a new doctor from the
 * Admin "Add New Doctor" flow.
 */

/**
 * Coerce an optional string to null when it is blank/whitespace-only so the DB
 * never stores empty strings for optional columns (education, description).
 */
const trimOptional = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Create a new row in `doctor_profiles` for a freshly-registered doctor.
 *
 * @param {Object} data
 * @param {string} data.user_id - Auth user UUID (foreign key to auth/users sync).
 * @param {string} data.first_name
 * @param {string} data.last_name
 * @param {string} data.medical_license_no
 * @param {string} [data.specialization] - Free-text specialty, defaults to 'General Practice'.
 * @param {string} [data.specialty_id] - UUID FK to `specialties`.
 * @param {number} [data.experience_years]
 * @param {boolean} [data.is_approved=false]
 * @param {string} [data.doctor_image]
 * @param {number} [data.consultation_fee=5000]
 * @param {string} [data.education]
 * @param {string} [data.description] - Short professional bio.
 * @returns {Promise<Object>} The created doctor profile row.
 */
export const create = async (data) => {
  const { data: profile, error } = await supabase
    .from('doctor_profiles')
    .insert([
      {
        user_id: data.user_id,
        first_name: data.first_name,
        last_name: data.last_name,
        medical_license_no: data.medical_license_no,
        specialization: data.specialization || 'General Practice',
        specialty_id: data.specialty_id || null,
        experience_years: data.experience_years || 0,
        is_approved: data.is_approved ?? false,
        doctor_image: data.doctor_image || null,
        consultation_fee:
          data.consultation_fee !== undefined && data.consultation_fee !== null
            ? Number(data.consultation_fee)
            : 5000,
        education: trimOptional(data.education),
        description: trimOptional(data.description),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return profile;
};

/**
 * Fetch all doctor profiles.
 * @returns {Promise<Object[]>}
 */
export const findAll = async () => {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*');

  if (error) throw error;
  return data;
};

/**
 * Fetch a single doctor profile by its primary key.
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Fetch a single doctor profile by its linked auth `user_id`.
 * @returns {Promise<Object|null>}
 */
export const findByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Update fields on an existing doctor profile.
 * @returns {Promise<Object>} The updated doctor profile row.
 */
export const update = async (id, updateData) => {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Remove a doctor profile by its primary key.
 * @returns {Promise<boolean>}
 */
export const remove = async (id) => {
  const { error } = await supabase
    .from('doctor_profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};