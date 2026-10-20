import { supabase } from '../supabase.js';
import * as reviewModel from '../models/reviewModel.js';

/**
 * GET /api/reviews/doctor/:doctorId
 * Returns all reviews for a doctor.
 */
export const getDoctorReviews = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const reviews = await reviewModel.getReviewsByDoctorId(doctorId);

    const formatted = (reviews || []).map((review) => {
      const patient = review.patient_profiles || {};
      const isAnonymous = Boolean(review.is_anonymous);
      return {
        id: review.id,
        appointmentId: review.appointment_id,
        doctorId: review.doctor_id,
        patientId: review.patient_id,
        rating: Number(review.rating),
        comment: review.review_comment || '',
        isAnonymous,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
        patientName: isAnonymous
          ? 'Anonymous'
          : `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Anonymous',
        patientImage: isAnonymous ? '' : patient.profile_picture_url || '',
      };
    });

    res.json({ reviews: formatted });
  } catch (error) {
    console.error('Error fetching doctor reviews:', error);
    next(error);
  }
};

/**
 * GET /api/reviews/appointment/:appointmentId
 * Returns the review for one appointment (or null when not reviewed yet).
 * Used by the patient dashboard to decide whether to show the review popup.
 */
export const getReviewByAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }
    const review = await reviewModel.getReviewByAppointmentId(appointmentId);
    res.json({ review: review || null, reviewed: Boolean(review) });
  } catch (error) {
    console.error('Error fetching review by appointment:', error);
    next(error);
  }
};

/**
 * GET /api/reviews/pending/:patientId
 * Returns COMPLETED appointments with no review yet (newest first).
 * The patient frontend polls this to auto-open the review popup.
 */
export const getPendingReviews = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }
    const pending = await reviewModel.getPendingReviewsForPatient(patientId, 10);
    res.json({ pending });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    next(error);
  }
};

/**
 * POST /api/reviews
 * Creates a new review for a doctor.
 */
export const createReview = async (req, res, next) => {
  try {
    const {
      appointment_id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      rating,
      review_comment: reviewComment,
      is_anonymous: isAnonymous,
    } = req.body;

    if (!appointmentId || !doctorId || !patientId) {
      return res.status(400).json({ message: 'appointment_id, doctor_id, and patient_id are required.' });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({ message: 'rating is required.' });
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'rating must be between 1 and 5.' });
    }

    // Reviews are only allowed after the visit is completed.
    const { data: appointmentRow, error: appointmentFetchError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', appointmentId)
      .maybeSingle();

    if (appointmentFetchError) throw appointmentFetchError;
    if (!appointmentRow) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (appointmentRow.status !== 'COMPLETED') {
      return res
        .status(400)
        .json({ message: 'You can review this visit after the consultation is completed.' });
    }

    // Check if the appointment already has a review
    const existingByAppointment = await reviewModel.getReviewByAppointmentId(appointmentId);
    if (existingByAppointment) {
      return res.status(409).json({ message: 'This appointment has already been reviewed.' });
    }

    const review = await reviewModel.createReview({
      appointment_id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      rating: numericRating,
      review_comment: reviewComment,
      is_anonymous: Boolean(isAnonymous),
    });

    res.status(201).json({ review });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'This appointment has already been reviewed.' });
    }
    next(error);
  }
};

/**
 * PUT /api/reviews/:reviewId
 * Updates an existing review.
 */
export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, review_comment: reviewComment, is_anonymous: isAnonymous } = req.body;

    if (!reviewId) {
      return res.status(400).json({ message: 'Review ID is required.' });
    }

    if (rating !== undefined && rating !== null) {
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'rating must be between 1 and 5.' });
      }
    }

    const review = await reviewModel.updateReview(reviewId, {
      rating,
      review_comment: reviewComment,
      is_anonymous: Boolean(isAnonymous),
    });

    res.json({ review });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reviews/:reviewId
 * Deletes a review.
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({ message: 'Review ID is required.' });
    }

    // Fetch the review first to verify it exists
    const { data: review, error: fetchError } = await supabase
      .from('doctor_reviews')
      .select('id')
      .eq('id', reviewId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    await reviewModel.deleteReview(reviewId);

    res.json({ message: 'Review deleted successfully.' });
  } catch (error) {
    next(error);
  }
};