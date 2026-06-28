import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get list of notifications (all roles)
router.get('/', authMiddleware, notificationController.getNotifications);

// Mark all notifications as read (all roles)
router.put('/read', authMiddleware, notificationController.markAsRead);

export default router;
