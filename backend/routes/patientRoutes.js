import { Router } from 'express';
import { registerPatient } from '../controllers/patientController.js';

const router = Router();

// POST /api/auth/register/patient
router.post('/register/patient', registerPatient);

export default router;