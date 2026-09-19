import express from 'express';
import {
  getDoctorReviews,
  getReviewByAppointment,
  getPendingReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';

const router = express.Router();

// Get all reviews for a doctor
router.get('/doctor/:doctorId', getDoctorReviews);

// Get pending (unreviewed COMPLETED) appointments for a patient — polled by
// the patient frontend to auto-open the review popup.
router.get('/pending/:patientId', getPendingReviews);

// Get the review for a single appointment (null when not reviewed yet)
router.get('/appointment/:appointmentId', getReviewByAppointment);

// Create a new review
router.post('/', createReview);

// Update a review
router.put('/:reviewId', updateReview);

// Delete a review
router.delete('/:reviewId', deleteReview);

export default router;