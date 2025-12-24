-- ============================================
-- MIGRATION: Menu Builder Configuration
-- This adds tables for the step-by-step builder flow for Subs/Wraps categories
-- ============================================

-- Drop if exists for clean migration
DROP TABLE IF EXISTS builder_step_items CASCADE;
DROP TABLE IF EXISTS builder_steps CASCADE;
DROP TABLE IF EXISTS builder_config CASCADE;

-- ============================================
-- Builder Config Table
-- Stores the overall configuration: which categories trigger the builder
-- ============================================
CREATE TABLE builder_config (
    config_id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    builder_category_ids JSONB NOT NULL DEFAULT '[]', -- Array of category IDs that trigger the builder (e.g., Subs, Wraps)
    include_base_item_price BOOLEAN NOT NULL DEFAULT false, -- Whether to include the original item price in total
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- ============================================
-- Builder Steps Table
-- Defines each step in the builder flow (Base, Protein, Toppings, Sauce)
-- ============================================
CREATE TABLE builder_steps (
    step_id TEXT PRIMARY KEY,
    config_id TEXT NOT NULL REFERENCES builder_config(config_id) ON DELETE CASCADE,
    step_name TEXT NOT NULL, -- e.g., 'Choose Your Base', 'Pick Your Protein'
    step_key TEXT NOT NULL, -- e.g., 'base', 'protein', 'toppings', 'sauce'
    step_type TEXT NOT NULL DEFAULT 'single', -- 'single' or 'multiple'
    is_required BOOLEAN NOT NULL DEFAULT true,
    min_selections INTEGER NOT NULL DEFAULT 1,
    max_selections INTEGER, -- NULL means unlimited for 'multiple' type
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- ============================================
-- Builder Step Items Table
-- Links menu items to builder steps (which items can be selected in each step)
-- ============================================
CREATE TABLE builder_step_items (
    step_item_id TEXT PRIMARY KEY,
    step_id TEXT NOT NULL REFERENCES builder_steps(step_id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    -- Override price if needed (NULL means use item's original price)
    override_price DECIMAL(10, 2),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    UNIQUE(step_id, item_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_builder_steps_config_id ON builder_steps(config_id);
CREATE INDEX idx_builder_steps_sort_order ON builder_steps(sort_order);
CREATE INDEX idx_builder_step_items_step_id ON builder_step_items(step_id);
CREATE INDEX idx_builder_step_items_item_id ON builder_step_items(item_id);

-- ============================================
-- SEED DATA: Create initial builder configuration
-- ============================================

-- First, let's find or create the Subs and Wraps categories
-- Check if they exist, if not we'll use placeholder IDs

DO $$
DECLARE
    v_config_id TEXT := 'builder_config_001';
    v_subs_category_id TEXT;
    v_wraps_category_id TEXT;
    v_sandwiches_category_id TEXT;
    v_base_step_id TEXT := 'step_base_001';
    v_protein_step_id TEXT := 'step_protein_001';
    v_toppings_step_id TEXT := 'step_toppings_001';
    v_sauce_step_id TEXT := 'step_sauce_001';
    v_now TEXT := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
BEGIN
    -- Get existing category IDs (Sandwiches category exists in seed data)
    SELECT category_id INTO v_sandwiches_category_id FROM categories WHERE name = 'Sandwiches' LIMIT 1;
    
    -- Create Subs category if it doesn't exist
    SELECT category_id INTO v_subs_category_id FROM categories WHERE name = 'Subs' LIMIT 1;
    IF v_subs_category_id IS NULL THEN
        v_subs_category_id := 'cat_subs_001';
        INSERT INTO categories (category_id, name, description, sort_order, created_at)
        VALUES (v_subs_category_id, 'Subs', 'Build your own submarine sandwiches', 7, v_now);
    END IF;
    
    -- Create Wraps category if it doesn't exist
    SELECT category_id INTO v_wraps_category_id FROM categories WHERE name = 'Wraps' LIMIT 1;
    IF v_wraps_category_id IS NULL THEN
        v_wraps_category_id := 'cat_wraps_001';
        INSERT INTO categories (category_id, name, description, sort_order, created_at)
        VALUES (v_wraps_category_id, 'Wraps', 'Build your own wraps', 8, v_now);
    END IF;
    
    -- Create the builder config
    INSERT INTO builder_config (config_id, enabled, builder_category_ids, include_base_item_price, created_at, updated_at)
    VALUES (
        v_config_id,
        true,
        jsonb_build_array(v_subs_category_id, v_wraps_category_id),
        false,
        v_now,
        v_now
    );
    
    -- Create builder steps
    -- Step 1: Choose Your Base (required, single selection)
    INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
    VALUES (v_base_step_id, v_config_id, 'Choose Your Base', 'base', 'single', true, 1, 1, 1, v_now);
    
    -- Step 2: Pick Your Protein (required, single selection)
    INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
    VALUES (v_protein_step_id, v_config_id, 'Pick Your Protein', 'protein', 'single', true, 1, 1, 2, v_now);
    
    -- Step 3: Add Toppings (optional, multiple selection)
    INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
    VALUES (v_toppings_step_id, v_config_id, 'Add Toppings', 'toppings', 'multiple', false, 0, NULL, 3, v_now);
    
    -- Step 4: Pick Your Sauce (required, single selection)
    INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
    VALUES (v_sauce_step_id, v_config_id, 'Pick Your Sauce', 'sauce', 'single', true, 1, 1, 4, v_now);
    
    -- Create sample builder items (menu items for each step)
    -- Note: In a real scenario, admin would configure these through the UI
    -- For now, we'll create placeholder items that can be customized
    
    -- Base options
    INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, available_for_collection, available_for_delivery, sort_order, created_at, updated_at)
    VALUES 
        ('item_base_white', 'White Italian Bread', '6-inch white Italian bread', v_subs_category_id, 2.50, true, true, true, 1, v_now, v_now),
        ('item_base_wheat', 'Whole Wheat Bread', '6-inch whole wheat bread', v_subs_category_id, 2.50, true, true, true, 2, v_now, v_now),
        ('item_base_wrap_flour', 'Flour Tortilla', 'Large flour tortilla wrap', v_wraps_category_id, 2.00, true, true, true, 3, v_now, v_now),
        ('item_base_wrap_spinach', 'Spinach Tortilla', 'Large spinach tortilla wrap', v_wraps_category_id, 2.50, true, true, true, 4, v_now, v_now)
    ON CONFLICT (item_id) DO NOTHING;
    
    INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
    VALUES 
        ('bsi_base_white', v_base_step_id, 'item_base_white', NULL, 1, true, v_now),
        ('bsi_base_wheat', v_base_step_id, 'item_base_wheat', NULL, 2, true, v_now),
        ('bsi_base_wrap_flour', v_base_step_id, 'item_base_wrap_flour', NULL, 3, true, v_now),
        ('bsi_base_wrap_spinach', v_base_step_id, 'item_base_wrap_spinach', NULL, 4, true, v_now)
    ON CONFLICT (step_id, item_id) DO NOTHING;
    
    -- Protein options
    INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, available_for_collection, available_for_delivery, sort_order, created_at, updated_at)
    VALUES 
        ('item_protein_chicken', 'Grilled Chicken', 'Seasoned grilled chicken breast', v_subs_category_id, 4.50, true, true, true, 10, v_now, v_now),
        ('item_protein_turkey', 'Oven Roasted Turkey', 'Sliced oven roasted turkey', v_subs_category_id, 4.00, true, true, true, 11, v_now, v_now),
        ('item_protein_beef', 'Roast Beef', 'Tender sliced roast beef', v_subs_category_id, 5.00, true, true, true, 12, v_now, v_now),
        ('item_protein_falafel', 'Falafel', 'Crispy homemade falafel', v_subs_category_id, 3.50, true, true, true, 13, v_now, v_now)
    ON CONFLICT (item_id) DO NOTHING;
    
    INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
    VALUES 
        ('bsi_protein_chicken', v_protein_step_id, 'item_protein_chicken', NULL, 1, true, v_now),
        ('bsi_protein_turkey', v_protein_step_id, 'item_protein_turkey', NULL, 2, true, v_now),
        ('bsi_protein_beef', v_protein_step_id, 'item_protein_beef', NULL, 3, true, v_now),
        ('bsi_protein_falafel', v_protein_step_id, 'item_protein_falafel', NULL, 4, true, v_now)
    ON CONFLICT (step_id, item_id) DO NOTHING;
    
    -- Topping options
    INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, available_for_collection, available_for_delivery, sort_order, created_at, updated_at)
    VALUES 
        ('item_topping_lettuce', 'Lettuce', 'Fresh shredded lettuce', v_subs_category_id, 0.50, true, true, true, 20, v_now, v_now),
        ('item_topping_tomato', 'Tomatoes', 'Fresh sliced tomatoes', v_subs_category_id, 0.50, true, true, true, 21, v_now, v_now),
        ('item_topping_onion', 'Red Onion', 'Sliced red onion', v_subs_category_id, 0.50, true, true, true, 22, v_now, v_now),
        ('item_topping_cucumber', 'Cucumber', 'Fresh cucumber slices', v_subs_category_id, 0.50, true, true, true, 23, v_now, v_now),
        ('item_topping_pepper', 'Green Peppers', 'Sliced green peppers', v_subs_category_id, 0.50, true, true, true, 24, v_now, v_now),
        ('item_topping_olive', 'Black Olives', 'Sliced black olives', v_subs_category_id, 0.75, true, true, true, 25, v_now, v_now),
        ('item_topping_jalapeno', 'Jalapenos', 'Sliced jalapeno peppers', v_subs_category_id, 0.75, true, true, true, 26, v_now, v_now),
        ('item_topping_cheese', 'Cheese', 'American or Swiss cheese', v_subs_category_id, 1.00, true, true, true, 27, v_now, v_now)
    ON CONFLICT (item_id) DO NOTHING;
    
    INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
    VALUES 
        ('bsi_topping_lettuce', v_toppings_step_id, 'item_topping_lettuce', NULL, 1, true, v_now),
        ('bsi_topping_tomato', v_toppings_step_id, 'item_topping_tomato', NULL, 2, true, v_now),
        ('bsi_topping_onion', v_toppings_step_id, 'item_topping_onion', NULL, 3, true, v_now),
        ('bsi_topping_cucumber', v_toppings_step_id, 'item_topping_cucumber', NULL, 4, true, v_now),
        ('bsi_topping_pepper', v_toppings_step_id, 'item_topping_pepper', NULL, 5, true, v_now),
        ('bsi_topping_olive', v_toppings_step_id, 'item_topping_olive', NULL, 6, true, v_now),
        ('bsi_topping_jalapeno', v_toppings_step_id, 'item_topping_jalapeno', NULL, 7, true, v_now),
        ('bsi_topping_cheese', v_toppings_step_id, 'item_topping_cheese', NULL, 8, true, v_now)
    ON CONFLICT (step_id, item_id) DO NOTHING;
    
    -- Sauce options
    INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, available_for_collection, available_for_delivery, sort_order, created_at, updated_at)
    VALUES 
        ('item_sauce_mayo', 'Mayonnaise', 'Classic mayonnaise', v_subs_category_id, 0.00, true, true, true, 30, v_now, v_now),
        ('item_sauce_mustard', 'Mustard', 'Yellow mustard', v_subs_category_id, 0.00, true, true, true, 31, v_now, v_now),
        ('item_sauce_ranch', 'Ranch', 'Creamy ranch dressing', v_subs_category_id, 0.50, true, true, true, 32, v_now, v_now),
        ('item_sauce_chipotle', 'Chipotle Southwest', 'Smoky chipotle sauce', v_subs_category_id, 0.50, true, true, true, 33, v_now, v_now),
        ('item_sauce_honey_mustard', 'Honey Mustard', 'Sweet honey mustard', v_subs_category_id, 0.50, true, true, true, 34, v_now, v_now),
        ('item_sauce_oil_vinegar', 'Oil & Vinegar', 'Classic oil and vinegar', v_subs_category_id, 0.00, true, true, true, 35, v_now, v_now)
    ON CONFLICT (item_id) DO NOTHING;
    
    INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
    VALUES 
        ('bsi_sauce_mayo', v_sauce_step_id, 'item_sauce_mayo', NULL, 1, true, v_now),
        ('bsi_sauce_mustard', v_sauce_step_id, 'item_sauce_mustard', NULL, 2, true, v_now),
        ('bsi_sauce_ranch', v_sauce_step_id, 'item_sauce_ranch', NULL, 3, true, v_now),
        ('bsi_sauce_chipotle', v_sauce_step_id, 'item_sauce_chipotle', NULL, 4, true, v_now),
        ('bsi_sauce_honey_mustard', v_sauce_step_id, 'item_sauce_honey_mustard', NULL, 5, true, v_now),
        ('bsi_sauce_oil_vinegar', v_sauce_step_id, 'item_sauce_oil_vinegar', NULL, 6, true, v_now)
    ON CONFLICT (step_id, item_id) DO NOTHING;
    
    -- Create sample Sub and Wrap items that will trigger the builder
    INSERT INTO menu_items (item_id, name, description, category_id, price, image_url, is_active, available_for_collection, available_for_delivery, sort_order, is_featured, created_at, updated_at)
    VALUES 
        ('item_sub_classic', 'Classic Sub', 'Build your own classic submarine sandwich', v_subs_category_id, 0.00, 'https://images.unsplash.com/photo-1509722747041-616f39b57569', true, true, true, 1, true, v_now, v_now),
        ('item_sub_footlong', 'Footlong Sub', 'Build your own 12-inch submarine sandwich', v_subs_category_id, 2.00, 'https://images.unsplash.com/photo-1553909489-cd47e0907980', true, true, true, 2, false, v_now, v_now),
        ('item_wrap_classic', 'Classic Wrap', 'Build your own wrap with fresh ingredients', v_wraps_category_id, 0.00, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f', true, true, true, 1, true, v_now, v_now),
        ('item_wrap_large', 'Large Wrap', 'Build a large wrap loaded with your favorites', v_wraps_category_id, 1.50, 'https://images.unsplash.com/photo-1551326844-4df70f78d0e9', true, true, true, 2, false, v_now, v_now)
    ON CONFLICT (item_id) DO NOTHING;
    
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 'Builder Config' as table_name, COUNT(*) as row_count FROM builder_config
UNION ALL
SELECT 'Builder Steps', COUNT(*) FROM builder_steps
UNION ALL
SELECT 'Builder Step Items', COUNT(*) FROM builder_step_items;
