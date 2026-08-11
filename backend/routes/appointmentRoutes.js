import { Router } from 'express';
import {
  createAppointment,
  getAppointmentPass,
  getPatientAppointments,
} from '../controllers/appointmentController.js';

const router = Router();

// POST /api/appointments - Create new appointment
router.post('/', createAppointment);

// GET /api/appointments/patient/:patientId - Get all appointments for a patient (card format)
router.get('/patient/:patientId', getPatientAppointments);

// GET /api/appointments/:appointmentId/pass - Get appointment pass with QR
router.get('/:appointmentId/pass', getAppointmentPass);

export default router;
