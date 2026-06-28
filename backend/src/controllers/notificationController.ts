import { Request, Response } from 'express';
import * as db from '../config/db';

export async function getNotifications(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'An error occurred fetching notifications.' });
  }
}

export async function markAsRead(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    await db.query(
      'UPDATE notifications SET read_status = $1 WHERE user_id = $2',
      [true, req.user.id]
    );
    return res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return res.status(500).json({ error: 'An error occurred updating notifications.' });
  }
}
