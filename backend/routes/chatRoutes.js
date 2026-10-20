// backend/routes/chatRoutes.js
import { Router } from 'express';
import { sendChatMessage } from '../controllers/chatController.js';

const router = Router();

// POST /api/chat - Send a message to the MedSync AI assistant.
// Body: { message: string, conversationHistory?: Array<{ sender, text }> }
router.post('/', sendChatMessage);

export default router;
