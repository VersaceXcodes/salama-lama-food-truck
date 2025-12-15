-- Migration: Add ticket_number and tracking_token to orders table
-- This enables guest-friendly order tracking without login

-- Add new columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_ticket_number ON orders(ticket_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);

-- Update existing orders to have ticket numbers
-- Using order_id to create unique ticket numbers (SL-NNNNNN format)
DO $$
DECLARE
    r RECORD;
    ticket_num TEXT;
    counter INT;
BEGIN
    counter := 1;
    FOR r IN SELECT order_id FROM orders WHERE ticket_number IS NULL ORDER BY created_at
    LOOP
        ticket_num := 'SL-' || LPAD(counter::TEXT, 6, '0');
        UPDATE orders 
        SET ticket_number = ticket_num,
            tracking_token = md5(random()::text || clock_timestamp()::text || order_id)
        WHERE order_id = r.order_id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make ticket_number and tracking_token NOT NULL after backfill
ALTER TABLE orders ALTER COLUMN ticket_number SET NOT NULL;
ALTER TABLE orders ALTER COLUMN tracking_token SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN orders.ticket_number IS 'Human-friendly order ticket number (e.g., SL-000123)';
COMMENT ON COLUMN orders.tracking_token IS 'Secure token for guest order tracking';
