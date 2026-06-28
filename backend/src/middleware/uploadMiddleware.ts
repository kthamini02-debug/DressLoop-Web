import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';

// Ensure the local upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File Filter for Images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG, WEBP images and PDF documents are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Uploads a local file (multer upload result) to Cloudinary if configured.
 * If Cloudinary is not configured, returns the local static server URL.
 */
export async function processUpload(file: Express.Multer.File): Promise<string> {
  const localUrl = `/uploads/${file.filename}`;

  if (!isCloudinaryConfigured) {
    // Return relative URL that will be prefixed with the backend server host on the frontend
    return localUrl;
  }

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'dress_platform',
      resource_type: 'auto',
    });

    // Delete local temp file
    fs.unlink(file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error, using local file backup:', error);
    return localUrl;
  }
}
