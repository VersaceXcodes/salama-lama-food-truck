-- Cleanup script for test user: newcustomer@test.ie
-- Run this script before browser testing to ensure clean test data

BEGIN;

-- Find the user_id for the test user
DO $$
DECLARE
    v_user_id TEXT;
BEGIN
    SELECT user_id INTO v_user_id FROM users WHERE email = 'newcustomer@test.ie';
    
    IF v_user_id IS NOT NULL THEN
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
        DELETE FROM newsletter_subscribers WHERE email = 'newcustomer@test.ie';
        
        -- Finally, delete the user
        DELETE FROM users WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Test user newcustomer@test.ie and all related records deleted successfully';
    ELSE
        RAISE NOTICE 'Test user newcustomer@test.ie not found - nothing to clean up';
    END IF;
END $$;

COMMIT;
