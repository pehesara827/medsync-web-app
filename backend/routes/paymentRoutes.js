import { Router } from 'express';
import { simulateOnlinePayment } from '../controllers/paymentController.js';

const router = Router();

// POST /api/payments/simulate - Sandbox online gateway payment confirmation
router.post('/simulate', simulateOnlinePayment);

export default router;