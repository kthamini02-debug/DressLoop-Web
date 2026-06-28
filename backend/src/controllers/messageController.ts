import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../config/db';
import { broadcastMessageToRoom } from '../config/socket';
import { createNotification } from '../utils/notification';

// Helper to check if a donor and NGO are authorized to chat (i.e. have an accepted, collected, or completed request)
async function canChat(user1Id: string, user2Id: string): Promise<boolean> {
  try {
    const queryStr = `
      SELECT r.id 
      FROM requests r
      JOIN donations d ON r.donation_id = d.id
      WHERE r.status IN ('accepted', 'collected', 'completed')
        AND (
          (r.ngo_id = $1 AND d.donor_id = $2)
          OR
          (r.ngo_id = $2 AND d.donor_id = $1)
        )
      LIMIT 1
    `;
    const result = await db.query(queryStr, [user1Id, user2Id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Check chat permission error:', error);
    return false;
  }
}

export async function getMessages(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { otherUserId } = req.params;
  const myId = req.user.id;

  try {
    // 1. Verify that they are authorized to chat
    const isAuthorized = await canChat(myId, otherUserId);
    console.log("CHAT CHECK:", myId, otherUserId, isAuthorized);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Chat is only available after a request has been accepted.' });
    }

    // 2. Fetch history
    const result = await db.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1) 
       ORDER BY timestamp ASC`,
      [myId, otherUserId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'An error occurred fetching messages.' });
  }
}

export async function sendMessage(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const myId = req.user.id;
  const { receiver_id, message } = req.body;

  if (!receiver_id || !message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Receiver ID and non-empty message are required.' });
  }

  try {
    // 1. Verify chat permission
    const isAuthorized = await canChat(myId, receiver_id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Chat is only available after a request has been accepted.' });
    }

    const messageId = uuidv4();
    const timestamp = new Date();

    // 2. Save message
    await db.query(
      'INSERT INTO messages (id, sender_id, receiver_id, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [messageId, myId, receiver_id, message.trim(), timestamp]
    );

    const messageObj = {
      id: messageId,
      sender_id: myId,
      receiver_id,
      message: message.trim(),
      timestamp,
    };

    // 3. Broadcast to the private conversation room
    const roomId = [myId, receiver_id].sort().join('_');
    console.log("BROADCASTING:", roomId, messageObj);
    broadcastMessageToRoom(roomId, messageObj);

    // 4. Send a Live Notification to the recipient
    const excerpt = message.trim().length > 30 ? `${message.trim().substring(0, 30)}...` : message.trim();
    await createNotification(
      receiver_id,
      'New Message',
      `New message from ${req.user.name}: "${excerpt}"`
    );

    return res.status(201).json(messageObj);
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'An error occurred sending message.' });
  }
}

// Get list of active chat partners (who they have accepted requests with)
export async function getChatPartners(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const myId = req.user.id;
  const myRole = req.user.role;

  try {
    let queryStr = '';
    const params = [myId];

    if (myRole === 'donor') {
      // Find NGOs with accepted requests
      queryStr = `
        SELECT u.id, u.name, u.email, n.organization_name, 
               MAX(r.status) as request_status, 
               MAX(d.title) as donation_title, 
               MAX(d.id) as donation_id
        FROM requests r
        JOIN donations d ON r.donation_id = d.id
        JOIN users u ON r.ngo_id = u.id
        JOIN ngos n ON u.id = n.id
        WHERE d.donor_id = $1 AND r.status IN ('accepted', 'collected', 'completed')
        GROUP BY u.id, u.name, u.email, n.organization_name
      `;
    } else if (myRole === 'ngo') {
      // Find donors of accepted requests
      queryStr = `
        SELECT u.id, u.name, u.email, 
               MAX(r.status) as request_status, 
               MAX(d.title) as donation_title, 
               MAX(d.id) as donation_id
        FROM requests r
        JOIN donations d ON r.donation_id = d.id
        JOIN users u ON d.donor_id = u.id
        WHERE r.ngo_id = $1 AND r.status IN ('accepted', 'collected', 'completed')
        GROUP BY u.id, u.name, u.email
      `;
    } else {
      return res.status(403).json({ error: 'Admins do not engage in donor-NGO chat.' });
    }

    const result = await db.query(queryStr, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Get chat partners error:', error);
    return res.status(500).json({ error: 'An error occurred fetching chat contacts.' });
  }
}
