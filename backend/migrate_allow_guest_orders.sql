-- Migration: Allow guest orders (NULL user_id in orders table)
-- This migration enables guest checkout by making user_id nullable
-- Date: 2025-12-16

-- Step 1: Make orders.user_id nullable to support guest orders
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Update the foreign key constraint to allow NULL
-- (Foreign key already allows NULL by default, no changes needed)

-- Step 3: Verify the change
-- You can run: SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id';
