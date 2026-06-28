import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload, processUpload } from '../middleware/uploadMiddleware';

const router = Router();

// Registration and Login
router.post('/register', authController.register);
router.post('/login', authController.login);

// Get Profile & Update Profile (JWT Protected)
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);

// Dynamic Document Upload Helper (for NGO signup or profile docs)
router.post('/upload-document', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file uploaded.' });
  }
  try {
    const fileUrl = await processUpload(req.file);
    return res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('File upload route error:', error);
    return res.status(500).json({ error: 'Failed to upload document.' });
  }
});

export default router;
