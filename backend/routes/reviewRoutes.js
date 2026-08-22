import express from 'express';
import {
  getDoctorReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';

const router = express.Router();

// Get all reviews for a doctor
router.get('/doctor/:doctorId', getDoctorReviews);

// Create a new review
router.post('/', createReview);

// Update a review
router.put('/:reviewId', updateReview);

// Delete a review
router.delete('/:reviewId', deleteReview);

export default router;