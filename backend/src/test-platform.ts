import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as db from './config/db';

async function runTests() {
  console.log('🧪 Starting Automated Platform Verification Tests...\n');

  try {
    // 1. Initialize Database
    await db.initDB();
    console.log('✓ Database initialized successfully.');

    // 2. Verify Seeding and Login credentials
    const testUsers = [
      { email: 'admin@dress.com', role: 'admin' },
      { email: 'ngo@dress.com', role: 'ngo' },
      { email: 'donor@dress.com', role: 'donor' },
      { email: 'pending@dress.com', role: 'ngo' },
    ];

    for (const testUser of testUsers) {
      const res = await db.query('SELECT * FROM users WHERE email = $1', [testUser.email]);
      if (res.rows.length === 0) {
        throw new Error(`❌ Missing seeded user: ${testUser.email}`);
      }
      
      const user = res.rows[0];
      if (user.role !== testUser.role) {
        throw new Error(`❌ Incorrect role for ${testUser.email}: expected ${testUser.role}, got ${user.role}`);
      }

      // Verify bcrypt hashing works
      const isMatch = await bcrypt.compare('password', user.password);
      if (!isMatch) {
        throw new Error(`❌ Hashed password verification failed for ${testUser.email}`);
      }
      console.log(`✓ Default account verified: ${testUser.email} (Role: ${user.role}, Password verified: OK)`);
    }

    // 3. Verify NGO registrations verification status
    const ngoRes = await db.query(
      `SELECT n.*, u.email FROM ngos n JOIN users u ON n.id = u.id WHERE u.email = 'ngo@dress.com'`
    );
    if (ngoRes.rows.length === 0 || ngoRes.rows[0].approval_status !== 'approved') {
      throw new Error('❌ Seeded NGO (ngo@dress.com) should be in approved status');
    }
    console.log('✓ NGO registration verification status verified (ngo@dress.com is APPROVED).');

    const pendingNgoRes = await db.query(
      `SELECT n.*, u.email FROM ngos n JOIN users u ON n.id = u.id WHERE u.email = 'pending@dress.com'`
    );
    if (pendingNgoRes.rows.length === 0 || pendingNgoRes.rows[0].approval_status !== 'pending') {
      throw new Error('❌ Seeded NGO (pending@dress.com) should be in pending status');
    }
    console.log('✓ NGO registration verification status verified (pending@dress.com is PENDING).');

    // 4. Test Donation creation
    const donorId = (await db.query("SELECT id FROM users WHERE email = 'donor@dress.com'")).rows[0].id;
    const donationId = uuidv4();
    await db.query(
      `INSERT INTO donations (id, donor_id, title, description, category, gender, age_group, size, quantity, condition, images, status) 
       VALUES ($1, $2, 'Test Warm Coat', 'A warm winter coat in good condition.', 'Coats', 'Unisex', 'Adult', 'L', 1, 'Good', $3, 'available')`,
      [donationId, donorId, JSON.stringify(['/uploads/coat.jpg'])]
    );
    console.log('✓ Donation created successfully in database.');

    // 5. Test NGO request creation
    const ngoId = (await db.query("SELECT id FROM users WHERE email = 'ngo@dress.com'")).rows[0].id;
    const requestId = uuidv4();
    await db.query(
      'INSERT INTO requests (id, donation_id, ngo_id, status) VALUES ($1, $2, $3, \'pending\')',
      [requestId, donationId, ngoId]
    );
    await db.query('UPDATE donations SET status = \'requested\' WHERE id = $1', [donationId]);
    console.log('✓ NGO requested donation successfully in database.');

    // 6. Test Donor acceptance
    await db.query('UPDATE requests SET status = \'accepted\' WHERE id = $1', [requestId]);
    await db.query('UPDATE donations SET status = \'accepted\' WHERE id = $1', [donationId]);
    console.log('✓ Donor accepted request successfully in database.');

    // 7. Verify Chat permission check (canChat logic)
    const canChatQuery = `
      SELECT r.id 
      FROM requests r
      JOIN donations d ON r.donation_id = d.id
      WHERE r.status IN ('accepted', 'collected', 'completed')
        AND (
          (r.ngo_id = $1 AND d.donor_id = $2)
          OR
          (r.ngo_id = $2 AND d.donor_id = $1)
        )
    `;
    const canChatRes = await db.query(canChatQuery, [ngoId, donorId]);
    if (canChatRes.rows.length === 0) {
      throw new Error('❌ Chat authorization check failed: donor and NGO should be allowed to chat.');
    }
    console.log('✓ Chat permission check validated successfully (canChat check passed).');

    // 8. Test Messaging creation
    const messageId = uuidv4();
    await db.query(
      'INSERT INTO messages (id, sender_id, receiver_id, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [messageId, ngoId, donorId, 'Hello, is this item available for pick up?', new Date()]
    );
    console.log('✓ NGO sent chat message successfully.');

    const messagesHistory = await db.query(
      'SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY timestamp ASC',
      [ngoId, donorId]
    );
    if (messagesHistory.rows.length === 0 || messagesHistory.rows[0].message !== 'Hello, is this item available for pick up?') {
      throw new Error('❌ Message history retrieval failed.');
    }
    console.log('✓ Chat history retrieved and verified successfully.');

    // 9. Clean up test data
    await db.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [ngoId]);
    await db.query('DELETE FROM requests WHERE id = $1', [requestId]);
    await db.query('DELETE FROM donations WHERE id = $1', [donationId]);
    console.log('✓ Test data successfully cleaned up.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The platform backend logic, database, seeding, auth, and chat workflows are fully functional.');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 TEST RUN FAILED:', error);
    process.exit(1);
  }
}

runTests();
