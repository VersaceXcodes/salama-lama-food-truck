-- Migration: Fix guest order support
-- This migration allows orders to be placed by guest users by making user_id nullable
-- and adding ticket_number and tracking_token columns for guest order tracking.

-- Add ticket_number and tracking_token columns if they don't exist
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tracking_token TEXT;

-- Make user_id nullable to support guest orders
ALTER TABLE orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Update the foreign key constraint to remain in place (it will allow NULL values)
-- No change needed to the FK constraint itself - it automatically allows NULL when the column is nullable

-- Add index for ticket_number for guest order lookups
CREATE INDEX IF NOT EXISTS idx_orders_ticket_number ON orders(ticket_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);

-- Make changed_by_user_id nullable in order_status_history to support guest order status changes
ALTER TABLE order_status_history 
  ALTER COLUMN changed_by_user_id DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN orders.user_id IS 'User ID - NULL for guest orders, references users(user_id) for authenticated users';
COMMENT ON COLUMN orders.ticket_number IS 'Guest-friendly ticket number for order tracking (e.g., SL-123456)';
COMMENT ON COLUMN orders.tracking_token IS 'Secure token for guest order tracking without authentication';
COMMENT ON COLUMN order_status_history.changed_by_user_id IS 'User ID who changed status - NULL for guest orders or system changes';
