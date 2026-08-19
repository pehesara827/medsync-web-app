import { Router } from 'express';
import { registerPatient, registerDoctor } from '../controllers/patientController.js';

const router = Router();

// POST /api/auth/register/patient
router.post('/register/patient', registerPatient);

// POST /api/auth/register/doctor
router.post('/register/doctor', registerDoctor);

export default router;
