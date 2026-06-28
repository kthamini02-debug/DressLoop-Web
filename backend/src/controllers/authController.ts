import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dress_smart_clothing_donation_platform_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function register(req: Request, res: Response) {
  const { name, email, password, role, organization_name, registration_number, verification_document } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  if (!['donor', 'ngo', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be donor, ngo, or admin.' });
  }

  if (role === 'ngo' && (!organization_name || !registration_number || !verification_document)) {
    return res.status(400).json({ error: 'NGO registration requires organization name, registration number, and verification document URL.' });
  }

  try {
    // Check if user already exists
    const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Write transactionally or sequentially (SQLite/PG compatible)
    await db.query(
      'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
      [userId, name, email, hashedPassword, role]
    );

    if (role === 'ngo') {
      await db.query(
        'INSERT INTO ngos (id, organization_name, registration_number, verification_document, approval_status) VALUES ($1, $2, $3, $4, $5)',
        [userId, organization_name, registration_number, verification_document, 'pending']
      );
    }

    // Generate Token
    const token = jwt.sign(
      { id: userId, name, email, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: userId,
        name,
        email,
        role,
        approval_status: role === 'ngo' ? 'pending' : undefined,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration.' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let ngoDetails = null;
    if (user.role === 'ngo') {
      const ngoRes = await db.query('SELECT approval_status, organization_name FROM ngos WHERE id = $1', [user.id]);
      if (ngoRes.rows.length > 0) {
        ngoDetails = ngoRes.rows[0];
      }
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_name: ngoDetails?.organization_name,
        approval_status: ngoDetails?.approval_status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login.' });
  }
}

export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const userRes = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userRes.rows[0];
    let approval_status = undefined;
    let organization_name = undefined;
    let registration_number = undefined;
    let verification_document = undefined;

    if (user.role === 'ngo') {
      const ngoRes = await db.query('SELECT * FROM ngos WHERE id = $1', [user.id]);
      if (ngoRes.rows.length > 0) {
        const ngo = ngoRes.rows[0];
        approval_status = ngo.approval_status;
        organization_name = ngo.organization_name;
        registration_number = ngo.registration_number;
        verification_document = ngo.verification_document;
      }
    }

    return res.json({
      user: {
        ...user,
        organization_name,
        registration_number,
        verification_document,
        approval_status,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'An error occurred fetching user profile.' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const { name, email, password, organization_name, registration_number } = req.body;

  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userRes.rows[0];
    let newPasswordHash = user.password;

    if (password && password.trim().length > 0) {
      newPasswordHash = await bcrypt.hash(password, 10);
    }

    const newName = name || user.name;
    const newEmail = email || user.email;

    // Check if new email conflicts with another user
    if (newEmail !== user.email) {
      const checkEmail = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, req.user.id]);
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
    }

    await db.query(
      'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4',
      [newName, newEmail, newPasswordHash, req.user.id]
    );

    if (user.role === 'ngo') {
      const ngoRes = await db.query('SELECT * FROM ngos WHERE id = $1', [req.user.id]);
      if (ngoRes.rows.length > 0) {
        const ngo = ngoRes.rows[0];
        const newOrgName = organization_name || ngo.organization_name;
        const newRegNum = registration_number || ngo.registration_number;

        await db.query(
          'UPDATE ngos SET organization_name = $1, registration_number = $2 WHERE id = $3',
          [newOrgName, newRegNum, req.user.id]
        );
      }
    }

    return res.json({
      message: 'Profile updated successfully.',
      user: {
        id: req.user.id,
        name: newName,
        email: newEmail,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'An error occurred updating profile.' });
  }
}
