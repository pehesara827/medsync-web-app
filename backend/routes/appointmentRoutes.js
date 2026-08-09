import { Router } from 'express';
import { createAppointment, getAppointmentPass } from '../controllers/appointmentController.js';

const router = Router();

// POST /api/appointments - Create new appointment
router.post('/', createAppointment);

// GET /api/appointments/:appointmentId/pass - Get appointment pass with QR
router.get('/:appointmentId/pass', getAppointmentPass);

export default router;
