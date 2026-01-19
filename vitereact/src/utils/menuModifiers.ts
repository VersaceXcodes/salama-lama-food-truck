/**
 * Menu Item Modifiers Utility
 * Generates modifier groups for menu items based on their category
 */

export interface ModifierOption {
  id: string;
  label: string;
  priceDelta: number;
  note?: string;
}

export interface ModifierGroup {
  id: string;
  title: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  type: 'single' | 'multi' | 'single_optional';
  options: ModifierOption[];
}

// Categories that support modifiers
const MODIFIER_CATEGORIES = ['grilled-subs', 'saj-wraps', 'loaded-fries', 'rice-bowls'];

/**
 * Check if an item (based on category) should have modifiers
 */
export function shouldHaveModifiers(categoryId: string | null): boolean {
  if (!categoryId) return false;
  return MODIFIER_CATEGORIES.includes(categoryId.toLowerCase());
}

/**
 * Generate modifiers for a specific category
 */
export function generateModifiersForCategory(
  categoryId: string,
  drinkItems?: Array<{ item_id: string; name: string; price: number }>
): ModifierGroup[] {
  const normalizedCategoryId = categoryId.toLowerCase();
  
  if (!shouldHaveModifiers(normalizedCategoryId)) {
    return [];
  }

  const modifierGroups: ModifierGroup[] = [];

  // A) Spice Level (REQUIRED)
  modifierGroups.push({
    id: 'spice-level',
    title: 'Spice Level',
    required: true,
    minSelect: 1,
    maxSelect: 1,
    type: 'single',
    options: [
      {
        id: 'mild',
        label: 'Mild',
        priceDelta: 0,
      },
      {
        id: 'spicy',
        label: 'Spicy',
        priceDelta: 0,
        note: 'Harissa instead of hot honey',
      },
    ],
  });

  // B) Remove Items (OPTIONAL, free)
  const removeOptions: ModifierOption[] = [
    { id: 'no-cheese', label: 'No cheese', priceDelta: 0 },
    { id: 'no-garlic', label: 'No garlic', priceDelta: 0 },
    { id: 'no-salad-fries-only', label: 'No salad (fries only)', priceDelta: 0 },
    { id: 'no-hot-honey', label: 'No hot honey', priceDelta: 0 },
  ];

  // Add rice bowl specific option
  if (normalizedCategoryId === 'rice-bowls') {
    removeOptions.push({
      id: 'no-fries-on-top',
      label: 'No fries on top',
      priceDelta: 0,
    });
  }

  modifierGroups.push({
    id: 'remove-items',
    title: 'Remove Items',
    required: false,
    minSelect: 0,
    maxSelect: removeOptions.length,
    type: 'multi',
    options: removeOptions,
  });

  // C) Add-ons (OPTIONAL, paid)
  const addOns: ModifierOption[] = [];

  if (normalizedCategoryId === 'grilled-subs') {
    addOns.push(
      { id: 'chicken-topping-fries', label: 'Chicken topping on fries', priceDelta: 3.0 },
      { id: 'brisket-topping-fries', label: 'Brisket topping on fries', priceDelta: 4.0 },
      { id: 'mixed-topping-fries', label: 'Mixed topping on fries', priceDelta: 5.0 }
    );
  } else if (normalizedCategoryId === 'saj-wraps') {
    addOns.push(
      { id: 'extra-mozzarella', label: 'Extra shredded mozzarella in wrap', priceDelta: 1.0 },
      { id: 'chicken-topping-fries', label: 'Chicken topping on fries', priceDelta: 3.0 },
      { id: 'brisket-topping-fries', label: 'Brisket topping on fries', priceDelta: 4.0 },
      { id: 'mixed-topping-fries', label: 'Mixed topping on fries', priceDelta: 5.0 }
    );
  } else if (normalizedCategoryId === 'loaded-fries' || normalizedCategoryId === 'rice-bowls') {
    addOns.push(
      { id: 'extra-chicken', label: 'Extra chicken', priceDelta: 3.99 },
      { id: 'extra-brisket', label: 'Extra brisket', priceDelta: 4.99 },
      { id: 'extra-mixed', label: 'Extra mixed', priceDelta: 5.99 }
    );
  }

  if (addOns.length > 0) {
    modifierGroups.push({
      id: 'add-ons',
      title: 'Add-ons',
      required: false,
      minSelect: 0,
      maxSelect: addOns.length,
      type: 'multi',
      options: addOns,
    });
  }

  // D) Extras (OPTIONAL, paid)
  modifierGroups.push({
    id: 'extras',
    title: 'Extras',
    required: false,
    minSelect: 0,
    maxSelect: 2,
    type: 'multi',
    options: [
      { id: 'halloumi-sticks', label: 'Grilled Halloumi Sticks', priceDelta: 6.5 },
      { id: 'pizza-poppers', label: 'Cheesy Pizza Poppers', priceDelta: 6.5 },
    ],
  });

  // E) Add a Drink (OPTIONAL, choose max 1)
  const drinkOptions: ModifierOption[] = [
    { id: 'none', label: 'None', priceDelta: 0 },
  ];

  // Add drinks from the provided drink items or use defaults
  if (drinkItems && drinkItems.length > 0) {
    drinkItems.forEach((drink) => {
      drinkOptions.push({
        id: `drink-${drink.item_id}`,
        label: drink.name,
        priceDelta: drink.price,
      });
    });
  } else {
    // Default drinks if API data not available
    const defaultDrinks = [
      { id: 'shani', label: 'Shani Can 330ml', price: 2.5 },
      { id: 'rubicon-guava', label: 'Rubicon Guava Can 330ml', price: 2.5 },
      { id: 'rubicon-mango', label: 'Rubicon Mango Can 330ml', price: 2.5 },
      { id: 'rubicon-passion', label: 'Rubicon Passion Fruit Can 330ml', price: 2.5 },
      { id: 'palestine-cola', label: 'Palestine Cola Can 330ml', price: 2.5 },
      { id: 'palestine-cola-sf', label: 'Palestine Cola (Sugar Free) Can 330ml', price: 2.5 },
      { id: 'palestine-lemon', label: 'Palestine Lemon and Lime Can 330ml', price: 2.5 },
      { id: 'palestine-orange', label: 'Palestine Orange Can 330ml', price: 2.5 },
      { id: 'water', label: 'Bottled Water 350ml', price: 2.5 },
      { id: 'capri-sun', label: 'Capri Sun 350ml', price: 2.0 },
    ];

    defaultDrinks.forEach((drink) => {
      drinkOptions.push({
        id: `drink-${drink.id}`,
        label: drink.label,
        priceDelta: drink.price,
      });
    });
  }

  modifierGroups.push({
    id: 'add-drink',
    title: 'Add a Drink',
    required: false,
    minSelect: 0,
    maxSelect: 1,
    type: 'single_optional',
    options: drinkOptions,
  });

  // Sort: Required groups first, then optional groups
  return modifierGroups.sort((a, b) => {
    if (a.required === b.required) return 0;
    return a.required ? -1 : 1;
  });
}

/**
 * Attach modifiers to a menu item based on its category
 */
export function attachModifiersToItem(
  item: any,
  drinkItems?: Array<{ item_id: string; name: string; price: number }>
): any {
  // Check if item already has customization_groups
  if (item.customization_groups && item.customization_groups.length > 0) {
    // Item already has customizations from the database
    return item;
  }

  // Check if item category should have modifiers
  if (!shouldHaveModifiers(item.category_id)) {
    return item;
  }

  // Generate modifiers for this category
  const modifierGroups = generateModifiersForCategory(item.category_id, drinkItems);

  // Convert ModifierGroup[] to CustomizationGroup[] format expected by the UI
  const customization_groups = modifierGroups.map((group, groupIndex) => ({
    group_id: group.id,
    name: group.title,
    type: group.type === 'multi' ? 'multiple' : 'single',
    is_required: group.required,
    sort_order: groupIndex,
    options: group.options.map((option, optionIndex) => ({
      option_id: option.id,
      name: option.label + (option.note ? ` (${option.note})` : ''),
      additional_price: option.priceDelta,
      is_default: option.id === 'mild' || option.id === 'none', // Default selections
      sort_order: optionIndex,
    })),
  }));

  return {
    ...item,
    customization_groups,
  };
}
