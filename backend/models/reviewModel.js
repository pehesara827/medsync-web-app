import { supabase } from '../supabase.js';

/**
 * Fetches all reviews for a doctor, including patient name and avatar.
 * @param {string} doctorId - The doctor UUID
 * @returns {Promise<Array>} Array of review objects
 */
export const getReviewsByDoctorId = async (doctorId) => {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .select(`
      id,
      appointment_id,
      doctor_id,
      patient_id,
      rating,
      review_comment,
      is_anonymous,
      created_at,
      updated_at,
      patient_profiles (
        id,
        first_name,
        last_name,
        profile_picture_url
      )
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetches a single review by appointment.
 * @param {string} appointmentId - The appointment UUID
 * @returns {Promise<Object|null>} The review or null
 */
export const getReviewByAppointmentId = async (appointmentId) => {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .select('*')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

/**
 * Fetches a single review by doctor and patient.
 * @param {string} doctorId - The doctor UUID
 * @param {string} patientId - The patient UUID
 * @returns {Promise<Object|null>} The review or null
 */
export const getReviewByDoctorAndPatient = async (doctorId, patientId) => {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

/**
 * Creates a new review for a doctor.
 * @param {Object} reviewData - { appointment_id, doctor_id, patient_id, rating, review_comment, is_anonymous }
 * @returns {Promise<Object>} Created review
 */
export const createReview = async (reviewData) => {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .insert([
      {
        appointment_id: reviewData.appointment_id,
        doctor_id: reviewData.doctor_id,
        patient_id: reviewData.patient_id,
        rating: reviewData.rating,
        review_comment: reviewData.review_comment || null,
        is_anonymous: reviewData.is_anonymous || false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Updates an existing review.
 * @param {string} reviewId - The review UUID
 * @param {Object} updates - { rating, review_comment, is_anonymous }
 * @returns {Promise<Object>} Updated review
 */
export const updateReview = async (reviewId, updates) => {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .update({
      rating: updates.rating,
      review_comment: updates.review_comment || null,
      is_anonymous: updates.is_anonymous || false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Deletes a review.
 * @param {string} reviewId - The review UUID
 * @returns {Promise<void>}
 */
export const deleteReview = async (reviewId) => {
  const { error } = await supabase
    .from('doctor_reviews')
    .delete()
    .eq('id', reviewId);

  if (error) throw error;
};