import express from 'express';
import { getSpecialties, getTopSpecialties } from '../controllers/specialtyController.js';

const router = express.Router();

// Get all specialties
router.get('/', getSpecialties);

// Get top 7 specialties for browse section
router.get('/top', getTopSpecialties);

export default router;