#!/usr/bin/env node

/**
 * Cleanup Test Data Script
 * 
 * This script removes test users from the database to prepare for browser testing.
 * Usage: node cleanup-test-data.js [email]
 * 
 * If no email is provided, it cleans up the default test user: newcustomer@test.ie
 */

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
      }
);

async function cleanupTestUser(email) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Find the user
    const userResult = await client.query('SELECT user_id, first_name, last_name FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log(`✅ No user found with email ${email} - nothing to clean up`);
      await client.query('ROLLBACK');
      return;
    }
    
    const userId = userResult.rows[0].user_id;
    const firstName = userResult.rows[0].first_name;
    const lastName = userResult.rows[0].last_name;
    
    console.log(`👤 Found user: ${firstName} ${lastName} (${userId})`);
    console.log(`🗑️  Deleting related records...`);
    
    // Get loyalty_account_id first if it exists
    const loyaltyResult = await client.query(
      'SELECT loyalty_account_id FROM loyalty_accounts WHERE user_id = $1',
      [userId]
    );
    const loyaltyAccountId = loyaltyResult.rows[0]?.loyalty_account_id;
    
    // Get order_ids first if they exist
    const ordersResult = await client.query(
      'SELECT order_id FROM orders WHERE user_id = $1',
      [userId]
    );
    const orderIds = ordersResult.rows.map(row => row.order_id);
    
    // Delete related records in order of dependencies
    const deletions = [];
    
    // Activity logs
    deletions.push({ table: 'activity_logs', where: 'user_id = $1', params: [userId] });
    
    // Redeemed rewards (uses loyalty_account_id)
    if (loyaltyAccountId) {
      deletions.push({ table: 'redeemed_rewards', where: 'loyalty_account_id = $1', params: [loyaltyAccountId] });
    }
    
    // User badges (uses loyalty_account_id)
    if (loyaltyAccountId) {
      deletions.push({ table: 'user_badges', where: 'loyalty_account_id = $1', params: [loyaltyAccountId] });
    }
    
    // Points transactions (if loyalty account exists)
    if (loyaltyAccountId) {
      deletions.push({ 
        table: 'points_transactions', 
        where: 'loyalty_account_id = $1', 
        params: [loyaltyAccountId] 
      });
    }
    
    // Order-related tables (if orders exist)
    if (orderIds.length > 0) {
      const orderIdList = orderIds.map((_, i) => `$${i + 1}`).join(',');
      deletions.push({ 
        table: 'order_items', 
        where: `order_id IN (${orderIdList})`, 
        params: orderIds 
      });
      deletions.push({ 
        table: 'order_status_history', 
        where: `order_id IN (${orderIdList})`, 
        params: orderIds 
      });
    }
    
    // Orders
    deletions.push({ table: 'orders', where: 'user_id = $1', params: [userId] });
    
    // Loyalty account
    deletions.push({ table: 'loyalty_accounts', where: 'user_id = $1', params: [userId] });
    
    // Discount usage
    deletions.push({ table: 'discount_usage', where: 'user_id = $1', params: [userId] });
    
    // Catering inquiries
    deletions.push({ table: 'catering_inquiries', where: 'user_id = $1', params: [userId] });
    
    // Email verifications
    deletions.push({ table: 'email_verifications', where: 'user_id = $1', params: [userId] });
    
    // Password resets
    deletions.push({ table: 'password_resets', where: 'user_id = $1', params: [userId] });
    
    // Payment methods
    deletions.push({ table: 'payment_methods', where: 'user_id = $1', params: [userId] });
    
    // Addresses
    deletions.push({ table: 'addresses', where: 'user_id = $1', params: [userId] });
    
    // Newsletter subscribers
    deletions.push({ table: 'newsletter_subscribers', where: 'email = $1', params: [email] });
    
    let totalDeleted = 0;
    
    for (const deletion of deletions) {
      try {
        const result = await client.query(
          `DELETE FROM ${deletion.table} WHERE ${deletion.where}`,
          deletion.params
        );
        const deletedCount = result.rowCount || 0;
        if (deletedCount > 0) {
          console.log(`   ✓ Deleted ${deletedCount} record(s) from ${deletion.table}`);
          totalDeleted += deletedCount;
        }
      } catch (error) {
        console.error(`   ⚠️  Error deleting from ${deletion.table}:`, error.message);
        // Continue with other deletions even if one fails
      }
    }
    
    // Delete any discount codes created for this user
    const discountResult = await client.query(
      `DELETE FROM discount_codes WHERE code LIKE $1`,
      [`%${userId.slice(0, 6).toUpperCase()}%`]
    );
    const discountCount = discountResult.rowCount || 0;
    if (discountCount > 0) {
      console.log(`   ✓ Deleted ${discountCount} discount code(s) for user`);
      totalDeleted += discountCount;
    }
    
    // Finally, delete the user
    await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
    console.log(`   ✓ Deleted user record`);
    totalDeleted += 1;
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully deleted test user ${email} and ${totalDeleted} related record(s)`);
    console.log(`🎯 Database is now ready for testing with a fresh registration\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error cleaning up test user:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const email = process.argv[2] || 'newcustomer@test.ie';
  
  console.log('🧹 Test Data Cleanup Script');
  console.log('═══════════════════════════════════════\n');
  
  try {
    await cleanupTestUser(email);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
