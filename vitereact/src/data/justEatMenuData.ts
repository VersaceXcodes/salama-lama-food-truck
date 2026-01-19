// Just Eat Menu Data for Salama Lama
// This file contains the complete menu structure matching the Just Eat menu

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isHighlight?: boolean;
  hasCustomizations?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  itemCount: number;
  note?: string;
  items: MenuItem[];
}

export const HIGHLIGHTS: MenuItem[] = [
  {
    id: 'HL_001',
    name: 'Grilled Halloumi Sticks',
    description: 'Served on a small base of fries, drizzled with hot honey',
    price: 6.50,
    category: 'Sides',
    isHighlight: true,
  },
  {
    id: 'HL_002',
    name: 'Crispy Seasoned Fries',
    description: 'Freshly fried, lightly seasoned crispy fries',
    price: 5.00,
    category: 'Sides',
    isHighlight: true,
  },
  {
    id: 'HL_003',
    name: 'Cheesy Pizza Poppers',
    description: 'Served on a small base of fries with hot honey',
    price: 6.50,
    category: 'Sides',
    isHighlight: true,
  },
  {
    id: 'HL_004',
    name: 'Chicken Grilled Sub',
    description: 'Toasted ciabatta sub with grilled chicken',
    price: 14.50,
    category: 'Most Popular',
    isHighlight: true,
    image: 'chicken-sub',
  },
];

export const MENU_DATA: MenuCategory[] = [
  {
    id: 'most-popular',
    name: 'Most Popular',
    itemCount: 4,
    items: [
      {
        id: 'MP_001',
        name: 'Mixed Rice Bowl',
        description: 'Mediterranean rice topped with grilled chicken and smoked brisket, finished with signature topped fries, house garlic sauce, Signature Lamazing sauce, shredded mozzarella, crispy onions, mixed Mediterranean salad, and hot honey.',
        price: 19.00,
        category: 'Most Popular',
        hasCustomizations: false,
      },
      {
        id: 'MP_002',
        name: 'Mixed Loaded Fries',
        description: 'Crispy seasoned fries topped with grilled chicken and smoked brisket, shredded mozzarella, house garlic sauce, Signature Lamazing sauce, crispy onions, mixed Mediterranean salad, and hot honey.',
        price: 18.00,
        category: 'Most Popular',
        hasCustomizations: false,
      },
      {
        id: 'MP_003',
        name: 'Chicken Grilled Sub',
        description: 'Toasted ciabatta sub filled with grilled chicken shawarma, melted mozzarella, house garlic sauce, and Signature Lamazing sauce. Served with signature topped fries.',
        price: 14.50,
        category: 'Most Popular',
        hasCustomizations: true,
      },
      {
        id: 'MP_004',
        name: 'Brisket Saj Wrap',
        description: 'Traditional toasted saj wrap filled with pulled smoked brisket, house garlic sauce, pickles, and fries. Served with signature topped fries.',
        price: 16.50,
        category: 'Most Popular',
        hasCustomizations: true,
      },
    ],
  },
  {
    id: 'grilled-subs',
    name: 'Grilled Subs',
    itemCount: 3,
    note: 'All grilled subs are served with signature topped fries.',
    items: [
      {
        id: 'GS_001',
        name: 'Chicken Grilled Sub',
        description: 'Toasted ciabatta sub with grilled chicken shawarma, mozzarella, house garlic, Signature Lamazing sauce.',
        price: 14.50,
        category: 'Grilled Subs',
        hasCustomizations: true,
      },
      {
        id: 'GS_002',
        name: 'Traditional Brisket Grilled Sub',
        description: 'Toasted ciabatta sub with slow smoked brisket, mozzarella, house garlic, Signature Lamazing sauce.',
        price: 16.00,
        category: 'Grilled Subs',
        hasCustomizations: true,
      },
      {
        id: 'GS_003',
        name: 'Mixed Grilled Sub',
        description: 'Toasted ciabatta sub with grilled chicken + smoked brisket, mozzarella, house garlic, Signature Lamazing sauce.',
        price: 17.00,
        category: 'Grilled Subs',
        hasCustomizations: true,
      },
    ],
  },
  {
    id: 'saj-wraps',
    name: 'Saj Wraps',
    itemCount: 3,
    note: 'All saj wraps are served with signature topped fries.',
    items: [
      {
        id: 'SW_001',
        name: 'Traditional Chicken Saj Wrap',
        description: 'Toasted saj wrap with grilled chicken, house garlic sauce, pickles and fries.',
        price: 15.00,
        category: 'Saj Wraps',
        hasCustomizations: true,
      },
      {
        id: 'SW_002',
        name: 'Brisket Saj Wrap',
        description: 'Toasted saj wrap with pulled smoked brisket, house garlic sauce, pickles and fries.',
        price: 16.50,
        category: 'Saj Wraps',
        hasCustomizations: true,
      },
      {
        id: 'SW_003',
        name: 'Mixed Saj Wrap',
        description: 'Toasted saj wrap with grilled chicken + brisket, house garlic sauce, pickles and fries.',
        price: 17.50,
        category: 'Saj Wraps',
        hasCustomizations: true,
      },
    ],
  },
  {
    id: 'loaded-fries',
    name: 'Loaded Fries',
    itemCount: 3,
    items: [
      {
        id: 'LF_001',
        name: 'Chicken Loaded Fries',
        description: 'Crispy seasoned fries with grilled chicken, mozzarella, house garlic, Signature Lamazing sauce, crispy onions, Mediterranean salad, hot honey.',
        price: 15.50,
        category: 'Loaded Fries',
        hasCustomizations: true,
      },
      {
        id: 'LF_002',
        name: 'Brisket Loaded Fries',
        description: 'Crispy seasoned fries with smoked brisket, mozzarella, house garlic, Signature Lamazing sauce, crispy onions, Mediterranean salad, hot honey.',
        price: 17.50,
        category: 'Loaded Fries',
        hasCustomizations: true,
      },
      {
        id: 'LF_003',
        name: 'Mixed Loaded Fries',
        description: 'Crispy seasoned fries with grilled chicken + smoked brisket, mozzarella, house garlic, Signature Lamazing sauce, crispy onions, Mediterranean salad, hot honey.',
        price: 18.00,
        category: 'Loaded Fries',
        hasCustomizations: true,
      },
    ],
  },
  {
    id: 'rice-bowls',
    name: 'Rice Bowls',
    itemCount: 3,
    note: 'Rice bowls are topped with signature topped fries.',
    items: [
      {
        id: 'RB_001',
        name: 'Chicken Rice Bowl',
        description: 'Mediterranean rice with grilled chicken, signature topped fries, house garlic, Signature Lamazing sauce, mozzarella, crispy onions, Mediterranean salad, hot honey.',
        price: 16.50,
        category: 'Rice Bowls',
        hasCustomizations: true,
      },
      {
        id: 'RB_002',
        name: 'Brisket Rice Bowl',
        description: 'Mediterranean rice with smoked brisket, signature topped fries, house garlic, Signature Lamazing sauce, mozzarella, crispy onions, Mediterranean salad, hot honey.',
        price: 18.50,
        category: 'Rice Bowls',
        hasCustomizations: true,
      },
      {
        id: 'RB_003',
        name: 'Mixed Rice Bowl',
        description: 'Mediterranean rice with grilled chicken + smoked brisket, signature topped fries, house garlic, Signature Lamazing sauce, mozzarella, crispy onions, Mediterranean salad, hot honey.',
        price: 19.00,
        category: 'Rice Bowls',
        hasCustomizations: true,
      },
    ],
  },
  {
    id: 'sides',
    name: 'Sides',
    itemCount: 4,
    items: [
      {
        id: 'SI_001',
        name: 'Crispy Seasoned Fries',
        description: 'Freshly fried, lightly seasoned crispy fries.',
        price: 5.00,
        category: 'Sides',
        hasCustomizations: false,
      },
      {
        id: 'SI_002',
        name: 'Signature Topped Fries',
        description: 'Finished with shredded mozzarella, house garlic sauce, Signature Lamazing sauce, mixed Mediterranean salad, crispy onions, and hot honey.',
        price: 8.00,
        category: 'Sides',
        hasCustomizations: false,
      },
      {
        id: 'SI_003',
        name: 'Grilled Halloumi Sticks',
        description: 'Served on a small base of fries, drizzled with hot honey and topped with shredded mozzarella and crispy onions.',
        price: 6.50,
        category: 'Sides',
        hasCustomizations: false,
      },
      {
        id: 'SI_004',
        name: 'Cheesy Pizza Poppers',
        description: 'Served on a small base of fries, drizzled with hot honey and topped with shredded mozzarella and crispy onions.',
        price: 6.50,
        category: 'Sides',
        hasCustomizations: false,
      },
    ],
  },
  {
    id: 'sauces-dips',
    name: 'Sauces and Dips',
    itemCount: 7,
    items: [
      {
        id: 'SD_001',
        name: 'Ketchup',
        description: '',
        price: 1.50,
        category: 'Sauces and Dips',
        hasCustomizations: false,
      },
      {
        id: 'SD_002',
        name: 'Bbq Sauce Dip',
        description: '',
        price: 1.50,
        category: 'Sauces and Dips',
        hasCustomizations: false,
      },
      {
        id: 'SD_003',
        name: 'Sweet Chilli Sauce Dip',
        description: '',
        price: 1.50,
        category: 'Sauces and Dips',
        hasCustomizations: false,
      },
      {
        id: 'SD_004',
        name: 'House Garlic Sauce',
        description: '',
        price: 2.00,
        category: 'Sauces and Dips',
        hasCustomizations: false,
      },
      {
        id: 'SD_005',
        name: 'Signature Lamazing Sauce',
        description: '',
        price: 2.00,
        category: 'Sauces and Dips',
        hasCustomizations: false,
      },
      {
        id: 'SD_006',
        name: 'Spicy Harissa',
        description: '',
        price: 2.00,
        category: 'Sauces and Dips',
        hasCustomizations: false,
      },
      {
        id: 'SD_007',
        name: 'Hot Honey',
        description: '',
        price: 2.50,
        category: 'Sauces and Dips',
        hasCustomizations: false,
      },
    ],
  },
  {
    id: 'drinks',
    name: 'Drinks',
    itemCount: 10,
    items: [
      {
        id: 'DR_001',
        name: 'Shani Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_002',
        name: 'Rubicon Guava Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_003',
        name: 'Rubicon Mango Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_004',
        name: 'Rubicon Passion Fruit Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_005',
        name: 'Palestine Cola Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_006',
        name: 'Palestine Cola (Sugar Free) Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_007',
        name: 'Palestine Lemon and Lime Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_008',
        name: 'Palestine Orange Can 330ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_009',
        name: 'Bottled Water 350ml',
        description: '',
        price: 2.50,
        category: 'Drinks',
        hasCustomizations: false,
      },
      {
        id: 'DR_010',
        name: 'Capri Sun 350ml',
        description: '',
        price: 2.00,
        category: 'Drinks',
        hasCustomizations: false,
      },
    ],
  },
];
