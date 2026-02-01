-- =====================================================
-- Salama Lama PDF Menu Migration Script
-- Source: Salama_Lama_Delivery_App_Menu_FULL_v2.pdf
-- This script replaces all existing menu data with PDF menu structure
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Clean up existing menu data
-- =====================================================
DELETE FROM cart_item_customizations;
DELETE FROM cart_items;
DELETE FROM customization_options;
DELETE FROM customization_groups;
DELETE FROM menu_items;
DELETE FROM categories;

-- =====================================================
-- STEP 2: Insert Categories (from PDF structure)
-- =====================================================
INSERT INTO categories (category_id, name, description, sort_order, created_at)
VALUES 
  ('cat_builder', 'Builder Items', 'Choose your protein and customize your meal', 1, NOW()::TEXT),
  ('cat_sides', 'Sides', 'Delicious sides to complement your meal', 2, NOW()::TEXT),
  ('cat_kids', 'Kids Meal', 'Perfect portion for little ones', 3, NOW()::TEXT),
  ('cat_sauces', 'Sauces & Dips', 'Add extra flavor to your meal', 4, NOW()::TEXT),
  ('cat_drinks', 'Drinks', 'Refresh your meal with a drink', 5, NOW()::TEXT);

-- =====================================================
-- STEP 3: Insert Menu Items (Base Items)
-- =====================================================

-- Builder Items (Main Category)
INSERT INTO menu_items (item_id, category_id, name, description, price, image_url, is_active, sort_order, created_at, updated_at)
VALUES
  -- Builder Items
  ('item_grilled_sub', 'cat_builder', 'Grilled Sub', 'Fresh sub filled with your choice of protein, crisp lettuce, juicy tomatoes, and our signature sauces', 14.50, NULL, true, 1, NOW()::TEXT, NOW()::TEXT),
  ('item_saj_wrap', 'cat_builder', 'Saj Wrap', 'Traditional saj bread wrapped with your choice of protein, fresh vegetables, and flavorful sauces', 15.00, NULL, true, 2, NOW()::TEXT, NOW()::TEXT),
  ('item_loaded_fries', 'cat_builder', 'Loaded Fries', 'Crispy fries loaded with your choice of protein, melted cheese, and signature sauces', 15.50, NULL, true, 3, NOW()::TEXT, NOW()::TEXT),
  ('item_rice_bowl', 'cat_builder', 'Rice Bowl', 'Fluffy basmati rice topped with your choice of protein, fresh salad, and house dressings', 16.50, NULL, true, 4, NOW()::TEXT, NOW()::TEXT),
  
  -- Sides
  ('item_fries', 'cat_sides', 'Fries', 'Golden crispy fries', 4.00, NULL, true, 1, NOW()::TEXT, NOW()::TEXT),
  ('item_cheese_fries', 'cat_sides', 'Cheese Fries', 'Fries topped with melted cheese', 5.00, NULL, true, 2, NOW()::TEXT, NOW()::TEXT),
  ('item_onion_rings', 'cat_sides', 'Onion Rings', 'Crispy breaded onion rings', 5.00, NULL, true, 3, NOW()::TEXT, NOW()::TEXT),
  ('item_mozzarella_sticks', 'cat_sides', 'Mozzarella Sticks', 'Golden fried mozzarella sticks', 6.00, NULL, true, 4, NOW()::TEXT, NOW()::TEXT),
  
  -- Kids Meal
  ('item_kids_meal', 'cat_kids', 'Kids Meal', 'Chicken strips, fries, and a drink', 10.00, NULL, true, 1, NOW()::TEXT, NOW()::TEXT),
  
  -- Sauces & Dips
  ('item_garlic_mayo', 'cat_sauces', 'Garlic Mayo', 'Creamy garlic mayonnaise', 1.00, NULL, true, 1, NOW()::TEXT, NOW()::TEXT),
  ('item_chilli_mayo', 'cat_sauces', 'Chilli Mayo', 'Spicy chilli mayonnaise', 1.00, NULL, true, 2, NOW()::TEXT, NOW()::TEXT),
  ('item_bbq_sauce', 'cat_sauces', 'BBQ Sauce', 'Smoky barbecue sauce', 1.00, NULL, true, 3, NOW()::TEXT, NOW()::TEXT),
  ('item_hot_sauce', 'cat_sauces', 'Hot Sauce', 'Fiery hot sauce', 1.00, NULL, true, 4, NOW()::TEXT, NOW()::TEXT),
  ('item_tahini', 'cat_sauces', 'Tahini', 'Creamy sesame sauce', 1.00, NULL, true, 5, NOW()::TEXT, NOW()::TEXT),
  ('item_hummus', 'cat_sauces', 'Hummus', 'Smooth chickpea dip', 1.50, NULL, true, 6, NOW()::TEXT, NOW()::TEXT),
  ('item_tzatziki', 'cat_sauces', 'Tzatziki', 'Cool yogurt and cucumber dip', 1.50, NULL, true, 7, NOW()::TEXT, NOW()::TEXT),
  
  -- Drinks
  ('item_coca_cola', 'cat_drinks', 'Coca Cola', 'Classic Coca Cola', 2.50, NULL, true, 1, NOW()::TEXT, NOW()::TEXT),
  ('item_coca_cola_zero', 'cat_drinks', 'Coca Cola Zero', 'Zero sugar Coca Cola', 2.50, NULL, true, 2, NOW()::TEXT, NOW()::TEXT),
  ('item_sprite', 'cat_drinks', 'Sprite', 'Lemon-lime soda', 2.50, NULL, true, 3, NOW()::TEXT, NOW()::TEXT),
  ('item_fanta', 'cat_drinks', 'Fanta Orange', 'Orange flavored soda', 2.50, NULL, true, 4, NOW()::TEXT, NOW()::TEXT),
  ('item_still_water', 'cat_drinks', 'Still Water', 'Pure still water', 2.00, NULL, true, 5, NOW()::TEXT, NOW()::TEXT),
  ('item_sparkling_water', 'cat_drinks', 'Sparkling Water', 'Refreshing sparkling water', 2.50, NULL, true, 6, NOW()::TEXT, NOW()::TEXT),
  ('item_red_bull', 'cat_drinks', 'Red Bull', 'Energy drink', 3.50, NULL, true, 7, NOW()::TEXT, NOW()::TEXT),
  ('item_red_bull_sf', 'cat_drinks', 'Red Bull Sugar Free', 'Sugar free energy drink', 3.50, NULL, true, 8, NOW()::TEXT, NOW()::TEXT),
  ('item_orange_juice', 'cat_drinks', 'Fruit Juice (Orange)', 'Fresh orange juice', 3.00, NULL, true, 9, NOW()::TEXT, NOW()::TEXT),
  ('item_apple_juice', 'cat_drinks', 'Fruit Juice (Apple)', 'Fresh apple juice', 3.00, NULL, true, 10, NOW()::TEXT, NOW()::TEXT);

-- =====================================================
-- STEP 4: Insert Customization Groups
-- =====================================================

-- Protein Choice (Required for all builder items)
INSERT INTO customization_groups (id, menu_item_id, name, description, min_selections, max_selections, is_required, display_order, created_at, updated_at)
VALUES
  (1, 1, 'Choose Protein', 'Select your protein', 1, 1, true, 1, NOW(), NOW()),
  (2, 2, 'Choose Protein', 'Select your protein', 1, 1, true, 1, NOW(), NOW()),
  (3, 3, 'Choose Protein', 'Select your protein', 1, 1, true, 1, NOW(), NOW()),
  (4, 4, 'Choose Protein', 'Select your protein', 1, 1, true, 1, NOW(), NOW());

-- Spice Level (Optional for all builder items)
INSERT INTO customization_groups (id, menu_item_id, name, description, min_selections, max_selections, is_required, display_order, created_at, updated_at)
VALUES
  (5, 1, 'Spice Level', 'Choose your spice level', 0, 1, false, 2, NOW(), NOW()),
  (6, 2, 'Spice Level', 'Choose your spice level', 0, 1, false, 2, NOW(), NOW()),
  (7, 3, 'Spice Level', 'Choose your spice level', 0, 1, false, 2, NOW(), NOW()),
  (8, 4, 'Spice Level', 'Choose your spice level', 0, 1, false, 2, NOW(), NOW());

-- Extra Options (Optional for all builder items)
INSERT INTO customization_groups (id, menu_item_id, name, description, min_selections, max_selections, is_required, display_order, created_at, updated_at)
VALUES
  (9, 1, 'Extra Options', 'Add extras to your meal', 0, 5, false, 3, NOW(), NOW()),
  (10, 2, 'Extra Options', 'Add extras to your meal', 0, 5, false, 3, NOW(), NOW()),
  (11, 3, 'Extra Options', 'Add extras to your meal', 0, 5, false, 3, NOW(), NOW()),
  (12, 4, 'Extra Options', 'Add extras to your meal', 0, 5, false, 3, NOW(), NOW());

-- =====================================================
-- STEP 5: Insert Customization Options
-- =====================================================

-- Protein Options for Grilled Sub (Item ID: 1, Base Price: €14.50)
INSERT INTO customization_options (id, customization_group_id, name, price_modifier, is_available, display_order, created_at, updated_at)
VALUES
  (1, 1, 'Chicken', 0.00, true, 1, NOW(), NOW()),
  (2, 1, 'Mixed (Chicken & Lamb)', 1.50, true, 2, NOW(), NOW()),
  (3, 1, 'Lamb', 2.50, true, 3, NOW(), NOW());

-- Protein Options for Saj Wrap (Item ID: 2, Base Price: €15.00)
INSERT INTO customization_options (id, customization_group_id, name, price_modifier, is_available, display_order, created_at, updated_at)
VALUES
  (4, 2, 'Chicken', 0.00, true, 1, NOW(), NOW()),
  (5, 2, 'Mixed (Chicken & Lamb)', 1.50, true, 2, NOW(), NOW()),
  (6, 2, 'Lamb', 2.50, true, 3, NOW(), NOW());

-- Protein Options for Loaded Fries (Item ID: 3, Base Price: €15.50)
INSERT INTO customization_options (id, customization_group_id, name, price_modifier, is_available, display_order, created_at, updated_at)
VALUES
  (7, 3, 'Chicken', 0.00, true, 1, NOW(), NOW()),
  (8, 3, 'Mixed (Chicken & Lamb)', 2.00, true, 2, NOW(), NOW()),
  (9, 3, 'Lamb', 3.00, true, 3, NOW(), NOW());

-- Protein Options for Rice Bowl (Item ID: 4, Base Price: €16.50)
INSERT INTO customization_options (id, customization_group_id, name, price_modifier, is_available, display_order, created_at, updated_at)
VALUES
  (10, 4, 'Chicken', 0.00, true, 1, NOW(), NOW()),
  (11, 4, 'Mixed (Chicken & Lamb)', 2.00, true, 2, NOW(), NOW()),
  (12, 4, 'Lamb', 3.00, true, 3, NOW(), NOW());

-- Spice Level Options (Same for all builder items)
INSERT INTO customization_options (id, customization_group_id, name, price_modifier, is_available, display_order, created_at, updated_at)
VALUES
  -- Grilled Sub Spice Levels
  (13, 5, 'Mild', 0.00, true, 1, NOW(), NOW()),
  (14, 5, 'Medium', 0.00, true, 2, NOW(), NOW()),
  (15, 5, 'Hot', 0.00, true, 3, NOW(), NOW()),
  (16, 5, 'Extra Hot', 0.00, true, 4, NOW(), NOW()),
  
  -- Saj Wrap Spice Levels
  (17, 6, 'Mild', 0.00, true, 1, NOW(), NOW()),
  (18, 6, 'Medium', 0.00, true, 2, NOW(), NOW()),
  (19, 6, 'Hot', 0.00, true, 3, NOW(), NOW()),
  (20, 6, 'Extra Hot', 0.00, true, 4, NOW(), NOW()),
  
  -- Loaded Fries Spice Levels
  (21, 7, 'Mild', 0.00, true, 1, NOW(), NOW()),
  (22, 7, 'Medium', 0.00, true, 2, NOW(), NOW()),
  (23, 7, 'Hot', 0.00, true, 3, NOW(), NOW()),
  (24, 7, 'Extra Hot', 0.00, true, 4, NOW(), NOW()),
  
  -- Rice Bowl Spice Levels
  (25, 8, 'Mild', 0.00, true, 1, NOW(), NOW()),
  (26, 8, 'Medium', 0.00, true, 2, NOW(), NOW()),
  (27, 8, 'Hot', 0.00, true, 3, NOW(), NOW()),
  (28, 8, 'Extra Hot', 0.00, true, 4, NOW(), NOW());

-- Extra Options (Same for all builder items)
INSERT INTO customization_options (id, customization_group_id, name, price_modifier, is_available, display_order, created_at, updated_at)
VALUES
  -- Grilled Sub Extras
  (29, 9, 'Extra Cheese', 1.00, true, 1, NOW(), NOW()),
  (30, 9, 'Extra Meat', 3.00, true, 2, NOW(), NOW()),
  (31, 9, 'Extra Sauce', 0.50, true, 3, NOW(), NOW()),
  (32, 9, 'No Onions', 0.00, true, 4, NOW(), NOW()),
  (33, 9, 'No Tomatoes', 0.00, true, 5, NOW(), NOW()),
  
  -- Saj Wrap Extras
  (34, 10, 'Extra Cheese', 1.00, true, 1, NOW(), NOW()),
  (35, 10, 'Extra Meat', 3.00, true, 2, NOW(), NOW()),
  (36, 10, 'Extra Sauce', 0.50, true, 3, NOW(), NOW()),
  (37, 10, 'No Onions', 0.00, true, 4, NOW(), NOW()),
  (38, 10, 'No Tomatoes', 0.00, true, 5, NOW(), NOW()),
  
  -- Loaded Fries Extras
  (39, 11, 'Extra Cheese', 1.00, true, 1, NOW(), NOW()),
  (40, 11, 'Extra Meat', 3.00, true, 2, NOW(), NOW()),
  (41, 11, 'Extra Sauce', 0.50, true, 3, NOW(), NOW()),
  (42, 11, 'No Onions', 0.00, true, 4, NOW(), NOW()),
  (43, 11, 'No Tomatoes', 0.00, true, 5, NOW(), NOW()),
  
  -- Rice Bowl Extras
  (44, 12, 'Extra Cheese', 1.00, true, 1, NOW(), NOW()),
  (45, 12, 'Extra Meat', 3.00, true, 2, NOW(), NOW()),
  (46, 12, 'Extra Sauce', 0.50, true, 3, NOW(), NOW()),
  (47, 12, 'No Onions', 0.00, true, 4, NOW(), NOW()),
  (48, 12, 'No Tomatoes', 0.00, true, 5, NOW(), NOW());

-- =====================================================
-- STEP 6: Reset Sequences
-- =====================================================
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('menu_items_id_seq', (SELECT MAX(id) FROM menu_items));
SELECT setval('customization_groups_id_seq', (SELECT MAX(id) FROM customization_groups));
SELECT setval('customization_options_id_seq', (SELECT MAX(id) FROM customization_options));

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Uncomment to verify the migration:
-- SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
-- UNION ALL
-- SELECT 'Menu Items', COUNT(*) FROM menu_items
-- UNION ALL
-- SELECT 'Customization Groups', COUNT(*) FROM customization_groups
-- UNION ALL
-- SELECT 'Customization Options', COUNT(*) FROM customization_options;

-- SELECT c.name as category, mi.name as item, mi.base_price, 
--        cg.name as group_name, co.name as option_name, co.price_modifier
-- FROM categories c
-- JOIN menu_items mi ON c.id = mi.category_id
-- LEFT JOIN customization_groups cg ON mi.id = cg.menu_item_id
-- LEFT JOIN customization_options co ON cg.id = co.customization_group_id
-- ORDER BY c.display_order, mi.display_order, cg.display_order, co.display_order;
