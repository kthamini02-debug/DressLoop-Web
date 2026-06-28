"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.processUpload = processUpload;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("../config/cloudinary");
// Ensure the local upload directory exists
const uploadDir = path_1.default.join(__dirname, '../../public/uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Multer Storage Configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
// File Filter for Images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG, JPG, WEBP images and PDF documents are allowed.'));
    }
};
exports.upload = (0, multer_1.default)({
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
async function processUpload(file) {
    const localUrl = `/uploads/${file.filename}`;
    if (!cloudinary_1.isCloudinaryConfigured) {
        // Return relative URL that will be prefixed with the backend server host on the frontend
        return localUrl;
    }
    try {
        const result = await cloudinary_1.cloudinary.uploader.upload(file.path, {
            folder: 'dress_platform',
            resource_type: 'auto',
        });
        // Delete local temp file
        fs_1.default.unlink(file.path, (err) => {
            if (err)
                console.error('Error deleting temp file:', err);
        });
        return result.secure_url;
    }
    catch (error) {
        console.error('Cloudinary upload error, using local file backup:', error);
        return localUrl;
    }
}
