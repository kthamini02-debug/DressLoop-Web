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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
// Configuration imports
const db_1 = require("./config/db");
const db = __importStar(require("./config/db"));
const socket_1 = require("./config/socket");
// Route imports
const auth_1 = __importDefault(require("./routes/auth"));
const donations_1 = __importDefault(require("./routes/donations"));
const requests_1 = __importDefault(require("./routes/requests"));
const messages_1 = __importDefault(require("./routes/messages"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
// Enable CORS
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
// Body Parser
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static uploads folder
const uploadsPath = path_1.default.join(__dirname, '../public/uploads');
app.use('/uploads', express_1.default.static(uploadsPath));
// Mount Routes
app.use('/api/auth', auth_1.default);
app.use('/api/donations', donations_1.default);
app.use('/api/requests', requests_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/admin', admin_1.default);
// Simple Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', sqlite: db.getIsSqlite() });
});
// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error Handler:', err.message || err);
    res.status(err.status || 500).json({
        error: err.message || 'An internal server error occurred.',
    });
});
// Seeding Script for Default Testing Users
async function seedDefaultUsers() {
    try {
        console.log('🌱 Checking default testing accounts (admin, donor, ngo)...');
        const hashedPassword = await bcryptjs_1.default.hash('password', 10);
        // Helper to seed/update a user
        async function seedUser(email, name, role, extraNgoInfo) {
            const checkRes = await db.query("SELECT id FROM users WHERE email = $1", [email]);
            let userId;
            if (checkRes.rows.length === 0) {
                userId = (0, uuid_1.v4)();
                await db.query("INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)", [userId, name, email, hashedPassword, role]);
                console.log(`✅ Created default user: ${email}`);
            }
            else {
                userId = checkRes.rows[0].id;
                await db.query("UPDATE users SET name = $1, password = $2, role = $3 WHERE id = $4", [name, hashedPassword, role, userId]);
                console.log(`🔄 Updated default user credentials: ${email}`);
            }
            if (role === 'ngo' && extraNgoInfo) {
                const checkNgo = await db.query("SELECT id FROM ngos WHERE id = $1", [userId]);
                if (checkNgo.rows.length === 0) {
                    await db.query("INSERT INTO ngos (id, organization_name, registration_number, verification_document, approval_status) VALUES ($1, $2, $3, $4, $5)", [userId, extraNgoInfo.name, extraNgoInfo.reg, extraNgoInfo.doc, extraNgoInfo.status]);
                }
                else {
                    await db.query("UPDATE ngos SET organization_name = $1, registration_number = $2, verification_document = $3, approval_status = $4 WHERE id = $5", [extraNgoInfo.name, extraNgoInfo.reg, extraNgoInfo.doc, extraNgoInfo.status, userId]);
                }
            }
        }
        // Seed Admin
        await seedUser('admin@dress.com', 'System Administrator', 'admin');
        // Seed Donor
        await seedUser('donor@dress.com', 'Sarah Donor', 'donor');
        // Seed NGO (Approved)
        await seedUser('ngo@dress.com', 'Hope Welfare Foundation', 'ngo', {
            name: 'Hope Welfare Foundation',
            reg: 'REG-123456-HWF',
            doc: '/uploads/hope_verification.pdf',
            status: 'approved',
        });
        // Create a dummy verification PDF placeholder just in case
        const pdfPlaceholder = path_1.default.join(uploadsPath, 'hope_verification.pdf');
        if (!require('fs').existsSync(pdfPlaceholder)) {
            require('fs').writeFileSync(pdfPlaceholder, 'PDF PLACEHOLDER CONTENT FOR VERIFICATION DOCUMENT');
        }
        // Seed NGO (Pending Admin Verification)
        await seedUser('pending@dress.com', 'Save Lives Orphanage', 'ngo', {
            name: 'Save Lives Orphanage',
            reg: 'REG-987654-SLO',
            doc: '/uploads/savelives_verification.pdf',
            status: 'pending',
        });
        const pdfPlaceholder2 = path_1.default.join(uploadsPath, 'savelives_verification.pdf');
        if (!require('fs').existsSync(pdfPlaceholder2)) {
            require('fs').writeFileSync(pdfPlaceholder2, 'PDF PLACEHOLDER CONTENT FOR VERIFICATION DOCUMENT');
        }
        console.log('✅ Default accounts seeded successfully!');
    }
    catch (error) {
        console.error('❌ Seeding error:', error);
    }
}
// Start Server
async function startServer() {
    try {
        // 1. Initialize Database & Tables
        await (0, db_1.initDB)();
        // 2. Run Seeding Script
        await seedDefaultUsers();
        // 3. Initialize Socket.io
        (0, socket_1.initSocket)(server);
        // 4. Start listening
        server.listen(PORT, () => {
            console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}
startServer();
