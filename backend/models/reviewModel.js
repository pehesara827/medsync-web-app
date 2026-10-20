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
 * Fetches COMPLETED appointments for a patient that have no review yet,
 * joined with doctor / schedule / patient names for the popup + notification.
 *
 * @param {string} patientId - patient_profiles.id
 * @param {number} [limit=10] - max rows to return (newest first)
 * @returns {Promise<Array>} pending review appointment objects
 */
export const getPendingReviewsForPatient = async (patientId, limit = 10) => {
  if (!patientId) return [];

  const { data: completed, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      appointment_date,
      status,
      doctor_id,
      patient_id,
      schedule_id,
      created_at,
      patient_profiles ( id, user_id, first_name, last_name ),
      doctor_profiles ( id, first_name, last_name, specialization ),
      doctor_schedules ( id, available_date, start_time, end_time )
    `
    )
    .eq('patient_id', patientId)
    .eq('status', 'COMPLETED')
    .order('appointment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!completed || completed.length === 0) return [];

  const ids = completed.map((a) => a.id);
  const { data: reviews, error: reviewError } = await supabase
    .from('doctor_reviews')
    .select('appointment_id')
    .in('appointment_id', ids);

  if (reviewError) throw reviewError;
  const reviewedIds = new Set((reviews || []).map((r) => r.appointment_id));

  return completed
    .filter((a) => !reviewedIds.has(a.id))
    .slice(0, limit)
    .map((a) => {
      const doctor = a.doctor_profiles || {};
      const schedule = a.doctor_schedules || {};
      const patient = a.patient_profiles || {};
      const doctorName =
        `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'your doctor';
      return {
        id: a.id,
        appointment_id: a.id,
        appointment_date: a.appointment_date,
        status: a.status,
        doctor_id: a.doctor_id,
        patient_id: a.patient_id,
        schedule_id: a.schedule_id,
        doctorName,
        doctorFirstName: doctor.first_name || '',
        doctorLastName: doctor.last_name || '',
        specialization: doctor.specialization || '',
        patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
        patientFirstName: patient.first_name || '',
        start_time: schedule.start_time || null,
        end_time: schedule.end_time || null,
        available_date: schedule.available_date || a.appointment_date,
      };
    });
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