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
const donationController = __importStar(require("../controllers/donationController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// Create a new donation (Donor only, supports up to 5 images)
router.post('/', authMiddleware_1.authMiddleware, uploadMiddleware_1.upload.array('images', 5), donationController.createDonation);
// Get my donations (Donor only)
router.get('/my', authMiddleware_1.authMiddleware, donationController.getMyDonations);
// Browse donations with filters (NGOs and Admins)
router.get('/browse', authMiddleware_1.authMiddleware, donationController.browseDonations);
// Get donation details (Authenticated users)
router.get('/:id', authMiddleware_1.authMiddleware, donationController.getDonationById);
// Update donation (Donor only, supports updating images)
router.put('/:id', authMiddleware_1.authMiddleware, uploadMiddleware_1.upload.array('images', 5), donationController.updateDonation);
// Delete donation (Donor only)
router.delete('/:id', authMiddleware_1.authMiddleware, donationController.deleteDonation);
exports.default = router;
