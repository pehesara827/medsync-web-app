import express from 'express';
import { getDoctors } from '../controllers/doctorController.js';

const router = express.Router();

// Get all approved doctors with ratings and specialties
router.get('/', getDoctors);

export default router;