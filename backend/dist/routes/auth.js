"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController = __importStar(require("../controllers/authController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// Registration and Login
router.post('/register', authController.register);
router.post('/login', authController.login);
// Get Profile & Update Profile (JWT Protected)
router.get('/me', authMiddleware_1.authMiddleware, authController.getMe);
router.put('/profile', authMiddleware_1.authMiddleware, authController.updateProfile);
// Dynamic Document Upload Helper (for NGO signup or profile docs)
router.post('/upload-document', uploadMiddleware_1.upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No document file uploaded.' });
    }
    try {
        const fileUrl = await (0, uploadMiddleware_1.processUpload)(req.file);
        return res.status(200).json({ url: fileUrl });
    }
    catch (error) {
        console.error('File upload route error:', error);
        return res.status(500).json({ error: 'Failed to upload document.' });
    }
});
exports.default = router;
