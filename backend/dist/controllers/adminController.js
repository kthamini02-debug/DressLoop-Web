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
exports.getDashboardStats = getDashboardStats;
exports.getNgos = getNgos;
exports.verifyNgo = verifyNgo;
exports.getUsers = getUsers;
exports.deleteUser = deleteUser;
exports.getDonations = getDonations;
exports.deleteDonation = deleteDonation;
const db = __importStar(require("../config/db"));
const notification_1 = require("../utils/notification");
async function getDashboardStats(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    try {
        // 1. User Stats
        const userStatsRes = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        const userStats = { donor: 0, ngo: 0, admin: 0 };
        userStatsRes.rows.forEach((row) => {
            if (row.role in userStats) {
                userStats[row.role] = parseInt(row.count, 10);
            }
        });
        // 2. NGO Stats
        const ngoStatsRes = await db.query('SELECT approval_status, COUNT(*) as count FROM ngos GROUP BY approval_status');
        const ngoStats = { pending: 0, approved: 0, rejected: 0 };
        ngoStatsRes.rows.forEach((row) => {
            if (row.approval_status in ngoStats) {
                ngoStats[row.approval_status] = parseInt(row.count, 10);
            }
        });
        // 3. Donation Stats
        const donationStatsRes = await db.query('SELECT status, COUNT(*) as count FROM donations GROUP BY status');
        const donationStats = { available: 0, requested: 0, accepted: 0, collected: 0, completed: 0, rejected: 0 };
        donationStatsRes.rows.forEach((row) => {
            if (row.status in donationStats) {
                donationStats[row.status] = parseInt(row.count, 10);
            }
        });
        // 4. Recent Donations
        const recentDonationsRes = await db.query(`SELECT d.id, d.title, d.category, d.status, d.created_at, u.name as donor_name 
       FROM donations d 
       JOIN users u ON d.donor_id = u.id 
       ORDER BY d.created_at DESC LIMIT 5`);
        // 5. Recent NGOs
        const recentNgosRes = await db.query(`SELECT n.id, n.organization_name, n.approval_status, n.created_at, u.email 
       FROM ngos n 
       JOIN users u ON n.id = u.id 
       ORDER BY n.created_at DESC LIMIT 5`);
        // 6. Chat Stats
        const totalMessagesRes = await db.query('SELECT COUNT(*) as count FROM messages');
        const totalMessages = parseInt(totalMessagesRes.rows[0]?.count || '0', 10);
        const activeChatsRes = await db.query("SELECT COUNT(DISTINCT CASE WHEN sender_id < receiver_id THEN sender_id || '_' || receiver_id ELSE receiver_id || '_' || sender_id END) AS count FROM messages");
        const activeChats = parseInt(activeChatsRes.rows[0]?.count || '0', 10);
        // 7. Platform Analytics
        const totalRequestsRes = await db.query('SELECT COUNT(*) as count FROM requests');
        const totalRequests = parseInt(totalRequestsRes.rows[0]?.count || '0', 10);
        const acceptedRequestsRes = await db.query("SELECT COUNT(*) as count FROM requests WHERE status = 'accepted'");
        const acceptedRequests = parseInt(acceptedRequestsRes.rows[0]?.count || '0', 10);
        const completedDonationsRes = await db.query("SELECT COUNT(*) as count FROM donations WHERE status = 'completed'");
        const completedDonations = parseInt(completedDonationsRes.rows[0]?.count || '0', 10);
        // 8. Reports (Categories & Request distribution)
        const categoryDistributionRes = await db.query('SELECT category, COUNT(*) as count FROM donations GROUP BY category');
        const categoryDistribution = categoryDistributionRes.rows.map((row) => ({
            category: row.category,
            count: parseInt(row.count, 10),
        }));
        const requestStatusRes = await db.query('SELECT status, COUNT(*) as count FROM requests GROUP BY status');
        const requestStatusStats = { pending: 0, accepted: 0, rejected: 0, collected: 0, completed: 0 };
        requestStatusRes.rows.forEach((row) => {
            if (row.status in requestStatusStats) {
                requestStatusStats[row.status] = parseInt(row.count, 10);
            }
        });
        return res.json({
            users: userStats,
            ngos: ngoStats,
            donations: donationStats,
            recentDonations: recentDonationsRes.rows,
            recentNgos: recentNgosRes.rows,
            chats: {
                totalMessages,
                activeChats,
            },
            analytics: {
                totalRequests,
                acceptedRequests,
                completedDonations,
                requestStatus: requestStatusStats,
            },
            reports: {
                categoryDistribution,
            },
        });
    }
    catch (error) {
        console.error('Get admin dashboard stats error:', error);
        return res.status(500).json({ error: 'An error occurred fetching stats.' });
    }
}
async function getNgos(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
    }
    try {
        const result = await db.query(`SELECT n.*, u.name as admin_contact_name, u.email 
       FROM ngos n 
       JOIN users u ON n.id = u.id 
       ORDER BY n.created_at DESC`);
        return res.json(result.rows);
    }
    catch (error) {
        console.error('Get NGOs list error:', error);
        return res.status(500).json({ error: 'An error occurred fetching NGOs.' });
    }
}
async function verifyNgo(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
    }
    const { id } = req.params; // NGO User ID
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid verification status. Must be approved or rejected.' });
    }
    try {
        // Check if NGO exists
        const ngoRes = await db.query('SELECT * FROM ngos WHERE id = $1', [id]);
        if (ngoRes.rows.length === 0) {
            return res.status(404).json({ error: 'NGO not found.' });
        }
        await db.query('UPDATE ngos SET approval_status = $1 WHERE id = $2', [status, id]);
        // Send notifications to the NGO
        if (status === 'approved') {
            await (0, notification_1.createNotification)(id, 'Account Approved', 'Congratulations! Your NGO registration has been approved by the administrator. You can now browse and request donations.');
        }
        else {
            await (0, notification_1.createNotification)(id, 'Account Rejected', 'Your NGO registration has been rejected by the administrator. Please contact support if you believe this is an error.');
        }
        return res.json({ message: `NGO status successfully updated to ${status}.` });
    }
    catch (error) {
        console.error('Verify NGO error:', error);
        return res.status(500).json({ error: 'An error occurred verifying NGO.' });
    }
}
async function getUsers(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
    }
    try {
        const result = await db.query('SELECT id, name, email, role, created_at FROM users WHERE role != \'admin\' ORDER BY created_at DESC');
        return res.json(result.rows);
    }
    catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({ error: 'An error occurred fetching users.' });
    }
}
async function deleteUser(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
    }
    const { id } = req.params;
    try {
        const userRes = await db.query('SELECT role FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (userRes.rows[0].role === 'admin') {
            return res.status(400).json({ error: 'Cannot delete admin users.' });
        }
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        return res.json({ message: 'User deleted successfully.' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({ error: 'An error occurred deleting user.' });
    }
}
async function getDonations(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
    }
    try {
        const result = await db.query(`SELECT d.*, u.name as donor_name, u.email as donor_email 
       FROM donations d 
       JOIN users u ON d.donor_id = u.id 
       ORDER BY d.created_at DESC`);
        return res.json(result.rows);
    }
    catch (error) {
        console.error('Get donations error:', error);
        return res.status(500).json({ error: 'An error occurred fetching donations.' });
    }
}
async function deleteDonation(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
    }
    const { id } = req.params;
    try {
        const checkRes = await db.query('SELECT id FROM donations WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Donation not found.' });
        }
        await db.query('DELETE FROM donations WHERE id = $1', [id]);
        return res.json({ message: 'Donation deleted successfully by admin.' });
    }
    catch (error) {
        console.error('Delete donation error:', error);
        return res.status(500).json({ error: 'An error occurred deleting donation.' });
    }
}
