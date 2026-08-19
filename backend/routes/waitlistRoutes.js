import { Router } from 'express';
import {
  joinWaitlist,
  getPatientWaitlist,
  getDoctorWaitlist,
  acceptOffer,
  declineOffer,
  cancelEntry,
  expireOffers,
} from '../controllers/waitlistController.js';

const router = Router();

// POST /api/waitlist - Join waitlist for a full slot
router.post('/', joinWaitlist);

// GET /api/waitlist/patient/:patientId - Get patient's waitlist entries
router.get('/patient/:patientId', getPatientWaitlist);

// GET /api/waitlist/doctor/:doctorId - Get doctor's waitlist entries
router.get('/doctor/:doctorId', getDoctorWaitlist);

// POST /api/waitlist/expire-offers - Manually trigger expiry check
router.post('/expire-offers', expireOffers);

// POST /api/waitlist/:waitlistId/accept - Accept a waitlist offer
router.post('/:waitlistId/accept', acceptOffer);

// POST /api/waitlist/:waitlistId/decline - Decline a waitlist offer
router.post('/:waitlistId/decline', declineOffer);

// DELETE /api/waitlist/:waitlistId - Cancel a patient's waitlist entry
router.delete('/:waitlistId', cancelEntry);

export default router;