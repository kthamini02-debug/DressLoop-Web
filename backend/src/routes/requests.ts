import { Router } from 'express';
import * as requestController from '../controllers/requestController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Create a request (NGO only)
router.post('/', authMiddleware, requestController.createRequest);

// View requests submitted by current NGO (NGO only)
router.get('/my', authMiddleware, requestController.getMyRequests);

// View requests submitted for a donation (Donor only)
router.get('/donation/:donationId', authMiddleware, requestController.getRequestsByDonation);

// Accept, reject, collect, or complete request status (Authenticated users)
router.put('/:id/status', authMiddleware, requestController.updateRequestStatus);

export default router;
