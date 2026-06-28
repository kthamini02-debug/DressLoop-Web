import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Configuration imports
import { initDB } from './config/db';
import * as db from './config/db';
import { initSocket } from './config/socket';

// Route imports
import authRoutes from './routes/auth';
import donationRoutes from './routes/donations';
import requestRoutes from './routes/requests';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
const uploadsPath = path.join(__dirname, '../public/uploads');
app.use('/uploads', express.static(uploadsPath));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Simple Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', sqlite: db.getIsSqlite() });
});

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🔥 Server Error Handler:', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred.',
  });
});

// Seeding Script for Default Testing Users
async function seedDefaultUsers() {
  try {
    console.log('🌱 Checking default testing accounts (admin, donor, ngo)...');
    const hashedPassword = await bcrypt.hash('password', 10);

    // Helper to seed/update a user
    async function seedUser(
      email: string,
      name: string,
      role: 'admin' | 'donor' | 'ngo',
      extraNgoInfo?: { name: string; reg: string; doc: string; status: 'approved' | 'pending' }
    ) {
      const checkRes = await db.query("SELECT id FROM users WHERE email = $1", [email]);
      let userId: string;
      if (checkRes.rows.length === 0) {
        userId = uuidv4();
        await db.query(
          "INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)",
          [userId, name, email, hashedPassword, role]
        );
        console.log(`✅ Created default user: ${email}`);
      } else {
        userId = checkRes.rows[0].id;
        await db.query(
          "UPDATE users SET name = $1, password = $2, role = $3 WHERE id = $4",
          [name, hashedPassword, role, userId]
        );
        console.log(`🔄 Updated default user credentials: ${email}`);
      }

      if (role === 'ngo' && extraNgoInfo) {
        const checkNgo = await db.query("SELECT id FROM ngos WHERE id = $1", [userId]);
        if (checkNgo.rows.length === 0) {
          await db.query(
            "INSERT INTO ngos (id, organization_name, registration_number, verification_document, approval_status) VALUES ($1, $2, $3, $4, $5)",
            [userId, extraNgoInfo.name, extraNgoInfo.reg, extraNgoInfo.doc, extraNgoInfo.status]
          );
        } else {
          await db.query(
            "UPDATE ngos SET organization_name = $1, registration_number = $2, verification_document = $3, approval_status = $4 WHERE id = $5",
            [extraNgoInfo.name, extraNgoInfo.reg, extraNgoInfo.doc, extraNgoInfo.status, userId]
          );
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
    const pdfPlaceholder = path.join(uploadsPath, 'hope_verification.pdf');
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

    const pdfPlaceholder2 = path.join(uploadsPath, 'savelives_verification.pdf');
    if (!require('fs').existsSync(pdfPlaceholder2)) {
      require('fs').writeFileSync(pdfPlaceholder2, 'PDF PLACEHOLDER CONTENT FOR VERIFICATION DOCUMENT');
    }

    console.log('✅ Default accounts seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}

// Start Server
async function startServer() {
  try {
    // 1. Initialize Database & Tables
    await initDB();
    
    // 2. Run Seeding Script
    await seedDefaultUsers();

    // 3. Initialize Socket.io
    initSocket(server);

    // 4. Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
