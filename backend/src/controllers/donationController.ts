import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../config/db';
import { processUpload } from '../middleware/uploadMiddleware';

export async function createDonation(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Only donors can upload donations.' });
  }

  const { title, description, category, gender, age_group, size, quantity, condition } = req.body;

  if (!title || !description || !category || !gender || !age_group || !size || !quantity || !condition) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const files = req.files as Express.Multer.File[];
    const imageUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const url = await processUpload(file);
        imageUrls.push(url);
      }
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({ error: 'At least one image is required for donation.' });
    }

    const donationId = uuidv4();
    const qty = parseInt(quantity, 10) || 1;

    await db.query(
      `INSERT INTO donations (id, donor_id, title, description, category, gender, age_group, size, quantity, condition, images, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [donationId, req.user.id, title, description, category, gender, age_group, size, qty, condition, imageUrls, 'available']
    );

    // Track status history
    await db.query(
      'INSERT INTO donation_status_history (id, donation_id, old_status, new_status) VALUES ($1, $2, $3, $4)',
      [uuidv4(), donationId, null, 'available']
    );

    return res.status(201).json({
      message: 'Donation uploaded successfully.',
      donationId,
    });
  } catch (error) {
    console.error('Create donation error:', error);
    return res.status(500).json({ error: 'An error occurred uploading donation.' });
  }
}

export async function getMyDonations(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result = await db.query(
      `SELECT d.*, 
       (SELECT COUNT(*) FROM requests r WHERE r.donation_id = d.id) as request_count 
       FROM donations d 
       WHERE d.donor_id = $1 
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Get my donations error:', error);
    return res.status(500).json({ error: 'An error occurred fetching donations.' });
  }
}

export async function getDonationById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT d.*, u.name as donor_name, u.email as donor_email 
       FROM donations d 
       JOIN users u ON d.donor_id = u.id 
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get donation details error:', error);
    return res.status(500).json({ error: 'An error occurred fetching donation details.' });
  }
}

export async function updateDonation(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { id } = req.params;
  const { title, description, category, gender, age_group, size, quantity, condition, existingImages } = req.body;

  try {
    // Check ownership and status
    const donationRes = await db.query('SELECT * FROM donations WHERE id = $1', [id]);
    if (donationRes.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    const donation = donationRes.rows[0];
    if (donation.donor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You do not own this donation.' });
    }

    if (!['available', 'requested'].includes(donation.status)) {
      return res.status(400).json({ error: 'Cannot update donation once request is accepted or completed.' });
    }

    // Handle images
    let updatedImages: string[] = [];
    if (existingImages) {
      updatedImages = Array.isArray(existingImages) ? existingImages : [existingImages];
    }

    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await processUpload(file);
        updatedImages.push(url);
      }
    }

    if (updatedImages.length === 0) {
      return res.status(400).json({ error: 'At least one image is required.' });
    }

    const newTitle = title || donation.title;
    const newDescription = description || donation.description;
    const newCategory = category || donation.category;
    const newGender = gender || donation.gender;
    const newAgeGroup = age_group || donation.age_group;
    const newSize = size || donation.size;
    const newQuantity = quantity ? parseInt(quantity, 10) : donation.quantity;
    const newCondition = condition || donation.condition;

    await db.query(
      `UPDATE donations 
       SET title = $1, description = $2, category = $3, gender = $4, age_group = $5, size = $6, quantity = $7, condition = $8, images = $9 
       WHERE id = $10`,
      [newTitle, newDescription, newCategory, newGender, newAgeGroup, newSize, newQuantity, newCondition, updatedImages, id]
    );

    return res.json({ message: 'Donation updated successfully.' });
  } catch (error) {
    console.error('Update donation error:', error);
    return res.status(500).json({ error: 'An error occurred updating donation.' });
  }
}

export async function deleteDonation(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { id } = req.params;

  try {
    const donationRes = await db.query('SELECT * FROM donations WHERE id = $1', [id]);
    if (donationRes.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    const donation = donationRes.rows[0];
    if (donation.donor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You do not own this donation.' });
    }

    if (!['available', 'requested'].includes(donation.status)) {
      return res.status(400).json({ error: 'Cannot delete donation once request is accepted or completed.' });
    }

    await db.query('DELETE FROM donations WHERE id = $1', [id]);
    return res.json({ message: 'Donation deleted successfully.' });
  } catch (error) {
    console.error('Delete donation error:', error);
    return res.status(500).json({ error: 'An error occurred deleting donation.' });
  }
}

export async function browseDonations(req: Request, res: Response) {
  if (!req.user || (req.user.role !== 'ngo' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  // If role is NGO, verify they are approved
  if (req.user.role === 'ngo') {
    const ngoRes = await db.query('SELECT approval_status FROM ngos WHERE id = $1', [req.user.id]);
    if (ngoRes.rows.length === 0) {
      return res.status(403).json({ error: 'NGO profile not found.' });
    }
    if (ngoRes.rows[0].approval_status !== 'approved') {
      return res.status(403).json({ error: 'Your NGO account is pending approval by the Admin.' });
    }
  }

  const { category, gender, age_group, size, condition, search } = req.query;

  try {
    let sql = `
      SELECT d.*, u.name as donor_name 
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE d.status = 'available'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      sql += ` AND d.category = $${paramIndex++}`;
      params.push(category);
    }
    if (gender) {
      sql += ` AND d.gender = $${paramIndex++}`;
      params.push(gender);
    }
    if (age_group) {
      sql += ` AND d.age_group = $${paramIndex++}`;
      params.push(age_group);
    }
    if (size) {
      sql += ` AND d.size = $${paramIndex++}`;
      params.push(size);
    }
    if (condition) {
      sql += ` AND d.condition = $${paramIndex++}`;
      params.push(condition);
    }
    if (search) {
      sql += ` AND (d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
      // SQLite does not support ILIKE natively, we handle ILIKE/LIKE translation or just use LIKE in SQLite
      // But SQLite is case insensitive for LIKE anyway. We can replace ILIKE with LIKE in our db query translator!
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY d.created_at DESC';

    // Let's modify db.ts query function to translate ILIKE to LIKE for SQLite
    const result = await db.query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Browse donations error:', error);
    return res.status(500).json({ error: 'An error occurred browsing donations.' });
  }
}
