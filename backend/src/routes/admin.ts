import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

const router = Router();

// Dashboard general analytics
router.get('/stats', authMiddleware, roleMiddleware(['admin']), adminController.getDashboardStats);

// NGO Verification Management
router.get('/ngos', authMiddleware, roleMiddleware(['admin']), adminController.getNgos);
router.put('/ngos/:id/verify', authMiddleware, roleMiddleware(['admin']), adminController.verifyNgo);

// User Accounts Moderation
router.get('/users', authMiddleware, roleMiddleware(['admin']), adminController.getUsers);
router.delete('/users/:id', authMiddleware, roleMiddleware(['admin']), adminController.deleteUser);

// Donations Moderation
router.get('/donations', authMiddleware, roleMiddleware(['admin']), adminController.getDonations);
router.delete('/donations/:id', authMiddleware, roleMiddleware(['admin']), adminController.deleteDonation);

export default router;
