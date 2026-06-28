import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../config/db';
import { createNotification } from '../utils/notification';

export async function createRequest(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'ngo') {
    return res.status(403).json({ error: 'Only NGOs can request donations.' });
  }

  const { donation_id } = req.body;
  if (!donation_id) {
    return res.status(400).json({ error: 'Donation ID is required.' });
  }

  try {
    // 1. Verify NGO is approved
    const ngoRes = await db.query('SELECT approval_status, organization_name FROM ngos WHERE id = $1', [req.user.id]);
    if (ngoRes.rows.length === 0) {
      return res.status(403).json({ error: 'NGO profile not found.' });
    }
    const ngo = ngoRes.rows[0];
    if (ngo.approval_status !== 'approved') {
      return res.status(403).json({ error: 'Your NGO account is pending approval by the Admin.' });
    }

    // 2. Verify donation is available or requested
    const donationRes = await db.query('SELECT * FROM donations WHERE id = $1', [donation_id]);
    if (donationRes.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found.' });
    }
    const donation = donationRes.rows[0];
    if (!['available', 'requested'].includes(donation.status)) {
      return res.status(400).json({ error: 'Donation is no longer available for request.' });
    }

    // 3. Check for duplicate requests
    const checkDuplicate = await db.query(
      'SELECT id FROM requests WHERE donation_id = $1 AND ngo_id = $2',
      [donation_id, req.user.id]
    );
    if (checkDuplicate.rows.length > 0) {
      return res.status(400).json({ error: 'You have already sent a request for this donation.' });
    }

    // 4. Create request
    const requestId = uuidv4();
    await db.query(
      'INSERT INTO requests (id, donation_id, ngo_id, status) VALUES ($1, $2, $3, $4)',
      [requestId, donation_id, req.user.id, 'pending']
    );

    // 5. Update donation status to requested (if it was available)
    if (donation.status === 'available') {
      await db.query('UPDATE donations SET status = $1 WHERE id = $2', ['requested', donation_id]);
      await db.query(
        'INSERT INTO donation_status_history (id, donation_id, old_status, new_status) VALUES ($1, $2, $3, $4)',
        [uuidv4(), donation_id, 'available', 'requested']
      );
    }

    // 6. Notify Donor
    await createNotification(
      donation.donor_id,
      'New Donation Request',
      `NGO "${ngo.organization_name}" has requested your donation: "${donation.title}".`
    );

    return res.status(201).json({
      message: 'Request submitted successfully.',
      requestId,
    });
  } catch (error) {
    console.error('Create request error:', error);
    return res.status(500).json({ error: 'An error occurred submitting the request.' });
  }
}

export async function getMyRequests(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'ngo') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const result = await db.query(
      `SELECT r.id as request_id, r.status as request_status, r.created_at as request_date,
              d.id as donation_id, d.title, d.category, d.size, d.condition, d.images, d.status as donation_status,
              u.name as donor_name, u.email as donor_email
       FROM requests r
       JOIN donations d ON r.donation_id = d.id
       JOIN users u ON d.donor_id = u.id
       WHERE r.ngo_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get my requests error:', error);
    return res.status(500).json({ error: 'An error occurred fetching requests.' });
  }
}

export async function getRequestsByDonation(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { donationId } = req.params;

  try {
    // Verify ownership
    const donationRes = await db.query('SELECT donor_id FROM donations WHERE id = $1', [donationId]);
    if (donationRes.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found.' });
    }
    if (donationRes.rows[0].donor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You do not own this donation.' });
    }

    const result = await db.query(
      `SELECT r.id as request_id, r.status as request_status, r.created_at as request_date,
              n.id as ngo_id, n.organization_name, n.registration_number, n.verification_document,
              u.email as ngo_email
       FROM requests r
       JOIN users u ON r.ngo_id = u.id
       JOIN ngos n ON u.id = n.id
       WHERE r.donation_id = $1
       ORDER BY r.created_at ASC`,
      [donationId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get requests by donation error:', error);
    return res.status(500).json({ error: 'An error occurred fetching requests.' });
  }
}

export async function updateRequestStatus(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { id } = req.params; // Request ID
  const { action } = req.body; // 'accept', 'reject', 'collect', 'complete'

  if (!['accept', 'reject', 'collect', 'complete'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action.' });
  }

  try {
    // Fetch request details
    const reqRes = await db.query(
      `SELECT r.*, d.donor_id, d.title as donation_title, d.status as donation_status,
              n.organization_name as ngo_name, n.id as ngo_user_id
       FROM requests r
       JOIN donations d ON r.donation_id = d.id
       JOIN ngos n ON r.ngo_id = n.id
       WHERE r.id = $1`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const request = reqRes.rows[0];

    // --- DONOR ACTIONS ---
    if (['accept', 'reject', 'complete'].includes(action)) {
      if (request.donor_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the donation owner can perform this action.' });
      }

      if (action === 'accept') {
        if (request.status !== 'pending') {
          return res.status(400).json({ error: 'Request is not in pending status.' });
        }

        // Accept this request
        await db.query('UPDATE requests SET status = \'accepted\' WHERE id = $1', [id]);

        // Reject all other requests for this donation
        await db.query(
          'UPDATE requests SET status = \'rejected\' WHERE donation_id = $1 AND id != $2',
          [request.donation_id, id]
        );

        // Update donation status to accepted
        await db.query('UPDATE donations SET status = \'accepted\' WHERE id = $1', [request.donation_id]);

        // Log status history
        await db.query(
          'INSERT INTO donation_status_history (id, donation_id, old_status, new_status) VALUES ($1, $2, $3, $4)',
          [uuidv4(), request.donation_id, request.donation_status, 'accepted']
        );

        // Notify accepted NGO
        await createNotification(
          request.ngo_id,
          'Donation Request Accepted',
          `Your request for "${request.donation_title}" has been accepted! You can now chat with the donor.`
        );

        // Notify rejected NGOs
        const otherReqs = await db.query(
          'SELECT ngo_id FROM requests WHERE donation_id = $1 AND id != $2',
          [request.donation_id, id]
        );
        for (const reqRow of otherReqs.rows) {
          await createNotification(
            reqRow.ngo_id,
            'Request Declined',
            `The donor accepted another request for "${request.donation_title}".`
          );
        }

        return res.json({ message: 'Request accepted successfully.' });
      }

      if (action === 'reject') {
        if (request.status !== 'pending') {
          return res.status(400).json({ error: 'Only pending requests can be rejected.' });
        }

        // Reject this request
        await db.query('UPDATE requests SET status = \'rejected\' WHERE id = $1', [id]);

        // Notify NGO
        await createNotification(
          request.ngo_id,
          'Request Declined',
          `Your request for "${request.donation_title}" has been declined by the donor.`
        );

        // Check if there are other pending requests.
        const pendingRes = await db.query(
          'SELECT id FROM requests WHERE donation_id = $1 AND status = \'pending\'',
          [request.donation_id]
        );

        // If no more pending requests, set donation status back to 'available'
        if (pendingRes.rows.length === 0) {
          await db.query('UPDATE donations SET status = \'available\' WHERE id = $1', [request.donation_id]);
          await db.query(
            'INSERT INTO donation_status_history (id, donation_id, old_status, new_status) VALUES ($1, $2, $3, $4)',
            [uuidv4(), request.donation_id, request.donation_status, 'available']
          );
        }

        return res.json({ message: 'Request rejected successfully.' });
      }

      if (action === 'complete') {
        if (request.status !== 'collected') {
          return res.status(400).json({ error: 'Donation must be collected before completing.' });
        }

        // Complete request & donation
        await db.query('UPDATE requests SET status = \'completed\' WHERE id = $1', [id]);
        await db.query('UPDATE donations SET status = \'completed\' WHERE id = $1', [request.donation_id]);

        // Log history
        await db.query(
          'INSERT INTO donation_status_history (id, donation_id, old_status, new_status) VALUES ($1, $2, $3, $4)',
          [uuidv4(), request.donation_id, request.donation_status, 'completed']
        );

        // Notify NGO
        await createNotification(
          request.ngo_id,
          'Donation Completed',
          `The donor confirmed collection of "${request.donation_title}". Thank you for your support!`
        );

        return res.json({ message: 'Donation collection completed successfully.' });
      }
    }

    // --- NGO ACTIONS ---
    if (action === 'collect') {
      if (request.ngo_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You did not make this request.' });
      }

      if (request.status !== 'accepted') {
        return res.status(400).json({ error: 'Request must be accepted before collecting.' });
      }

      // Collect donation
      await db.query('UPDATE requests SET status = \'collected\' WHERE id = $1', [id]);
      await db.query('UPDATE donations SET status = \'collected\' WHERE id = $1', [request.donation_id]);

      // Log history
      await db.query(
        'INSERT INTO donation_status_history (id, donation_id, old_status, new_status) VALUES ($1, $2, $3, $4)',
        [uuidv4(), request.donation_id, request.donation_status, 'collected']
      );

      // Notify Donor
      await createNotification(
        request.donor_id,
        'Donation Collected',
        `NGO "${request.ngo_name}" has marked "${request.donation_title}" as collected. Please confirm collection.`
      );

      return res.json({ message: 'Donation marked as collected.' });
    }
  } catch (error) {
    console.error('Update request status error:', error);
    return res.status(500).json({ error: 'An error occurred updating the request.' });
  }
}
