import { Router } from 'express';
import {
  createAppointment,
  getAppointmentPass,
  getPatientAppointments,
  cancelAppointment,
  updateAppointment,
} from '../controllers/appointmentController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// POST /api/appointments - Create new appointment
router.post('/', requireRole(['PATIENT']), createAppointment);

// GET /api/appointments/patient/:patientId - Get all appointments for a patient (card format)
router.get('/patient/:patientId', requireRole(['PATIENT']), getPatientAppointments);

// GET /api/appointments/:appointmentId/pass - Get appointment pass with QR
router.get('/:appointmentId/pass', requireRole(['PATIENT', 'DOCTOR', 'ADMIN']), getAppointmentPass);

// PATCH /api/appointments/:appointmentId/cancel - Cancel an appointment
router.patch('/:appointmentId/cancel', requireRole(['PATIENT']), cancelAppointment);

// PUT /api/appointments/:appointmentId - Update an appointment
router.put('/:appointmentId', requireRole(['PATIENT']), updateAppointment);

export default router;
