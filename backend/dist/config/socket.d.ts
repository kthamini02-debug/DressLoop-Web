import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
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
export declare function initSocket(server: HttpServer): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
/**
 * Sends a real-time notification to a specific user if they are online.
 */
export declare function sendNotificationToUser(userId: string, notification: {
    id: string;
    title: string;
    message: string;
    read_status: boolean;
    created_at: Date;
}): void;
/**
 * Broadcasts a new message to a chat room in real-time.
 */
export declare function broadcastMessageToRoom(roomId: string, message: any): void;
/**
 * Checks if a user is online.
 */
export declare function isUserOnline(userId: string): boolean;
export {};
