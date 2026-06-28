import { Router } from 'express';
import * as donationController from '../controllers/donationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Create a new donation (Donor only, supports up to 5 images)
router.post('/', authMiddleware, upload.array('images', 5), donationController.createDonation);

// Get my donations (Donor only)
router.get('/my', authMiddleware, donationController.getMyDonations);

// Browse donations with filters (NGOs and Admins)
router.get('/browse', authMiddleware, donationController.browseDonations);

// Get donation details (Authenticated users)
router.get('/:id', authMiddleware, donationController.getDonationById);

// Update donation (Donor only, supports updating images)
router.put('/:id', authMiddleware, upload.array('images', 5), donationController.updateDonation);

// Delete donation (Donor only)
router.delete('/:id', authMiddleware, donationController.deleteDonation);

export default router;
