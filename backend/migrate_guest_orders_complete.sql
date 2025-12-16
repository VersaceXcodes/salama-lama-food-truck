-- Migration: Complete guest orders support
-- This migration enables full guest checkout by making all user_id foreign keys nullable
-- Date: 2025-12-16

-- Step 1: Make order_status_history.changed_by_user_id nullable (for guest orders)
ALTER TABLE order_status_history ALTER COLUMN changed_by_user_id DROP NOT NULL;

-- Step 2: Make stock_history.changed_by_user_id nullable (for guest orders)
ALTER TABLE stock_history ALTER COLUMN changed_by_user_id DROP NOT NULL;

-- Step 3: Make invoices.user_id nullable (for guest orders)
ALTER TABLE invoices ALTER COLUMN user_id DROP NOT NULL;

-- Verification queries (run these after migration):
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'order_status_history' AND column_name = 'changed_by_user_id';
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'stock_history' AND column_name = 'changed_by_user_id';
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'user_id';
