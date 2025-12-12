-- Cleanup script for browser test users
-- Run this script before browser testing to ensure clean test data
-- This script cleans up all test users that might be created during browser testing

BEGIN;

-- Cleanup test.signup@example.com (primary browser test user)
DO $$
DECLARE
    v_user_id TEXT;
    v_discount_code TEXT;
BEGIN
    SELECT user_id, first_order_discount_code INTO v_user_id, v_discount_code 
    FROM users 
    WHERE email = 'test.signup@example.com' OR phone = '+353871234599';
    
    IF v_user_id IS NOT NULL THEN
        -- Delete discount code if it exists
        IF v_discount_code IS NOT NULL THEN
            DELETE FROM discount_usage WHERE discount_code_id IN (SELECT code_id FROM discount_codes WHERE code = v_discount_code);
            DELETE FROM discount_codes WHERE code = v_discount_code;
        END IF;
        
        -- Delete related records in order of dependencies
        DELETE FROM activity_logs WHERE user_id = v_user_id;
        DELETE FROM redeemed_rewards WHERE user_id = v_user_id;
        DELETE FROM user_badges WHERE user_id = v_user_id;
        DELETE FROM points_transactions WHERE loyalty_account_id IN (SELECT loyalty_account_id FROM loyalty_accounts WHERE user_id = v_user_id);
        DELETE FROM loyalty_accounts WHERE user_id = v_user_id;
        DELETE FROM discount_usage WHERE user_id = v_user_id;
        DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE user_id = v_user_id);
        DELETE FROM order_status_history WHERE order_id IN (SELECT order_id FROM orders WHERE user_id = v_user_id);
        DELETE FROM orders WHERE user_id = v_user_id;
        DELETE FROM catering_inquiries WHERE user_id = v_user_id;
        DELETE FROM email_verifications WHERE user_id = v_user_id;
        DELETE FROM password_resets WHERE user_id = v_user_id;
        DELETE FROM payment_methods WHERE user_id = v_user_id;
        DELETE FROM addresses WHERE user_id = v_user_id;
        DELETE FROM newsletter_subscribers WHERE email = 'test.signup@example.com';
        
        -- Finally, delete the user
        DELETE FROM users WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Browser test user (test.signup@example.com / +353871234599) and all related records deleted successfully';
    ELSE
        RAISE NOTICE 'Browser test user not found - nothing to clean up';
    END IF;
END $$;

-- Cleanup other potential test users
DO $$
DECLARE
    v_user_id TEXT;
BEGIN
    SELECT user_id INTO v_user_id FROM users WHERE email = 'newcustomer@test.ie';
    
    IF v_user_id IS NOT NULL THEN
        -- Delete related records
        DELETE FROM activity_logs WHERE user_id = v_user_id;
        DELETE FROM redeemed_rewards WHERE user_id = v_user_id;
        DELETE FROM user_badges WHERE user_id = v_user_id;
        DELETE FROM points_transactions WHERE loyalty_account_id IN (SELECT loyalty_account_id FROM loyalty_accounts WHERE user_id = v_user_id);
        DELETE FROM loyalty_accounts WHERE user_id = v_user_id;
        DELETE FROM discount_usage WHERE user_id = v_user_id;
        DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE user_id = v_user_id);
        DELETE FROM order_status_history WHERE order_id IN (SELECT order_id FROM orders WHERE user_id = v_user_id);
        DELETE FROM orders WHERE user_id = v_user_id;
        DELETE FROM catering_inquiries WHERE user_id = v_user_id;
        DELETE FROM email_verifications WHERE user_id = v_user_id;
        DELETE FROM password_resets WHERE user_id = v_user_id;
        DELETE FROM payment_methods WHERE user_id = v_user_id;
        DELETE FROM addresses WHERE user_id = v_user_id;
        DELETE FROM newsletter_subscribers WHERE email = 'newcustomer@test.ie';
        DELETE FROM users WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Test user newcustomer@test.ie deleted successfully';
    END IF;
END $$;

COMMIT;
