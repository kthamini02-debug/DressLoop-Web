import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get list of active chat partners (users with whom you have active accepted donations)
router.get('/contacts', authMiddleware, messageController.getChatPartners);

// Get chat history with a specific user
router.get('/history/:otherUserId', authMiddleware, messageController.getMessages);

// Send message to a user
router.post('/', authMiddleware, messageController.sendMessage);

export default router;
