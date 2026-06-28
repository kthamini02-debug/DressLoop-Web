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
exports.createNotification = createNotification;
const uuid_1 = require("uuid");
const db = __importStar(require("../config/db"));
const socket_1 = require("../config/socket");
async function createNotification(userId, title, message) {
    try {
        const id = (0, uuid_1.v4)();
        const createdAt = new Date();
        // Save to Database
        await db.query('INSERT INTO notifications (id, user_id, title, message, read_status, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [id, userId, title, message, false, createdAt]);
        // Emit via Socket.io
        (0, socket_1.sendNotificationToUser)(userId, {
            id,
            title,
            message,
            read_status: false,
            created_at: createdAt,
        });
        return id;
    }
    catch (error) {
        console.error('Error creating notification:', error);
    }
}
