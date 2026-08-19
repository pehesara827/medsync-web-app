import express from 'express';
import {
  getDoctors,
  getDoctorProfile,
  getDoctorAppointments,
  getDoctorSchedule,
  getDoctorPatients,
  updateScheduleCapacity,
} from '../controllers/doctorController.js';

const router = express.Router();

// Get all approved doctors with ratings and specialties
router.get('/', getDoctors);

// Get doctor profile by user_id (logged-in doctor)
router.get('/profile/:userId', getDoctorProfile);

// Get doctor's appointments by doctor_id
router.get('/appointments/:doctorId', getDoctorAppointments);

// Get doctor's schedule by doctor_id
router.get('/schedule/:doctorId', getDoctorSchedule);

// Get doctor's patients by doctor_id
router.get('/patients/:doctorId', getDoctorPatients);

// Update max_patients capacity for a specific schedule slot
router.put('/schedules/:scheduleId', updateScheduleCapacity);

export default router;
