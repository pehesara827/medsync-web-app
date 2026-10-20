import { Router } from 'express';
import {
  getDoctorSchedules,
  createSchedule,
  broadcastSessionDelay,
} from '../controllers/scheduleController.js';

const router = Router();

// GET /api/schedules - list schedules (filter by doctor_id / date range)
router.get('/', getDoctorSchedules);

// POST /api/schedules - create a new schedule slot
router.post('/', createSchedule);

// POST /api/schedules/:scheduleId/broadcast-delay - record + broadcast a delay
router.post('/:scheduleId/broadcast-delay', broadcastSessionDelay);

export default router;