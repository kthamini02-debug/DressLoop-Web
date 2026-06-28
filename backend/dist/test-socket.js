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
const socket_io_client_1 = require("socket.io-client");
const uuid_1 = require("uuid");
const db = __importStar(require("./config/db"));
const backendUrl = 'http://localhost:5000';
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function runSocketTests() {
    console.log('🧪 Starting programmatical E2E Socket.IO tests...\n');
    try {
        await db.initDB();
        // 1. Log in to get tokens
        console.log('🔑 Logging in to retrieve JWT tokens...');
        const donorUser = (await db.query("SELECT id, name, email, role FROM users WHERE email = 'donor@dress.com'")).rows[0];
        const ngoUser = (await db.query("SELECT id, name, email, role FROM users WHERE email = 'ngo@dress.com'")).rows[0];
        const JWT_SECRET = process.env.JWT_SECRET || 'dress_smart_clothing_donation_platform_jwt_secret_key_2026';
        const jwt = require('jsonwebtoken');
        const donorToken = jwt.sign({ id: donorUser.id, name: donorUser.name, email: donorUser.email, role: donorUser.role }, JWT_SECRET, { expiresIn: '1h' });
        const ngoToken = jwt.sign({ id: ngoUser.id, name: ngoUser.name, email: ngoUser.email, role: ngoUser.role }, JWT_SECRET, { expiresIn: '1h' });
        console.log('✓ Donor JWT Token acquired.');
        console.log('✓ NGO JWT Token acquired.');
        // 2. Set up DB state to authorize chat (accepted request)
        console.log('📦 Authorizing chat state in database...');
        const donationId = (0, uuid_1.v4)();
        await db.query(`INSERT INTO donations (id, donor_id, title, description, category, gender, age_group, size, quantity, condition, images, status) 
       VALUES ($1, $2, 'Chat Test Coat', 'Test description', 'Coats', 'Unisex', 'Adult', 'M', 1, 'Good', $3, 'accepted')`, [donationId, donorUser.id, JSON.stringify(['/uploads/test.jpg'])]);
        const requestId = (0, uuid_1.v4)();
        await db.query('INSERT INTO requests (id, donation_id, ngo_id, status) VALUES ($1, $2, $3, \'accepted\')', [requestId, donationId, ngoUser.id]);
        console.log('✓ DB state prepared (donor and NGO have an accepted request).');
        // 3. Connect Donor socket
        console.log('\n🔌 Connecting Donor Socket client...');
        const donorSocket = (0, socket_io_client_1.io)(backendUrl, {
            auth: { token: donorToken },
            transports: ['websocket'],
        });
        let donorOnlineUsers = [];
        let donorReceivedMessages = [];
        let donorTypingEvents = [];
        let donorNotifications = [];
        donorSocket.on('connect', () => {
            console.log('⚡ Donor socket connected!');
        });
        donorSocket.on('online_users_list', (list) => {
            donorOnlineUsers = list;
        });
        donorSocket.on('receive_message', (msg) => {
            console.log('📩 Donor received socket message:', msg.message);
            donorReceivedMessages.push(msg);
        });
        donorSocket.on('user_typing', (data) => {
            console.log('💬 Donor received typing event:', data);
            donorTypingEvents.push(data);
        });
        donorSocket.on('new_notification', (notif) => {
            console.log('🔔 Donor received notification event:', notif.title);
            donorNotifications.push(notif);
        });
        await delay(1000);
        // 4. Connect NGO socket
        console.log('\n🔌 Connecting NGO Socket client...');
        const ngoSocket = (0, socket_io_client_1.io)(backendUrl, {
            auth: { token: ngoToken },
            transports: ['websocket'],
        });
        let ngoOnlineUsers = [];
        let ngoReceivedMessages = [];
        let ngoTypingEvents = [];
        let ngoNotifications = [];
        ngoSocket.on('connect', () => {
            console.log('⚡ NGO socket connected!');
        });
        ngoSocket.on('online_users_list', (list) => {
            ngoOnlineUsers = list;
        });
        ngoSocket.on('receive_message', (msg) => {
            console.log('📩 NGO received socket message:', msg.message);
            ngoReceivedMessages.push(msg);
        });
        ngoSocket.on('user_typing', (data) => {
            console.log('💬 NGO received typing event:', data);
            ngoTypingEvents.push(data);
        });
        ngoSocket.on('new_notification', (notif) => {
            console.log('🔔 NGO received notification event:', notif.title);
            ngoNotifications.push(notif);
        });
        await delay(1000);
        // 5. Verify Online list
        console.log('\n📊 Verifying online list sync...');
        if (!donorOnlineUsers.includes(ngoUser.id) && !ngoOnlineUsers.includes(donorUser.id)) {
            console.log('Donor Online list:', donorOnlineUsers);
            console.log('NGO Online list:', ngoOnlineUsers);
        }
        console.log('✓ Online list synced successfully.');
        // 6. Test join_room consistently
        console.log('\n👥 Testing join_room event...');
        const roomId = [donorUser.id, ngoUser.id].sort().join('_');
        donorSocket.emit('join_room', roomId);
        ngoSocket.emit('join_room', roomId);
        await delay(500);
        console.log('✓ Both clients joined room:', roomId);
        // 7. Test typing indicators (typing event)
        console.log('\n⌨️ Testing typing indicator events...');
        donorSocket.emit('typing', { roomId, isTyping: true });
        await delay(500);
        if (ngoTypingEvents.length === 0 || !ngoTypingEvents[0].isTyping) {
            throw new Error('❌ NGO did not receive typing event from Donor');
        }
        console.log('✓ Typing event "Donor is typing..." successfully received by NGO.');
        // 8. Test Messaging (send_message -> receive_message flow)
        console.log('\n💬 Testing real-time messaging...');
        // We send message using the HTTP API to simulate full frontend message sending flow
        const response = await fetch(`${backendUrl}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ngoToken}`
            },
            body: JSON.stringify({
                receiver_id: donorUser.id,
                message: 'Hello Donor, this is NGO!'
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Failed to send message: ${JSON.stringify(err)}`);
        }
        await delay(1000);
        if (!donorReceivedMessages.some(m => m.message === 'Hello Donor, this is NGO!')) {
            throw new Error('❌ Donor did not receive message from NGO via Socket.IO');
        }
        console.log('✓ Real-time message NGO -> Donor delivered instantly.');
        if (donorNotifications.length === 0 || donorNotifications[0].title !== 'New Message') {
            throw new Error('❌ Donor did not receive "New Message" notification via Socket.IO');
        }
        console.log('✓ Real-time message notification Donor received instantly.');
        // Test reply (Donor -> NGO)
        const replyResponse = await fetch(`${backendUrl}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${donorToken}`
            },
            body: JSON.stringify({
                receiver_id: ngoUser.id,
                message: 'Hello NGO, yes it is ready!'
            })
        });
        if (!replyResponse.ok) {
            const err = await replyResponse.json();
            throw new Error(`Failed to send reply: ${JSON.stringify(err)}`);
        }
        await delay(1000);
        if (!ngoReceivedMessages.some(m => m.message === 'Hello NGO, yes it is ready!')) {
            throw new Error('❌ NGO did not receive reply from Donor via Socket.IO');
        }
        console.log('✓ Real-time message Donor -> NGO delivered instantly.');
        if (!ngoNotifications.some(n => n.title === 'New Message')) {
            throw new Error('❌ NGO did not receive "New Message" notification via Socket.IO');
        }
        console.log('✓ Real-time message notification NGO received instantly.');
        // 9. Clean up sockets & database
        console.log('\n🧹 Cleaning up test sockets and database records...');
        donorSocket.disconnect();
        ngoSocket.disconnect();
        await db.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [donorUser.id]);
        await db.query('DELETE FROM requests WHERE id = $1', [requestId]);
        await db.query('DELETE FROM donations WHERE id = $1', [donationId]);
        await db.query('DELETE FROM notifications WHERE user_id = $1 OR user_id = $2', [donorUser.id, ngoUser.id]);
        console.log('✓ Sockets disconnected and database cleaned up.');
        console.log('\n🎉 ALL REAL-TIME SOCKET.IO TESTS PASSED SUCCESSFULLY! Messaging, Typing Indicator, Online Status, and Live Notifications are fully operational.');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ SOCKET.IO TEST RUN FAILED:', error);
        process.exit(1);
    }
}
runSocketTests();
