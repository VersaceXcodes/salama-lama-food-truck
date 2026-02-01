-- =====================================================
-- SYNC PDF MENU ITEMS WITH MENU BUILDER
-- This connects the PDF menu items to the Menu Builder system
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Update Builder Config to use Builder Items category
-- =====================================================
UPDATE builder_config
SET builder_category_ids = '["cat_builder"]'::jsonb,
    updated_at = NOW()::TEXT
WHERE config_id = 'builder_config_001';

-- =====================================================
-- STEP 2: Clear old builder steps and create new ones matching PDF structure
-- =====================================================
-- Delete old step items first (foreign key constraint)
DELETE FROM builder_step_items WHERE step_id IN (
  SELECT step_id FROM builder_steps WHERE config_id = 'builder_config_001'
);

-- Delete old steps
DELETE FROM builder_steps WHERE config_id = 'builder_config_001';

-- Create new steps matching PDF menu structure
-- Step 1: Choose Your Base (Grilled Sub, Saj Wrap, Loaded Fries, Rice Bowl)
INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
VALUES (
  'step_pdf_base',
  'builder_config_001',
  'Choose Your Base',
  'base',
  'single',
  true,
  1,
  1,
  1,
  NOW()::TEXT
);

-- Step 2: Pick Your Protein (Chicken, Mixed, Lamb)
INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
VALUES (
  'step_pdf_protein',
  'builder_config_001',
  'Pick Your Protein',
  'protein',
  'single',
  true,
  1,
  1,
  2,
  NOW()::TEXT
);

-- Step 3: Choose Your Spice Level (Optional)
INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
VALUES (
  'step_pdf_spice',
  'builder_config_001',
  'Choose Your Spice Level',
  'spice',
  'single',
  false,
  0,
  1,
  3,
  NOW()::TEXT
);

-- Step 4: Add Extra Options (Optional, Multiple)
INSERT INTO builder_steps (step_id, config_id, step_name, step_key, step_type, is_required, min_selections, max_selections, sort_order, created_at)
VALUES (
  'step_pdf_extras',
  'builder_config_001',
  'Add Extras',
  'extras',
  'multiple',
  false,
  0,
  NULL,
  4,
  NOW()::TEXT
);

-- =====================================================
-- STEP 3: Link PDF Menu Items to Builder Steps
-- =====================================================

-- Link Base Items (Step 1)
INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
VALUES
  ('bsi_pdf_base_sub', 'step_pdf_base', 'item_grilled_sub', 14.50, 1, true, NOW()::TEXT),
  ('bsi_pdf_base_wrap', 'step_pdf_base', 'item_saj_wrap', 15.00, 2, true, NOW()::TEXT),
  ('bsi_pdf_base_fries', 'step_pdf_base', 'item_loaded_fries', 15.50, 3, true, NOW()::TEXT),
  ('bsi_pdf_base_bowl', 'step_pdf_base', 'item_rice_bowl', 16.50, 4, true, NOW()::TEXT);

-- Create protein items (these will be separate menu items for builder)
-- Note: We'll create placeholder items that represent protein choices
INSERT INTO menu_items (item_id, category_id, name, description, price, is_active, available_for_collection, available_for_delivery, sort_order, created_at, updated_at)
VALUES
  ('item_protein_chicken_pdf', 'cat_builder', 'Chicken', 'Grilled chicken', 0.00, true, true, true, 100, NOW()::TEXT, NOW()::TEXT),
  ('item_protein_mixed_sub', 'cat_builder', 'Mixed (Chicken & Lamb)', 'Mixed chicken and lamb', 1.50, true, true, true, 101, NOW()::TEXT, NOW()::TEXT),
  ('item_protein_lamb_sub', 'cat_builder', 'Lamb', 'Tender lamb', 2.50, true, true, true, 102, NOW()::TEXT, NOW()::TEXT),
  ('item_protein_mixed_fries', 'cat_builder', 'Mixed (Chicken & Lamb) - Fries/Bowl', 'Mixed chicken and lamb for fries/bowl', 2.00, true, true, true, 103, NOW()::TEXT, NOW()::TEXT),
  ('item_protein_lamb_fries', 'cat_builder', 'Lamb - Fries/Bowl', 'Tender lamb for fries/bowl', 3.00, true, true, true, 104, NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (item_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()::TEXT;

-- Link Protein Items (Step 2) - We'll use the average pricing
INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
VALUES
  ('bsi_pdf_protein_chicken', 'step_pdf_protein', 'item_protein_chicken_pdf', 0.00, 1, true, NOW()::TEXT),
  ('bsi_pdf_protein_mixed', 'step_pdf_protein', 'item_protein_mixed_sub', 1.50, 2, true, NOW()::TEXT),
  ('bsi_pdf_protein_lamb', 'step_pdf_protein', 'item_protein_lamb_sub', 2.50, 3, true, NOW()::TEXT)
ON CONFLICT (step_id, item_id) DO UPDATE
SET override_price = EXCLUDED.override_price,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- Create spice level items
INSERT INTO menu_items (item_id, category_id, name, description, price, is_active, available_for_collection, available_for_delivery, sort_order, created_at, updated_at)
VALUES
  ('item_spice_mild', 'cat_builder', 'Mild', 'Mild spice level', 0.00, true, true, true, 110, NOW()::TEXT, NOW()::TEXT),
  ('item_spice_medium', 'cat_builder', 'Medium', 'Medium spice level', 0.00, true, true, true, 111, NOW()::TEXT, NOW()::TEXT),
  ('item_spice_hot', 'cat_builder', 'Hot', 'Hot spice level', 0.00, true, true, true, 112, NOW()::TEXT, NOW()::TEXT),
  ('item_spice_extra', 'cat_builder', 'Extra Hot', 'Extra hot spice level', 0.00, true, true, true, 113, NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (item_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()::TEXT;

-- Link Spice Items (Step 3)
INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
VALUES
  ('bsi_pdf_spice_mild', 'step_pdf_spice', 'item_spice_mild', 0.00, 1, true, NOW()::TEXT),
  ('bsi_pdf_spice_medium', 'step_pdf_spice', 'item_spice_medium', 0.00, 2, true, NOW()::TEXT),
  ('bsi_pdf_spice_hot', 'step_pdf_spice', 'item_spice_hot', 0.00, 3, true, NOW()::TEXT),
  ('bsi_pdf_spice_extra', 'step_pdf_spice', 'item_spice_extra', 0.00, 4, true, NOW()::TEXT)
ON CONFLICT (step_id, item_id) DO UPDATE
SET override_price = EXCLUDED.override_price,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- Create extra items
INSERT INTO menu_items (item_id, category_id, name, description, price, is_active, available_for_collection, available_for_delivery, sort_order, created_at, updated_at)
VALUES
  ('item_extra_cheese_builder', 'cat_builder', 'Extra Cheese', 'Add extra cheese', 1.00, true, true, true, 120, NOW()::TEXT, NOW()::TEXT),
  ('item_extra_meat_builder', 'cat_builder', 'Extra Meat', 'Add extra meat', 3.00, true, true, true, 121, NOW()::TEXT, NOW()::TEXT),
  ('item_extra_sauce_builder', 'cat_builder', 'Extra Sauce', 'Add extra sauce', 0.50, true, true, true, 122, NOW()::TEXT, NOW()::TEXT),
  ('item_no_onions_builder', 'cat_builder', 'No Onions', 'Remove onions', 0.00, true, true, true, 123, NOW()::TEXT, NOW()::TEXT),
  ('item_no_tomatoes_builder', 'cat_builder', 'No Tomatoes', 'Remove tomatoes', 0.00, true, true, true, 124, NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (item_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()::TEXT;

-- Link Extra Items (Step 4)
INSERT INTO builder_step_items (step_item_id, step_id, item_id, override_price, sort_order, is_active, created_at)
VALUES
  ('bsi_pdf_extra_cheese', 'step_pdf_extras', 'item_extra_cheese_builder', 1.00, 1, true, NOW()::TEXT),
  ('bsi_pdf_extra_meat', 'step_pdf_extras', 'item_extra_meat_builder', 3.00, 2, true, NOW()::TEXT),
  ('bsi_pdf_extra_sauce', 'step_pdf_extras', 'item_extra_sauce_builder', 0.50, 3, true, NOW()::TEXT),
  ('bsi_pdf_no_onions', 'step_pdf_extras', 'item_no_onions_builder', 0.00, 4, true, NOW()::TEXT),
  ('bsi_pdf_no_tomatoes', 'step_pdf_extras', 'item_no_tomatoes_builder', 0.00, 5, true, NOW()::TEXT)
ON CONFLICT (step_id, item_id) DO UPDATE
SET override_price = EXCLUDED.override_price,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================
-- SELECT * FROM builder_config;
-- SELECT * FROM builder_steps ORDER BY sort_order;
-- SELECT bs.step_name, COUNT(bsi.step_item_id) as item_count
-- FROM builder_steps bs
-- LEFT JOIN builder_step_items bsi ON bs.step_id = bsi.step_id
-- GROUP BY bs.step_id, bs.step_name, bs.sort_order
-- ORDER BY bs.sort_order;
