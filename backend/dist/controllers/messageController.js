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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = getMessages;
exports.sendMessage = sendMessage;
exports.getChatPartners = getChatPartners;
const uuid_1 = require("uuid");
const db = __importStar(require("../config/db"));
const socket_1 = require("../config/socket");
const notification_1 = require("../utils/notification");
// Helper to check if a donor and NGO are authorized to chat (i.e. have an accepted, collected, or completed request)
async function canChat(user1Id, user2Id) {
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
    }
    catch (error) {
        console.error('Check chat permission error:', error);
        return false;
    }
}
async function getMessages(req, res) {
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
        const result = await db.query(`SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1) 
       ORDER BY timestamp ASC`, [myId, otherUserId]);
        return res.json(result.rows);
    }
    catch (error) {
        console.error('Get messages error:', error);
        return res.status(500).json({ error: 'An error occurred fetching messages.' });
    }
}
async function sendMessage(req, res) {
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
        const messageId = (0, uuid_1.v4)();
        const timestamp = new Date();
        // 2. Save message
        await db.query('INSERT INTO messages (id, sender_id, receiver_id, message, timestamp) VALUES ($1, $2, $3, $4, $5)', [messageId, myId, receiver_id, message.trim(), timestamp]);
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
        (0, socket_1.broadcastMessageToRoom)(roomId, messageObj);
        // 4. Send a Live Notification to the recipient
        const excerpt = message.trim().length > 30 ? `${message.trim().substring(0, 30)}...` : message.trim();
        await (0, notification_1.createNotification)(receiver_id, 'New Message', `New message from ${req.user.name}: "${excerpt}"`);
        return res.status(201).json(messageObj);
    }
    catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({ error: 'An error occurred sending message.' });
    }
}
// Get list of active chat partners (who they have accepted requests with)
async function getChatPartners(req, res) {
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
        }
        else if (myRole === 'ngo') {
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
        }
        else {
            return res.status(403).json({ error: 'Admins do not engage in donor-NGO chat.' });
        }
        const result = await db.query(queryStr, params);
        return res.json(result.rows);
    }
    catch (error) {
        console.error('Get chat partners error:', error);
        return res.status(500).json({ error: 'An error occurred fetching chat contacts.' });
    }
}
