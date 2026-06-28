import { v4 as uuidv4 } from 'uuid';
import * as db from '../config/db';
import { sendNotificationToUser } from '../config/socket';

export async function createNotification(userId: string, title: string, message: string) {
  try {
    const id = uuidv4();
    const createdAt = new Date();

    // Save to Database
    await db.query(
      'INSERT INTO notifications (id, user_id, title, message, read_status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, userId, title, message, false, createdAt]
    );

    // Emit via Socket.io
    sendNotificationToUser(userId, {
      id,
      title,
      message,
      read_status: false,
      created_at: createdAt,
    });

    return id;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
