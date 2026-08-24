import express from 'express';
import {
  getDoctors,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorAppointments,
  getRecentConsultations,
  getDoctorSchedule,
  getDoctorPatients,
  getDoctorWeeklyStats,
  updateScheduleCapacity,
  getCurrentSession,
  reportSessionDelay,
} from '../controllers/doctorController.js';

const router = express.Router();

// Get all approved doctors with ratings and specialties
router.get('/', getDoctors);

// Get doctor profile by user_id (logged-in doctor)
router.get('/profile/:userId', getDoctorProfile);

// Update doctor profile by user_id (logged-in doctor)
router.put('/profile/:userId', updateDoctorProfile);

// Get doctor's appointments by doctor_id (supports ?date=YYYY-MM-DD)
router.get('/appointments/:doctorId', getDoctorAppointments);

// Get doctor's recent completed consultations by doctor_id
router.get('/recent-consultations/:doctorId', getRecentConsultations);

// Get doctor's schedule by doctor_id
router.get('/schedule/:doctorId', getDoctorSchedule);

// Get doctor's patients by doctor_id
router.get('/patients/:doctorId', getDoctorPatients);

// Get doctor's weekly patient counts by doctor_id
router.get('/weekly-stats/:doctorId', getDoctorWeeklyStats);

// Update max_patients capacity for a specific schedule slot
router.put('/schedules/:scheduleId', updateScheduleCapacity);

// Get the doctor's current active session (today's in-progress slot)
router.get('/session/current/:doctorId', getCurrentSession);

// Report a delay for the doctor's current active session
router.post('/session/delay/:doctorId', reportSessionDelay);

export default router;
