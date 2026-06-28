import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dress_smart_clothing_donation_platform_jwt_secret_key_2026';

let io: Server | null = null;

// Map to store online users: userId -> Set of socketIds (handles multiple tabs/devices)
const onlineUsers = new Map<string, Set<string>>();

interface SocketUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware for Socket.io
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token missing.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SocketUser;
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.user;
    if (!user) return;

    console.log(`🔌 User connected: ${user.name} (${user.role}) - Socket: ${socket.id}`);
    
    // Track user socket ID
    let sockets = onlineUsers.get(user.id);
    const isFirstConnection = !sockets || sockets.size === 0;
    if (!sockets) {
      sockets = new Set<string>();
      onlineUsers.set(user.id, sockets);
    }
    sockets.add(socket.id);

    // Join their own private user room to receive targeted events
    socket.join(user.id);
    
    // Broadcast user online status if they just became online
    if (isFirstConnection) {
      io?.emit('user_status', { userId: user.id, status: 'online' });
    }

    // Send the list of currently online users to the newly connected socket
    socket.emit('online_users_list', Array.from(onlineUsers.keys()));

    // Join a private chat room for a conversation (roomId = sorted user IDs)
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      console.log(`👤 User ${user.name} joined room: ${roomId}`);
    });

    // Handle typing indicator
    socket.on('typing', ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      socket.to(roomId).emit('user_typing', { userId: user.id, isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${user.name} - Socket: ${socket.id}`);
      
      const userSockets = onlineUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.id);
          // Broadcast user offline status
          io?.emit('user_status', { userId: user.id, status: 'offline' });
        }
      }
    });
  });

  return io;
}

/**
 * Sends a real-time notification to a specific user if they are online.
 */
export function sendNotificationToUser(userId: string, notification: { id: string; title: string; message: string; read_status: boolean; created_at: Date }) {
  if (!io) return;
  // Emit to user's private room to reach all their active socket connections
  io.to(userId).emit('new_notification', notification);
  console.log(`🔔 Sent real-time notification to user room ${userId}`);
}

/**
 * Broadcasts a new message to a chat room in real-time.
 */
export function broadcastMessageToRoom(roomId: string, message: any) {
  if (!io) return;
  // Broadcast to the conversation room
  io.to(roomId).emit('receive_message', message);
  
  // Also target the sender and receiver's rooms directly to ensure delivery
  if (message.sender_id) {
    io.to(message.sender_id).emit('receive_message', message);
  }
  if (message.receiver_id) {
    io.to(message.receiver_id).emit('receive_message', message);
  }
}

/**
 * Checks if a user is online.
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && (onlineUsers.get(userId)?.size || 0) > 0;
}
