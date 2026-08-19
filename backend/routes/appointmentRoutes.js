import { Router } from 'express';
import {
  createAppointment,
  getAppointmentPass,
  getPatientAppointments,
  cancelAppointment,
  updateAppointment,
} from '../controllers/appointmentController.js';

const router = Router();

// POST /api/appointments - Create new appointment
router.post('/', createAppointment);

// GET /api/appointments/patient/:patientId - Get all appointments for a patient (card format)
router.get('/patient/:patientId', getPatientAppointments);

// GET /api/appointments/:appointmentId/pass - Get appointment pass with QR
router.get('/:appointmentId/pass', getAppointmentPass);

// PATCH /api/appointments/:appointmentId/cancel - Cancel an appointment
router.patch('/:appointmentId/cancel', cancelAppointment);

// PUT /api/appointments/:appointmentId - Update an appointment
router.put('/:appointmentId', updateAppointment);

export default router;
