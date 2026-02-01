-- ============================================================
-- SALAMA LAMA MENU UPDATE FROM PDF
-- Source: Salama_Lama_Delivery_App_Menu_FULL_v2.pdf
-- Date: 2026-02-01
-- Description: Complete menu migration matching PDF structure
-- ============================================================

-- Step 1: Clean up existing menu data (preserve orders and other data)
DELETE FROM customization_options WHERE group_id IN (SELECT group_id FROM customization_groups);
DELETE FROM customization_groups WHERE item_id IN (SELECT item_id FROM menu_items);
DELETE FROM menu_items;
DELETE FROM categories;

-- Step 2: Create categories in correct sort order
INSERT INTO categories (category_id, name, description, sort_order, created_at) VALUES
('GRILLED_SUB', 'Grilled Sub', 'Toasted ciabatta subs with signature toppings', 1, datetime('now')),
('SAJ_WRAP', 'Saj Wrap', 'Traditional toasted saj wraps', 2, datetime('now')),
('LOADED_FRIES', 'Loaded Fries', 'Crispy fries loaded with your choice of protein', 3, datetime('now')),
('RICE_BOWL', 'Rice Bowl', 'Mediterranean rice bowls with signature toppings', 4, datetime('now')),
('SIDES', 'Sides', 'Perfect accompaniments to your meal', 5, datetime('now')),
('KIDS_MEAL', 'Kids Meal', 'Made for little ones', 6, datetime('now')),
('SAUCES_DIPS', 'Sauces & Dips', 'Extra sauces and dips', 7, datetime('now')),
('DRINKS', 'Drinks', 'Refreshing beverages', 8, datetime('now'));

-- Step 3: Insert base menu items
-- Note: For items with protein choices, we create one base item and use customization groups

-- GRILLED SUB (base price: Kick'n Chicken €14.50)
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_GRILLED_SUB', 'Grilled Sub', 'Toasted ciabatta sub filled with melted mozzarella cheese, house garlic sauce, and Signature Lamazing sauce. Served with signature topped fries.', 'GRILLED_SUB', 14.50, 1, 0, datetime('now'), datetime('now'));

-- SAJ WRAP (base price: Kick'n Chicken €15)
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_SAJ_WRAP', 'Saj Wrap', 'Traditional toasted saj wrap filled with house garlic sauce, pickles, and fries. Served with signature topped fries.', 'SAJ_WRAP', 15.00, 1, 0, datetime('now'), datetime('now'));

-- LOADED FRIES (base price: Kick'n Chicken €15.50)
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_LOADED_FRIES', 'Loaded Fries', 'Crispy seasoned fries topped with shredded mozzarella cheese, house garlic sauce, Signature Lamazing sauce, crispy onions, mixed Mediterranean salad, and hot honey.', 'LOADED_FRIES', 15.50, 1, 0, datetime('now'), datetime('now'));

-- RICE BOWL (base price: Kick'n Chicken €16.50)
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_RICE_BOWL', 'Rice Bowl', 'Mediterranean rice topped with your choice of protein and finished with signature topped fries, house garlic sauce, Signature Lamazing sauce, shredded mozzarella cheese, crispy onions, mixed Mediterranean salad, and hot honey.', 'RICE_BOWL', 16.50, 1, 0, datetime('now'), datetime('now'));

-- SIDES
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_CRISPY_FRIES', 'Crispy Seasoned Fries', 'Freshly fried, lightly seasoned crispy fries.', 'SIDES', 5.00, 1, 0, datetime('now'), datetime('now')),
('ITEM_SIGNATURE_FRIES', 'Signature Topped Fries', 'Crispy seasoned fries finished with shredded mozzarella cheese, house garlic sauce, Signature Lamazing sauce, mixed Mediterranean salad, crispy onions, and hot honey.', 'SIDES', 8.00, 1, 0, datetime('now'), datetime('now')),
('ITEM_HALLOUMI_STICKS', 'Grilled Halloumi Sticks', 'Golden grilled halloumi sticks served on a small base of fries, drizzled with hot honey and topped with shredded mozzarella cheese and crispy onions.', 'SIDES', 6.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_PIZZA_POPPERS', 'Cheesy Pizza Poppers', 'Crispy pizza poppers served on a small base of fries, drizzled with hot honey and topped with shredded mozzarella cheese and crispy onions.', 'SIDES', 6.50, 1, 0, datetime('now'), datetime('now'));

-- KIDS MEAL
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_KIDS_MEAL', 'Kids Chicken & Fries', 'Breaded boneless chicken served on crispy seasoned fries with a Capri Sun. (No customisation)', 'KIDS_MEAL', 10.00, 1, 0, datetime('now'), datetime('now'));

-- SAUCES & DIPS
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_KETCHUP', 'Ketchup', '', 'SAUCES_DIPS', 1.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_BBQ', 'BBQ Sauce', '', 'SAUCES_DIPS', 1.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_SWEET_CHILLI', 'Sweet Chilli Sauce', '', 'SAUCES_DIPS', 1.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_GARLIC_SAUCE', 'House Garlic Sauce', '', 'SAUCES_DIPS', 2.00, 1, 0, datetime('now'), datetime('now')),
('ITEM_LAMAZING_SAUCE', 'Signature Lamazing Sauce', '', 'SAUCES_DIPS', 2.00, 1, 0, datetime('now'), datetime('now')),
('ITEM_HARISSA', 'Spicy Harissa', '', 'SAUCES_DIPS', 2.00, 1, 0, datetime('now'), datetime('now')),
('ITEM_HOT_HONEY', 'Hot Honey', '', 'SAUCES_DIPS', 2.50, 1, 0, datetime('now'), datetime('now'));

-- DRINKS
INSERT INTO menu_items (item_id, name, description, category_id, price, is_active, stock_tracked, created_at, updated_at) VALUES
('ITEM_SHANI', 'Shani Can', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_RUBICON_GUAVA', 'Rubicon Guava', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_RUBICON_MANGO', 'Rubicon Mango', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_RUBICON_PASSION', 'Rubicon Passion Fruit', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_PALESTINE_COLA', 'Palestine Cola', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_PALESTINE_COLA_SF', 'Palestine Cola (Sugar Free)', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_PALESTINE_LEMON', 'Palestine Lemon & Lime', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_PALESTINE_ORANGE', 'Palestine Orange', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_WATER', 'Bottled Water', '', 'DRINKS', 2.50, 1, 0, datetime('now'), datetime('now')),
('ITEM_CAPRI_SUN', 'Capri Sun', '', 'DRINKS', 2.00, 1, 0, datetime('now'), datetime('now'));

-- ============================================================
-- Step 4: Create Customization Groups and Options
-- ============================================================

-- ==================== GRILLED SUB CUSTOMIZATIONS ====================

-- Required: Choose Your Protein
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_GRILLED_SUB_PROTEIN', 'ITEM_GRILLED_SUB', 'Choose Your Protein', 'single', 1, 1);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_GRILLED_SUB_CHICKEN', 'CG_GRILLED_SUB_PROTEIN', 'Kick''n Chicken - Juicy chicken shawarma, thinly sliced and grilled with our signature house seasoning', 0.00, 1, 1),
('CO_GRILLED_SUB_BRISKET', 'CG_GRILLED_SUB_PROTEIN', 'Buss''n Brisket - Proper low-and-slow smoked beef brisket, cooked until tender', 1.50, 0, 2),
('CO_GRILLED_SUB_MIXED', 'CG_GRILLED_SUB_PROTEIN', 'Mixed - A generous combination of juicy grilled chicken and slow-smoked brisket', 2.50, 0, 3);

-- Required: Spice Level
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_GRILLED_SUB_SPICE', 'ITEM_GRILLED_SUB', 'Spice Level', 'single', 1, 2);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_GRILLED_SUB_MILD', 'CG_GRILLED_SUB_SPICE', 'Mild', 0.00, 1, 1),
('CO_GRILLED_SUB_SPICY', 'CG_GRILLED_SUB_SPICE', 'Spicy (harissa instead of hot honey)', 0.00, 0, 2);

-- Optional: Remove Items (Free)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_GRILLED_SUB_REMOVE', 'ITEM_GRILLED_SUB', 'Remove Items', 'multiple', 0, 3);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_GRILLED_SUB_NO_CHEESE', 'CG_GRILLED_SUB_REMOVE', 'No cheese', 0.00, 0, 1),
('CO_GRILLED_SUB_NO_GARLIC', 'CG_GRILLED_SUB_REMOVE', 'No garlic', 0.00, 0, 2),
('CO_GRILLED_SUB_NO_SALAD', 'CG_GRILLED_SUB_REMOVE', 'No salad (fries only)', 0.00, 0, 3),
('CO_GRILLED_SUB_NO_HONEY', 'CG_GRILLED_SUB_REMOVE', 'No hot honey', 0.00, 0, 4);

-- Optional: Add-ons (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_GRILLED_SUB_ADDON', 'ITEM_GRILLED_SUB', 'Add-ons', 'multiple', 0, 4);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_GRILLED_SUB_ADDON_CHICKEN', 'CG_GRILLED_SUB_ADDON', 'Chicken topping on fries', 3.00, 0, 1),
('CO_GRILLED_SUB_ADDON_BRISKET', 'CG_GRILLED_SUB_ADDON', 'Brisket topping on fries', 4.00, 0, 2),
('CO_GRILLED_SUB_ADDON_MIXED', 'CG_GRILLED_SUB_ADDON', 'Mixed topping on fries', 5.00, 0, 3);

-- Optional: Extras (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_GRILLED_SUB_EXTRA', 'ITEM_GRILLED_SUB', 'Extras', 'multiple', 0, 5);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_GRILLED_SUB_EXTRA_HALLOUMI', 'CG_GRILLED_SUB_EXTRA', 'Grilled Halloumi Sticks', 6.50, 0, 1),
('CO_GRILLED_SUB_EXTRA_POPPERS', 'CG_GRILLED_SUB_EXTRA', 'Cheesy Pizza Poppers', 6.50, 0, 2);

-- Optional: Drinks
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_GRILLED_SUB_DRINK', 'ITEM_GRILLED_SUB', 'Add a Drink', 'single', 0, 6);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_GRILLED_SUB_DRINK_SHANI', 'CG_GRILLED_SUB_DRINK', 'Shani Can', 2.50, 0, 1),
('CO_GRILLED_SUB_DRINK_GUAVA', 'CG_GRILLED_SUB_DRINK', 'Rubicon Guava', 2.50, 0, 2),
('CO_GRILLED_SUB_DRINK_MANGO', 'CG_GRILLED_SUB_DRINK', 'Rubicon Mango', 2.50, 0, 3),
('CO_GRILLED_SUB_DRINK_PASSION', 'CG_GRILLED_SUB_DRINK', 'Rubicon Passion Fruit', 2.50, 0, 4),
('CO_GRILLED_SUB_DRINK_COLA', 'CG_GRILLED_SUB_DRINK', 'Palestine Cola', 2.50, 0, 5),
('CO_GRILLED_SUB_DRINK_COLA_SF', 'CG_GRILLED_SUB_DRINK', 'Palestine Cola (Sugar Free)', 2.50, 0, 6),
('CO_GRILLED_SUB_DRINK_LEMON', 'CG_GRILLED_SUB_DRINK', 'Palestine Lemon & Lime', 2.50, 0, 7),
('CO_GRILLED_SUB_DRINK_ORANGE', 'CG_GRILLED_SUB_DRINK', 'Palestine Orange', 2.50, 0, 8),
('CO_GRILLED_SUB_DRINK_WATER', 'CG_GRILLED_SUB_DRINK', 'Bottled Water', 2.50, 0, 9),
('CO_GRILLED_SUB_DRINK_CAPRI', 'CG_GRILLED_SUB_DRINK', 'Capri Sun', 2.00, 0, 10);

-- ==================== SAJ WRAP CUSTOMIZATIONS ====================

-- Required: Choose Your Protein
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_SAJ_WRAP_PROTEIN', 'ITEM_SAJ_WRAP', 'Choose Your Protein', 'single', 1, 1);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_SAJ_WRAP_CHICKEN', 'CG_SAJ_WRAP_PROTEIN', 'Kick''n Chicken - Juicy chicken shawarma, thinly sliced and grilled', 0.00, 1, 1),
('CO_SAJ_WRAP_BRISKET', 'CG_SAJ_WRAP_PROTEIN', 'Buss''n Brisket - Proper low-and-slow smoked beef brisket', 1.50, 0, 2),
('CO_SAJ_WRAP_MIXED', 'CG_SAJ_WRAP_PROTEIN', 'Mixed - A generous combination of chicken and brisket', 2.50, 0, 3);

-- Required: Spice Level
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_SAJ_WRAP_SPICE', 'ITEM_SAJ_WRAP', 'Spice Level', 'single', 1, 2);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_SAJ_WRAP_MILD', 'CG_SAJ_WRAP_SPICE', 'Mild', 0.00, 1, 1),
('CO_SAJ_WRAP_SPICY', 'CG_SAJ_WRAP_SPICE', 'Spicy (harissa instead of hot honey)', 0.00, 0, 2);

-- Optional: Remove Items (Free)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_SAJ_WRAP_REMOVE', 'ITEM_SAJ_WRAP', 'Remove Items', 'multiple', 0, 3);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_SAJ_WRAP_NO_CHEESE', 'CG_SAJ_WRAP_REMOVE', 'No cheese', 0.00, 0, 1),
('CO_SAJ_WRAP_NO_GARLIC', 'CG_SAJ_WRAP_REMOVE', 'No garlic', 0.00, 0, 2),
('CO_SAJ_WRAP_NO_SALAD', 'CG_SAJ_WRAP_REMOVE', 'No salad (fries only)', 0.00, 0, 3),
('CO_SAJ_WRAP_NO_HONEY', 'CG_SAJ_WRAP_REMOVE', 'No hot honey', 0.00, 0, 4);

-- Optional: Add-ons (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_SAJ_WRAP_ADDON', 'ITEM_SAJ_WRAP', 'Add-ons', 'multiple', 0, 4);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_SAJ_WRAP_ADDON_MOZZ', 'CG_SAJ_WRAP_ADDON', 'Extra shredded mozzarella in wrap', 1.00, 0, 1),
('CO_SAJ_WRAP_ADDON_CHICKEN', 'CG_SAJ_WRAP_ADDON', 'Chicken topping on fries', 3.00, 0, 2),
('CO_SAJ_WRAP_ADDON_BRISKET', 'CG_SAJ_WRAP_ADDON', 'Brisket topping on fries', 4.00, 0, 3),
('CO_SAJ_WRAP_ADDON_MIXED', 'CG_SAJ_WRAP_ADDON', 'Mixed topping on fries', 5.00, 0, 4);

-- Optional: Extras (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_SAJ_WRAP_EXTRA', 'ITEM_SAJ_WRAP', 'Extras', 'multiple', 0, 5);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_SAJ_WRAP_EXTRA_HALLOUMI', 'CG_SAJ_WRAP_EXTRA', 'Grilled Halloumi Sticks', 6.50, 0, 1),
('CO_SAJ_WRAP_EXTRA_POPPERS', 'CG_SAJ_WRAP_EXTRA', 'Cheesy Pizza Poppers', 6.50, 0, 2);

-- Optional: Drinks
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_SAJ_WRAP_DRINK', 'ITEM_SAJ_WRAP', 'Add a Drink', 'single', 0, 6);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_SAJ_WRAP_DRINK_SHANI', 'CG_SAJ_WRAP_DRINK', 'Shani Can', 2.50, 0, 1),
('CO_SAJ_WRAP_DRINK_GUAVA', 'CG_SAJ_WRAP_DRINK', 'Rubicon Guava', 2.50, 0, 2),
('CO_SAJ_WRAP_DRINK_MANGO', 'CG_SAJ_WRAP_DRINK', 'Rubicon Mango', 2.50, 0, 3),
('CO_SAJ_WRAP_DRINK_PASSION', 'CG_SAJ_WRAP_DRINK', 'Rubicon Passion Fruit', 2.50, 0, 4),
('CO_SAJ_WRAP_DRINK_COLA', 'CG_SAJ_WRAP_DRINK', 'Palestine Cola', 2.50, 0, 5),
('CO_SAJ_WRAP_DRINK_COLA_SF', 'CG_SAJ_WRAP_DRINK', 'Palestine Cola (Sugar Free)', 2.50, 0, 6),
('CO_SAJ_WRAP_DRINK_LEMON', 'CG_SAJ_WRAP_DRINK', 'Palestine Lemon & Lime', 2.50, 0, 7),
('CO_SAJ_WRAP_DRINK_ORANGE', 'CG_SAJ_WRAP_DRINK', 'Palestine Orange', 2.50, 0, 8),
('CO_SAJ_WRAP_DRINK_WATER', 'CG_SAJ_WRAP_DRINK', 'Bottled Water', 2.50, 0, 9),
('CO_SAJ_WRAP_DRINK_CAPRI', 'CG_SAJ_WRAP_DRINK', 'Capri Sun', 2.00, 0, 10);

-- ==================== LOADED FRIES CUSTOMIZATIONS ====================

-- Required: Choose Your Protein
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_LOADED_FRIES_PROTEIN', 'ITEM_LOADED_FRIES', 'Choose Your Protein', 'single', 1, 1);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_LOADED_FRIES_CHICKEN', 'CG_LOADED_FRIES_PROTEIN', 'Kick''n Chicken - Juicy chicken shawarma', 0.00, 1, 1),
('CO_LOADED_FRIES_BRISKET', 'CG_LOADED_FRIES_PROTEIN', 'Buss''n Brisket - Slow-smoked beef brisket', 2.00, 0, 2),
('CO_LOADED_FRIES_MIXED', 'CG_LOADED_FRIES_PROTEIN', 'Mixed - Combination of chicken and brisket', 3.00, 0, 3);

-- Required: Spice Level
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_LOADED_FRIES_SPICE', 'ITEM_LOADED_FRIES', 'Spice Level', 'single', 1, 2);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_LOADED_FRIES_MILD', 'CG_LOADED_FRIES_SPICE', 'Mild', 0.00, 1, 1),
('CO_LOADED_FRIES_SPICY', 'CG_LOADED_FRIES_SPICE', 'Spicy (harissa instead of hot honey)', 0.00, 0, 2);

-- Optional: Remove Items (Free)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_LOADED_FRIES_REMOVE', 'ITEM_LOADED_FRIES', 'Remove Items', 'multiple', 0, 3);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_LOADED_FRIES_NO_CHEESE', 'CG_LOADED_FRIES_REMOVE', 'No cheese', 0.00, 0, 1),
('CO_LOADED_FRIES_NO_GARLIC', 'CG_LOADED_FRIES_REMOVE', 'No garlic', 0.00, 0, 2),
('CO_LOADED_FRIES_NO_SALAD', 'CG_LOADED_FRIES_REMOVE', 'No salad', 0.00, 0, 3),
('CO_LOADED_FRIES_NO_HONEY', 'CG_LOADED_FRIES_REMOVE', 'No hot honey', 0.00, 0, 4);

-- Optional: Add-ons (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_LOADED_FRIES_ADDON', 'ITEM_LOADED_FRIES', 'Add-ons', 'multiple', 0, 4);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_LOADED_FRIES_ADDON_CHICKEN', 'CG_LOADED_FRIES_ADDON', 'Extra chicken', 3.99, 0, 1),
('CO_LOADED_FRIES_ADDON_BRISKET', 'CG_LOADED_FRIES_ADDON', 'Extra brisket', 4.99, 0, 2),
('CO_LOADED_FRIES_ADDON_MIXED', 'CG_LOADED_FRIES_ADDON', 'Extra mixed', 5.99, 0, 3);

-- Optional: Extras (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_LOADED_FRIES_EXTRA', 'ITEM_LOADED_FRIES', 'Extras', 'multiple', 0, 5);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_LOADED_FRIES_EXTRA_HALLOUMI', 'CG_LOADED_FRIES_EXTRA', 'Grilled Halloumi Sticks', 6.50, 0, 1),
('CO_LOADED_FRIES_EXTRA_POPPERS', 'CG_LOADED_FRIES_EXTRA', 'Cheesy Pizza Poppers', 6.50, 0, 2);

-- Optional: Drinks
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_LOADED_FRIES_DRINK', 'ITEM_LOADED_FRIES', 'Add a Drink', 'single', 0, 6);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_LOADED_FRIES_DRINK_SHANI', 'CG_LOADED_FRIES_DRINK', 'Shani Can', 2.50, 0, 1),
('CO_LOADED_FRIES_DRINK_GUAVA', 'CG_LOADED_FRIES_DRINK', 'Rubicon Guava', 2.50, 0, 2),
('CO_LOADED_FRIES_DRINK_MANGO', 'CG_LOADED_FRIES_DRINK', 'Rubicon Mango', 2.50, 0, 3),
('CO_LOADED_FRIES_DRINK_PASSION', 'CG_LOADED_FRIES_DRINK', 'Rubicon Passion Fruit', 2.50, 0, 4),
('CO_LOADED_FRIES_DRINK_COLA', 'CG_LOADED_FRIES_DRINK', 'Palestine Cola', 2.50, 0, 5),
('CO_LOADED_FRIES_DRINK_COLA_SF', 'CG_LOADED_FRIES_DRINK', 'Palestine Cola (Sugar Free)', 2.50, 0, 6),
('CO_LOADED_FRIES_DRINK_LEMON', 'CG_LOADED_FRIES_DRINK', 'Palestine Lemon & Lime', 2.50, 0, 7),
('CO_LOADED_FRIES_DRINK_ORANGE', 'CG_LOADED_FRIES_DRINK', 'Palestine Orange', 2.50, 0, 8),
('CO_LOADED_FRIES_DRINK_WATER', 'CG_LOADED_FRIES_DRINK', 'Bottled Water', 2.50, 0, 9),
('CO_LOADED_FRIES_DRINK_CAPRI', 'CG_LOADED_FRIES_DRINK', 'Capri Sun', 2.00, 0, 10);

-- ==================== RICE BOWL CUSTOMIZATIONS ====================

-- Required: Choose Your Protein
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_RICE_BOWL_PROTEIN', 'ITEM_RICE_BOWL', 'Choose Your Protein', 'single', 1, 1);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_RICE_BOWL_CHICKEN', 'CG_RICE_BOWL_PROTEIN', 'Kick''n Chicken - Juicy chicken shawarma', 0.00, 1, 1),
('CO_RICE_BOWL_BRISKET', 'CG_RICE_BOWL_PROTEIN', 'Buss''n Brisket - Slow-smoked beef brisket', 2.00, 0, 2),
('CO_RICE_BOWL_MIXED', 'CG_RICE_BOWL_PROTEIN', 'Mixed - Combination of chicken and brisket', 3.00, 0, 3);

-- Required: Spice Level
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_RICE_BOWL_SPICE', 'ITEM_RICE_BOWL', 'Spice Level', 'single', 1, 2);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_RICE_BOWL_MILD', 'CG_RICE_BOWL_SPICE', 'Mild', 0.00, 1, 1),
('CO_RICE_BOWL_SPICY', 'CG_RICE_BOWL_SPICE', 'Spicy (harissa instead of hot honey)', 0.00, 0, 2);

-- Optional: Remove Items (Free)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_RICE_BOWL_REMOVE', 'ITEM_RICE_BOWL', 'Remove Items', 'multiple', 0, 3);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_RICE_BOWL_NO_CHEESE', 'CG_RICE_BOWL_REMOVE', 'No cheese', 0.00, 0, 1),
('CO_RICE_BOWL_NO_GARLIC', 'CG_RICE_BOWL_REMOVE', 'No garlic', 0.00, 0, 2),
('CO_RICE_BOWL_NO_SALAD', 'CG_RICE_BOWL_REMOVE', 'No salad', 0.00, 0, 3),
('CO_RICE_BOWL_NO_HONEY', 'CG_RICE_BOWL_REMOVE', 'No hot honey', 0.00, 0, 4),
('CO_RICE_BOWL_NO_FRIES', 'CG_RICE_BOWL_REMOVE', 'No fries on top', 0.00, 0, 5);

-- Optional: Add-ons (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_RICE_BOWL_ADDON', 'ITEM_RICE_BOWL', 'Add-ons', 'multiple', 0, 4);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_RICE_BOWL_ADDON_CHICKEN', 'CG_RICE_BOWL_ADDON', 'Extra chicken', 3.99, 0, 1),
('CO_RICE_BOWL_ADDON_BRISKET', 'CG_RICE_BOWL_ADDON', 'Extra brisket', 4.99, 0, 2),
('CO_RICE_BOWL_ADDON_MIXED', 'CG_RICE_BOWL_ADDON', 'Extra mixed', 5.99, 0, 3);

-- Optional: Extras (Paid)
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_RICE_BOWL_EXTRA', 'ITEM_RICE_BOWL', 'Extras', 'multiple', 0, 5);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_RICE_BOWL_EXTRA_HALLOUMI', 'CG_RICE_BOWL_EXTRA', 'Grilled Halloumi Sticks', 6.50, 0, 1),
('CO_RICE_BOWL_EXTRA_POPPERS', 'CG_RICE_BOWL_EXTRA', 'Cheesy Pizza Poppers', 6.50, 0, 2);

-- Optional: Drinks
INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES
('CG_RICE_BOWL_DRINK', 'ITEM_RICE_BOWL', 'Add a Drink', 'single', 0, 6);

INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES
('CO_RICE_BOWL_DRINK_SHANI', 'CG_RICE_BOWL_DRINK', 'Shani Can', 2.50, 0, 1),
('CO_RICE_BOWL_DRINK_GUAVA', 'CG_RICE_BOWL_DRINK', 'Rubicon Guava', 2.50, 0, 2),
('CO_RICE_BOWL_DRINK_MANGO', 'CG_RICE_BOWL_DRINK', 'Rubicon Mango', 2.50, 0, 3),
('CO_RICE_BOWL_DRINK_PASSION', 'CG_RICE_BOWL_DRINK', 'Rubicon Passion Fruit', 2.50, 0, 4),
('CO_RICE_BOWL_DRINK_COLA', 'CG_RICE_BOWL_DRINK', 'Palestine Cola', 2.50, 0, 5),
('CO_RICE_BOWL_DRINK_COLA_SF', 'CG_RICE_BOWL_DRINK', 'Palestine Cola (Sugar Free)', 2.50, 0, 6),
('CO_RICE_BOWL_DRINK_LEMON', 'CG_RICE_BOWL_DRINK', 'Palestine Lemon & Lime', 2.50, 0, 7),
('CO_RICE_BOWL_DRINK_ORANGE', 'CG_RICE_BOWL_DRINK', 'Palestine Orange', 2.50, 0, 8),
('CO_RICE_BOWL_DRINK_WATER', 'CG_RICE_BOWL_DRINK', 'Bottled Water', 2.50, 0, 9),
('CO_RICE_BOWL_DRINK_CAPRI', 'CG_RICE_BOWL_DRINK', 'Capri Sun', 2.00, 0, 10);

-- ============================================================
-- Migration Complete
-- ============================================================
-- Total Categories: 8
-- Total Menu Items: 31
-- Total Customization Groups: 24 (4 main items × 6 groups each)
-- Total Customization Options: 164+
-- ============================================================
