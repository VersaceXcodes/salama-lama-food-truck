-- ============================================
-- DROP EXISTING TABLES (in reverse order of dependencies)
-- ============================================
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS catering_quotes CASCADE;
DROP TABLE IF EXISTS catering_inquiries CASCADE;
DROP TABLE IF EXISTS redeemed_rewards CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS points_transactions CASCADE;
DROP TABLE IF EXISTS loyalty_accounts CASCADE;
DROP TABLE IF EXISTS discount_usage CASCADE;
DROP TABLE IF EXISTS discount_codes CASCADE;
DROP TABLE IF EXISTS delivery_zones CASCADE;
DROP TABLE IF EXISTS stock_history CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customization_options CASCADE;
DROP TABLE IF EXISTS customization_groups CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Users Table
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    profile_photo_url TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
    order_notifications_email BOOLEAN NOT NULL DEFAULT true,
    order_notifications_sms BOOLEAN NOT NULL DEFAULT false,
    marketing_emails BOOLEAN NOT NULL DEFAULT false,
    marketing_sms BOOLEAN NOT NULL DEFAULT false,
    newsletter_subscribed BOOLEAN NOT NULL DEFAULT false,
    dietary_preferences JSONB,
    first_order_discount_code TEXT,
    first_order_discount_used BOOLEAN NOT NULL DEFAULT false,
    referral_code TEXT UNIQUE,
    referred_by_user_id TEXT,
    staff_permissions JSONB,
    FOREIGN KEY (referred_by_user_id) REFERENCES users(user_id)
);

-- Addresses Table
CREATE TABLE addresses (
    address_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL DEFAULT 'Dublin',
    postal_code TEXT NOT NULL,
    delivery_instructions TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Payment Methods Table
CREATE TABLE payment_methods (
    payment_method_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sumup_token TEXT NOT NULL,
    card_type TEXT NOT NULL,
    last_four_digits TEXT NOT NULL,
    expiry_month TEXT NOT NULL,
    expiry_year TEXT NOT NULL,
    cardholder_name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Password Resets Table
CREATE TABLE password_resets (
    reset_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reset_token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Email Verifications Table
CREATE TABLE email_verifications (
    verification_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    verification_token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Newsletter Subscribers Table
CREATE TABLE newsletter_subscribers (
    subscriber_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    subscribed_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'subscribed',
    user_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Categories Table
CREATE TABLE categories (
    category_id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Menu Items Table
CREATE TABLE menu_items (
    item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    image_urls JSONB,
    dietary_tags JSONB,
    is_limited_edition BOOLEAN NOT NULL DEFAULT false,
    limited_edition_end_date TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    available_for_collection BOOLEAN NOT NULL DEFAULT true,
    available_for_delivery BOOLEAN NOT NULL DEFAULT true,
    stock_tracked BOOLEAN NOT NULL DEFAULT false,
    current_stock INTEGER,
    low_stock_threshold INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    meta_description TEXT,
    image_alt_text TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Customization Groups Table
CREATE TABLE customization_groups (
    group_id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
);

-- Customization Options Table
CREATE TABLE customization_options (
    option_id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    additional_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (group_id) REFERENCES customization_groups(group_id)
);

-- Orders Table
CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    order_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    collection_time_slot TEXT,
    delivery_address_id TEXT,
    delivery_address_snapshot JSONB,
    delivery_fee DECIMAL(10, 2),
    estimated_delivery_time TEXT,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_code TEXT,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_method_id TEXT,
    payment_method_type TEXT,
    sumup_transaction_id TEXT,
    invoice_url TEXT,
    loyalty_points_awarded INTEGER NOT NULL DEFAULT 0,
    special_instructions TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    cancelled_at TEXT,
    cancellation_reason TEXT,
    refund_amount DECIMAL(10, 2),
    refund_reason TEXT,
    refunded_at TEXT,
    internal_notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (delivery_address_id) REFERENCES addresses(address_id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id)
);

-- Order Items Table
CREATE TABLE order_items (
    order_item_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    selected_customizations JSONB,
    line_total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
);

-- Order Status History Table
CREATE TABLE order_status_history (
    history_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    changed_by_user_id TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id)
);

-- Stock History Table
CREATE TABLE stock_history (
    history_id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    change_type TEXT NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    quantity_changed INTEGER NOT NULL,
    reason TEXT,
    notes TEXT,
    changed_by_user_id TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    related_order_id TEXT,
    FOREIGN KEY (item_id) REFERENCES menu_items(item_id),
    FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (related_order_id) REFERENCES orders(order_id)
);

-- Delivery Zones Table
CREATE TABLE delivery_zones (
    zone_id TEXT PRIMARY KEY,
    zone_name TEXT NOT NULL,
    zone_type TEXT NOT NULL,
    zone_boundaries JSONB NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    minimum_order_value DECIMAL(10, 2),
    estimated_delivery_time INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Discount Codes Table
CREATE TABLE discount_codes (
    code_id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    applicable_order_types JSONB,
    applicable_category_ids JSONB,
    applicable_item_ids JSONB,
    minimum_order_value DECIMAL(10, 2),
    total_usage_limit INTEGER,
    per_customer_usage_limit INTEGER,
    total_used_count INTEGER NOT NULL DEFAULT 0,
    valid_from TEXT NOT NULL,
    valid_until TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    internal_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Discount Usage Table
CREATE TABLE discount_usage (
    usage_id TEXT PRIMARY KEY,
    code_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    discount_amount_applied DECIMAL(10, 2) NOT NULL,
    used_at TEXT NOT NULL,
    FOREIGN KEY (code_id) REFERENCES discount_codes(code_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Loyalty Accounts Table
CREATE TABLE loyalty_accounts (
    loyalty_account_id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    current_points_balance INTEGER NOT NULL DEFAULT 0,
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    total_points_redeemed INTEGER NOT NULL DEFAULT 0,
    total_points_expired INTEGER NOT NULL DEFAULT 0,
    referral_count INTEGER NOT NULL DEFAULT 0,
    spin_wheel_available_count INTEGER NOT NULL DEFAULT 0,
    next_spin_available_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Points Transactions Table
CREATE TABLE points_transactions (
    transaction_id TEXT PRIMARY KEY,
    loyalty_account_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    points_amount INTEGER NOT NULL,
    order_id TEXT,
    reason TEXT,
    adjusted_by_user_id TEXT,
    running_balance INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    FOREIGN KEY (loyalty_account_id) REFERENCES loyalty_accounts(loyalty_account_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (adjusted_by_user_id) REFERENCES users(user_id)
);

-- Badges Table
CREATE TABLE badges (
    badge_id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    unlock_criteria JSONB NOT NULL,
    icon_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- User Badges Table
CREATE TABLE user_badges (
    user_badge_id TEXT PRIMARY KEY,
    loyalty_account_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    FOREIGN KEY (loyalty_account_id) REFERENCES loyalty_accounts(loyalty_account_id),
    FOREIGN KEY (badge_id) REFERENCES badges(badge_id)
);

-- Rewards Table
CREATE TABLE rewards (
    reward_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_value JSONB NOT NULL,
    expiry_days_after_redemption INTEGER,
    stock_limit INTEGER,
    stock_remaining INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    image_url TEXT,
    availability_status TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Redeemed Rewards Table
CREATE TABLE redeemed_rewards (
    redeemed_reward_id TEXT PRIMARY KEY,
    loyalty_account_id TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    reward_code TEXT UNIQUE NOT NULL,
    points_deducted INTEGER NOT NULL,
    redeemed_at TEXT NOT NULL,
    expires_at TEXT,
    usage_status TEXT NOT NULL DEFAULT 'unused',
    used_in_order_id TEXT,
    used_at TEXT,
    FOREIGN KEY (loyalty_account_id) REFERENCES loyalty_accounts(loyalty_account_id),
    FOREIGN KEY (reward_id) REFERENCES rewards(reward_id),
    FOREIGN KEY (used_in_order_id) REFERENCES orders(order_id)
);

-- Catering Inquiries Table
CREATE TABLE catering_inquiries (
    inquiry_id TEXT PRIMARY KEY,
    inquiry_number TEXT UNIQUE NOT NULL,
    user_id TEXT,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    company_name TEXT,
    event_type TEXT NOT NULL,
    event_type_other TEXT,
    event_date TEXT NOT NULL,
    event_start_time TEXT NOT NULL,
    event_end_time TEXT NOT NULL,
    event_location_address TEXT NOT NULL,
    event_location_city TEXT NOT NULL,
    event_location_postal_code TEXT NOT NULL,
    event_location_type TEXT NOT NULL,
    guest_count INTEGER NOT NULL,
    guest_count_min INTEGER,
    guest_count_max INTEGER,
    dietary_requirements JSONB,
    dietary_notes TEXT,
    menu_preferences TEXT,
    preferred_package TEXT,
    budget_range TEXT,
    additional_details TEXT,
    attached_files JSONB,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'new',
    admin_notes TEXT,
    submitted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Catering Quotes Table
CREATE TABLE catering_quotes (
    quote_id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL,
    quote_number TEXT UNIQUE NOT NULL,
    line_items JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    additional_fees JSONB,
    tax_amount DECIMAL(10, 2) NOT NULL,
    grand_total DECIMAL(10, 2) NOT NULL,
    valid_until TEXT NOT NULL,
    terms TEXT,
    quote_pdf_url TEXT,
    created_at TEXT NOT NULL,
    sent_at TEXT,
    accepted_at TEXT,
    FOREIGN KEY (inquiry_id) REFERENCES catering_inquiries(inquiry_id)
);

-- Invoices Table
CREATE TABLE invoices (
    invoice_id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    order_id TEXT,
    catering_inquiry_id TEXT,
    user_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    line_items JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2) NOT NULL,
    grand_total DECIMAL(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    sumup_transaction_id TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    paid_at TEXT,
    invoice_pdf_url TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (catering_inquiry_id) REFERENCES catering_inquiries(inquiry_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- System Settings Table
CREATE TABLE system_settings (
    setting_id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB,
    setting_type TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by_user_id TEXT,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT,
    changes JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================
-- SEED DATA
-- ============================================

-- Seed Users
INSERT INTO users (user_id, email, phone, password_hash, first_name, last_name, role, profile_photo_url, email_verified, status, created_at, last_login_at, marketing_opt_in, order_notifications_email, order_notifications_sms, marketing_emails, marketing_sms, newsletter_subscribed, dietary_preferences, first_order_discount_code, first_order_discount_used, referral_code, referred_by_user_id, staff_permissions) VALUES
('user_001', 'admin@coffeeshop.ie', '+353871234567', 'admin123', 'Sean', 'Murphy', 'admin', 'https://images.unsplash.com/photo-1560250097-0b93528c311a', true, 'active', '2023-01-15T10:00:00Z', '2024-01-15T09:30:00Z', false, true, false, false, false, false, NULL, NULL, false, 'SEAN2024', NULL, '{"manage_orders": true, "manage_menu": true, "manage_users": true, "view_reports": true, "manage_settings": true}'),
('user_002', 'manager@coffeeshop.ie', '+353871234568', 'manager123', 'Aoife', 'O''Connor', 'staff', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', true, 'active', '2023-02-10T11:00:00Z', '2024-01-14T16:20:00Z', false, true, true, false, false, false, NULL, NULL, false, 'AOIFE2024', NULL, '{"manage_orders": true, "manage_menu": true, "view_reports": true}'),
('user_003', 'john.smith@email.ie', '+353871234569', 'password123', 'John', 'Smith', 'customer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', true, 'active', '2023-03-20T14:30:00Z', '2024-01-13T12:15:00Z', true, true, true, true, false, true, '["vegetarian", "gluten-free"]', 'FIRST10', true, 'JOHN2024', NULL, NULL),
('user_004', 'sarah.wilson@email.ie', '+353871234570', 'password123', 'Sarah', 'Wilson', 'customer', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80', true, 'active', '2023-04-05T09:15:00Z', '2024-01-12T18:45:00Z', true, true, false, true, true, true, '["vegan"]', 'FIRST10', false, 'SARAH2024', 'user_003', NULL),
('user_005', 'michael.byrne@email.ie', '+353871234571', 'password123', 'Michael', 'Byrne', 'customer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', true, 'active', '2023-05-12T16:20:00Z', '2024-01-11T10:30:00Z', false, true, false, false, false, false, NULL, 'FIRST10', true, 'MIKE2024', NULL, NULL),
('user_006', 'emma.kelly@email.ie', '+353871234572', 'password123', 'Emma', 'Kelly', 'customer', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', true, 'active', '2023-06-18T13:45:00Z', '2024-01-10T15:20:00Z', true, true, true, true, false, true, '["dairy-free"]', NULL, false, 'EMMA2024', 'user_004', NULL),
('user_007', 'james.ryan@email.ie', '+353871234573', 'password123', 'James', 'Ryan', 'customer', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', false, 'active', '2023-07-22T11:10:00Z', '2024-01-09T14:55:00Z', false, true, false, false, false, false, NULL, 'FIRST10', false, 'JAMES2024', NULL, NULL),
('user_008', 'lisa.brennan@email.ie', '+353871234574', 'password123', 'Lisa', 'Brennan', 'customer', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f', true, 'active', '2023-08-30T10:25:00Z', '2024-01-08T09:40:00Z', true, true, true, true, true, true, '["nut-free"]', 'FIRST10', true, 'LISA2024', 'user_003', NULL),
('user_009', 'david.walsh@email.ie', '+353871234575', 'password123', 'David', 'Walsh', 'customer', 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef', true, 'active', '2023-09-14T15:35:00Z', '2024-01-07T11:25:00Z', false, true, false, false, false, false, NULL, NULL, false, 'DAVID2024', NULL, NULL),
('user_010', 'claire.murphy@email.ie', '+353871234576', 'password123', 'Claire', 'Murphy', 'customer', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1', true, 'active', '2023-10-08T12:50:00Z', '2024-01-06T16:10:00Z', true, true, false, true, false, true, '["vegetarian"]', 'FIRST10', false, 'CLAIRE2024', 'user_006', NULL);

-- Seed Addresses
INSERT INTO addresses (address_id, user_id, label, address_line1, address_line2, city, postal_code, delivery_instructions, is_default, latitude, longitude, created_at) VALUES
('addr_001', 'user_003', 'Home', '15 Grafton Street', 'Apartment 3B', 'Dublin', 'D02 X285', 'Ring doorbell twice', true, 53.3421, -6.2603, '2023-03-20T14:35:00Z'),
('addr_002', 'user_003', 'Work', '42 Camden Street', 'Floor 2', 'Dublin', 'D02 P593', 'Leave at reception', false, 53.3355, -6.2633, '2023-04-15T10:20:00Z'),
('addr_003', 'user_004', 'Home', '8 Ranelagh Road', NULL, 'Dublin', 'D06 W2P4', 'Call on arrival', true, 53.3198, -6.2558, '2023-04-05T09:20:00Z'),
('addr_004', 'user_005', 'Home', '23 Leeson Street', 'Basement flat', 'Dublin', 'D02 HF65', 'Entrance at side', true, 53.3334, -6.2513, '2023-05-12T16:25:00Z'),
('addr_005', 'user_006', 'Home', '71 Rathmines Road', NULL, 'Dublin', 'D06 E0W7', NULL, true, 53.3212, -6.2642, '2023-06-18T13:50:00Z'),
('addr_006', 'user_006', 'Parents House', '12 Dartry Road', NULL, 'Dublin', 'D06 X2K9', 'Green gate on left', false, 53.3125, -6.2589, '2023-07-10T11:30:00Z'),
('addr_007', 'user_008', 'Home', '56 Baggot Street', 'Apartment 7', 'Dublin', 'D04 Y2F5', 'Use side entrance', true, 53.3358, -6.2445, '2023-08-30T10:30:00Z'),
('addr_008', 'user_010', 'Home', '34 Merrion Square', NULL, 'Dublin', 'D02 VK65', 'Ring bell for Flat 2', true, 53.3398, -6.2498, '2023-10-08T12:55:00Z');

-- Seed Payment Methods
INSERT INTO payment_methods (payment_method_id, user_id, sumup_token, card_type, last_four_digits, expiry_month, expiry_year, cardholder_name, is_default, created_at) VALUES
('pm_001', 'user_003', 'tok_jhg8934hg93h4g', 'Visa', '4242', '12', '2026', 'John Smith', true, '2023-03-25T15:20:00Z'),
('pm_002', 'user_004', 'tok_93hg8h34g9h34g', 'Mastercard', '5555', '08', '2025', 'Sarah Wilson', true, '2023-04-10T11:45:00Z'),
('pm_003', 'user_005', 'tok_h8g93h4g93hg4h', 'Visa', '1234', '03', '2027', 'Michael Byrne', true, '2023-05-18T14:30:00Z'),
('pm_004', 'user_006', 'tok_g93h4g9h3g4h93', 'Amex', '9876', '11', '2026', 'Emma Kelly', true, '2023-06-22T16:10:00Z'),
('pm_005', 'user_008', 'tok_4hg93h4g93h4g9', 'Visa', '6789', '05', '2025', 'Lisa Brennan', true, '2023-09-05T10:15:00Z'),
('pm_006', 'user_010', 'tok_h934gh93g4h93g', 'Mastercard', '3210', '09', '2026', 'Claire Murphy', true, '2023-10-15T13:40:00Z');

-- Seed Password Resets
INSERT INTO password_resets (reset_id, user_id, reset_token, created_at, expires_at, used) VALUES
('rst_001', 'user_007', 'reset_tk_jh3g4h93gh4g93h4g', '2024-01-01T10:30:00Z', '2024-01-01T12:30:00Z', false),
('rst_002', 'user_009', 'reset_tk_g93h4g93hg4h93gh4', '2024-01-05T14:20:00Z', '2024-01-05T16:20:00Z', true);

-- Seed Email Verifications
INSERT INTO email_verifications (verification_id, user_id, verification_token, created_at, expires_at, verified_at) VALUES
('ver_001', 'user_003', 'verify_tk_93gh4g93hg4h9', '2023-03-20T14:30:00Z', '2023-03-21T14:30:00Z', '2023-03-20T15:45:00Z'),
('ver_002', 'user_004', 'verify_tk_h4g93h4gh93g4h', '2023-04-05T09:15:00Z', '2023-04-06T09:15:00Z', '2023-04-05T10:30:00Z'),
('ver_003', 'user_007', 'verify_tk_g3h4g93h4gh93h', '2023-07-22T11:10:00Z', '2023-07-23T11:10:00Z', NULL);

-- Seed Newsletter Subscribers
INSERT INTO newsletter_subscribers (subscriber_id, email, subscribed_at, status, user_id) VALUES
('sub_001', 'newsletter1@email.ie', '2023-02-15T10:30:00Z', 'subscribed', NULL),
('sub_002', 'newsletter2@email.ie', '2023-03-10T14:20:00Z', 'subscribed', NULL),
('sub_003', 'john.smith@email.ie', '2023-03-20T14:35:00Z', 'subscribed', 'user_003'),
('sub_004', 'sarah.wilson@email.ie', '2023-04-05T09:20:00Z', 'subscribed', 'user_004'),
('sub_005', 'emma.kelly@email.ie', '2023-06-18T13:50:00Z', 'subscribed', 'user_006'),
('sub_006', 'newsletter3@email.ie', '2023-09-20T11:15:00Z', 'unsubscribed', NULL);

-- Seed Categories
INSERT INTO categories (category_id, name, description, sort_order, created_at) VALUES
('cat_001', 'Hot Drinks', 'Freshly brewed coffee and tea selections', 1, '2023-01-10T10:00:00Z'),
('cat_002', 'Cold Drinks', 'Iced beverages and cold brew options', 2, '2023-01-10T10:05:00Z'),
('cat_003', 'Pastries', 'Fresh baked goods and sweet treats', 3, '2023-01-10T10:10:00Z'),
('cat_004', 'Sandwiches', 'Artisan sandwiches and wraps', 4, '2023-01-10T10:15:00Z'),
('cat_005', 'Salads', 'Fresh and healthy salad options', 5, '2023-01-10T10:20:00Z'),
('cat_006', 'Breakfast', 'Morning favorites and breakfast items', 6, '2023-01-10T10:25:00Z');

-- Seed Menu Items
INSERT INTO menu_items (item_id, name, description, category_id, price, image_url, image_urls, dietary_tags, is_limited_edition, limited_edition_end_date, is_active, available_for_collection, available_for_delivery, stock_tracked, current_stock, low_stock_threshold, sort_order, is_featured, meta_description, image_alt_text, created_at, updated_at) VALUES
('item_001', 'Espresso', 'Rich and bold single shot espresso', 'cat_001', 2.50, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04', '["https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04"]', '["vegan", "dairy-free"]', false, NULL, true, true, true, false, NULL, NULL, 1, true, 'Perfect single shot espresso made from premium beans', 'Espresso coffee in white cup', '2023-01-15T10:00:00Z', '2023-12-01T10:00:00Z'),
('item_002', 'Cappuccino', 'Classic cappuccino with steamed milk and foam', 'cat_001', 3.80, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d', '["https://images.unsplash.com/photo-1572442388796-11668a67e53d"]', '["vegetarian"]', false, NULL, true, true, true, false, NULL, NULL, 2, true, 'Traditional cappuccino with perfect milk foam', 'Cappuccino with latte art', '2023-01-15T10:05:00Z', '2023-12-01T10:00:00Z'),
('item_003', 'Latte', 'Smooth espresso with steamed milk', 'cat_001', 4.00, 'https://images.unsplash.com/photo-1561882468-9110e03e0f78', '["https://images.unsplash.com/photo-1561882468-9110e03e0f78"]', '["vegetarian"]', false, NULL, true, true, true, false, NULL, NULL, 3, true, 'Creamy latte with premium espresso', 'Latte in glass with beautiful latte art', '2023-01-15T10:10:00Z', '2023-12-01T10:00:00Z'),
('item_004', 'Mocha', 'Espresso with chocolate and steamed milk', 'cat_001', 4.50, 'https://images.unsplash.com/photo-1607260550778-aa5c0b81b6fe', '["https://images.unsplash.com/photo-1607260550778-aa5c0b81b6fe"]', '["vegetarian"]', false, NULL, true, true, true, false, NULL, NULL, 4, false, 'Rich mocha with belgian chocolate', 'Mocha coffee with whipped cream', '2023-01-15T10:15:00Z', '2023-12-01T10:00:00Z'),
('item_005', 'Flat White', 'Espresso with microfoam milk', 'cat_001', 4.20, 'https://images.unsplash.com/photo-1541167760496-1628856ab772', '["https://images.unsplash.com/photo-1541167760496-1628856ab772"]', '["vegetarian"]', false, NULL, true, true, true, false, NULL, NULL, 5, true, 'Perfect flat white with velvety microfoam', 'Flat white coffee in white cup', '2023-01-15T10:20:00Z', '2023-12-01T10:00:00Z'),
('item_006', 'Americano', 'Espresso with hot water', 'cat_001', 3.00, 'https://images.unsplash.com/photo-1520970014086-2208d157c9e2', '["https://images.unsplash.com/photo-1520970014086-2208d157c9e2"]', '["vegan", "dairy-free"]', false, NULL, true, true, true, false, NULL, NULL, 6, false, 'Classic americano coffee', 'Americano in black cup', '2023-01-15T10:25:00Z', '2023-12-01T10:00:00Z'),
('item_007', 'Iced Latte', 'Cold latte with ice', 'cat_002', 4.50, 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7', '["https://images.unsplash.com/photo-1517487881594-2787fef5ebf7"]', '["vegetarian"]', false, NULL, true, true, true, false, NULL, NULL, 1, true, 'Refreshing iced latte', 'Iced latte in glass', '2023-01-15T10:30:00Z', '2023-12-01T10:00:00Z'),
('item_008', 'Cold Brew', 'Smooth cold brew coffee', 'cat_002', 4.00, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6', '["https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6"]', '["vegan", "dairy-free"]', false, NULL, true, true, true, true, 25, 5, 2, true, 'Cold steeped for 12 hours', 'Cold brew coffee bottle', '2023-01-15T10:35:00Z', '2023-12-01T10:00:00Z'),
('item_009', 'Pumpkin Spice Latte', 'Seasonal favorite with pumpkin and spices', 'cat_001', 5.00, 'https://images.unsplash.com/photo-1602439928082-9d3a2e0ad589', '["https://images.unsplash.com/photo-1602439928082-9d3a2e0ad589"]', '["vegetarian"]', true, '2024-11-30T23:59:59Z', true, true, true, false, NULL, NULL, 7, true, 'Limited edition pumpkin spice latte', 'Pumpkin spice latte with whipped cream', '2023-09-01T10:00:00Z', '2023-12-01T10:00:00Z'),
('item_010', 'Croissant', 'Buttery French pastry', 'cat_003', 3.50, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a', '["https://images.unsplash.com/photo-1555507036-ab1f4038808a"]', '["vegetarian"]', false, NULL, true, true, true, true, 40, 10, 1, true, 'Fresh baked croissant daily', 'Golden buttery croissant', '2023-01-15T10:40:00Z', '2023-12-01T10:00:00Z'),
('item_011', 'Chocolate Muffin', 'Rich chocolate muffin', 'cat_003', 3.80, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa', '["https://images.unsplash.com/photo-1607958996333-41aef7caefaa"]', '["vegetarian"]', false, NULL, true, true, true, true, 35, 8, 2, false, 'Decadent chocolate muffin', 'Chocolate muffin with chocolate chips', '2023-01-15T10:45:00Z', '2023-12-01T10:00:00Z'),
('item_012', 'Blueberry Scone', 'Freshly baked scone with blueberries', 'cat_003', 3.20, 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec', '["https://images.unsplash.com/photo-1608198093002-ad4e005484ec"]', '["vegetarian"]', false, NULL, true, true, true, true, 30, 8, 3, false, 'Traditional scone with fresh blueberries', 'Blueberry scone on plate', '2023-01-15T10:50:00Z', '2023-12-01T10:00:00Z'),
('item_013', 'Turkey & Avocado Sandwich', 'Whole grain with turkey, avocado, lettuce', 'cat_004', 7.50, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af', '["https://images.unsplash.com/photo-1528735602780-2552fd46c7af"]', '["dairy-free"]', false, NULL, true, true, true, true, 20, 5, 1, true, 'Healthy turkey sandwich with fresh avocado', 'Turkey and avocado sandwich', '2023-01-15T10:55:00Z', '2023-12-01T10:00:00Z'),
('item_014', 'Veggie Wrap', 'Grilled vegetables with hummus', 'cat_004', 6.80, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f', '["https://images.unsplash.com/photo-1626700051175-6818013e1d4f"]', '["vegan", "dairy-free"]', false, NULL, true, true, true, true, 18, 5, 2, true, 'Plant-based wrap with grilled veggies', 'Veggie wrap with hummus', '2023-01-15T11:00:00Z', '2023-12-01T10:00:00Z'),
('item_015', 'Caesar Salad', 'Classic caesar with parmesan', 'cat_005', 8.50, 'https://images.unsplash.com/photo-1546793665-c74683f339c1', '["https://images.unsplash.com/photo-1546793665-c74683f339c1"]', '["vegetarian", "gluten-free"]', false, NULL, true, true, true, false, NULL, NULL, 1, true, 'Traditional caesar salad', 'Fresh caesar salad bowl', '2023-01-15T11:05:00Z', '2023-12-01T10:00:00Z'),
('item_016', 'Quinoa Bowl', 'Quinoa with roasted vegetables', 'cat_005', 9.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', '["https://images.unsplash.com/photo-1512621776951-a57141f2eefd"]', '["vegan", "gluten-free"]', false, NULL, true, true, true, false, NULL, NULL, 2, true, 'Nutritious quinoa bowl', 'Quinoa bowl with vegetables', '2023-01-15T11:10:00Z', '2023-12-01T10:00:00Z'),
('item_017', 'Breakfast Burrito', 'Eggs, cheese, peppers, salsa', 'cat_006', 6.50, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58', '["https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58"]', '["vegetarian"]', false, NULL, true, true, true, false, NULL, NULL, 1, true, 'Hearty breakfast burrito', 'Breakfast burrito on plate', '2023-01-15T11:15:00Z', '2023-12-01T10:00:00Z'),
('item_018', 'Avocado Toast', 'Sourdough with smashed avocado', 'cat_006', 7.50, 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2', '["https://images.unsplash.com/photo-1588137378633-dea1336ce1e2"]', '["vegan", "dairy-free"]', false, NULL, true, true, true, false, NULL, NULL, 2, true, 'Popular avocado toast on sourdough', 'Avocado toast with seeds', '2023-01-15T11:20:00Z', '2023-12-01T10:00:00Z');

-- Seed Customization Groups
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('cg_001', 'item_002', 'Milk Type', 'single', false, 1),
('cg_002', 'item_002', 'Size', 'single', true, 2),
('cg_003', 'item_002', 'Extra Shots', 'single', false, 3),
('cg_004', 'item_003', 'Milk Type', 'single', false, 1),
('cg_005', 'item_003', 'Size', 'single', true, 2),
('cg_006', 'item_003', 'Flavor Shots', 'multiple', false, 3),
('cg_007', 'item_007', 'Milk Type', 'single', false, 1),
('cg_008', 'item_007', 'Size', 'single', true, 2),
('cg_009', 'item_013', 'Bread Type', 'single', true, 1),
('cg_010', 'item_013', 'Add Extras', 'multiple', false, 2);

-- Seed Customization Options
INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('co_001', 'cg_001', 'Whole Milk', 0.00, true, 1),
('co_002', 'cg_001', 'Oat Milk', 0.50, false, 2),
('co_003', 'cg_001', 'Almond Milk', 0.50, false, 3),
('co_004', 'cg_001', 'Soy Milk', 0.50, false, 4),
('co_005', 'cg_002', 'Regular', 0.00, true, 1),
('co_006', 'cg_002', 'Large', 0.80, false, 2),
('co_007', 'cg_003', 'No Extra Shot', 0.00, true, 1),
('co_008', 'cg_003', 'Extra Shot', 0.60, false, 2),
('co_009', 'cg_003', 'Double Shot', 1.20, false, 3),
('co_010', 'cg_004', 'Whole Milk', 0.00, true, 1),
('co_011', 'cg_004', 'Oat Milk', 0.50, false, 2),
('co_012', 'cg_004', 'Almond Milk', 0.50, false, 3),
('co_013', 'cg_005', 'Regular', 0.00, true, 1),
('co_014', 'cg_005', 'Large', 0.80, false, 2),
('co_015', 'cg_006', 'Vanilla', 0.60, false, 1),
('co_016', 'cg_006', 'Caramel', 0.60, false, 2),
('co_017', 'cg_006', 'Hazelnut', 0.60, false, 3),
('co_018', 'cg_007', 'Whole Milk', 0.00, true, 1),
('co_019', 'cg_007', 'Oat Milk', 0.50, false, 2),
('co_020', 'cg_008', 'Regular', 0.00, true, 1),
('co_021', 'cg_008', 'Large', 0.80, false, 2),
('co_022', 'cg_009', 'White Bread', 0.00, true, 1),
('co_023', 'cg_009', 'Whole Grain', 0.50, false, 2),
('co_024', 'cg_009', 'Sourdough', 0.80, false, 3),
('co_025', 'cg_010', 'Extra Cheese', 1.00, false, 1),
('co_026', 'cg_010', 'Bacon', 1.50, false, 2),
('co_027', 'cg_010', 'Tomato', 0.50, false, 3);

-- Seed Orders
INSERT INTO orders (order_id, order_number, user_id, order_type, status, collection_time_slot, delivery_address_id, delivery_address_snapshot, delivery_fee, estimated_delivery_time, subtotal, discount_code, discount_amount, tax_amount, total_amount, payment_status, payment_method_id, payment_method_type, sumup_transaction_id, invoice_url, loyalty_points_awarded, special_instructions, customer_name, customer_email, customer_phone, created_at, updated_at, completed_at, cancelled_at, cancellation_reason, refund_amount, refund_reason, refunded_at, internal_notes) VALUES
('ord_001', 'ORD-2024-0001', 'user_003', 'collection', 'completed', '2024-01-10T14:00:00Z', NULL, NULL, NULL, NULL, 7.80, NULL, 0.00, 1.79, 9.59, 'paid', 'pm_001', 'card', 'sumup_tx_001', 'https://example.com/invoice/ord_001.pdf', 10, NULL, 'John Smith', 'john.smith@email.ie', '+353871234569', '2024-01-10T13:30:00Z', '2024-01-10T14:15:00Z', '2024-01-10T14:15:00Z', NULL, NULL, NULL, NULL, NULL, NULL),
('ord_002', 'ORD-2024-0002', 'user_004', 'delivery', 'completed', NULL, 'addr_003', '{"label": "Home", "address_line1": "8 Ranelagh Road", "city": "Dublin", "postal_code": "D06 W2P4"}', 3.50, '2024-01-11T12:45:00Z', 12.00, 'FIRST10', 1.20, 2.68, 16.98, 'paid', 'pm_002', 'card', 'sumup_tx_002', 'https://example.com/invoice/ord_002.pdf', 17, 'Please ring doorbell', 'Sarah Wilson', 'sarah.wilson@email.ie', '+353871234570', '2024-01-11T12:00:00Z', '2024-01-11T12:45:00Z', '2024-01-11T12:45:00Z', NULL, NULL, NULL, NULL, NULL, NULL),
('ord_003', 'ORD-2024-0003', 'user_005', 'collection', 'completed', '2024-01-12T10:30:00Z', NULL, NULL, NULL, NULL, 8.30, NULL, 0.00, 1.91, 10.21, 'paid', 'pm_003', 'card', 'sumup_tx_003', 'https://example.com/invoice/ord_003.pdf', 10, NULL, 'Michael Byrne', 'michael.byrne@email.ie', '+353871234571', '2024-01-12T10:00:00Z', '2024-01-12T10:35:00Z', '2024-01-12T10:35:00Z', NULL, NULL, NULL, NULL, NULL, NULL),
('ord_004', 'ORD-2024-0004', 'user_006', 'delivery', 'in_progress', NULL, 'addr_005', '{"label": "Home", "address_line1": "71 Rathmines Road", "city": "Dublin", "postal_code": "D06 E0W7"}', 3.50, '2024-01-14T18:30:00Z', 15.50, NULL, 0.00, 3.47, 22.47, 'paid', 'pm_004', 'card', 'sumup_tx_004', NULL, 22, NULL, 'Emma Kelly', 'emma.kelly@email.ie', '+353871234572', '2024-01-14T17:45:00Z', '2024-01-14T18:00:00Z', NULL, NULL, NULL, NULL, NULL, NULL, 'Customer called to confirm address'),
('ord_005', 'ORD-2024-0005', 'user_003', 'collection', 'preparing', '2024-01-15T15:00:00Z', NULL, NULL, NULL, NULL, 11.00, NULL, 0.00, 2.53, 13.53, 'paid', 'pm_001', 'card', 'sumup_tx_005', NULL, 13, 'Extra hot please', 'John Smith', 'john.smith@email.ie', '+353871234569', '2024-01-15T14:30:00Z', '2024-01-15T14:35:00Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('ord_006', 'ORD-2024-0006', 'user_008', 'delivery', 'completed', NULL, 'addr_007', '{"label": "Home", "address_line1": "56 Baggot Street", "address_line2": "Apartment 7", "city": "Dublin", "postal_code": "D04 Y2F5"}', 3.50, '2024-01-13T16:00:00Z', 13.80, NULL, 0.00, 3.17, 20.47, 'paid', 'pm_005', 'card', 'sumup_tx_006', 'https://example.com/invoice/ord_006.pdf', 20, 'Leave at door', 'Lisa Brennan', 'lisa.brennan@email.ie', '+353871234574', '2024-01-13T15:15:00Z', '2024-01-13T16:05:00Z', '2024-01-13T16:05:00Z', NULL, NULL, NULL, NULL, NULL, NULL),
('ord_007', 'ORD-2024-0007', 'user_010', 'collection', 'cancelled', '2024-01-14T11:00:00Z', NULL, NULL, NULL, NULL, 7.50, NULL, 0.00, 1.73, 9.23, 'refunded', 'pm_006', 'card', 'sumup_tx_007', NULL, 0, NULL, 'Claire Murphy', 'claire.murphy@email.ie', '+353871234576', '2024-01-14T10:30:00Z', '2024-01-14T10:45:00Z', NULL, '2024-01-14T10:45:00Z', 'Customer requested cancellation', 9.23, 'Customer changed plans', '2024-01-14T10:50:00Z', 'Full refund processed'),
('ord_008', 'ORD-2024-0008', 'user_004', 'delivery', 'completed', NULL, 'addr_003', '{"label": "Home", "address_line1": "8 Ranelagh Road", "city": "Dublin", "postal_code": "D06 W2P4"}', 3.50, '2024-01-09T13:30:00Z', 18.50, NULL, 0.00, 4.25, 26.25, 'paid', 'pm_002', 'card', 'sumup_tx_008', 'https://example.com/invoice/ord_008.pdf', 26, NULL, 'Sarah Wilson', 'sarah.wilson@email.ie', '+353871234570', '2024-01-09T12:45:00Z', '2024-01-09T13:35:00Z', '2024-01-09T13:35:00Z', NULL, NULL, NULL, NULL, NULL, NULL),
('ord_009', 'ORD-2024-0009', 'user_005', 'collection', 'completed', '2024-01-08T09:30:00Z', NULL, NULL, NULL, NULL, 10.50, NULL, 0.00, 2.42, 12.92, 'paid', 'pm_003', 'card', 'sumup_tx_009', 'https://example.com/invoice/ord_009.pdf', 13, NULL, 'Michael Byrne', 'michael.byrne@email.ie', '+353871234571', '2024-01-08T09:00:00Z', '2024-01-08T09:35:00Z', '2024-01-08T09:35:00Z', NULL, NULL, NULL, NULL, NULL, NULL),
('ord_010', 'ORD-2024-0010', 'user_006', 'delivery', 'completed', NULL, 'addr_005', '{"label": "Home", "address_line1": "71 Rathmines Road", "city": "Dublin", "postal_code": "D06 E0W7"}', 3.50, '2024-01-07T14:00:00Z', 21.00, NULL, 0.00, 4.83, 29.33, 'paid', 'pm_004', 'card', 'sumup_tx_010', 'https://example.com/invoice/ord_010.pdf', 29, NULL, 'Emma Kelly', 'emma.kelly@email.ie', '+353871234572', '2024-01-07T13:15:00Z', '2024-01-07T14:05:00Z', '2024-01-07T14:05:00Z', NULL, NULL, NULL, NULL, NULL, NULL);

-- Seed Order Items
INSERT INTO order_items (order_item_id, order_id, item_id, item_name, quantity, unit_price, selected_customizations, line_total) VALUES
('oi_001', 'ord_001', 'item_002', 'Cappuccino', 1, 3.80, '{"Milk Type": "Oat Milk", "Size": "Regular", "Extra Shots": "No Extra Shot"}', 4.30),
('oi_002', 'ord_001', 'item_010', 'Croissant', 1, 3.50, NULL, 3.50),
('oi_003', 'ord_002', 'item_003', 'Latte', 1, 4.00, '{"Milk Type": "Almond Milk", "Size": "Large", "Flavor Shots": ["Vanilla"]}', 5.90),
('oi_004', 'ord_002', 'item_013', 'Turkey & Avocado Sandwich', 1, 7.50, '{"Bread Type": "Whole Grain"}', 8.00),
('oi_005', 'ord_003', 'item_005', 'Flat White', 1, 4.20, '{"Milk Type": "Whole Milk", "Size": "Regular"}', 4.20),
('oi_006', 'ord_003', 'item_012', 'Blueberry Scone', 1, 3.20, NULL, 3.20),
('oi_007', 'ord_003', 'item_001', 'Espresso', 1, 2.50, NULL, 2.50),
('oi_008', 'ord_004', 'item_007', 'Iced Latte', 2, 4.50, '{"Milk Type": "Oat Milk", "Size": "Large"}', 10.80),
('oi_009', 'ord_004', 'item_011', 'Chocolate Muffin', 1, 3.80, NULL, 3.80),
('oi_010', 'ord_004', 'item_010', 'Croissant', 1, 3.50, NULL, 3.50),
('oi_011', 'ord_005', 'item_003', 'Latte', 2, 4.00, '{"Milk Type": "Whole Milk", "Size": "Large"}', 9.60),
('oi_012', 'ord_005', 'item_012', 'Blueberry Scone', 1, 3.20, NULL, 3.20),
('oi_013', 'ord_006', 'item_015', 'Caesar Salad', 1, 8.50, NULL, 8.50),
('oi_014', 'ord_006', 'item_002', 'Cappuccino', 1, 3.80, '{"Milk Type": "Soy Milk", "Size": "Regular"}', 4.30),
('oi_015', 'ord_006', 'item_010', 'Croissant', 1, 3.50, NULL, 3.50),
('oi_016', 'ord_007', 'item_013', 'Turkey & Avocado Sandwich', 1, 7.50, '{"Bread Type": "Sourdough"}', 8.30),
('oi_017', 'ord_008', 'item_016', 'Quinoa Bowl', 2, 9.00, NULL, 18.00),
('oi_018', 'ord_008', 'item_008', 'Cold Brew', 1, 4.00, NULL, 4.00),
('oi_019', 'ord_009', 'item_017', 'Breakfast Burrito', 1, 6.50, NULL, 6.50),
('oi_020', 'ord_009', 'item_002', 'Cappuccino', 1, 3.80, '{"Milk Type": "Oat Milk", "Size": "Regular"}', 4.30),
('oi_021', 'ord_010', 'item_014', 'Veggie Wrap', 2, 6.80, NULL, 13.60),
('oi_022', 'ord_010', 'item_007', 'Iced Latte', 1, 4.50, '{"Milk Type": "Almond Milk", "Size": "Large"}', 5.80),
('oi_023', 'ord_010', 'item_011', 'Chocolate Muffin', 1, 3.80, NULL, 3.80);

-- Seed Order Status History
INSERT INTO order_status_history (history_id, order_id, status, changed_by_user_id, changed_at, notes) VALUES
('osh_001', 'ord_001', 'received', 'user_003', '2024-01-10T13:30:00Z', 'Order placed'),
('osh_002', 'ord_001', 'preparing', 'user_002', '2024-01-10T13:35:00Z', 'Started preparation'),
('osh_003', 'ord_001', 'ready', 'user_002', '2024-01-10T13:50:00Z', 'Ready for collection'),
('osh_004', 'ord_001', 'completed', 'user_002', '2024-01-10T14:15:00Z', 'Customer collected'),
('osh_005', 'ord_002', 'received', 'user_004', '2024-01-11T12:00:00Z', 'Order placed'),
('osh_006', 'ord_002', 'preparing', 'user_002', '2024-01-11T12:05:00Z', 'Started preparation'),
('osh_007', 'ord_002', 'out_for_delivery', 'user_002', '2024-01-11T12:30:00Z', 'Driver assigned'),
('osh_008', 'ord_002', 'completed', 'user_002', '2024-01-11T12:45:00Z', 'Delivered successfully'),
('osh_009', 'ord_004', 'received', 'user_006', '2024-01-14T17:45:00Z', 'Order placed'),
('osh_010', 'ord_004', 'preparing', 'user_002', '2024-01-14T17:50:00Z', 'Started preparation'),
('osh_011', 'ord_004', 'out_for_delivery', 'user_002', '2024-01-14T18:10:00Z', 'Out for delivery'),
('osh_012', 'ord_005', 'received', 'user_003', '2024-01-15T14:30:00Z', 'Order placed'),
('osh_013', 'ord_005', 'preparing', 'user_002', '2024-01-15T14:35:00Z', 'Started preparation'),
('osh_014', 'ord_007', 'received', 'user_010', '2024-01-14T10:30:00Z', 'Order placed'),
('osh_015', 'ord_007', 'cancelled', 'user_010', '2024-01-14T10:45:00Z', 'Customer requested cancellation');

-- Seed Stock History
INSERT INTO stock_history (history_id, item_id, change_type, previous_stock, new_stock, quantity_changed, reason, notes, changed_by_user_id, changed_at, related_order_id) VALUES
('sh_001', 'item_008', 'restock', 15, 35, 20, 'Weekly restock', 'New batch received', 'user_002', '2024-01-08T09:00:00Z', NULL),
('sh_002', 'item_010', 'restock', 25, 55, 30, 'Daily morning bake', 'Fresh croissants', 'user_002', '2024-01-10T07:00:00Z', NULL),
('sh_003', 'item_011', 'restock', 20, 50, 30, 'Daily morning bake', 'Fresh muffins', 'user_002', '2024-01-10T07:00:00Z', NULL),
('sh_004', 'item_012', 'restock', 18, 40, 22, 'Daily morning bake', 'Fresh scones', 'user_002', '2024-01-10T07:00:00Z', NULL),
('sh_005', 'item_010', 'sale', 55, 54, -1, 'Order sale', 'Sold via order', 'user_002', '2024-01-10T13:30:00Z', 'ord_001'),
('sh_006', 'item_013', 'restock', 12, 25, 13, 'Daily prep', 'Fresh sandwiches', 'user_002', '2024-01-11T08:00:00Z', NULL),
('sh_007', 'item_014', 'restock', 10, 23, 13, 'Daily prep', 'Fresh wraps', 'user_002', '2024-01-11T08:00:00Z', NULL),
('sh_008', 'item_008', 'sale', 35, 34, -1, 'Order sale', 'Sold via order', 'user_002', '2024-01-09T12:45:00Z', 'ord_008'),
('sh_009', 'item_010', 'adjustment', 54, 40, -14, 'End of day adjustment', 'Removed stale items', 'user_002', '2024-01-10T21:00:00Z', NULL),
('sh_010', 'item_011', 'adjustment', 50, 35, -15, 'End of day adjustment', 'Removed old stock', 'user_002', '2024-01-10T21:00:00Z', NULL);

-- Seed Delivery Zones
INSERT INTO delivery_zones (zone_id, zone_name, zone_type, zone_boundaries, delivery_fee, minimum_order_value, estimated_delivery_time, is_active, priority, created_at, updated_at) VALUES
('zone_001', 'Dublin City Centre', 'polygon', '{"type": "Polygon", "coordinates": [[[53.3498, -6.2603], [53.3398, -6.2603], [53.3398, -6.2403], [53.3498, -6.2403], [53.3498, -6.2603]]]}', 2.50, 10.00, 30, true, 1, '2023-01-10T10:00:00Z', '2023-12-01T10:00:00Z'),
('zone_002', 'Ranelagh & Rathmines', 'polygon', '{"type": "Polygon", "coordinates": [[[53.3298, -6.2703], [53.3098, -6.2703], [53.3098, -6.2503], [53.3298, -6.2503], [53.3298, -6.2703]]]}', 3.50, 12.00, 40, true, 2, '2023-01-10T10:05:00Z', '2023-12-01T10:00:00Z'),
('zone_003', 'Ballsbridge & Donnybrook', 'polygon', '{"type": "Polygon", "coordinates": [[[53.3298, -6.2403], [53.3098, -6.2403], [53.3098, -6.2203], [53.3298, -6.2203], [53.3298, -6.2403]]]}', 4.00, 15.00, 50, true, 3, '2023-01-10T10:10:00Z', '2023-12-01T10:00:00Z'),
('zone_004', 'Drumcondra & Glasnevin', 'polygon', '{"type": "Polygon", "coordinates": [[[53.3798, -6.2703], [53.3598, -6.2703], [53.3598, -6.2503], [53.3798, -6.2503], [53.3798, -6.2703]]]}', 4.50, 15.00, 55, true, 4, '2023-01-10T10:15:00Z', '2023-12-01T10:00:00Z');

-- Seed Discount Codes
INSERT INTO discount_codes (code_id, code, discount_type, discount_value, applicable_order_types, applicable_category_ids, applicable_item_ids, minimum_order_value, total_usage_limit, per_customer_usage_limit, total_used_count, valid_from, valid_until, status, internal_notes, created_at, updated_at) VALUES
('dc_001', 'FIRST10', 'percentage', 10.00, '["collection", "delivery"]', NULL, NULL, 10.00, 1000, 1, 2, '2023-01-01T00:00:00Z', '2024-12-31T23:59:59Z', 'active', 'First order discount for new customers', '2023-01-10T10:00:00Z', '2024-01-01T10:00:00Z'),
('dc_002', 'SAVE5', 'fixed', 5.00, '["collection", "delivery"]', NULL, NULL, 20.00, NULL, NULL, 45, '2023-06-01T00:00:00Z', '2024-06-30T23:59:59Z', 'active', 'General discount code', '2023-05-25T10:00:00Z', '2024-01-01T10:00:00Z'),
('dc_003', 'BREAKFAST20', 'percentage', 20.00, '["collection"]', '["cat_006"]', NULL, 5.00, 500, 3, 87, '2024-01-01T00:00:00Z', '2024-03-31T23:59:59Z', 'active', 'Morning breakfast special', '2023-12-20T10:00:00Z', '2024-01-01T10:00:00Z'),
('dc_004', 'FREEDELIVERY', 'delivery_fee', 0.00, '["delivery"]', NULL, NULL, 25.00, NULL, NULL, 156, '2023-09-01T00:00:00Z', NULL, 'active', 'Free delivery on orders over 25', '2023-08-25T10:00:00Z', '2024-01-01T10:00:00Z'),
('dc_005', 'WINTER15', 'percentage', 15.00, '["collection", "delivery"]', NULL, NULL, 15.00, 200, 2, 32, '2023-12-01T00:00:00Z', '2024-02-29T23:59:59Z', 'active', 'Winter promotion', '2023-11-25T10:00:00Z', '2024-01-01T10:00:00Z'),
('dc_006', 'EXPIRED', 'percentage', 25.00, '["collection", "delivery"]', NULL, NULL, 10.00, 100, 1, 98, '2023-01-01T00:00:00Z', '2023-12-31T23:59:59Z', 'expired', 'Old promotional code', '2023-01-01T10:00:00Z', '2023-12-31T10:00:00Z');

-- Seed Discount Usage
INSERT INTO discount_usage (usage_id, code_id, user_id, order_id, discount_amount_applied, used_at) VALUES
('du_001', 'dc_001', 'user_004', 'ord_002', 1.20, '2024-01-11T12:00:00Z'),
('du_002', 'dc_002', 'user_006', 'ord_004', 5.00, '2024-01-14T17:45:00Z');

-- Seed Loyalty Accounts
INSERT INTO loyalty_accounts (loyalty_account_id, user_id, current_points_balance, total_points_earned, total_points_redeemed, total_points_expired, referral_count, spin_wheel_available_count, next_spin_available_at, created_at) VALUES
('la_001', 'user_003', 320, 500, 150, 30, 2, 1, '2024-01-20T00:00:00Z', '2023-03-20T14:30:00Z'),
('la_002', 'user_004', 450, 600, 100, 50, 1, 0, '2024-01-18T00:00:00Z', '2023-04-05T09:15:00Z'),
('la_003', 'user_005', 180, 350, 170, 0, 0, 1, '2024-01-22T00:00:00Z', '2023-05-12T16:20:00Z'),
('la_004', 'user_006', 580, 750, 120, 50, 2, 2, '2024-01-16T00:00:00Z', '2023-06-18T13:45:00Z'),
('la_005', 'user_007', 95, 150, 50, 5, 0, 0, '2024-01-25T00:00:00Z', '2023-07-22T11:10:00Z'),
('la_006', 'user_008', 275, 480, 180, 25, 1, 1, '2024-01-21T00:00:00Z', '2023-08-30T10:25:00Z'),
('la_007', 'user_009', 140, 200, 60, 0, 0, 0, '2024-01-19T00:00:00Z', '2023-09-14T15:35:00Z'),
('la_008', 'user_010', 360, 520, 150, 10, 1, 1, '2024-01-17T00:00:00Z', '2023-10-08T12:50:00Z');

-- Seed Points Transactions
INSERT INTO points_transactions (transaction_id, loyalty_account_id, transaction_type, points_amount, order_id, reason, adjusted_by_user_id, running_balance, created_at, expires_at) VALUES
('pt_001', 'la_001', 'earned', 10, 'ord_001', 'Order purchase', NULL, 10, '2024-01-10T14:15:00Z', '2025-01-10T14:15:00Z'),
('pt_002', 'la_002', 'earned', 17, 'ord_002', 'Order purchase', NULL, 17, '2024-01-11T12:45:00Z', '2025-01-11T12:45:00Z'),
('pt_003', 'la_003', 'earned', 10, 'ord_003', 'Order purchase', NULL, 10, '2024-01-12T10:35:00Z', '2025-01-12T10:35:00Z'),
('pt_004', 'la_004', 'earned', 22, 'ord_004', 'Order purchase', NULL, 22, '2024-01-14T18:00:00Z', '2025-01-14T18:00:00Z'),
('pt_005', 'la_001', 'earned', 13, 'ord_005', 'Order purchase', NULL, 23, '2024-01-15T14:35:00Z', '2025-01-15T14:35:00Z'),
('pt_006', 'la_006', 'earned', 20, 'ord_006', 'Order purchase', NULL, 20, '2024-01-13T16:05:00Z', '2025-01-13T16:05:00Z'),
('pt_007', 'la_002', 'earned', 26, 'ord_008', 'Order purchase', NULL, 43, '2024-01-09T13:35:00Z', '2025-01-09T13:35:00Z'),
('pt_008', 'la_003', 'earned', 13, 'ord_009', 'Order purchase', NULL, 23, '2024-01-08T09:35:00Z', '2025-01-08T09:35:00Z'),
('pt_009', 'la_004', 'earned', 29, 'ord_010', 'Order purchase', NULL, 51, '2024-01-07T14:05:00Z', '2025-01-07T14:05:00Z'),
('pt_010', 'la_001', 'earned', 50, NULL, 'Referral bonus', NULL, 73, '2023-04-05T09:20:00Z', '2024-04-05T09:20:00Z'),
('pt_011', 'la_001', 'redeemed', -100, NULL, 'Redeemed reward', NULL, -27, '2023-09-15T10:00:00Z', NULL),
('pt_012', 'la_001', 'manual_adjustment', 50, NULL, 'Goodwill points', 'user_001', 23, '2023-10-20T14:00:00Z', '2024-10-20T14:00:00Z'),
('pt_013', 'la_002', 'earned', 100, NULL, 'Spin wheel prize', NULL, 143, '2023-11-12T16:30:00Z', '2024-11-12T16:30:00Z'),
('pt_014', 'la_004', 'earned', 50, NULL, 'Referral bonus', NULL, 101, '2023-08-30T10:30:00Z', '2024-08-30T10:30:00Z');

-- Seed Badges
INSERT INTO badges (badge_id, name, description, unlock_criteria, icon_url, is_active, sort_order, created_at) VALUES
('badge_001', 'First Order', 'Completed your first order', '{"type": "order_count", "value": 1}', 'https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a', true, 1, '2023-01-10T10:00:00Z'),
('badge_002', 'Loyal Customer', 'Completed 10 orders', '{"type": "order_count", "value": 10}', 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60', true, 2, '2023-01-10T10:05:00Z'),
('badge_003', 'Coffee Lover', 'Ordered 25 coffee drinks', '{"type": "category_order_count", "category": "cat_001", "value": 25}', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93', true, 3, '2023-01-10T10:10:00Z'),
('badge_004', 'Early Bird', 'Placed 5 orders before 9 AM', '{"type": "time_based_orders", "before": "09:00", "value": 5}', 'https://images.unsplash.com/photo-1541753236788-b0ac1fc5009d', true, 4, '2023-01-10T10:15:00Z'),
('badge_005', 'Points Master', 'Earned 500 loyalty points', '{"type": "points_earned", "value": 500}', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1', true, 5, '2023-01-10T10:20:00Z'),
('badge_006', 'Referral Champion', 'Referred 3 friends', '{"type": "referral_count", "value": 3}', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19', true, 6, '2023-01-10T10:25:00Z'),
('badge_007', 'Breakfast Fan', 'Ordered 10 breakfast items', '{"type": "category_order_count", "category": "cat_006", "value": 10}', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666', true, 7, '2023-01-10T10:30:00Z');

-- Seed User Badges
INSERT INTO user_badges (user_badge_id, loyalty_account_id, badge_id, earned_at) VALUES
('ub_001', 'la_001', 'badge_001', '2024-01-10T14:15:00Z'),
('ub_002', 'la_001', 'badge_002', '2024-01-13T10:00:00Z'),
('ub_003', 'la_001', 'badge_005', '2024-01-14T15:30:00Z'),
('ub_004', 'la_002', 'badge_001', '2024-01-11T12:45:00Z'),
('ub_005', 'la_002', 'badge_005', '2024-01-13T09:20:00Z'),
('ub_006', 'la_003', 'badge_001', '2024-01-12T10:35:00Z'),
('ub_007', 'la_004', 'badge_001', '2024-01-07T14:05:00Z'),
('ub_008', 'la_004', 'badge_002', '2024-01-12T11:00:00Z'),
('ub_009', 'la_004', 'badge_005', '2024-01-14T16:00:00Z'),
('ub_010', 'la_006', 'badge_001', '2024-01-13T16:05:00Z');

-- Seed Rewards
INSERT INTO rewards (reward_id, name, description, points_cost, reward_type, reward_value, expiry_days_after_redemption, stock_limit, stock_remaining, status, image_url, availability_status, sort_order, created_at, updated_at) VALUES
('reward_001', 'Free Coffee', 'Any regular size hot drink', 100, 'discount', '{"type": "free_item", "category": "cat_001", "max_value": 4.50}', 30, NULL, NULL, 'active', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', 'available', 1, '2023-01-10T10:00:00Z', '2024-01-01T10:00:00Z'),
('reward_002', '€5 Off', '€5 off your next order', 200, 'discount', '{"type": "fixed_discount", "amount": 5.00}', 60, NULL, NULL, 'active', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da', 'available', 2, '2023-01-10T10:05:00Z', '2024-01-01T10:00:00Z'),
('reward_003', 'Free Pastry', 'Any pastry from our selection', 80, 'discount', '{"type": "free_item", "category": "cat_003", "max_value": 4.00}', 14, NULL, NULL, 'active', 'https://images.unsplash.com/photo-1509440159596-0249088772ff', 'available', 3, '2023-01-10T10:10:00Z', '2024-01-01T10:00:00Z'),
('reward_004', '20% Off Order', '20% off any order', 250, 'discount', '{"type": "percentage_discount", "percentage": 20, "max_discount": 10.00}', 30, NULL, NULL, 'active', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19', 'available', 4, '2023-01-10T10:15:00Z', '2024-01-01T10:00:00Z'),
('reward_005', 'Free Sandwich', 'Any sandwich from our menu', 150, 'discount', '{"type": "free_item", "category": "cat_004", "max_value": 8.00}', 7, NULL, NULL, 'active', 'https://images.unsplash.com/photo-1553909489-cd47e0907980', 'available', 5, '2023-01-10T10:20:00Z', '2024-01-01T10:00:00Z'),
('reward_006', 'Free Delivery', 'Free delivery on your next order', 120, 'delivery', '{"type": "free_delivery"}', 45, NULL, NULL, 'active', 'https://images.unsplash.com/photo-1526367790999-0150786686a2', 'available', 6, '2023-01-10T10:25:00Z', '2024-01-01T10:00:00Z'),
('reward_007', 'Branded Mug', 'Limited edition coffee shop mug', 500, 'physical', '{"type": "merchandise", "item": "mug"}', NULL, 50, 32, 'active', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d', 'limited', 7, '2023-01-10T10:30:00Z', '2024-01-12T10:00:00Z');

-- Seed Redeemed Rewards
INSERT INTO redeemed_rewards (redeemed_reward_id, loyalty_account_id, reward_id, reward_code, points_deducted, redeemed_at, expires_at, usage_status, used_in_order_id, used_at) VALUES
('rr_001', 'la_001', 'reward_001', 'FREECOF-001-JG84H3', 100, '2023-09-15T10:00:00Z', '2023-10-15T10:00:00Z', 'used', 'ord_001', '2024-01-10T13:30:00Z'),
('rr_002', 'la_002', 'reward_003', 'PASTRY-002-K9D3H8', 80, '2024-01-05T14:30:00Z', '2024-01-19T14:30:00Z', 'unused', NULL, NULL),
('rr_003', 'la_004', 'reward_002', '5OFF-003-HG93J4', 200, '2023-12-20T11:00:00Z', '2024-02-18T11:00:00Z', 'unused', NULL, NULL),
('rr_004', 'la_006', 'reward_006', 'FREEDEL-004-M8K3H9', 120, '2024-01-08T16:00:00Z', '2024-02-22T16:00:00Z', 'unused', NULL, NULL),
('rr_005', 'la_001', 'reward_003', 'PASTRY-005-J9H4G8', 80, '2023-11-10T09:30:00Z', '2023-11-24T09:30:00Z', 'expired', NULL, NULL);

-- Seed Catering Inquiries
INSERT INTO catering_inquiries (inquiry_id, inquiry_number, user_id, contact_name, contact_email, contact_phone, company_name, event_type, event_type_other, event_date, event_start_time, event_end_time, event_location_address, event_location_city, event_location_postal_code, event_location_type, guest_count, guest_count_min, guest_count_max, dietary_requirements, dietary_notes, menu_preferences, preferred_package, budget_range, additional_details, attached_files, marketing_opt_in, status, admin_notes, submitted_at, updated_at) VALUES
('ci_001', 'CAT-2024-0001', 'user_003', 'John Smith', 'john.smith@email.ie', '+353871234569', 'Tech Corp Ltd', 'corporate', NULL, '2024-02-15T00:00:00Z', '09:00', '17:00', '123 Business Park', 'Dublin', 'D18 X4Y5', 'office', 50, 45, 55, '["vegetarian", "vegan", "gluten-free"]', 'About 10 people with dietary restrictions', 'Breakfast and lunch service needed', 'premium', '€1000-€1500', 'We''d like coffee service throughout the day', '[]', true, 'quoted', 'Sent initial quote on Jan 12', '2024-01-10T10:30:00Z', '2024-01-12T14:00:00Z'),
('ci_002', 'CAT-2024-0002', 'user_006', 'Emma Kelly', 'emma.kelly@email.ie', '+353871234572', NULL, 'birthday', NULL, '2024-02-22T00:00:00Z', '14:00', '18:00', '45 Residential Street', 'Dublin', 'D06 K8W2', 'home', 25, 20, 30, '["nut-free"]', 'One child with severe nut allergy', 'Finger foods and desserts', 'standard', '€500-€750', 'Birthday party for 8 year old', '[]', false, 'confirmed', 'Deposit received', '2024-01-12T15:20:00Z', '2024-01-14T10:00:00Z'),
('ci_003', 'CAT-2024-0003', NULL, 'Patricia O''Brien', 'patricia.obrien@email.ie', '+353871234580', NULL, 'wedding', NULL, '2024-06-15T00:00:00Z', '15:00', '23:00', 'Grand Hotel Ballroom', 'Dublin', 'D02 F5X9', 'venue', 120, 100, 150, '["vegetarian", "vegan", "halal"]', 'Diverse dietary needs', 'Full catering service with coffee bar', 'luxury', '€3000+', 'Wedding reception, need coffee station and dessert bar', '[]', true, 'new', NULL, '2024-01-14T11:45:00Z', '2024-01-14T11:45:00Z'),
('ci_004', 'CAT-2024-0004', 'user_005', 'Michael Byrne', 'michael.byrne@email.ie', '+353871234571', 'Byrne Consulting', 'meeting', NULL, '2024-01-25T00:00:00Z', '10:00', '13:00', '78 Conference Center', 'Dublin', 'D04 Y2H8', 'office', 15, 12, 18, '[]', NULL, 'Coffee, pastries and sandwiches', 'standard', '€250-€500', 'Half day workshop catering', '[]', false, 'in_progress', 'Menu being finalized', '2024-01-13T09:30:00Z', '2024-01-14T16:20:00Z');

-- Seed Catering Quotes
INSERT INTO catering_quotes (quote_id, inquiry_id, quote_number, line_items, subtotal, additional_fees, tax_amount, grand_total, valid_until, terms, quote_pdf_url, created_at, sent_at, accepted_at) VALUES
('cq_001', 'ci_001', 'QTE-2024-0001', '[{"item": "Coffee Station", "quantity": 1, "unit_price": 150.00, "total": 150.00}, {"item": "Pastry Selection", "quantity": 50, "unit_price": 3.50, "total": 175.00}, {"item": "Sandwich Platter", "quantity": 50, "unit_price": 7.00, "total": 350.00}, {"item": "Staff Service", "quantity": 8, "unit_price": 25.00, "total": 200.00}]', 875.00, '[{"name": "Setup Fee", "amount": 50.00}, {"name": "Delivery", "amount": 25.00}]', 201.25, 1151.25, '2024-02-01T23:59:59Z', 'Payment terms: 50% deposit required, balance due 7 days before event', 'https://example.com/quotes/cq_001.pdf', '2024-01-12T14:00:00Z', '2024-01-12T14:30:00Z', '2024-01-13T10:00:00Z'),
('cq_002', 'ci_002', 'QTE-2024-0002', '[{"item": "Party Platter", "quantity": 3, "unit_price": 65.00, "total": 195.00}, {"item": "Dessert Box", "quantity": 25, "unit_price": 5.50, "total": 137.50}, {"item": "Beverage Package", "quantity": 25, "unit_price": 3.00, "total": 75.00}]', 407.50, '[{"name": "Delivery", "amount": 15.00}]', 93.69, 516.19, '2024-02-08T23:59:59Z', 'Full payment due 3 days before event', 'https://example.com/quotes/cq_002.pdf', '2024-01-13T16:00:00Z', '2024-01-13T16:30:00Z', '2024-01-14T09:00:00Z');

-- Seed Invoices
INSERT INTO invoices (invoice_id, invoice_number, order_id, catering_inquiry_id, user_id, customer_name, customer_email, customer_phone, customer_address, line_items, subtotal, discount_amount, delivery_fee, tax_amount, grand_total, payment_status, payment_method, sumup_transaction_id, issue_date, due_date, paid_at, invoice_pdf_url, notes, created_at, updated_at) VALUES
('inv_001', 'INV-2024-0001', 'ord_001', NULL, 'user_003', 'John Smith', 'john.smith@email.ie', '+353871234569', '15 Grafton Street, Apartment 3B, Dublin D02 X285', '[{"item": "Cappuccino (Oat Milk, Regular)", "quantity": 1, "unit_price": 4.30, "total": 4.30}, {"item": "Croissant", "quantity": 1, "unit_price": 3.50, "total": 3.50}]', 7.80, 0.00, NULL, 1.79, 9.59, 'paid', 'credit_card', 'sumup_tx_001', '2024-01-10T14:15:00Z', NULL, '2024-01-10T14:15:00Z', 'https://example.com/invoices/inv_001.pdf', NULL, '2024-01-10T14:15:00Z', '2024-01-10T14:15:00Z'),
('inv_002', 'INV-2024-0002', 'ord_002', NULL, 'user_004', 'Sarah Wilson', 'sarah.wilson@email.ie', '+353871234570', '8 Ranelagh Road, Dublin D06 W2P4', '[{"item": "Latte (Almond Milk, Large, Vanilla)", "quantity": 1, "unit_price": 5.90, "total": 5.90}, {"item": "Turkey & Avocado Sandwich (Whole Grain)", "quantity": 1, "unit_price": 8.00, "total": 8.00}]', 13.90, 1.20, 3.50, 2.68, 16.98, 'paid', 'credit_card', 'sumup_tx_002', '2024-01-11T12:45:00Z', NULL, '2024-01-11T12:45:00Z', 'https://example.com/invoices/inv_002.pdf', NULL, '2024-01-11T12:45:00Z', '2024-01-11T12:45:00Z'),
('inv_003', 'INV-2024-0003', NULL, 'ci_001', 'user_003', 'John Smith', 'john.smith@email.ie', '+353871234569', '123 Business Park, Dublin D18 X4Y5', '[{"item": "Coffee Station", "quantity": 1, "unit_price": 150.00, "total": 150.00}, {"item": "Pastry Selection", "quantity": 50, "unit_price": 3.50, "total": 175.00}, {"item": "Sandwich Platter", "quantity": 50, "unit_price": 7.00, "total": 350.00}, {"item": "Staff Service", "quantity": 8, "unit_price": 25.00, "total": 200.00}, {"item": "Setup Fee", "quantity": 1, "unit_price": 50.00, "total": 50.00}, {"item": "Delivery", "quantity": 1, "unit_price": 25.00, "total": 25.00}]', 950.00, 0.00, NULL, 201.25, 1151.25, 'pending', 'bank_transfer', NULL, '2024-01-13T10:00:00Z', '2024-02-08T23:59:59Z', NULL, 'https://example.com/invoices/inv_003.pdf', 'Catering deposit invoice - 50% of total', '2024-01-13T10:00:00Z', '2024-01-13T10:00:00Z');

-- Seed System Settings
INSERT INTO system_settings (setting_id, setting_key, setting_value, setting_type, updated_at, updated_by_user_id) VALUES
('set_001', 'store_hours', '{"monday": {"open": "07:00", "close": "19:00"}, "tuesday": {"open": "07:00", "close": "19:00"}, "wednesday": {"open": "07:00", "close": "19:00"}, "thursday": {"open": "07:00", "close": "19:00"}, "friday": {"open": "07:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "20:00"}, "sunday": {"open": "09:00", "close": "18:00"}}', 'json', '2024-01-01T10:00:00Z', 'user_001'),
('set_002', 'tax_rate', '0.23', 'number', '2023-01-10T10:00:00Z', 'user_001'),
('set_003', 'loyalty_points_rate', '1', 'number', '2023-01-10T10:05:00Z', 'user_001'),
('set_004', 'minimum_order_delivery', '10.00', 'number', '2023-01-10T10:10:00Z', 'user_001'),
('set_005', 'minimum_order_collection', '5.00', 'number', '2023-01-10T10:15:00Z', 'user_001'),
('set_006', 'order_prep_time_collection', '15', 'number', '2023-01-10T10:20:00Z', 'user_001'),
('set_007', 'order_prep_time_delivery', '30', 'number', '2023-01-10T10:25:00Z', 'user_001'),
('set_008', 'store_name', '"Dublin Coffee House"', 'string', '2023-01-10T10:00:00Z', 'user_001'),
('set_009', 'store_email', '"info@coffeeshop.ie"', 'string', '2023-01-10T10:00:00Z', 'user_001'),
('set_010', 'store_phone', '"+353871234567"', 'string', '2023-01-10T10:00:00Z', 'user_001'),
('set_011', 'store_address', '{"line1": "42 Main Street", "line2": null, "city": "Dublin", "postal_code": "D02 X123"}', 'json', '2023-01-10T10:00:00Z', 'user_001'),
('set_012', 'collection_time_slots', '["09:00-09:30", "09:30-10:00", "10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00", "12:00-12:30", "12:30-13:00", "13:00-13:30", "13:30-14:00", "14:00-14:30", "14:30-15:00", "15:00-15:30", "15:30-16:00", "16:00-16:30", "16:30-17:00"]', 'json', '2023-01-10T10:30:00Z', 'user_001'),
('set_013', 'featured_categories', '["cat_001", "cat_003", "cat_004"]', 'json', '2024-01-01T10:00:00Z', 'user_002'),
('set_014', 'max_order_items', '20', 'number', '2023-01-10T10:35:00Z', 'user_001'),
('set_015', 'maintenance_mode', 'false', 'boolean', '2024-01-15T09:00:00Z', 'user_001');

-- Seed Activity Logs
INSERT INTO activity_logs (log_id, user_id, action_type, entity_type, entity_id, description, changes, ip_address, user_agent, created_at) VALUES
('log_001', 'user_001', 'create', 'menu_item', 'item_009', 'Created limited edition menu item', '{"name": "Pumpkin Spice Latte", "price": 5.00}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-09-01T10:00:00Z'),
('log_002', 'user_002', 'update', 'order', 'ord_001', 'Updated order status', '{"status": {"from": "preparing", "to": "ready"}}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-10T13:50:00Z'),
('log_003', 'user_002', 'update', 'order', 'ord_002', 'Updated order status', '{"status": {"from": "preparing", "to": "out_for_delivery"}}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-11T12:30:00Z'),
('log_004', 'user_001', 'create', 'discount_code', 'dc_005', 'Created winter promotion code', '{"code": "WINTER15", "discount": 15}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-11-25T10:00:00Z'),
('log_005', 'user_002', 'update', 'menu_item', 'item_008', 'Updated stock level', '{"current_stock": {"from": 35, "to": 25}}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-08T09:00:00Z'),
('log_006', 'user_001', 'update', 'system_settings', 'set_001', 'Updated store hours', '{"friday": {"close": {"from": "19:00", "to": "20:00"}}}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2024-01-01T10:00:00Z'),
('log_007', 'user_002', 'create', 'catering_quote', 'cq_001', 'Created catering quote', '{"inquiry_id": "ci_001", "total": 1151.25}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-12T14:00:00Z'),
('log_008', 'user_001', 'update', 'user', 'user_007', 'Manually added loyalty points', '{"points": {"adjustment": 50, "reason": "goodwill"}}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-10-20T14:00:00Z'),
('log_009', 'user_002', 'update', 'order', 'ord_007', 'Cancelled and refunded order', '{"status": "cancelled", "refund_amount": 9.23}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-14T10:45:00Z'),
('log_010', 'user_001', 'create', 'reward', 'reward_007', 'Added new merchandise reward', '{"name": "Branded Mug", "points_cost": 500}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-01-10T10:30:00Z'),
('log_011', 'user_002', 'update', 'menu_item', 'item_010', 'Restocked pastries', '{"current_stock": {"from": 25, "to": 55}}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-10T07:00:00Z'),
('log_012', 'user_001', 'delete', 'discount_code', 'dc_006', 'Archived expired discount code', '{"code": "EXPIRED", "status": "expired"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-12-31T10:00:00Z'),
('log_013', 'user_002', 'update', 'catering_inquiry', 'ci_001', 'Updated inquiry status', '{"status": {"from": "new", "to": "quoted"}}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-12T14:00:00Z'),
('log_014', 'user_002', 'update', 'order', 'ord_004', 'Added internal note', '{"internal_notes": "Customer called to confirm address"}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2024-01-14T17:55:00Z'),
('log_015', 'user_001', 'update', 'system_settings', 'set_015', 'Disabled maintenance mode', '{"maintenance_mode": {"from": true, "to": false}}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2024-01-15T09:00:00Z');

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_is_active ON menu_items(is_active);
CREATE INDEX idx_loyalty_accounts_user_id ON loyalty_accounts(user_id);
CREATE INDEX idx_points_transactions_loyalty_account_id ON points_transactions(loyalty_account_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_catering_inquiries_status ON catering_inquiries(status);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);