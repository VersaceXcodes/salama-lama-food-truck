-- =====================================================
-- Salama Lama PDF Menu Migration Script (Safe Version)
-- Source: Salama_Lama_Delivery_App_Menu_FULL_v2.pdf
-- This script ADDS PDF menu data alongside existing data
-- Existing orders will continue to reference old menu items
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Deactivate existing active menu items (keep for order history)
-- =====================================================
UPDATE menu_items SET is_active = false WHERE is_active = true;

-- =====================================================
-- STEP 2: Insert or Update Categories (from PDF structure)
-- =====================================================
INSERT INTO categories (category_id, name, description, sort_order, created_at)
VALUES 
  ('cat_builder', 'Builder Items', 'Choose your protein and customize your meal', 1, NOW()::TEXT),
  ('cat_sides', 'Sides', 'Delicious sides to complement your meal', 2, NOW()::TEXT),
  ('cat_kids', 'Kids Meal', 'Perfect portion for little ones', 3, NOW()::TEXT),
  ('cat_sauces', 'Sauces & Dips', 'Add extra flavor to your meal', 4, NOW()::TEXT),
  ('cat_drinks', 'Drinks', 'Refresh your meal with a drink', 5, NOW()::TEXT)
ON CONFLICT (category_id) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- =====================================================
-- STEP 3: Insert Menu Items (Base Items)
-- =====================================================

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
  ('item_apple_juice', 'cat_drinks', 'Fruit Juice (Apple)', 'Fresh apple juice', 3.00, NULL, true, 10, NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (item_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW()::TEXT;

-- =====================================================
-- STEP 4: Delete existing customization groups for these items (safe)
-- =====================================================
DELETE FROM customization_options WHERE group_id IN (
  SELECT group_id FROM customization_groups WHERE item_id IN (
    'item_grilled_sub', 'item_saj_wrap', 'item_loaded_fries', 'item_rice_bowl'
  )
);
DELETE FROM customization_groups WHERE item_id IN (
  'item_grilled_sub', 'item_saj_wrap', 'item_loaded_fries', 'item_rice_bowl'
);

-- =====================================================
-- STEP 5: Insert Customization Groups
-- =====================================================

-- Protein Choice (Required for all builder items)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order)
VALUES
  ('group_sub_protein', 'item_grilled_sub', 'Choose Protein', 'radio', true, 1),
  ('group_wrap_protein', 'item_saj_wrap', 'Choose Protein', 'radio', true, 1),
  ('group_fries_protein', 'item_loaded_fries', 'Choose Protein', 'radio', true, 1),
  ('group_bowl_protein', 'item_rice_bowl', 'Choose Protein', 'radio', true, 1);

-- Spice Level (Optional for all builder items)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order)
VALUES
  ('group_sub_spice', 'item_grilled_sub', 'Spice Level', 'radio', false, 2),
  ('group_wrap_spice', 'item_saj_wrap', 'Spice Level', 'radio', false, 2),
  ('group_fries_spice', 'item_loaded_fries', 'Spice Level', 'radio', false, 2),
  ('group_bowl_spice', 'item_rice_bowl', 'Spice Level', 'radio', false, 2);

-- Extra Options (Optional for all builder items)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order)
VALUES
  ('group_sub_extras', 'item_grilled_sub', 'Extra Options', 'checkbox', false, 3),
  ('group_wrap_extras', 'item_saj_wrap', 'Extra Options', 'checkbox', false, 3),
  ('group_fries_extras', 'item_loaded_fries', 'Extra Options', 'checkbox', false, 3),
  ('group_bowl_extras', 'item_rice_bowl', 'Extra Options', 'checkbox', false, 3);

-- =====================================================
-- STEP 6: Insert Customization Options
-- =====================================================

-- Protein Options for Grilled Sub (Base Price: €14.50)
INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
VALUES
  ('opt_sub_chicken', 'group_sub_protein', 'Chicken', 0.00, true, 1),
  ('opt_sub_mixed', 'group_sub_protein', 'Mixed (Chicken & Lamb)', 1.50, false, 2),
  ('opt_sub_lamb', 'group_sub_protein', 'Lamb', 2.50, false, 3);

-- Protein Options for Saj Wrap (Base Price: €15.00)
INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
VALUES
  ('opt_wrap_chicken', 'group_wrap_protein', 'Chicken', 0.00, true, 1),
  ('opt_wrap_mixed', 'group_wrap_protein', 'Mixed (Chicken & Lamb)', 1.50, false, 2),
  ('opt_wrap_lamb', 'group_wrap_protein', 'Lamb', 2.50, false, 3);

-- Protein Options for Loaded Fries (Base Price: €15.50)
INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
VALUES
  ('opt_fries_chicken', 'group_fries_protein', 'Chicken', 0.00, true, 1),
  ('opt_fries_mixed', 'group_fries_protein', 'Mixed (Chicken & Lamb)', 2.00, false, 2),
  ('opt_fries_lamb', 'group_fries_protein', 'Lamb', 3.00, false, 3);

-- Protein Options for Rice Bowl (Base Price: €16.50)
INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
VALUES
  ('opt_bowl_chicken', 'group_bowl_protein', 'Chicken', 0.00, true, 1),
  ('opt_bowl_mixed', 'group_bowl_protein', 'Mixed (Chicken & Lamb)', 2.00, false, 2),
  ('opt_bowl_lamb', 'group_bowl_protein', 'Lamb', 3.00, false, 3);

-- Spice Level Options (Same for all builder items)
INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
VALUES
  -- Grilled Sub Spice Levels
  ('opt_sub_spice_mild', 'group_sub_spice', 'Mild', 0.00, false, 1),
  ('opt_sub_spice_medium', 'group_sub_spice', 'Medium', 0.00, true, 2),
  ('opt_sub_spice_hot', 'group_sub_spice', 'Hot', 0.00, false, 3),
  ('opt_sub_spice_extra', 'group_sub_spice', 'Extra Hot', 0.00, false, 4),
  
  -- Saj Wrap Spice Levels
  ('opt_wrap_spice_mild', 'group_wrap_spice', 'Mild', 0.00, false, 1),
  ('opt_wrap_spice_medium', 'group_wrap_spice', 'Medium', 0.00, true, 2),
  ('opt_wrap_spice_hot', 'group_wrap_spice', 'Hot', 0.00, false, 3),
  ('opt_wrap_spice_extra', 'group_wrap_spice', 'Extra Hot', 0.00, false, 4),
  
  -- Loaded Fries Spice Levels
  ('opt_fries_spice_mild', 'group_fries_spice', 'Mild', 0.00, false, 1),
  ('opt_fries_spice_medium', 'group_fries_spice', 'Medium', 0.00, true, 2),
  ('opt_fries_spice_hot', 'group_fries_spice', 'Hot', 0.00, false, 3),
  ('opt_fries_spice_extra', 'group_fries_spice', 'Extra Hot', 0.00, false, 4),
  
  -- Rice Bowl Spice Levels
  ('opt_bowl_spice_mild', 'group_bowl_spice', 'Mild', 0.00, false, 1),
  ('opt_bowl_spice_medium', 'group_bowl_spice', 'Medium', 0.00, true, 2),
  ('opt_bowl_spice_hot', 'group_bowl_spice', 'Hot', 0.00, false, 3),
  ('opt_bowl_spice_extra', 'group_bowl_spice', 'Extra Hot', 0.00, false, 4);

-- Extra Options (Same for all builder items)
INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order)
VALUES
  -- Grilled Sub Extras
  ('opt_sub_extra_cheese', 'group_sub_extras', 'Extra Cheese', 1.00, false, 1),
  ('opt_sub_extra_meat', 'group_sub_extras', 'Extra Meat', 3.00, false, 2),
  ('opt_sub_extra_sauce', 'group_sub_extras', 'Extra Sauce', 0.50, false, 3),
  ('opt_sub_no_onions', 'group_sub_extras', 'No Onions', 0.00, false, 4),
  ('opt_sub_no_tomatoes', 'group_sub_extras', 'No Tomatoes', 0.00, false, 5),
  
  -- Saj Wrap Extras
  ('opt_wrap_extra_cheese', 'group_wrap_extras', 'Extra Cheese', 1.00, false, 1),
  ('opt_wrap_extra_meat', 'group_wrap_extras', 'Extra Meat', 3.00, false, 2),
  ('opt_wrap_extra_sauce', 'group_wrap_extras', 'Extra Sauce', 0.50, false, 3),
  ('opt_wrap_no_onions', 'group_wrap_extras', 'No Onions', 0.00, false, 4),
  ('opt_wrap_no_tomatoes', 'group_wrap_extras', 'No Tomatoes', 0.00, false, 5),
  
  -- Loaded Fries Extras
  ('opt_fries_extra_cheese', 'group_fries_extras', 'Extra Cheese', 1.00, false, 1),
  ('opt_fries_extra_meat', 'group_fries_extras', 'Extra Meat', 3.00, false, 2),
  ('opt_fries_extra_sauce', 'group_fries_extras', 'Extra Sauce', 0.50, false, 3),
  ('opt_fries_no_onions', 'group_fries_extras', 'No Onions', 0.00, false, 4),
  ('opt_fries_no_tomatoes', 'group_fries_extras', 'No Tomatoes', 0.00, false, 5),
  
  -- Rice Bowl Extras
  ('opt_bowl_extra_cheese', 'group_bowl_extras', 'Extra Cheese', 1.00, false, 1),
  ('opt_bowl_extra_meat', 'group_bowl_extras', 'Extra Meat', 3.00, false, 2),
  ('opt_bowl_extra_sauce', 'group_bowl_extras', 'Extra Sauce', 0.50, false, 3),
  ('opt_bowl_no_onions', 'group_bowl_extras', 'No Onions', 0.00, false, 4),
  ('opt_bowl_no_tomatoes', 'group_bowl_extras', 'No Tomatoes', 0.00, false, 5);

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these to verify:
-- SELECT COUNT(*) as active_items FROM menu_items WHERE is_active = true;
-- SELECT COUNT(*) as categories FROM categories;
-- SELECT COUNT(*) as groups FROM customization_groups;
-- SELECT COUNT(*) as options FROM customization_options;
