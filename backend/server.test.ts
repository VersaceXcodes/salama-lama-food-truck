import request from 'supertest';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { app, pool } from './server.ts'; // import your Express app instance and database pool

// ============================================
// TEST DATABASE SETUP & TEARDOWN
// ============================================

let testDB;
let socketServer: Server;
let clientSocket;

beforeAll(async () => {
  // Connect to test database
  testDB = pool;
  
  // Initialize WebSocket server for testing
  const httpServer = app.listen(0); // Random port
  const address = httpServer.address();
  const port = typeof address === 'string' ? 0 : address?.port || 0;
  
  // Wait for database connection
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Close database connections
  if (testDB) {
    await testDB.end();
  }
  
  // Close WebSocket connections
  if (clientSocket) {
    clientSocket.close();
  }
});

beforeEach(async () => {
  // Clear all tables before each test
  await clearDatabase();
  
  // Seed minimal test data
  await seedTestData();
});

afterEach(async () => {
  // Rollback any transactions
  await testDB.query('ROLLBACK');
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function clearDatabase() {
  const tables = [
    'activity_logs',
    'system_settings',
    'invoices',
    'catering_quotes',
    'catering_inquiries',
    'redeemed_rewards',
    'rewards',
    'user_badges',
    'badges',
    'points_transactions',
    'loyalty_accounts',
    'discount_usage',
    'discount_codes',
    'delivery_zones',
    'stock_history',
    'order_status_history',
    'order_items',
    'orders',
    'customization_options',
    'customization_groups',
    'menu_items',
    'categories',
    'newsletter_subscribers',
    'email_verifications',
    'password_resets',
    'payment_methods',
    'addresses',
    'users'
  ];
  
  for (const table of tables) {
    await testDB.query(`DELETE FROM ${table}`);
  }
}

async function seedTestData() {
  // Seed test admin user
  await testDB.query(`
    INSERT INTO users (
      user_id, email, phone, password_hash, first_name, last_name, role,
      email_verified, status, created_at, referral_code
    ) VALUES (
      'admin_test_001',
      'admin@test.com',
      '+353871111111',
      'admin123',
      'Admin',
      'User',
      'admin',
      true,
      'active',
      '2024-01-01T10:00:00Z',
      'ADMIN2024'
    )
  `);
  
  // Seed test staff user
  await testDB.query(`
    INSERT INTO users (
      user_id, email, phone, password_hash, first_name, last_name, role,
      email_verified, status, created_at, referral_code,
      staff_permissions
    ) VALUES (
      'staff_test_001',
      'staff@test.com',
      '+353871111112',
      'staff123',
      'Staff',
      'User',
      'staff',
      true,
      'active',
      '2024-01-01T10:00:00Z',
      'STAFF2024',
      '{"manage_orders": true, "view_stock": true}'::jsonb
    )
  `);
  
  // Seed test category
  await testDB.query(`
    INSERT INTO categories (category_id, name, description, sort_order, created_at)
    VALUES ('cat_test_001', 'Test Category', 'Test description', 0, '2024-01-01T10:00:00Z')
  `);
  
  // Seed test menu item
  await testDB.query(`
    INSERT INTO menu_items (
      item_id, name, description, category_id, price, is_active,
      stock_tracked, current_stock, low_stock_threshold, created_at, updated_at
    ) VALUES (
      'item_test_001',
      'Test Item',
      'Test description',
      'cat_test_001',
      10.00,
      true,
      true,
      50,
      10,
      '2024-01-01T10:00:00Z',
      '2024-01-01T10:00:00Z'
    )
  `);
  
  // Seed system settings
  await testDB.query(`
    INSERT INTO system_settings (setting_id, setting_key, setting_value, setting_type, updated_at)
    VALUES
      ('set_test_001', 'tax_rate', '0.23', 'number', '2024-01-01T10:00:00Z'),
      ('set_test_002', 'loyalty_points_rate', '1', 'number', '2024-01-01T10:00:00Z'),
      ('set_test_003', 'first_order_discount_percentage', '20', 'number', '2024-01-01T10:00:00Z')
  `);
}

function generateToken(userId: string, role: string = 'customer'): string {
  return jwt.sign(
    { user_id: userId, role, email: `${userId}@test.com` },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

async function createTestUser(overrides = {}) {
  const userId = `user_test_${nanoid(10)}`;
  const defaults = {
    user_id: userId,
    email: `${userId}@test.com`,
    phone: `+35387${Math.floor(1000000 + Math.random() * 9000000)}`,
    password_hash: 'password123', // Plain text for testing
    first_name: 'Test',
    last_name: 'User',
    role: 'customer',
    email_verified: true,
    status: 'active',
    created_at: new Date().toISOString(),
    referral_code: `TEST${nanoid(6)}`
  };
  
  const userData = { ...defaults, ...overrides };
  
  await testDB.query(`
    INSERT INTO users (
      user_id, email, phone, password_hash, first_name, last_name, role,
      email_verified, status, created_at, referral_code
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    userData.user_id, userData.email, userData.phone, userData.password_hash,
    userData.first_name, userData.last_name, userData.role, userData.email_verified,
    userData.status, userData.created_at, userData.referral_code
  ]);
  
  // Create loyalty account
  await testDB.query(`
    INSERT INTO loyalty_accounts (
      loyalty_account_id, user_id, current_points_balance, total_points_earned,
      total_points_redeemed, total_points_expired, referral_count,
      spin_wheel_available_count, created_at
    ) VALUES ($1, $2, 0, 0, 0, 0, 0, 0, $3)
  `, [`la_${userId}`, userId, new Date().toISOString()]);
  
  return userData;
}

// ============================================
// AUTHENTICATION TESTS
// ============================================

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register new customer with first-order discount', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          phone: '+353871234567',
          password: 'password123',
          first_name: 'John',
          last_name: 'Doe',
          marketing_opt_in: true
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('first_order_discount_code');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.role).toBe('customer');
      expect(response.body.user.email_verified).toBe(false);
      
      // Verify user created in database
      const userResult = await testDB.query(
        'SELECT * FROM users WHERE email = $1',
        ['newuser@test.com']
      );
      expect(userResult.rows.length).toBe(1);
      expect(userResult.rows[0].password_hash).toBe('password123'); // Plain text
      
      // Verify loyalty account created
      const loyaltyResult = await testDB.query(
        'SELECT * FROM loyalty_accounts WHERE user_id = $1',
        [userResult.rows[0].user_id]
      );
      expect(loyaltyResult.rows.length).toBe(1);
      expect(loyaltyResult.rows[0].current_points_balance).toBe(0);
      
      // Verify first-order discount code created
      const discountResult = await testDB.query(
        'SELECT * FROM discount_codes WHERE code = $1',
        [response.body.first_order_discount_code]
      );
      expect(discountResult.rows.length).toBe(1);
      expect(discountResult.rows[0].discount_type).toBe('percentage');
      expect(Number(discountResult.rows[0].discount_value)).toBe(20);
      
      // Verify email verification created
      const verificationResult = await testDB.query(
        'SELECT * FROM email_verifications WHERE user_id = $1',
        [userResult.rows[0].user_id]
      );
      expect(verificationResult.rows.length).toBe(1);
    });
    
    it('should reject registration with duplicate email', async () => {
      await createTestUser({ email: 'existing@test.com' });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@test.com',
          phone: '+353871234568',
          password: 'password123',
          first_name: 'Jane',
          last_name: 'Doe'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('REGISTRATION_FAILED');
      expect(response.body.message).toContain('Email already registered');
    });
    
    it('should reject registration with duplicate phone', async () => {
      await createTestUser({ phone: '+353871234567' });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          phone: '+353871234567',
          password: 'password123',
          first_name: 'Jane',
          last_name: 'Doe'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('REGISTRATION_FAILED');
      expect(response.body.message).toContain('Phone already registered');
    });
    
    it('should handle referral code during registration', async () => {
      const referrer = await createTestUser({ referral_code: 'REFERRER123' });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'referred@test.com',
          phone: '+353871234569',
          password: 'password123',
          first_name: 'Referred',
          last_name: 'User',
          referred_by_user_id: referrer.user_id
        });
      
      expect(response.status).toBe(201);
      
      // Verify referral count incremented
      const referrerLoyalty = await testDB.query(
        'SELECT referral_count FROM loyalty_accounts WHERE user_id = $1',
        [referrer.user_id]
      );
      expect(referrerLoyalty.rows[0].referral_count).toBe(1);
    });
    
    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          phone: '+353871234567',
          password: 'short', // Too short
          first_name: 'Test',
          last_name: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters');
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials (plain text password)', async () => {
      const user = await createTestUser({
        email: 'login@test.com',
        password_hash: 'password123' // Plain text
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123' // Plain text comparison
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.user_id).toBe(user.user_id);
      expect(response.body.user.email).toBe('login@test.com');
      
      // Verify JWT token
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-secret') as jwt.JwtPayload;
      expect(decoded.user_id).toBe(user.user_id);
      expect(decoded.role).toBe('customer');
      
      // Verify last_login_at updated
      const userResult = await testDB.query(
        'SELECT last_login_at FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].last_login_at).not.toBeNull();
    });
    
    it('should reject login with incorrect password', async () => {
      await createTestUser({
        email: 'login@test.com',
        password_hash: 'password123'
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('AUTHENTICATION_FAILED');
      expect(response.body.message).toBe('Invalid email or password');
    });
    
    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('AUTHENTICATION_FAILED');
    });
    
    it('should reject login for suspended user', async () => {
      await createTestUser({
        email: 'suspended@test.com',
        password_hash: 'password123',
        status: 'suspended'
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'suspended@test.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Account is suspended');
    });
    
    it('should include loyalty account info in login response', async () => {
      const user = await createTestUser({
        email: 'loyalty@test.com',
        password_hash: 'password123'
      });
      
      // Add some points
      await testDB.query(`
        UPDATE loyalty_accounts 
        SET current_points_balance = 100, total_points_earned = 150
        WHERE user_id = $1
      `, [user.user_id]);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loyalty@test.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.user.loyalty_account).toBeDefined();
      expect(response.body.user.loyalty_account.current_points_balance).toBe(100);
      expect(response.body.user.loyalty_account.total_points_earned).toBe(150);
    });
  });
  
  describe('POST /api/auth/password-reset-request', () => {
    it('should create password reset token for valid email', async () => {
      const user = await createTestUser({ email: 'reset@test.com' });
      
      const response = await request(app)
        .post('/api/auth/password-reset-request')
        .send({ email: 'reset@test.com' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('If your email is registered');
      
      // Verify reset token created
      const resetResult = await testDB.query(
        'SELECT * FROM password_resets WHERE user_id = $1 AND used = false',
        [user.user_id]
      );
      expect(resetResult.rows.length).toBe(1);
      expect(resetResult.rows[0].reset_token).toBeDefined();
      
      // Verify token expires in 1 hour
      const expiresAt = new Date(resetResult.rows[0].expires_at);
      const createdAt = new Date(resetResult.rows[0].created_at);
      const diffMinutes = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60);
      expect(diffMinutes).toBe(60);
    });
    
    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset-request')
        .send({ email: 'nonexistent@test.com' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('If your email is registered');
      
      // Verify no token created
      const resetResult = await testDB.query(
        'SELECT * FROM password_resets WHERE reset_token IS NOT NULL'
      );
      expect(resetResult.rows.length).toBe(0);
    });
    
    it('should invalidate old tokens when creating new one', async () => {
      const user = await createTestUser({ email: 'reset@test.com' });
      
      // Create first token
      await testDB.query(`
        INSERT INTO password_resets (reset_id, user_id, reset_token, created_at, expires_at, used)
        VALUES ($1, $2, $3, $4, $5, false)
      `, [
        'reset_old_001',
        user.user_id,
        'old_token_123',
        new Date().toISOString(),
        new Date(Date.now() + 3600000).toISOString()
      ]);
      
      // Request new token
      await request(app)
        .post('/api/auth/password-reset-request')
        .send({ email: 'reset@test.com' });
      
      // Verify old token invalidated
      const oldTokenResult = await testDB.query(
        'SELECT * FROM password_resets WHERE reset_token = $1',
        ['old_token_123']
      );
      expect(new Date(oldTokenResult.rows[0].expires_at) < new Date()).toBe(true);
    });
  });
  
  describe('POST /api/auth/password-reset', () => {
    it('should reset password with valid token', async () => {
      const user = await createTestUser({ email: 'reset@test.com' });
      const resetToken = nanoid(32);
      
      await testDB.query(`
        INSERT INTO password_resets (reset_id, user_id, reset_token, created_at, expires_at, used)
        VALUES ($1, $2, $3, $4, $5, false)
      `, [
        'reset_test_001',
        user.user_id,
        resetToken,
        new Date().toISOString(),
        new Date(Date.now() + 3600000).toISOString()
      ]);
      
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({
          reset_token: resetToken,
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password reset successfully');
      
      // Verify password updated (plain text)
      const userResult = await testDB.query(
        'SELECT password_hash FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].password_hash).toBe('newpassword123');
      
      // Verify token marked as used
      const tokenResult = await testDB.query(
        'SELECT used FROM password_resets WHERE reset_token = $1',
        [resetToken]
      );
      expect(tokenResult.rows[0].used).toBe(true);
    });
    
    it('should reject expired reset token', async () => {
      const user = await createTestUser({ email: 'reset@test.com' });
      const resetToken = nanoid(32);
      
      await testDB.query(`
        INSERT INTO password_resets (reset_id, user_id, reset_token, created_at, expires_at, used)
        VALUES ($1, $2, $3, $4, $5, false)
      `, [
        'reset_test_002',
        user.user_id,
        resetToken,
        new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        new Date(Date.now() - 3600000).toISOString() // Expired 1 hour ago
      ]);
      
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({
          reset_token: resetToken,
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_TOKEN');
      expect(response.body.message).toContain('expired');
    });
    
    it('should reject already used token', async () => {
      const user = await createTestUser({ email: 'reset@test.com' });
      const resetToken = nanoid(32);
      
      await testDB.query(`
        INSERT INTO password_resets (reset_id, user_id, reset_token, created_at, expires_at, used)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [
        'reset_test_003',
        user.user_id,
        resetToken,
        new Date().toISOString(),
        new Date(Date.now() + 3600000).toISOString()
      ]);
      
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({
          reset_token: resetToken,
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_TOKEN');
    });
  });
  
  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const user = await createTestUser({ email_verified: false });
      const verificationToken = nanoid(32);
      
      await testDB.query(`
        INSERT INTO email_verifications (verification_id, user_id, verification_token, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'ver_test_001',
        user.user_id,
        verificationToken,
        new Date().toISOString(),
        new Date(Date.now() + 86400000).toISOString() // 24 hours
      ]);
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ verification_token: verificationToken });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Email verified successfully');
      
      // Verify email_verified flag updated
      const userResult = await testDB.query(
        'SELECT email_verified FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].email_verified).toBe(true);
      
      // Verify verification marked as verified
      const verificationResult = await testDB.query(
        'SELECT verified_at FROM email_verifications WHERE verification_token = $1',
        [verificationToken]
      );
      expect(verificationResult.rows[0].verified_at).not.toBeNull();
    });
    
    it('should reject expired verification token', async () => {
      const user = await createTestUser();
      const verificationToken = nanoid(32);
      
      await testDB.query(`
        INSERT INTO email_verifications (verification_id, user_id, verification_token, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'ver_test_002',
        user.user_id,
        verificationToken,
        new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        new Date(Date.now() - 86400000).toISOString() // Expired yesterday
      ]);
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ verification_token: verificationToken });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VERIFICATION_FAILED');
      expect(response.body.message).toContain('expired');
    });
  });
});

// ============================================
// MENU TESTS
// ============================================

describe('Menu', () => {
  describe('GET /api/menu/items', () => {
    beforeEach(async () => {
      // Create additional test items
      await testDB.query(`
        INSERT INTO menu_items (
          item_id, name, description, category_id, price, is_active,
          dietary_tags, is_featured, stock_tracked, current_stock,
          created_at, updated_at
        ) VALUES
        ('item_test_002', 'Vegan Item', 'Test vegan', 'cat_test_001', 12.00, true, '["vegan"]'::jsonb, true, false, NULL, NOW(), NOW()),
        ('item_test_003', 'Gluten Free Item', 'Test GF', 'cat_test_001', 11.00, true, '["gluten_free"]'::jsonb, false, true, 5, NOW(), NOW()),
        ('item_test_004', 'Inactive Item', 'Test inactive', 'cat_test_001', 9.00, false, NULL, false, false, NULL, NOW(), NOW())
      `);
    });
    
    it('should return all active menu items', async () => {
      const response = await request(app)
        .get('/api/menu/items');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body.items.length).toBeGreaterThanOrEqual(3);
      
      // Should not include inactive items
      const hasInactive = response.body.items.some(item => item.item_id === 'item_test_004');
      expect(hasInactive).toBe(false);
    });
    
    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/menu/items')
        .query({ category: 'cat_test_001' });
      
      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      response.body.items.forEach(item => {
        expect(item.category_id).toBe('cat_test_001');
      });
    });
    
    it('should filter by dietary tags', async () => {
      const response = await request(app)
        .get('/api/menu/items')
        .query({ dietary_filters: ['vegan'] });
      
      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      response.body.items.forEach(item => {
        expect(item.dietary_tags).toContain('vegan');
      });
    });
    
    it('should filter featured items', async () => {
      const response = await request(app)
        .get('/api/menu/items')
        .query({ is_featured: true });
      
      expect(response.status).toBe(200);
      response.body.items.forEach(item => {
        expect(item.is_featured).toBe(true);
      });
    });
    
    it('should search by item name', async () => {
      const response = await request(app)
        .get('/api/menu/items')
        .query({ search: 'Vegan' });
      
      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items[0].name).toContain('Vegan');
    });
    
    it('should sort by price', async () => {
      const response = await request(app)
        .get('/api/menu/items')
        .query({ sort: 'price_low_high' });
      
      expect(response.status).toBe(200);
      const prices = response.body.items.map(item => Number(item.price));
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });
    
    it('should paginate results', async () => {
      const response1 = await request(app)
        .get('/api/menu/items')
        .query({ limit: 2, offset: 0 });
      
      expect(response1.status).toBe(200);
      expect(response1.body.items.length).toBeLessThanOrEqual(2);
      expect(response1.body.limit).toBe(2);
      expect(response1.body.offset).toBe(0);
      
      const response2 = await request(app)
        .get('/api/menu/items')
        .query({ limit: 2, offset: 2 });
      
      expect(response2.status).toBe(200);
      expect(response2.body.offset).toBe(2);
    });
    
    it('should include customization groups and options', async () => {
      // Create customization group
      await testDB.query(`
        INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order)
        VALUES ('cg_test_001', 'item_test_001', 'Size', 'single', true, 0)
      `);
      
      await testDB.query(`
        INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
        VALUES
        ('co_test_001', 'cg_test_001', 'Small', 0.00, true, 0),
        ('co_test_002', 'cg_test_001', 'Large', 1.50, false, 1)
      `);
      
      const response = await request(app)
        .get('/api/menu/items/item_test_001');
      
      expect(response.status).toBe(200);
      expect(response.body.customization_groups).toBeDefined();
      expect(response.body.customization_groups.length).toBe(1);
      expect(response.body.customization_groups[0].options.length).toBe(2);
      expect(response.body.customization_groups[0].options[0].name).toBe('Small');
    });
  });
  
  describe('GET /api/menu/categories', () => {
    it('should return all categories sorted', async () => {
      await testDB.query(`
        INSERT INTO categories (category_id, name, description, sort_order, created_at) VALUES
        ('cat_test_002', 'Category B', 'Second', 1, NOW()),
        ('cat_test_003', 'Category A', 'First', 0, NOW())
      `);
      
      const response = await request(app)
        .get('/api/menu/categories');
      
      expect(response.status).toBe(200);
      expect(response.body.categories).toBeDefined();
      expect(response.body.categories.length).toBeGreaterThanOrEqual(3);
      
      // Check sorting by sort_order
      for (let i = 1; i < response.body.categories.length; i++) {
        expect(response.body.categories[i].sort_order)
          .toBeGreaterThanOrEqual(response.body.categories[i - 1].sort_order);
      }
    });
  });
});

// ============================================
// PROFILE TESTS
// ============================================

describe('Profile', () => {
  describe('GET /api/profile', () => {
    it('should return authenticated user profile', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Add some orders and points for stats
      await testDB.query(`
        UPDATE loyalty_accounts 
        SET current_points_balance = 250, total_points_earned = 500
        WHERE user_id = $1
      `, [user.user_id]);
      
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(user.user_id);
      expect(response.body.email).toBe(user.email);
      expect(response.body.loyalty_account).toBeDefined();
      expect(response.body.loyalty_account.current_points_balance).toBe(250);
    });
    
    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });
    
    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid_token');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });
  });
  
  describe('PUT /api/profile', () => {
    it('should update user profile', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'UpdatedName',
          dietary_preferences: ['vegetarian', 'gluten_free'],
          marketing_opt_in: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body.first_name).toBe('UpdatedName');
      expect(response.body.dietary_preferences).toEqual(['vegetarian', 'gluten_free']);
      expect(response.body.marketing_opt_in).toBe(true);
      
      // Verify database updated
      const userResult = await testDB.query(
        'SELECT first_name, dietary_preferences, marketing_opt_in FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].first_name).toBe('UpdatedName');
    });
    
    it('should allow partial updates', async () => {
      const user = await createTestUser({ first_name: 'Original' });
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ last_name: 'UpdatedLast' });
      
      expect(response.status).toBe(200);
      expect(response.body.first_name).toBe('Original'); // Unchanged
      expect(response.body.last_name).toBe('UpdatedLast'); // Changed
    });
  });
  
  describe('DELETE /api/profile', () => {
    it('should delete account with password verification', async () => {
      const user = await createTestUser({ password_hash: 'password123' });
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'password123' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Account deleted');
      
      // Verify user data anonymized
      const userResult = await testDB.query(
        'SELECT email, first_name, last_name, status FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].email).toContain('deleted_');
      expect(userResult.rows[0].first_name).toBe('[Deleted]');
      expect(userResult.rows[0].last_name).toBe('User');
      expect(userResult.rows[0].status).toBe('deleted');
    });
    
    it('should reject deletion with incorrect password', async () => {
      const user = await createTestUser({ password_hash: 'password123' });
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'wrongpassword' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_PASSWORD');
    });
  });
  
  describe('PUT /api/profile/password', () => {
    it('should change password with valid current password', async () => {
      const user = await createTestUser({ password_hash: 'oldpassword123' });
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .put('/api/profile/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'oldpassword123',
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password changed');
      
      // Verify password updated (plain text)
      const userResult = await testDB.query(
        'SELECT password_hash FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].password_hash).toBe('newpassword123');
    });
    
    it('should reject with incorrect current password', async () => {
      const user = await createTestUser({ password_hash: 'password123' });
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .put('/api/profile/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'wrongpassword',
          new_password: 'newpassword123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_PASSWORD');
    });
  });
});

// ============================================
// ADDRESS TESTS
// ============================================

describe('Addresses', () => {
  describe('POST /api/addresses', () => {
    it('should create new address with geocoding', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'Home',
          address_line1: '123 Test Street',
          city: 'Dublin',
          postal_code: 'D02 X123',
          delivery_instructions: 'Ring doorbell',
          is_default: true
        });
      
      expect(response.status).toBe(201);
      expect(response.body.address_id).toBeDefined();
      expect(response.body.label).toBe('Home');
      expect(response.body.is_default).toBe(true);
      expect(response.body.latitude).toBeDefined(); // From geocoding
      expect(response.body.longitude).toBeDefined();
      
      // Verify in database
      const addressResult = await testDB.query(
        'SELECT * FROM addresses WHERE user_id = $1',
        [user.user_id]
      );
      expect(addressResult.rows.length).toBe(1);
    });
    
    it('should unset other defaults when setting new default', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create first default address
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          is_default, created_at
        ) VALUES ($1, $2, 'Old Default', '456 Old St', 'Dublin', 'D02 Y456', true, NOW())
      `, ['addr_old_001', user.user_id]);
      
      // Create new default address
      const response = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'New Default',
          address_line1: '123 New St',
          city: 'Dublin',
          postal_code: 'D02 X123',
          is_default: true
        });
      
      expect(response.status).toBe(201);
      expect(response.body.is_default).toBe(true);
      
      // Verify old default unset
      const oldAddressResult = await testDB.query(
        'SELECT is_default FROM addresses WHERE address_id = $1',
        ['addr_old_001']
      );
      expect(oldAddressResult.rows[0].is_default).toBe(false);
    });
  });
  
  describe('PUT /api/addresses/{address_id}', () => {
    it('should update address', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const addressId = 'addr_test_001';
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          is_default, created_at
        ) VALUES ($1, $2, 'Home', '123 Old St', 'Dublin', 'D02 X123', false, NOW())
      `, [addressId, user.user_id]);
      
      const response = await request(app)
        .put(`/api/addresses/${addressId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          label: 'Updated Home',
          delivery_instructions: 'New instructions'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.label).toBe('Updated Home');
      expect(response.body.delivery_instructions).toBe('New instructions');
    });
    
    it('should reject update for address not owned by user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateToken(user1.user_id);
      
      const addressId = 'addr_test_002';
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code, created_at
        ) VALUES ($1, $2, 'Home', '123 St', 'Dublin', 'D02 X123', NOW())
      `, [addressId, user2.user_id]);
      
      const response = await request(app)
        .put(`/api/addresses/${addressId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ label: 'Hacked' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });
  
  describe('DELETE /api/addresses/{address_id}', () => {
    it('should delete address', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const addressId = 'addr_test_003';
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code, created_at
        ) VALUES ($1, $2, 'Work', '456 Work St', 'Dublin', 'D04 Y456', NOW())
      `, [addressId, user.user_id]);
      
      const response = await request(app)
        .delete(`/api/addresses/${addressId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
      
      // Verify deleted from database
      const addressResult = await testDB.query(
        'SELECT * FROM addresses WHERE address_id = $1',
        [addressId]
      );
      expect(addressResult.rows.length).toBe(0);
    });
    
    it('should prevent deletion of address in active order', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const addressId = 'addr_test_004';
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code, created_at
        ) VALUES ($1, $2, 'Home', '123 St', 'Dublin', 'D02 X123', NOW())
      `, [addressId, user.user_id]);
      
      // Create active order with this address
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, delivery_address_id,
          subtotal, tax_amount, total_amount, payment_status, customer_name,
          customer_email, customer_phone, created_at, updated_at
        ) VALUES (
          'ord_test_001', 'TEST-001', $1, 'delivery', 'preparing', $2,
          20.00, 4.60, 24.60, 'paid', 'Test User', 'test@test.com', '+353871234567',
          NOW(), NOW()
        )
      `, [user.user_id, addressId]);
      
      const response = await request(app)
        .delete(`/api/addresses/${addressId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ADDRESS_IN_USE');
    });
  });
});

// ============================================
// CART TESTS
// ============================================

describe('Cart', () => {
  describe('POST /api/cart/items', () => {
    it('should add item to cart', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item_id: 'item_test_001',
          quantity: 2,
          selected_customizations: {}
        });
      
      expect(response.status).toBe(200);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].item_id).toBe('item_test_001');
      expect(response.body.items[0].quantity).toBe(2);
      expect(response.body.subtotal).toBe(20.00); // 10.00 * 2
    });
    
    it('should reject adding out-of-stock item', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Set item stock to 0
      await testDB.query(`
        UPDATE menu_items 
        SET current_stock = 0 
        WHERE item_id = 'item_test_001'
      `);
      
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item_id: 'item_test_001',
          quantity: 1
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ITEM_UNAVAILABLE');
      expect(response.body.message).toContain('out of stock');
    });
    
    it('should reject quantity exceeding stock', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Item has stock of 50
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item_id: 'item_test_001',
          quantity: 100 // Exceeds stock
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INSUFFICIENT_STOCK');
      expect(response.body.message).toContain('Only 50 available');
    });
    
    it('should calculate customization prices', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create customization with additional price
      await testDB.query(`
        INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order)
        VALUES ('cg_test_cart_01', 'item_test_001', 'Size', 'single', true, 0)
      `);
      
      await testDB.query(`
        INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
        VALUES ('co_test_cart_01', 'cg_test_cart_01', 'Large', 2.00, false, 0)
      `);
      
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item_id: 'item_test_001',
          quantity: 1,
          selected_customizations: {
            'cg_test_cart_01': 'co_test_cart_01'
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body.items[0].unit_price).toBe(12.00); // 10.00 + 2.00
      expect(response.body.items[0].line_total).toBe(12.00);
      expect(response.body.subtotal).toBe(12.00);
    });
  });
  
  describe('PUT /api/cart/items/{item_id}', () => {
    it('should update cart item quantity', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Add item to cart first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item_id: 'item_test_001',
          quantity: 2
        });
      
      // Update quantity
      const response = await request(app)
        .put('/api/cart/items/item_test_001')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });
      
      expect(response.status).toBe(200);
      expect(response.body.items[0].quantity).toBe(5);
      expect(response.body.subtotal).toBe(50.00); // 10.00 * 5
    });
  });
  
  describe('DELETE /api/cart/items/{item_id}', () => {
    it('should remove item from cart', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      // Remove item
      const response = await request(app)
        .delete('/api/cart/items/item_test_001')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(0);
      expect(response.body.subtotal).toBe(0);
    });
  });
});

// ============================================
// CHECKOUT TESTS
// ============================================

describe('Checkout', () => {
  describe('POST /api/checkout/validate', () => {
    it('should validate collection checkout', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.errors).toEqual([]);
    });
    
    it('should validate delivery checkout with valid address', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create delivery zone
      await testDB.query(`
        INSERT INTO delivery_zones (
          zone_id, zone_name, zone_type, zone_boundaries, delivery_fee,
          minimum_order_value, estimated_delivery_time, is_active, priority,
          created_at, updated_at
        ) VALUES (
          'zone_test_001',
          'Test Zone',
          'polygon',
          '{"type": "Polygon", "coordinates": [[[53.3498, -6.2603], [53.3398, -6.2603], [53.3398, -6.2403], [53.3498, -6.2403], [53.3498, -6.2603]]]}'::jsonb,
          3.50,
          10.00,
          30,
          true,
          1,
          NOW(),
          NOW()
        )
      `);
      
      // Create address within zone
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          latitude, longitude, created_at
        ) VALUES ($1, $2, 'Home', '123 St', 'Dublin', 'D02 X123', 53.3448, -6.2503, NOW())
      `, ['addr_test_val_01', user.user_id]);
      
      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'delivery',
          delivery_address_id: 'addr_test_val_01'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });
    
    it('should reject delivery to address outside zones', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create address outside all zones
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          latitude, longitude, created_at
        ) VALUES ($1, $2, 'Home', '999 Far St', 'Dublin', 'D99 Z999', 54.0000, -7.0000, NOW())
      `, ['addr_test_val_02', user.user_id]);
      
      const response = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'delivery',
          delivery_address_id: 'addr_test_val_02'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'delivery_address',
          error: 'ADDRESS_OUT_OF_RANGE'
        })
      );
    });
    
    it('should validate discount code', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create discount code
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, minimum_order_value,
          valid_from, status, created_at, updated_at
        ) VALUES (
          'dc_test_001', 'TESTCODE', 'percentage', 10.00, 15.00,
          '2024-01-01T00:00:00Z', 'active', NOW(), NOW()
        )
      `);
      
      // Add items worth €20 to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          discount_code: 'TESTCODE'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });
    
    it('should reject invalid discount code', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          discount_code: 'INVALID_CODE'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'discount_code',
          error: 'INVALID_CODE'
        })
      );
    });
  });
  
  describe('POST /api/checkout/calculate', () => {
    it('should calculate totals for collection order', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Add items to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.subtotal).toBe(20.00);
      expect(response.body.discount_amount).toBe(0);
      expect(response.body.delivery_fee).toBe(0);
      expect(response.body.tax_amount).toBe(4.60); // 20.00 * 0.23
      expect(response.body.total_amount).toBe(24.60);
    });
    
    it('should calculate delivery fee for delivery order', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create delivery zone
      await testDB.query(`
        INSERT INTO delivery_zones (
          zone_id, zone_name, zone_type, zone_boundaries, delivery_fee,
          minimum_order_value, estimated_delivery_time, is_active, priority,
          created_at, updated_at
        ) VALUES (
          'zone_test_calc_01',
          'Test Zone',
          'polygon',
          '{"type": "Polygon", "coordinates": [[[53.35, -6.27], [53.33, -6.27], [53.33, -6.25], [53.35, -6.25], [53.35, -6.27]]]}'::jsonb,
          3.50,
          10.00,
          30,
          true,
          1,
          NOW(),
          NOW()
        )
      `);
      
      // Create address
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          latitude, longitude, created_at
        ) VALUES ($1, $2, 'Home', '123 St', 'Dublin', 'D02 X123', 53.34, -6.26, NOW())
      `, ['addr_test_calc_01', user.user_id]);
      
      // Add items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'delivery',
          delivery_address_id: 'addr_test_calc_01'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.subtotal).toBe(20.00);
      expect(response.body.delivery_fee).toBe(3.50);
      expect(response.body.tax_amount).toBe(5.41); // (20.00 + 3.50) * 0.23
      expect(response.body.total_amount).toBe(28.91);
    });
    
    it('should apply percentage discount', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create discount
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, minimum_order_value,
          valid_from, status, created_at, updated_at
        ) VALUES (
          'dc_test_calc_01', 'SAVE10', 'percentage', 10.00, 0,
          '2024-01-01T00:00:00Z', 'active', NOW(), NOW()
        )
      `);
      
      // Add items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          discount_code: 'SAVE10'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.subtotal).toBe(20.00);
      expect(response.body.discount_amount).toBe(2.00); // 10% of 20.00
      expect(response.body.tax_amount).toBe(4.14); // (20.00 - 2.00) * 0.23
      expect(response.body.total_amount).toBe(22.14);
    });
    
    it('should apply fixed discount', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create discount
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, minimum_order_value,
          valid_from, status, created_at, updated_at
        ) VALUES (
          'dc_test_calc_02', 'SAVE5', 'fixed', 5.00, 0,
          '2024-01-01T00:00:00Z', 'active', NOW(), NOW()
        )
      `);
      
      // Add items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          discount_code: 'SAVE5'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.discount_amount).toBe(5.00);
      expect(response.body.total_amount).toBe(18.45); // (20 - 5) * 1.23
    });
    
    it('should enforce minimum order value for discount', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create discount with MOQ of €25
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, minimum_order_value,
          valid_from, status, created_at, updated_at
        ) VALUES (
          'dc_test_calc_03', 'BIGORDER', 'percentage', 15.00, 25.00,
          '2024-01-01T00:00:00Z', 'active', NOW(), NOW()
        )
      `);
      
      // Add items worth only €20
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          discount_code: 'BIGORDER'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MINIMUM_ORDER_NOT_MET');
      expect(response.body.message).toContain('€25');
    });
  });
  
  describe('POST /api/checkout/order', () => {
    it('should create collection order and award points', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_test_001', user.user_id]);
      
      // Add items to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_test_001',
          cvv: '123'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.order_id).toBeDefined();
      expect(response.body.order_number).toMatch(/^ORD-/);
      expect(response.body.status).toBe('received');
      expect(response.body.total_amount).toBe(24.60);
      expect(response.body.loyalty_points_awarded).toBe(24); // floor(24.60 * 1)
      
      // Verify order created in database
      const orderResult = await testDB.query(
        'SELECT * FROM orders WHERE order_id = $1',
        [response.body.order_id]
      );
      expect(orderResult.rows.length).toBe(1);
      expect(orderResult.rows[0].payment_status).toBe('paid');
      
      // Verify order items created
      const itemsResult = await testDB.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [response.body.order_id]
      );
      expect(itemsResult.rows.length).toBe(1);
      expect(itemsResult.rows[0].item_name).toBe('Test Item');
      expect(itemsResult.rows[0].quantity).toBe(2);
      
      // Verify stock deducted
      const stockResult = await testDB.query(
        'SELECT current_stock FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(stockResult.rows[0].current_stock).toBe(48); // 50 - 2
      
      // Verify loyalty points awarded
      const loyaltyResult = await testDB.query(
        'SELECT current_points_balance, total_points_earned FROM loyalty_accounts WHERE user_id = $1',
        [user.user_id]
      );
      expect(loyaltyResult.rows[0].current_points_balance).toBe(24);
      expect(loyaltyResult.rows[0].total_points_earned).toBe(24);
      
      // Verify points transaction created
      const transactionResult = await testDB.query(
        'SELECT * FROM points_transactions WHERE order_id = $1',
        [response.body.order_id]
      );
      expect(transactionResult.rows.length).toBe(1);
      expect(transactionResult.rows[0].transaction_type).toBe('earned');
      expect(transactionResult.rows[0].points_amount).toBe(24);
      
      // Verify order status history created
      const historyResult = await testDB.query(
        'SELECT * FROM order_status_history WHERE order_id = $1',
        [response.body.order_id]
      );
      expect(historyResult.rows.length).toBe(1);
      expect(historyResult.rows[0].status).toBe('received');
      
      // Verify invoice created
      const invoiceResult = await testDB.query(
        'SELECT * FROM invoices WHERE order_id = $1',
        [response.body.order_id]
      );
      expect(invoiceResult.rows.length).toBe(1);
      
      // Verify cart cleared
      const cartResponse = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);
      expect(cartResponse.body.items.length).toBe(0);
    });
    
    it('should handle first-order discount usage', async () => {
      const user = await createTestUser({ 
        first_order_discount_code: 'FIRST20-TEST123',
        first_order_discount_used: false
      });
      const token = generateToken(user.user_id);
      
      // Create the discount code
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, per_customer_usage_limit,
          valid_from, valid_until, status, created_at, updated_at
        ) VALUES (
          'dc_first_001', 'FIRST20-TEST123', 'percentage', 20.00, 1,
          '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'active', NOW(), NOW()
        )
      `);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_test_002', user.user_id]);
      
      // Add items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          discount_code: 'FIRST20-TEST123',
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_test_002',
          cvv: '123'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.discount_amount).toBe(4.00); // 20% of 20.00
      
      // Verify first_order_discount_used flag set
      const userResult = await testDB.query(
        'SELECT first_order_discount_used FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].first_order_discount_used).toBe(true);
      
      // Verify discount usage recorded
      const usageResult = await testDB.query(
        'SELECT * FROM discount_usage WHERE code_id = $1 AND user_id = $2',
        ['dc_first_001', user.user_id]
      );
      expect(usageResult.rows.length).toBe(1);
    });
    
    it('should enforce MOQ for delivery', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create delivery zone with MOQ of €15
      await testDB.query(`
        INSERT INTO delivery_zones (
          zone_id, zone_name, zone_type, zone_boundaries, delivery_fee,
          minimum_order_value, estimated_delivery_time, is_active, priority,
          created_at, updated_at
        ) VALUES (
          'zone_test_moq_01',
          'Test Zone',
          'polygon',
          '{"type": "Polygon", "coordinates": [[[53.35, -6.27], [53.33, -6.27], [53.33, -6.25], [53.35, -6.25], [53.35, -6.27]]]}'::jsonb,
          3.50,
          15.00,
          30,
          true,
          1,
          NOW(),
          NOW()
        )
      `);
      
      // Create address
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          latitude, longitude, created_at
        ) VALUES ($1, $2, 'Home', '123 St', 'Dublin', 'D02 X123', 53.34, -6.26, NOW())
      `, ['addr_test_moq_01', user.user_id]);
      
      // Add item worth only €10
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 1 });
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_test_moq_01', user.user_id]);
      
      const response = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'delivery',
          delivery_address_id: 'addr_test_moq_01',
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_test_moq_01',
          cvv: '123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MINIMUM_ORDER_NOT_MET');
      expect(response.body.message).toContain('€15');
    });
  });
});

// ============================================
// ORDER TESTS
// ============================================

describe('Orders', () => {
  describe('GET /api/orders', () => {
    it('should return user order history', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create test orders
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES
        ('ord_hist_001', 'ORD-001', $1, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'Test', 'test@test.com', '+353871234567', NOW(), NOW()),
        ('ord_hist_002', 'ORD-002', $1, 'delivery', 'preparing', 30.00, 6.90, 36.90, 'paid', 'Test', 'test@test.com', '+353871234567', NOW(), NOW())
      `, [user.user_id]);
      
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders.length).toBe(2);
      expect(response.body.total).toBe(2);
    });
    
    it('should filter orders by status', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES
        ('ord_filt_001', 'ORD-001', $1, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'Test', 'test@test.com', '+353871234567', NOW(), NOW()),
        ('ord_filt_002', 'ORD-002', $1, 'collection', 'preparing', 30.00, 6.90, 36.90, 'paid', 'Test', 'test@test.com', '+353871234567', NOW(), NOW())
      `, [user.user_id]);
      
      const response = await request(app)
        .get('/api/orders')
        .query({ status: 'completed' })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.orders.length).toBe(1);
      expect(response.body.orders[0].status).toBe('completed');
    });
    
    it('should not return other users orders', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateToken(user1.user_id);
      
      // Create order for user2
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ('ord_sec_001', 'ORD-999', $1, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'User2', 'user2@test.com', '+353879999999', NOW(), NOW())
      `, [user2.user_id]);
      
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      const hasOtherUserOrder = response.body.orders.some(o => o.order_id === 'ord_sec_001');
      expect(hasOtherUserOrder).toBe(false);
    });
  });
  
  describe('GET /api/orders/{order_id}', () => {
    it('should return order details with items and status history', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const orderId = 'ord_detail_001';
      
      // Create order
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-DETAIL-001', $2, 'collection', 'preparing', 20.00, 4.60, 24.60, 'paid', 'Test', 'test@test.com', '+353871234567', NOW(), NOW())
      `, [orderId, user.user_id]);
      
      // Create order items
      await testDB.query(`
        INSERT INTO order_items (
          order_item_id, order_id, item_id, item_name, quantity, unit_price, line_total
        ) VALUES ('oi_detail_001', $1, 'item_test_001', 'Test Item', 2, 10.00, 20.00)
      `, [orderId]);
      
      // Create status history
      await testDB.query(`
        INSERT INTO order_status_history (
          history_id, order_id, status, changed_by_user_id, changed_at
        ) VALUES
        ('osh_detail_001', $1, 'received', $2, NOW()),
        ('osh_detail_002', $1, 'preparing', 'staff_test_001', NOW())
      `, [orderId, user.user_id]);
      
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.order_id).toBe(orderId);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBe(1);
      expect(response.body.status_history).toBeDefined();
      expect(response.body.status_history.length).toBe(2);
    });
    
    it('should reject access to other users order', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateToken(user1.user_id);
      
      // Create order for user2
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ('ord_sec_002', 'ORD-SEC', $1, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'User2', 'user2@test.com', '+353879999999', NOW(), NOW())
      `, [user2.user_id]);
      
      const response = await request(app)
        .get('/api/orders/ord_sec_002')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });
  
  describe('POST /api/orders/{order_id}/cancel', () => {
    it('should cancel order if within cancellation window', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const orderId = 'ord_cancel_001';
      
      // Create recent order (within 5 minutes)
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, sumup_transaction_id,
          customer_name, customer_email, customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-CANCEL-001', $2, 'collection', 'received', 20.00, 4.60, 24.60, 'paid', 'sumup_tx_test_001', 'Test', 'test@test.com', '+353871234567', NOW(), NOW())
      `, [orderId, user.user_id]);
      
      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          cancellation_reason: 'Ordered by mistake'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
      expect(response.body.cancellation_reason).toBe('Ordered by mistake');
      
      // Verify refund initiated (in real system, would call SumUp API)
      const orderResult = await testDB.query(
        'SELECT payment_status, refund_amount FROM orders WHERE order_id = $1',
        [orderId]
      );
      expect(orderResult.rows[0].payment_status).toBe('refunded');
      expect(Number(orderResult.rows[0].refund_amount)).toBe(24.60);
    });
    
    it('should reject cancellation after time window', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const orderId = 'ord_cancel_002';
      
      // Create old order (more than 5 minutes ago)
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-CANCEL-002', $2, 'collection', 'preparing', 20.00, 4.60, 24.60, 'paid', 'Test', 'test@test.com', '+353871234567', $3, NOW())
      `, [orderId, user.user_id, new Date(Date.now() - 600000).toISOString()]); // 10 minutes ago
      
      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          cancellation_reason: 'Changed mind'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('CANCELLATION_NOT_ALLOWED');
      expect(response.body.message).toContain('too late');
    });
  });
});

// ============================================
// LOYALTY TESTS
// ============================================

describe('Loyalty', () => {
  describe('GET /api/loyalty', () => {
    it('should return loyalty account details', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Update loyalty account
      await testDB.query(`
        UPDATE loyalty_accounts 
        SET 
          current_points_balance = 350,
          total_points_earned = 800,
          total_points_redeemed = 400,
          referral_count = 5
        WHERE user_id = $1
      `, [user.user_id]);
      
      const response = await request(app)
        .get('/api/loyalty')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.current_points_balance).toBe(350);
      expect(response.body.total_points_earned).toBe(800);
      expect(response.body.total_points_redeemed).toBe(400);
      expect(response.body.referral_count).toBe(5);
    });
  });
  
  describe('GET /api/loyalty/points/history', () => {
    it('should return points transaction history', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const loyaltyAccountId = `la_${user.user_id}`;
      
      // Create transactions
      await testDB.query(`
        INSERT INTO points_transactions (
          transaction_id, loyalty_account_id, transaction_type, points_amount,
          reason, running_balance, created_at
        ) VALUES
        ('pt_test_001', $1, 'earned', 50, 'Order purchase', 50, NOW()),
        ('pt_test_002', $1, 'redeemed', -100, 'Reward redemption', -50, NOW()),
        ('pt_test_003', $1, 'manual_adjustment', 100, 'Goodwill credit', 50, NOW())
      `, [loyaltyAccountId]);
      
      const response = await request(app)
        .get('/api/loyalty/points/history')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.transactions).toBeDefined();
      expect(response.body.transactions.length).toBe(3);
      
      // Check sorting (newest first)
      expect(response.body.transactions[0].transaction_type).toBe('manual_adjustment');
    });
  });
  
  describe('GET /api/loyalty/rewards', () => {
    it('should return available rewards', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create rewards
      await testDB.query(`
        INSERT INTO rewards (
          reward_id, name, description, points_cost, reward_type, reward_value,
          status, sort_order, created_at, updated_at
        ) VALUES
        ('rew_test_001', 'Free Coffee', 'Free coffee reward', 100, 'discount', '{"type": "free_item"}'::jsonb, 'active', 0, NOW(), NOW()),
        ('rew_test_002', '€5 Off', 'Five euro discount', 200, 'discount', '{"type": "fixed_discount", "amount": 5.00}'::jsonb, 'active', 1, NOW(), NOW())
      `);
      
      const response = await request(app)
        .get('/api/loyalty/rewards')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.rewards).toBeDefined();
      expect(response.body.rewards.length).toBe(2);
    });
  });
  
  describe('POST /api/loyalty/rewards/{reward_id}/redeem', () => {
    it('should redeem reward and deduct points', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Set points balance
      await testDB.query(`
        UPDATE loyalty_accounts 
        SET current_points_balance = 250, total_points_earned = 250
        WHERE user_id = $1
      `, [user.user_id]);
      
      // Create reward
      await testDB.query(`
        INSERT INTO rewards (
          reward_id, name, description, points_cost, reward_type, reward_value,
          status, created_at, updated_at
        ) VALUES (
          'rew_redeem_001', 'Test Reward', 'Test', 100, 'discount',
          '{"type": "fixed_discount", "amount": 5.00}'::jsonb, 'active', NOW(), NOW()
        )
      `);
      
      const response = await request(app)
        .post('/api/loyalty/rewards/rew_redeem_001/redeem')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.reward_code).toBeDefined();
      expect(response.body.points_deducted).toBe(100);
      expect(response.body.usage_status).toBe('unused');
      
      // Verify points deducted
      const loyaltyResult = await testDB.query(
        'SELECT current_points_balance, total_points_redeemed FROM loyalty_accounts WHERE user_id = $1',
        [user.user_id]
      );
      expect(loyaltyResult.rows[0].current_points_balance).toBe(150); // 250 - 100
      expect(loyaltyResult.rows[0].total_points_redeemed).toBe(100);
      
      // Verify redeemed reward created
      const redeemedResult = await testDB.query(
        'SELECT * FROM redeemed_rewards WHERE reward_code = $1',
        [response.body.reward_code]
      );
      expect(redeemedResult.rows.length).toBe(1);
      
      // Verify points transaction created
      const transactionResult = await testDB.query(
        `SELECT * FROM points_transactions 
         WHERE loyalty_account_id = $1 AND transaction_type = 'redeemed'
         ORDER BY created_at DESC LIMIT 1`,
        [`la_${user.user_id}`]
      );
      expect(transactionResult.rows[0].points_amount).toBe(-100);
      expect(transactionResult.rows[0].running_balance).toBe(150);
    });
    
    it('should reject redemption with insufficient points', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Set low points balance
      await testDB.query(`
        UPDATE loyalty_accounts 
        SET current_points_balance = 50
        WHERE user_id = $1
      `, [user.user_id]);
      
      // Create reward costing 100 points
      await testDB.query(`
        INSERT INTO rewards (
          reward_id, name, description, points_cost, reward_type, reward_value,
          status, created_at, updated_at
        ) VALUES (
          'rew_redeem_002', 'Expensive Reward', 'Test', 100, 'discount',
          '{"type": "fixed_discount"}'::jsonb, 'active', NOW(), NOW()
        )
      `);
      
      const response = await request(app)
        .post('/api/loyalty/rewards/rew_redeem_002/redeem')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INSUFFICIENT_POINTS');
      expect(response.body.message).toContain('50 more points');
    });
  });
  
  describe('GET /api/loyalty/badges', () => {
    it('should return earned and locked badges', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const loyaltyAccountId = `la_${user.user_id}`;
      
      // Create badges
      await testDB.query(`
        INSERT INTO badges (
          badge_id, name, description, unlock_criteria, icon_url, is_active, created_at
        ) VALUES
        ('badge_test_001', 'First Order', 'Completed first order', '{"type": "order_count", "value": 1}'::jsonb, 'http://icon1.jpg', true, NOW()),
        ('badge_test_002', 'Loyal Customer', 'Completed 10 orders', '{"type": "order_count", "value": 10}'::jsonb, 'http://icon2.jpg', true, NOW())
      `);
      
      // Award first badge
      await testDB.query(`
        INSERT INTO user_badges (
          user_badge_id, loyalty_account_id, badge_id, earned_at
        ) VALUES ('ub_test_001', $1, 'badge_test_001', NOW())
      `, [loyaltyAccountId]);
      
      const response = await request(app)
        .get('/api/loyalty/badges')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.earned).toBeDefined();
      expect(response.body.locked).toBeDefined();
      expect(response.body.earned.length).toBe(1);
      expect(response.body.locked.length).toBe(1);
      expect(response.body.earned[0].badge_id).toBe('badge_test_001');
      expect(response.body.locked[0].badge_id).toBe('badge_test_002');
    });
  });
});

// ============================================
// CATERING TESTS
// ============================================

describe('Catering', () => {
  describe('POST /api/catering/inquiries', () => {
    it('should create catering inquiry', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .post('/api/catering/inquiries')
        .set('Authorization', `Bearer ${token}`)
        .send({
          contact_name: 'John Doe',
          contact_email: 'john@company.com',
          contact_phone: '+353871234567',
          company_name: 'Test Corp',
          event_type: 'corporate',
          event_date: '2024-03-15',
          event_start_time: '09:00',
          event_end_time: '17:00',
          event_location_address: '123 Business Park',
          event_location_city: 'Dublin',
          event_location_postal_code: 'D18 X123',
          event_location_type: 'office',
          guest_count: 50,
          dietary_requirements: ['vegetarian', 'vegan'],
          dietary_notes: 'Some guests are vegan',
          menu_preferences: 'Variety of options',
          preferred_package: 'premium',
          budget_range: '€1000-€1500',
          marketing_opt_in: true
        });
      
      expect(response.status).toBe(201);
      expect(response.body.inquiry_id).toBeDefined();
      expect(response.body.inquiry_number).toMatch(/^CAT-/);
      expect(response.body.status).toBe('new');
      expect(response.body.contact_name).toBe('John Doe');
      
      // Verify in database
      const inquiryResult = await testDB.query(
        'SELECT * FROM catering_inquiries WHERE inquiry_id = $1',
        [response.body.inquiry_id]
      );
      expect(inquiryResult.rows.length).toBe(1);
      expect(inquiryResult.rows[0].guest_count).toBe(50);
    });
    
    it('should allow guest catering inquiry', async () => {
      const response = await request(app)
        .post('/api/catering/inquiries')
        .send({
          contact_name: 'Guest User',
          contact_email: 'guest@company.com',
          contact_phone: '+353871234568',
          event_type: 'wedding',
          event_date: '2024-06-20',
          event_start_time: '14:00',
          event_end_time: '23:00',
          event_location_address: 'Wedding Venue',
          event_location_city: 'Dublin',
          event_location_postal_code: 'D02 X456',
          event_location_type: 'venue',
          guest_count: 100
        });
      
      expect(response.status).toBe(201);
      expect(response.body.user_id).toBeNull(); // Guest inquiry
    });
  });
  
  describe('GET /api/catering/inquiries/{inquiry_id}', () => {
    it('should return inquiry details with quotes', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const inquiryId = 'ci_test_001';
      
      // Create inquiry
      await testDB.query(`
        INSERT INTO catering_inquiries (
          inquiry_id, inquiry_number, user_id, contact_name, contact_email,
          contact_phone, event_type, event_date, event_start_time, event_end_time,
          event_location_address, event_location_city, event_location_postal_code,
          event_location_type, guest_count, status, submitted_at, updated_at
        ) VALUES (
          $1, 'CAT-TEST-001', $2, 'Test', 'test@test.com', '+353871234567',
          'corporate', '2024-03-15', '09:00', '17:00', '123 St', 'Dublin',
          'D18 X123', 'office', 50, 'quoted', NOW(), NOW()
        )
      `, [inquiryId, user.user_id]);
      
      // Create quote
      await testDB.query(`
        INSERT INTO catering_quotes (
          quote_id, inquiry_id, quote_number, line_items, subtotal, tax_amount,
          grand_total, valid_until, created_at
        ) VALUES (
          'cq_test_001', $1, 'QTE-TEST-001',
          '[{"item": "Coffee", "quantity": 50, "unit_price": 3.00, "total": 150.00}]'::jsonb,
          150.00, 34.50, 184.50, '2024-02-15T23:59:59Z', NOW()
        )
      `, [inquiryId]);
      
      const response = await request(app)
        .get(`/api/catering/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.inquiry_id).toBe(inquiryId);
      expect(response.body.quotes).toBeDefined();
      expect(response.body.quotes.length).toBe(1);
      expect(response.body.quotes[0].grand_total).toBe(184.50);
    });
  });
  
  describe('POST /api/catering/inquiries/{inquiry_id}/accept-quote', () => {
    it('should accept quote and update status', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const inquiryId = 'ci_accept_001';
      
      // Create inquiry
      await testDB.query(`
        INSERT INTO catering_inquiries (
          inquiry_id, inquiry_number, user_id, contact_name, contact_email,
          contact_phone, event_type, event_date, event_start_time, event_end_time,
          event_location_address, event_location_city, event_location_postal_code,
          event_location_type, guest_count, status, submitted_at, updated_at
        ) VALUES (
          $1, 'CAT-ACCEPT-001', $2, 'Test', 'test@test.com', '+353871234567',
          'corporate', '2024-03-15', '09:00', '17:00', '123 St', 'Dublin',
          'D18 X123', 'office', 50, 'quoted', NOW(), NOW()
        )
      `, [inquiryId, user.user_id]);
      
      // Create quote
      await testDB.query(`
        INSERT INTO catering_quotes (
          quote_id, inquiry_id, quote_number, line_items, subtotal, tax_amount,
          grand_total, valid_until, created_at, sent_at
        ) VALUES (
          'cq_accept_001', $1, 'QTE-ACCEPT-001',
          '[{"item": "Catering Package", "quantity": 1, "unit_price": 500.00, "total": 500.00}]'::jsonb,
          500.00, 115.00, 615.00, '2024-02-28T23:59:59Z', NOW(), NOW()
        )
      `, [inquiryId]);
      
      const response = await request(app)
        .post(`/api/catering/inquiries/${inquiryId}/accept-quote`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('confirmed');
      
      // Verify quote marked as accepted
      const quoteResult = await testDB.query(
        'SELECT accepted_at FROM catering_quotes WHERE quote_id = $1',
        ['cq_accept_001']
      );
      expect(quoteResult.rows[0].accepted_at).not.toBeNull();
    });
    
    it('should reject acceptance for non-owned inquiry', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateToken(user1.user_id);
      
      // Create inquiry for user2
      await testDB.query(`
        INSERT INTO catering_inquiries (
          inquiry_id, inquiry_number, user_id, contact_name, contact_email,
          contact_phone, event_type, event_date, event_start_time, event_end_time,
          event_location_address, event_location_city, event_location_postal_code,
          event_location_type, guest_count, status, submitted_at, updated_at
        ) VALUES (
          'ci_sec_001', 'CAT-SEC-001', $1, 'User2', 'user2@test.com', '+353879999999',
          'wedding', '2024-06-15', '14:00', '23:00', '456 St', 'Dublin',
          'D02 Y456', 'venue', 100, 'quoted', NOW(), NOW()
        )
      `, [user2.user_id]);
      
      const response = await request(app)
        .post('/api/catering/inquiries/ci_sec_001/accept-quote')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });
});

// ============================================
// STAFF TESTS
// ============================================

describe('Staff', () => {
  describe('GET /api/staff/orders', () => {
    it('should return order queue for staff', async () => {
      const staffToken = generateToken('staff_test_001', 'staff');
      
      // Create test orders
      const user = await createTestUser();
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES
        ('ord_staff_001', 'ORD-STAFF-001', $1, 'collection', 'received', 20.00, 4.60, 24.60, 'paid', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW()),
        ('ord_staff_002', 'ORD-STAFF-002', $1, 'delivery', 'preparing', 30.00, 6.90, 36.90, 'paid', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW())
      `, [user.user_id]);
      
      const response = await request(app)
        .get('/api/staff/orders')
        .set('Authorization', `Bearer ${staffToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should filter orders by status', async () => {
      const staffToken = generateToken('staff_test_001', 'staff');
      
      const response = await request(app)
        .get('/api/staff/orders')
        .query({ status: 'received' })
        .set('Authorization', `Bearer ${staffToken}`);
      
      expect(response.status).toBe(200);
      response.body.orders.forEach(order => {
        expect(order.status).toBe('received');
      });
    });
    
    it('should reject access for customer role', async () => {
      const user = await createTestUser();
      const customerToken = generateToken(user.user_id, 'customer');
      
      const response = await request(app)
        .get('/api/staff/orders')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });
  
  describe('PUT /api/staff/orders/{order_id}/status', () => {
    it('should update order status and create history', async () => {
      const staffToken = generateToken('staff_test_001', 'staff');
      
      const orderId = 'ord_status_001';
      const user = await createTestUser();
      
      // Create order
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-STATUS-001', $2, 'collection', 'received', 20.00, 4.60, 24.60, 'paid', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW())
      `, [orderId, user.user_id]);
      
      const response = await request(app)
        .put(`/api/staff/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'preparing',
          notes: 'Started preparation'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('preparing');
      
      // Verify status updated
      const orderResult = await testDB.query(
        'SELECT status FROM orders WHERE order_id = $1',
        [orderId]
      );
      expect(orderResult.rows[0].status).toBe('preparing');
      
      // Verify status history created
      const historyResult = await testDB.query(
        'SELECT * FROM order_status_history WHERE order_id = $1 AND status = $2',
        [orderId, 'preparing']
      );
      expect(historyResult.rows.length).toBe(1);
      expect(historyResult.rows[0].changed_by_user_id).toBe('staff_test_001');
      expect(historyResult.rows[0].notes).toBe('Started preparation');
    });
    
    it('should reject invalid status transition', async () => {
      const staffToken = generateToken('staff_test_001', 'staff');
      
      const orderId = 'ord_status_002';
      const user = await createTestUser();
      
      // Create order already completed
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-STATUS-002', $2, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW())
      `, [orderId, user.user_id]);
      
      const response = await request(app)
        .put(`/api/staff/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'preparing' // Cannot go back from completed
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_STATUS_TRANSITION');
    });
  });
  
  describe('PUT /api/staff/stock/{item_id}', () => {
    it('should update stock with permission', async () => {
      const staffToken = generateToken('staff_test_001', 'staff');
      
      const response = await request(app)
        .put('/api/staff/stock/item_test_001')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          change_type: 'restock',
          quantity: 20,
          reason: 'Daily restock',
          notes: 'Fresh delivery'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.previous_stock).toBe(50);
      expect(response.body.new_stock).toBe(70);
      
      // Verify stock updated
      const stockResult = await testDB.query(
        'SELECT current_stock FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(stockResult.rows[0].current_stock).toBe(70);
      
      // Verify stock history created
      const historyResult = await testDB.query(
        'SELECT * FROM stock_history WHERE item_id = $1 ORDER BY changed_at DESC LIMIT 1',
        ['item_test_001']
      );
      expect(historyResult.rows[0].change_type).toBe('restock');
      expect(historyResult.rows[0].quantity_changed).toBe(20);
      expect(historyResult.rows[0].changed_by_user_id).toBe('staff_test_001');
    });
  });
});

// ============================================
// ADMIN TESTS
// ============================================

describe('Admin', () => {
  describe('POST /api/admin/menu/items', () => {
    it('should create menu item', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const response = await request(app)
        .post('/api/admin/menu/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Item',
          description: 'New test item',
          category_id: 'cat_test_001',
          price: 15.50,
          is_active: true,
          stock_tracked: true,
          current_stock: 100,
          low_stock_threshold: 20,
          dietary_tags: ['vegan', 'gluten_free'],
          is_featured: true
        });
      
      expect(response.status).toBe(201);
      expect(response.body.item_id).toBeDefined();
      expect(response.body.name).toBe('New Item');
      expect(response.body.price).toBe(15.50);
      
      // Verify in database
      const itemResult = await testDB.query(
        'SELECT * FROM menu_items WHERE item_id = $1',
        [response.body.item_id]
      );
      expect(itemResult.rows.length).toBe(1);
      expect(itemResult.rows[0].current_stock).toBe(100);
    });
    
    it('should reject creation by non-admin', async () => {
      const user = await createTestUser();
      const customerToken = generateToken(user.user_id, 'customer');
      
      const response = await request(app)
        .post('/api/admin/menu/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Hacked Item',
          category_id: 'cat_test_001',
          price: 10.00
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });
  
  describe('PUT /api/admin/menu/items/{item_id}', () => {
    it('should update menu item', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const response = await request(app)
        .put('/api/admin/menu/items/item_test_001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Item Name',
          price: 12.50,
          is_featured: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Item Name');
      expect(response.body.price).toBe(12.50);
      expect(response.body.is_featured).toBe(true);
      
      // Verify in database
      const itemResult = await testDB.query(
        'SELECT name, price, is_featured FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(itemResult.rows[0].name).toBe('Updated Item Name');
      expect(Number(itemResult.rows[0].price)).toBe(12.50);
    });
  });
  
  describe('DELETE /api/admin/menu/items/{item_id}', () => {
    it('should soft delete menu item', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const response = await request(app)
        .delete('/api/admin/menu/items/item_test_001')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
      
      // Verify soft deleted (marked inactive)
      const itemResult = await testDB.query(
        'SELECT is_active FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(itemResult.rows[0].is_active).toBe(false);
    });
  });
  
  describe('POST /api/admin/discounts', () => {
    it('should create discount code', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const response = await request(app)
        .post('/api/admin/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'ADMINTEST',
          discount_type: 'percentage',
          discount_value: 15.00,
          minimum_order_value: 20.00,
          total_usage_limit: 100,
          per_customer_usage_limit: 1,
          valid_from: '2024-01-01T00:00:00Z',
          valid_until: '2024-12-31T23:59:59Z',
          status: 'active'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.code_id).toBeDefined();
      expect(response.body.code).toBe('ADMINTEST');
      expect(response.body.discount_value).toBe(15.00);
    });
    
    it('should reject duplicate discount code', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      // Create existing code
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, valid_from,
          status, created_at, updated_at
        ) VALUES ('dc_dup_001', 'DUPLICATE', 'percentage', 10.00, NOW(), 'active', NOW(), NOW())
      `);
      
      const response = await request(app)
        .post('/api/admin/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'DUPLICATE',
          discount_type: 'percentage',
          discount_value: 20.00,
          valid_from: '2024-01-01T00:00:00Z'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('DUPLICATE_CODE');
    });
  });
  
  describe('POST /api/admin/orders/{order_id}/refund', () => {
    it('should process refund and update order', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const orderId = 'ord_refund_001';
      const user = await createTestUser();
      
      // Create completed order
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, sumup_transaction_id,
          customer_name, customer_email, customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-REFUND-001', $2, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'sumup_tx_refund_001', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW())
      `, [orderId, user.user_id]);
      
      const response = await request(app)
        .post(`/api/admin/orders/${orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          refund_amount: 24.60,
          refund_reason: 'Customer complaint'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.payment_status).toBe('refunded');
      expect(response.body.refund_amount).toBe(24.60);
      
      // Verify in database
      const orderResult = await testDB.query(
        'SELECT payment_status, refund_amount, refund_reason, refunded_at FROM orders WHERE order_id = $1',
        [orderId]
      );
      expect(orderResult.rows[0].payment_status).toBe('refunded');
      expect(Number(orderResult.rows[0].refund_amount)).toBe(24.60);
      expect(orderResult.rows[0].refunded_at).not.toBeNull();
    });
    
    it('should handle partial refund', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const orderId = 'ord_refund_002';
      const user = await createTestUser();
      
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, sumup_transaction_id,
          customer_name, customer_email, customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-REFUND-002', $2, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'sumup_tx_refund_002', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW())
      `, [orderId, user.user_id]);
      
      const response = await request(app)
        .post(`/api/admin/orders/${orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          refund_amount: 10.00, // Partial refund
          refund_reason: 'One item missing'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.refund_amount).toBe(10.00);
      expect(response.body.payment_status).toBe('refunded'); // Still marked as refunded even if partial
    });
  });
  
  describe('POST /api/admin/customers/{customer_id}/adjust-points', () => {
    it('should manually adjust customer points', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      const customer = await createTestUser();
      
      // Set initial balance
      await testDB.query(`
        UPDATE loyalty_accounts 
        SET current_points_balance = 100, total_points_earned = 100
        WHERE user_id = $1
      `, [customer.user_id]);
      
      const response = await request(app)
        .post(`/api/admin/customers/${customer.user_id}/adjust-points`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          points_amount: 50,
          reason: 'Goodwill gesture'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.current_points_balance).toBe(150);
      
      // Verify points updated
      const loyaltyResult = await testDB.query(
        'SELECT current_points_balance FROM loyalty_accounts WHERE user_id = $1',
        [customer.user_id]
      );
      expect(loyaltyResult.rows[0].current_points_balance).toBe(150);
      
      // Verify transaction created with admin reference
      const transactionResult = await testDB.query(
        `SELECT * FROM points_transactions 
         WHERE loyalty_account_id = $1 AND transaction_type = 'manual_adjustment'
         ORDER BY created_at DESC LIMIT 1`,
        [`la_${customer.user_id}`]
      );
      expect(transactionResult.rows[0].points_amount).toBe(50);
      expect(transactionResult.rows[0].adjusted_by_user_id).toBe('admin_test_001');
      expect(transactionResult.rows[0].reason).toBe('Goodwill gesture');
    });
    
    it('should allow negative adjustment', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      const customer = await createTestUser();
      
      await testDB.query(`
        UPDATE loyalty_accounts 
        SET current_points_balance = 100
        WHERE user_id = $1
      `, [customer.user_id]);
      
      const response = await request(app)
        .post(`/api/admin/customers/${customer.user_id}/adjust-points`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          points_amount: -30,
          reason: 'Correction for error'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.current_points_balance).toBe(70);
    });
  });
  
  describe('POST /api/admin/staff', () => {
    it('should create staff account with permissions', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const response = await request(app)
        .post('/api/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newstaff@test.com',
          phone: '+353879876543',
          password: 'staff123',
          first_name: 'New',
          last_name: 'Staff',
          role: 'staff',
          staff_permissions: {
            manage_orders: true,
            view_stock: true,
            update_stock: false
          }
        });
      
      expect(response.status).toBe(201);
      expect(response.body.user_id).toBeDefined();
      expect(response.body.role).toBe('staff');
      expect(response.body.staff_permissions).toEqual({
        manage_orders: true,
        view_stock: true,
        update_stock: false
      });
      
      // Verify in database
      const staffResult = await testDB.query(
        'SELECT * FROM users WHERE email = $1',
        ['newstaff@test.com']
      );
      expect(staffResult.rows.length).toBe(1);
      expect(staffResult.rows[0].role).toBe('staff');
    });
    
    it('should reject staff creation by non-admin', async () => {
      const staffToken = generateToken('staff_test_001', 'staff');
      
      const response = await request(app)
        .post('/api/admin/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'hacker@test.com',
          password: 'hack123',
          first_name: 'Hacker',
          last_name: 'User',
          role: 'staff'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
    });
  });
  
  describe('POST /api/admin/catering/inquiries/{inquiry_id}/quotes', () => {
    it('should create catering quote', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const inquiryId = 'ci_quote_001';
      const user = await createTestUser();
      
      // Create inquiry
      await testDB.query(`
        INSERT INTO catering_inquiries (
          inquiry_id, inquiry_number, user_id, contact_name, contact_email,
          contact_phone, event_type, event_date, event_start_time, event_end_time,
          event_location_address, event_location_city, event_location_postal_code,
          event_location_type, guest_count, status, submitted_at, updated_at
        ) VALUES (
          $1, 'CAT-QUOTE-001', $2, 'Customer', 'customer@test.com', '+353871234567',
          'corporate', '2024-03-15', '09:00', '17:00', '123 St', 'Dublin',
          'D18 X123', 'office', 50, 'in_progress', NOW(), NOW()
        )
      `, [inquiryId, user.user_id]);
      
      const response = await request(app)
        .post(`/api/admin/catering/inquiries/${inquiryId}/quotes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          line_items: [
            { item: 'Coffee Package', quantity: 50, unit_price: 3.00, total: 150.00 },
            { item: 'Lunch Package', quantity: 50, unit_price: 10.00, total: 500.00 }
          ],
          subtotal: 650.00,
          additional_fees: [
            { name: 'Service Fee', amount: 65.00 },
            { name: 'Delivery', amount: 25.00 }
          ],
          tax_amount: 149.50,
          grand_total: 889.50,
          valid_until: '2024-02-15T23:59:59Z',
          terms: 'Payment terms: 50% deposit required'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.quote_id).toBeDefined();
      expect(response.body.quote_number).toMatch(/^QTE-/);
      expect(response.body.grand_total).toBe(889.50);
      
      // Verify inquiry status updated
      const inquiryResult = await testDB.query(
        'SELECT status FROM catering_inquiries WHERE inquiry_id = $1',
        [inquiryId]
      );
      expect(inquiryResult.rows[0].status).toBe('quoted');
    });
  });
});

// ============================================
// WEBSOCKET TESTS
// ============================================

describe('WebSocket Events', () => {
  let adminSocket;
  let staffSocket;
  let customerSocket;
  
  beforeEach(async () => {
    const adminToken = generateToken('admin_test_001', 'admin');
    const staffToken = generateToken('staff_test_001', 'staff');
    
    // Connect admin socket
    adminSocket = ioClient('http://localhost:3000', {
      auth: { token: adminToken }
    });
    
    // Connect staff socket
    staffSocket = ioClient('http://localhost:3000', {
      auth: { token: staffToken }
    });
    
    await new Promise(resolve => {
      adminSocket.on('connect', resolve);
    });
    
    await new Promise(resolve => {
      staffSocket.on('connect', resolve);
    });
  });
  
  afterEach(() => {
    if (adminSocket) adminSocket.close();
    if (staffSocket) staffSocket.close();
    if (customerSocket) customerSocket.close();
  });
  
  describe('new_order event', () => {
    it('should broadcast new order to all staff', async (done) => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_ws_001', user.user_id]);
      
      // Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 1 });
      
      // Listen for new order event
      staffSocket.on('new_order', (data) => {
        expect(data.event).toBe('order.new');
        expect(data.data.order_number).toBeDefined();
        expect(data.data.order_type).toBe('collection');
        expect(data.data.customer_name).toBe('Test User');
        done();
      });
      
      // Place order
      await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_ws_001',
          cvv: '123'
        });
    });
  });
  
  describe('order_status_updated event', () => {
    it('should broadcast status update to staff and customer', async (done) => {
      const user = await createTestUser();
      const customerToken = generateToken(user.user_id);
      const staffToken = generateToken('staff_test_001', 'staff');
      
      // Connect customer socket
      customerSocket = ioClient('http://localhost:3000', {
        auth: { token: customerToken }
      });
      
      await new Promise(resolve => {
        customerSocket.on('connect', resolve);
      });
      
      const orderId = 'ord_ws_status_001';
      
      // Create order
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-WS-001', $2, 'collection', 'received', 20.00, 4.60, 24.60, 'paid', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW())
      `, [orderId, user.user_id]);
      
      let staffReceived = false;
      let customerReceived = false;
      
      staffSocket.on('order_status_updated', (data) => {
        expect(data.event).toBe('order.status_changed');
        expect(data.data.order_id).toBe(orderId);
        expect(data.data.new_status).toBe('preparing');
        staffReceived = true;
        
        if (staffReceived && customerReceived) done();
      });
      
      customerSocket.on('order_status_updated', (data) => {
        expect(data.event).toBe('order.status_changed');
        expect(data.data.order_id).toBe(orderId);
        expect(data.data.new_status).toBe('preparing');
        expect(data.data.status_message).toBeDefined();
        customerReceived = true;
        
        if (staffReceived && customerReceived) done();
      });
      
      // Update order status
      await request(app)
        .put(`/api/staff/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'preparing' });
    });
  });
  
  describe('low_stock_alert event', () => {
    it('should broadcast low stock alert to admin and staff', async (done) => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      adminSocket.on('low_stock_alert', (data) => {
        expect(data.event).toBe('stock.low');
        expect(data.data.item_id).toBe('item_test_001');
        expect(data.data.current_stock).toBe(8);
        expect(data.data.alert_type).toBe('low_stock');
        done();
      });
      
      // Update stock to below threshold (10)
      await request(app)
        .put('/api/admin/stock/item_test_001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          change_type: 'adjustment',
          quantity: -42, // 50 - 42 = 8 (below threshold of 10)
          reason: 'Test low stock'
        });
    });
  });
});

// ============================================
// BUSINESS LOGIC TESTS
// ============================================

describe('Business Logic', () => {
  describe('Loyalty Points Calculation', () => {
    it('should calculate points based on order total', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_loyalty_001', user.user_id]);
      
      // Add items worth €37.50
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 3 }); // 3 * 10 = 30
      
      // Update item price temporarily
      await testDB.query(`
        UPDATE menu_items SET price = 12.50 WHERE item_id = 'item_test_001'
      `);
      
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 3 }); // 3 * 12.50 = 37.50
      
      const orderResponse = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_loyalty_001',
          cvv: '123'
        });
      
      // With tax: 37.50 * 1.23 = 46.125, rounded to 46.13
      // Points should be floor(46.13 * 1) = 46
      expect(orderResponse.body.loyalty_points_awarded).toBe(46);
      
      // Verify points added to account
      const loyaltyResult = await testDB.query(
        'SELECT current_points_balance FROM loyalty_accounts WHERE user_id = $1',
        [user.user_id]
      );
      expect(loyaltyResult.rows[0].current_points_balance).toBe(46);
    });
    
    it('should apply points after discount if configured', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Update system setting to apply points after discount
      await testDB.query(`
        UPDATE system_settings 
        SET setting_value = '"after_discount"'
        WHERE setting_key = 'loyalty_points_calculation_basis'
      `);
      
      // Create discount
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, valid_from,
          status, created_at, updated_at
        ) VALUES (
          'dc_points_001', 'SAVE10', 'percentage', 10.00, NOW(), 'active', NOW(), NOW()
        )
      `);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_discount_001', user.user_id]);
      
      // Add items worth €20
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const orderResponse = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          discount_code: 'SAVE10',
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_discount_001',
          cvv: '123'
        });
      
      // Subtotal: 20.00
      // Discount: 2.00 (10%)
      // After discount: 18.00
      // Tax: 18.00 * 0.23 = 4.14
      // Total: 22.14
      // Points: floor(18.00 * 1) = 18 (based on amount after discount)
      
      expect(orderResponse.body.loyalty_points_awarded).toBe(18);
    });
  });
  
  describe('Discount Code Validation', () => {
    it('should enforce per-customer usage limit', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create discount with limit of 1 per customer
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, per_customer_usage_limit,
          valid_from, status, created_at, updated_at
        ) VALUES (
          'dc_limit_001', 'ONETIME', 'percentage', 15.00, 1,
          NOW(), 'active', NOW(), NOW()
        )
      `);
      
      // Record previous usage
      await testDB.query(`
        INSERT INTO discount_usage (
          usage_id, code_id, user_id, order_id, discount_amount_applied, used_at
        ) VALUES (
          'du_test_001', 'dc_limit_001', $1, 'ord_old_001', 3.00, NOW()
        )
      `, [user.user_id]);
      
      const response = await request(app)
        .post('/api/discounts/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'ONETIME',
          order_type: 'collection',
          order_value: 20.00
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('USAGE_LIMIT_EXCEEDED');
      expect(response.body.message).toContain('already used');
    });
    
    it('should enforce total usage limit', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create discount with total limit of 2
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, total_usage_limit,
          total_used_count, valid_from, status, created_at, updated_at
        ) VALUES (
          'dc_limit_002', 'LIMITED', 'percentage', 10.00, 2, 2,
          NOW(), 'active', NOW(), NOW()
        )
      `);
      
      const response = await request(app)
        .post('/api/discounts/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'LIMITED',
          order_type: 'collection',
          order_value: 20.00
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('USAGE_LIMIT_EXCEEDED');
    });
    
    it('should check discount validity period', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create expired discount
      await testDB.query(`
        INSERT INTO discount_codes (
          code_id, code, discount_type, discount_value, valid_from, valid_until,
          status, created_at, updated_at
        ) VALUES (
          'dc_expired_001', 'EXPIRED', 'percentage', 20.00,
          '2023-01-01T00:00:00Z', '2023-12-31T23:59:59Z',
          'active', NOW(), NOW()
        )
      `);
      
      const response = await request(app)
        .post('/api/discounts/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'EXPIRED',
          order_type: 'collection',
          order_value: 20.00
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('CODE_EXPIRED');
    });
  });
  
  describe('Stock Deduction on Order', () => {
    it('should deduct stock atomically during order creation', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Set initial stock
      await testDB.query(`
        UPDATE menu_items 
        SET current_stock = 10 
        WHERE item_id = 'item_test_001'
      `);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_stock_001', user.user_id]);
      
      // Add 5 items to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 5 });
      
      const orderResponse = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_stock_001',
          cvv: '123'
        });
      
      expect(orderResponse.status).toBe(201);
      
      // Verify stock deducted
      const stockResult = await testDB.query(
        'SELECT current_stock FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(stockResult.rows[0].current_stock).toBe(5); // 10 - 5
      
      // Verify stock history created
      const historyResult = await testDB.query(
        `SELECT * FROM stock_history 
         WHERE item_id = $1 AND related_order_id = $2`,
        ['item_test_001', orderResponse.body.order_id]
      );
      expect(historyResult.rows.length).toBe(1);
      expect(historyResult.rows[0].change_type).toBe('sale');
      expect(historyResult.rows[0].quantity_changed).toBe(-5);
    });
    
    it('should rollback stock deduction if payment fails', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Set initial stock
      await testDB.query(`
        UPDATE menu_items 
        SET current_stock = 10 
        WHERE item_id = 'item_test_001'
      `);
      
      // Create payment method with token that will fail
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'invalid_token_fail', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_fail_001', user.user_id]);
      
      // Add items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 3 });
      
      const orderResponse = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_fail_001',
          cvv: '123'
        });
      
      expect(orderResponse.status).toBe(400);
      expect(orderResponse.body.error).toBe('PAYMENT_FAILED');
      
      // Verify stock NOT deducted (transaction rolled back)
      const stockResult = await testDB.query(
        'SELECT current_stock FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(stockResult.rows[0].current_stock).toBe(10); // Unchanged
      
      // Verify no order created
      const orderResult = await testDB.query(
        'SELECT * FROM orders WHERE user_id = $1',
        [user.user_id]
      );
      expect(orderResult.rows.length).toBe(0);
    });
  });
  
  describe('Delivery Fee Calculation', () => {
    it('should calculate fee based on delivery zone', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create delivery zones with different fees
      await testDB.query(`
        INSERT INTO delivery_zones (
          zone_id, zone_name, zone_type, zone_boundaries, delivery_fee,
          minimum_order_value, estimated_delivery_time, is_active, priority,
          created_at, updated_at
        ) VALUES
        (
          'zone_fee_001',
          'City Center',
          'polygon',
          '{"type": "Polygon", "coordinates": [[[53.35, -6.27], [53.33, -6.27], [53.33, -6.25], [53.35, -6.25], [53.35, -6.27]]]}'::jsonb,
          2.50,
          10.00,
          30,
          true,
          1,
          NOW(),
          NOW()
        ),
        (
          'zone_fee_002',
          'Suburbs',
          'polygon',
          '{"type": "Polygon", "coordinates": [[[53.32, -6.28], [53.30, -6.28], [53.30, -6.26], [53.32, -6.26], [53.32, -6.28]]]}'::jsonb,
          4.50,
          15.00,
          45,
          true,
          2,
          NOW(),
          NOW()
        )
      `);
      
      // Create address in city center zone
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          latitude, longitude, created_at
        ) VALUES ($1, $2, 'City', '123 City St', 'Dublin', 'D02 X123', 53.34, -6.26, NOW())
      `, ['addr_city_001', user.user_id]);
      
      // Add items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 });
      
      const response = await request(app)
        .post('/api/checkout/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'delivery',
          delivery_address_id: 'addr_city_001'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.delivery_fee).toBe(2.50); // City center fee
      expect(response.body.breakdown.delivery_zone).toBe('City Center');
    });
    
    it('should apply free delivery threshold', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Set free delivery threshold
      await testDB.query(`
        INSERT INTO system_settings (setting_id, setting_key, setting_value, setting_type, updated_at)
        VALUES ('set_free_del', 'free_delivery_threshold', '30.00', 'number', NOW())
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = '30.00'
      `);
      
      // Create zone
      await testDB.query(`
        INSERT INTO delivery_zones (
          zone_id, zone_name, zone_type, zone_boundaries, delivery_fee,
          minimum_order_value, estimated_delivery_time, is_active, priority,
          created_at, updated_at
        ) VALUES (
          'zone_free_001',
          'Test Zone',
          'polygon',
          '{"type": "Polygon", "coordinates": [[[53.35, -6.27], [53.33, -6.27], [53.33, -6.25], [53.35, -6.25], [53.35, -6.27]]]}'::jsonb,
          3.50,
          10.00,
          30,
          true,
          1,
          NOW(),
          NOW()
        )
      `);
      
      // Create address
      await testDB.query(`
        INSERT INTO addresses (
          address_id, user_id, label, address_line1, city, postal_code,
          latitude, longitude, created_at
        ) VALUES ($1, $2, 'Home', '123 St', 'Dublin', 'D02 X123', 53.34, -6.26, NOW())
      `, ['addr_free_001', user.user_id]);
      
      // Add items worth €35 (above threshold)
      await testDB.query(`
        UPDATE menu_items SET price = 17.50 WHERE item_id = 'item_test_001'
      `);
      
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 2 }); // 2 * 17.50 = 35.00
      
      const response = await request(app)
        .post('/api/checkout/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'delivery',
          delivery_address_id: 'addr_free_001'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.delivery_fee).toBe(0); // Free delivery applied
      expect(response.body.subtotal).toBe(35.00);
    });
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  describe('Concurrent Order Placement', () => {
    it('should handle race condition on stock deduction', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Set stock to 5
      await testDB.query(`
        UPDATE menu_items 
        SET current_stock = 5 
        WHERE item_id = 'item_test_001'
      `);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_race_001', user.user_id]);
      
      // Two users try to order 3 items each (total 6, but only 5 in stock)
      const user2 = await createTestUser();
      const token2 = generateToken(user2.user_id);
      
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '5678', '12', '2027', 'Test User 2', true, NOW())
      `, ['pm_race_002', user2.user_id]);
      
      // Add to carts
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 3 });
      
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token2}`)
        .send({ item_id: 'item_test_001', quantity: 3 });
      
      // Both try to place order simultaneously
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/checkout/order')
          .set('Authorization', `Bearer ${token}`)
          .send({
            order_type: 'collection',
            collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
            customer_name: 'User 1',
            customer_email: user.email,
            customer_phone: user.phone,
            payment_method_id: 'pm_race_001',
            cvv: '123'
          }),
        request(app)
          .post('/api/checkout/order')
          .set('Authorization', `Bearer ${token2}`)
          .send({
            order_type: 'collection',
            collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
            customer_name: 'User 2',
            customer_email: user2.email,
            customer_phone: user2.phone,
            payment_method_id: 'pm_race_002',
            cvv: '123'
          })
      ]);
      
      // One should succeed, one should fail
      const succeeded = [response1, response2].filter(r => r.status === 201);
      const failed = [response1, response2].filter(r => r.status === 400);
      
      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);
      expect(failed[0].body.error).toBe('INSUFFICIENT_STOCK');
      
      // Verify stock is correct (5 - 3 = 2)
      const stockResult = await testDB.query(
        'SELECT current_stock FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(stockResult.rows[0].current_stock).toBe(2);
    });
  });
  
  describe('Badge Unlocking', () => {
    it('should unlock "First Order" badge after first order', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create "First Order" badge
      await testDB.query(`
        INSERT INTO badges (
          badge_id, name, description, unlock_criteria, icon_url, is_active, created_at
        ) VALUES (
          'badge_first_order', 'First Order', 'Completed first order',
          '{"type": "order_count", "value": 1}'::jsonb, 'http://icon.jpg', true, NOW()
        )
      `);
      
      // Create payment method
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_badge_001', user.user_id]);
      
      // Add items and place order
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 1 });
      
      await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_badge_001',
          cvv: '123'
        });
      
      // Check if badge unlocked
      const badgeResult = await testDB.query(
        `SELECT * FROM user_badges 
         WHERE loyalty_account_id = $1 AND badge_id = $2`,
        [`la_${user.user_id}`, 'badge_first_order']
      );
      
      expect(badgeResult.rows.length).toBe(1);
      expect(badgeResult.rows[0].earned_at).not.toBeNull();
    });
  });
  
  describe('GDPR Compliance', () => {
    it('should anonymize user data on account deletion', async () => {
      const user = await createTestUser({ 
        email: 'gdpr@test.com',
        password_hash: 'password123'
      });
      const token = generateToken(user.user_id);
      
      // Create order for user
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at
        ) VALUES ($1, 'ORD-GDPR-001', $2, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'GDPR User', 'gdpr@test.com', '+353871234567', NOW(), NOW())
      `, ['ord_gdpr_001', user.user_id]);
      
      // Delete account
      const response = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'password123' });
      
      expect(response.status).toBe(200);
      
      // Verify user anonymized
      const userResult = await testDB.query(
        'SELECT email, first_name, last_name, password_hash, status FROM users WHERE user_id = $1',
        [user.user_id]
      );
      expect(userResult.rows[0].email).toContain('deleted_');
      expect(userResult.rows[0].first_name).toBe('[Deleted]');
      expect(userResult.rows[0].last_name).toBe('User');
      expect(userResult.rows[0].password_hash).toBe('deleted');
      expect(userResult.rows[0].status).toBe('deleted');
      
      // Verify order preserved but anonymized
      const orderResult = await testDB.query(
        'SELECT customer_email FROM orders WHERE order_id = $1',
        ['ord_gdpr_001']
      );
      expect(orderResult.rows[0].customer_email).toBe('deleted@deleted.local');
    });
  });
  
  describe('Time Slot Validation', () => {
    it('should reject past time slot', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 1 });
      
      const response = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'collection_time_slot',
          error: 'INVALID_TIME_SLOT'
        })
      );
    });
    
    it('should reject time slot too soon (prep time)', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 1 });
      
      // Time slot in 5 minutes (but prep time is 15 minutes)
      const response = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 300000).toISOString()
        });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          error: 'TIME_SLOT_TOO_SOON'
        })
      );
    });
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('Input Validation', () => {
  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          phone: '+353871234567',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid email');
    });
  });
  
  describe('Phone Validation', () => {
    it('should reject invalid phone format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          phone: '1234', // Too short
          password: 'password123',
          first_name: 'Test',
          last_name: 'User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid phone');
    });
  });
  
  describe('Price Validation', () => {
    it('should reject negative price', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      const response = await request(app)
        .post('/api/admin/menu/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Item',
          category_id: 'cat_test_001',
          price: -5.00 // Negative price
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Price must be positive');
    });
  });
  
  describe('Quantity Validation', () => {
    it('should reject zero quantity', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item_id: 'item_test_001',
          quantity: 0 // Invalid
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Quantity must be at least 1');
    });
  });
});

// ============================================
// DATABASE TRANSACTION TESTS
// ============================================

describe('Database Transactions', () => {
  describe('Order Creation Transaction', () => {
    it('should rollback entire order if any step fails', async () => {
      const user = await createTestUser();
      const token = generateToken(user.user_id);
      
      // Create payment method that will fail
      await testDB.query(`
        INSERT INTO payment_methods (
          payment_method_id, user_id, sumup_token, card_type, last_four_digits,
          expiry_month, expiry_year, cardholder_name, is_default, created_at
        ) VALUES ($1, $2, 'fail_token', 'Visa', '1234', '12', '2027', 'Test User', true, NOW())
      `, ['pm_rollback_001', user.user_id]);
      
      // Add items
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ item_id: 'item_test_001', quantity: 5 });
      
      // Get initial stock
      const initialStock = await testDB.query(
        'SELECT current_stock FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      const stockBefore = initialStock.rows[0].current_stock;
      
      // Attempt order (will fail at payment)
      const response = await request(app)
        .post('/api/checkout/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_type: 'collection',
          collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
          customer_name: 'Test User',
          customer_email: user.email,
          customer_phone: user.phone,
          payment_method_id: 'pm_rollback_001',
          cvv: '123'
        });
      
      expect(response.status).toBe(400);
      
      // Verify stock unchanged
      const finalStock = await testDB.query(
        'SELECT current_stock FROM menu_items WHERE item_id = $1',
        ['item_test_001']
      );
      expect(finalStock.rows[0].current_stock).toBe(stockBefore);
      
      // Verify no order created
      const orderResult = await testDB.query(
        'SELECT * FROM orders WHERE user_id = $1',
        [user.user_id]
      );
      expect(orderResult.rows.length).toBe(0);
      
      // Verify no points added
      const loyaltyResult = await testDB.query(
        'SELECT current_points_balance FROM loyalty_accounts WHERE user_id = $1',
        [user.user_id]
      );
      expect(loyaltyResult.rows[0].current_points_balance).toBe(0);
    });
  });
});

// ============================================
// ANALYTICS TESTS
// ============================================

describe('Analytics', () => {
  describe('GET /api/admin/analytics/sales', () => {
    it('should return sales analytics for date range', async () => {
      const adminToken = generateToken('admin_test_001', 'admin');
      
      // Create test orders
      const user = await createTestUser();
      await testDB.query(`
        INSERT INTO orders (
          order_id, order_number, user_id, order_type, status, subtotal,
          tax_amount, total_amount, payment_status, customer_name, customer_email,
          customer_phone, created_at, updated_at, completed_at
        ) VALUES
        ('ord_analytics_001', 'ORD-A-001', $1, 'collection', 'completed', 20.00, 4.60, 24.60, 'paid', 'Cust', 'c@test.com', '+353871234567', NOW(), NOW(), NOW()),
        ('ord_analytics_002', 'ORD-A-002', $1, 'delivery', 'completed', 30.00, 6.90, 36.90, 'paid', 'Cust', 'c@test.com', '+353871234567', NOW(), NOW(), NOW())
      `, [user.user_id]);
      
      const response = await request(app)
        .get('/api/admin/analytics/sales')
        .query({ date_range: 'today' })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.total_revenue).toBeGreaterThanOrEqual(61.50);
      expect(response.body.total_orders).toBeGreaterThanOrEqual(2);
      expect(response.body.average_order_value).toBeDefined();
    });
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('Error Handling', () => {
  it('should return 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/nonexistent');
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('NOT_FOUND');
  });
  
  it('should handle database errors gracefully', async () => {
    // Temporarily break database connection
    await testDB.query('SELECT pg_terminate_backend(pg_backend_pid())').catch(() => {});
    
    const response = await request(app)
      .get('/api/menu/items');
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('INTERNAL_SERVER_ERROR');
    
    // Reconnect
    testDB = pool;
  });
  
  it('should sanitize error messages (no stack traces in production)', async () => {
    const user = await createTestUser();
    const token = generateToken(user.user_id);
    
    // Force an error
    const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          item_id: 'nonexistent_item',
          quantity: 1
        });
    
    expect(response.status).toBe(404);
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body.message).toBeDefined();
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Integration: Complete Customer Journey', () => {
  it('should complete full customer journey: register → order → track → loyalty', async () => {
    // 1. Register
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'journey@test.com',
        phone: '+353871111111',
        password: 'password123',
        first_name: 'Journey',
        last_name: 'User'
      });
    
    expect(registerResponse.status).toBe(201);
    const { user, token, first_order_discount_code } = registerResponse.body;
    
    // 2. Browse menu
    const menuResponse = await request(app)
      .get('/api/menu/items');
    
    expect(menuResponse.status).toBe(200);
    expect(menuResponse.body.items.length).toBeGreaterThan(0);
    
    // 3. Add to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ item_id: 'item_test_001', quantity: 2 });
    
    // 4. Get cart
    const cartResponse = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    
    expect(cartResponse.body.items.length).toBe(1);
    expect(cartResponse.body.subtotal).toBe(20.00);
    
    // 5. Add payment method
    await testDB.query(`
      INSERT INTO payment_methods (
        payment_method_id, user_id, sumup_token, card_type, last_four_digits,
        expiry_month, expiry_year, cardholder_name, is_default, created_at
      ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Journey User', true, NOW())
    `, ['pm_journey_001', user.user_id]);
    
    // 6. Validate checkout
    const validateResponse = await request(app)
      .post('/api/checkout/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        order_type: 'collection',
        collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
        discount_code: first_order_discount_code
      });
    
    expect(validateResponse.body.valid).toBe(true);
    
    // 7. Place order with first-order discount
    const orderResponse = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({
        order_type: 'collection',
        collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
        discount_code: first_order_discount_code,
        customer_name: 'Journey User',
        customer_email: user.email,
        customer_phone: '+353871111111',
        payment_method_id: 'pm_journey_001',
        cvv: '123'
      });
    
    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.order_id).toBeDefined();
    expect(orderResponse.body.discount_amount).toBe(4.00); // 20% of 20.00
    expect(orderResponse.body.loyalty_points_awarded).toBeGreaterThan(0);
    
    const orderId = orderResponse.body.order_id;
    
    // 8. Track order
    const trackResponse = await request(app)
      .get(`/api/orders/${orderId}/track`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(trackResponse.status).toBe(200);
    expect(trackResponse.body.status).toBe('received');
    
    // 9. Check loyalty points
    const loyaltyResponse = await request(app)
      .get('/api/loyalty')
      .set('Authorization', `Bearer ${token}`);
    
    expect(loyaltyResponse.status).toBe(200);
    expect(loyaltyResponse.body.current_points_balance).toBeGreaterThan(0);
    expect(loyaltyResponse.body.total_points_earned).toBeGreaterThan(0);
    
    // 10. View order history
    const historyResponse = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.orders.length).toBe(1);
    expect(historyResponse.body.orders[0].order_id).toBe(orderId);
  });
});

describe('Integration: Staff Order Processing', () => {
  it('should complete staff workflow: view queue → update status → complete', async () => {
    const staffToken = generateToken('staff_test_001', 'staff');
    
    // Create a new order
    const user = await createTestUser();
    const orderId = 'ord_staff_workflow_001';
    
    await testDB.query(`
      INSERT INTO orders (
        order_id, order_number, user_id, order_type, status, subtotal,
        tax_amount, total_amount, payment_status, customer_name, customer_email,
        customer_phone, created_at, updated_at
      ) VALUES ($1, 'ORD-STAFF-WF-001', $2, 'collection', 'received', 20.00, 4.60, 24.60, 'paid', 'Customer', 'cust@test.com', '+353871234567', NOW(), NOW())
    `, [orderId, user.user_id]);
    
    await testDB.query(`
      INSERT INTO order_items (
        order_item_id, order_id, item_id, item_name, quantity, unit_price, line_total
      ) VALUES ('oi_staff_wf_001', $1, 'item_test_001', 'Test Item', 2, 10.00, 20.00)
    `, [orderId]);
    
    // 1. View order queue
    const queueResponse = await request(app)
      .get('/api/staff/orders')
      .query({ status: 'received' })
      .set('Authorization', `Bearer ${staffToken}`);
    
    expect(queueResponse.status).toBe(200);
    expect(queueResponse.body.orders.length).toBeGreaterThanOrEqual(1);
    
    const order = queueResponse.body.orders.find(o => o.order_id === orderId);
    expect(order).toBeDefined();
    expect(order.status).toBe('received');
    
    // 2. Start preparing
    const prepareResponse = await request(app)
      .put(`/api/staff/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'preparing' });
    
    expect(prepareResponse.status).toBe(200);
    expect(prepareResponse.body.status).toBe('preparing');
    
    // 3. Mark as ready
    const readyResponse = await request(app)
      .put(`/api/staff/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'ready' });
    
    expect(readyResponse.status).toBe(200);
    expect(readyResponse.body.status).toBe('ready');
    
    // 4. Complete order
    const completeResponse = await request(app)
      .put(`/api/staff/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ 
        status: 'completed',
        notes: 'Customer collected order'
      });
    
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.status).toBe('completed');
    expect(completeResponse.body.completed_at).not.toBeNull();
    
    // Verify status history has all transitions
    const historyResult = await testDB.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at',
      [orderId]
    );
    
    expect(historyResult.rows.length).toBe(3);
    expect(historyResult.rows[0].status).toBe('preparing');
    expect(historyResult.rows[1].status).toBe('ready');
    expect(historyResult.rows[2].status).toBe('completed');
    expect(historyResult.rows[2].notes).toBe('Customer collected order');
  });
});

describe('Integration: Admin Business Management', () => {
  it('should complete admin workflow: add item → create discount → view analytics', async () => {
    const adminToken = generateToken('admin_test_001', 'admin');
    
    // 1. Add menu item
    const itemResponse = await request(app)
      .post('/api/admin/menu/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Special',
        description: 'Special item for testing',
        category_id: 'cat_test_001',
        price: 15.00,
        is_active: true,
        stock_tracked: true,
        current_stock: 100,
        low_stock_threshold: 20,
        is_featured: true
      });
    
    expect(itemResponse.status).toBe(201);
    const newItemId = itemResponse.body.item_id;
    
    // 2. Create discount code
    const discountResponse = await request(app)
      .post('/api/admin/discounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'ADMINSPECIAL',
        discount_type: 'percentage',
        discount_value: 20.00,
        applicable_item_ids: [newItemId],
        minimum_order_value: 10.00,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 86400000 * 30).toISOString(),
        status: 'active'
      });
    
    expect(discountResponse.status).toBe(201);
    
    // 3. Create test order using the item and discount
    const customer = await createTestUser();
    const customerToken = generateToken(customer.user_id);
    
    await testDB.query(`
      INSERT INTO payment_methods (
        payment_method_id, user_id, sumup_token, card_type, last_four_digits,
        expiry_month, expiry_year, cardholder_name, is_default, created_at
      ) VALUES ($1, $2, 'test_token', 'Visa', '1234', '12', '2027', 'Customer', true, NOW())
    `, ['pm_admin_wf_001', customer.user_id]);
    
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ item_id: newItemId, quantity: 2 });
    
    await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        order_type: 'collection',
        collection_time_slot: new Date(Date.now() + 3600000).toISOString(),
        discount_code: 'ADMINSPECIAL',
        customer_name: 'Customer',
        customer_email: customer.email,
        customer_phone: customer.phone,
        payment_method_id: 'pm_admin_wf_001',
        cvv: '123'
      });
    
    // 4. View analytics
    const analyticsResponse = await request(app)
      .get('/api/admin/analytics/sales')
      .query({ date_range: 'today' })
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.body.total_revenue).toBeGreaterThan(0);
    
    // 5. View discount usage
    const usageResponse = await request(app)
      .get(`/api/admin/discounts/${discountResponse.body.code_id}/usage`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(usageResponse.status).toBe(200);
    expect(usageResponse.body.total_uses).toBeGreaterThanOrEqual(1);
  });
});