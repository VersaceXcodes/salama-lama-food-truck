
def generate_customizations(item_id, category_type):
    # category_type: 'GS' (Grilled Sub), 'SW' (Saj Wrap), 'LF' (Loaded Fries), 'RB' (Rice Bowl)
    
    # Common definitions
    spice_opts = [
        ('MILD', 'Mild', 0.00, 1, 1),
        ('SPICY', 'Spicy (harissa instead of hot honey)', 0.00, 0, 2)
    ]
    
    # Base Remove Options
    remove_opts = [
        ('CHEESE', 'No cheese', 0.00, 0, 1),
        ('GARLIC', 'No garlic', 0.00, 0, 2),
        ('SALAD', 'No salad (fries only)', 0.00, 0, 3),
        ('HONEY', 'No hot honey', 0.00, 0, 4)
    ]
    # Add specific remove option for Rice Bowls
    if category_type == 'RB':
        remove_opts.append(('FRIES', 'No fries on top', 0.00, 0, 5))

    addon_opts = []
    if category_type == 'GS':
        addon_opts = [
            ('CHICKEN', 'Chicken topping on fries', 3.00, 0, 1),
            ('BRISKET', 'Brisket topping on fries', 4.00, 0, 2),
            ('MIXED', 'Mixed topping on fries', 5.00, 0, 3)
        ]
    elif category_type == 'SW':
        addon_opts = [
            ('MOZZ', 'Extra shredded mozzarella in wrap', 1.00, 0, 1),
            ('CHICKEN', 'Chicken topping on fries', 3.00, 0, 2),
            ('BRISKET', 'Brisket topping on fries', 4.00, 0, 3),
            ('MIXED', 'Mixed topping on fries', 5.00, 0, 4)
        ]
    elif category_type in ['LF', 'RB']:
        addon_opts = [
            ('CHICKEN', 'Extra chicken', 3.99, 0, 1),
            ('BRISKET', 'Extra brisket', 4.99, 0, 2),
            ('MIXED', 'Extra mixed', 5.99, 0, 3)
        ]
    
    extra_opts = [
        ('HALLOUMI', 'Grilled Halloumi Sticks', 6.50, 0, 1),
        ('POPPERS', 'Cheesy Pizza Poppers', 6.50, 0, 2)
    ]
    
    drink_opts = [
        ('1', 'Shani Can 330ml', 2.50, 0, 1),
        ('2', 'Rubicon Guava Can 330ml', 2.50, 0, 2),
        ('3', 'Rubicon Mango Can 330ml', 2.50, 0, 3),
        ('4', 'Rubicon Passion Fruit Can 330ml', 2.50, 0, 4),
        ('5', 'Palestine Cola Can 330ml', 2.50, 0, 5),
        ('6', 'Palestine Cola (Sugar Free) Can 330ml', 2.50, 0, 6),
        ('7', 'Palestine Lemon and Lime Can 330ml', 2.50, 0, 7),
        ('8', 'Palestine Orange Can 330ml', 2.50, 0, 8),
        ('9', 'Bottled Water 350ml', 2.50, 0, 9),
        ('10', 'Capri Sun 350ml', 2.00, 0, 10)
    ]

    sql = []
    
    # helper to clean IDs
    clean_id = item_id.replace('ITEM_', '')
    
    # 1. Spice Level
    group_id = f"CG_{clean_id}_SPICE"
    sql.append(f"INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES ('{group_id}', '{item_id}', 'Spice Level', 'single', 1, 1);")
    for code, name, price, default, order in spice_opts:
        opt_id = f"CO_{clean_id}_SPICE_{code}"
        sql.append(f"INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES ('{opt_id}', '{group_id}', '{name}', {price:.2f}, {default}, {order});")

    # 2. Remove Items
    group_id = f"CG_{clean_id}_REMOVE"
    sql.append(f"INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES ('{group_id}', '{item_id}', 'Remove Items', 'multiple', 0, 2);")
    for code, name, price, default, order in remove_opts:
        opt_id = f"CO_{clean_id}_REMOVE_{code}"
        sql.append(f"INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES ('{opt_id}', '{group_id}', '{name}', {price:.2f}, {default}, {order});")

    # 3. Add-ons
    if addon_opts:
        group_id = f"CG_{clean_id}_ADDON"
        sql.append(f"INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES ('{group_id}', '{item_id}', 'Add-ons', 'multiple', 0, 3);")
        for code, name, price, default, order in addon_opts:
            opt_id = f"CO_{clean_id}_ADDON_{code}"
            sql.append(f"INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES ('{opt_id}', '{group_id}', '{name}', {price:.2f}, {default}, {order});")

    # 4. Extras
    group_id = f"CG_{clean_id}_EXTRA"
    sql.append(f"INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES ('{group_id}', '{item_id}', 'Extras', 'multiple', 0, 4);")
    for code, name, price, default, order in extra_opts:
        opt_id = f"CO_{clean_id}_EXTRA_{code}"
        sql.append(f"INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES ('{opt_id}', '{group_id}', '{name}', {price:.2f}, {default}, {order});")

    # 5. Drinks
    group_id = f"CG_{clean_id}_DRINK"
    sql.append(f"INSERT INTO customization_groups (group_id, item_id, name, type, is_required, sort_order) VALUES ('{group_id}', '{item_id}', 'Add a Drink', 'single', 0, 5);")
    for code, name, price, default, order in drink_opts:
        opt_id = f"CO_{clean_id}_DRINK_{code}"
        sql.append(f"INSERT INTO customization_options (option_id, group_id, name, additional_price, is_default, sort_order) VALUES ('{opt_id}', '{group_id}', '{name}', {price:.2f}, {default}, {order});")
        
    return "\n".join(sql)

# Define items to generate
items = [
    # Most Popular
    ('ITEM_MP_001', 'RB'), # Mixed Rice Bowl
    ('ITEM_MP_002', 'LF'), # Mixed Loaded Fries
    ('ITEM_MP_003', 'GS'), # Chicken Grilled Sub
    ('ITEM_MP_004', 'SW'), # Brisket Saj Wrap
    
    # Saj Wraps
    ('ITEM_SW_001', 'SW'),
    ('ITEM_SW_002', 'SW'),
    ('ITEM_SW_003', 'SW'),
    
    # Loaded Fries
    ('ITEM_LF_001', 'LF'),
    ('ITEM_LF_002', 'LF'),
    ('ITEM_LF_003', 'LF'),
    
    # Rice Bowls
    ('ITEM_RB_001', 'RB'),
    ('ITEM_RB_002', 'RB'),
    ('ITEM_RB_003', 'RB')
]

print("-- Generated Customizations")
for item_id, cat_type in items:
    print(f"\n-- Customizations for {item_id}")
    print(generate_customizations(item_id, cat_type))
