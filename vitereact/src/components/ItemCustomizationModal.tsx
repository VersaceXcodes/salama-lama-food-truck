import React, { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { MenuItem, MENU_DATA } from '@/data/justEatMenuData';

// ===========================
// Types
// ===========================

export interface ItemCustomization {
  spiceLevel: 'Mild' | 'Spicy' | null;
  removeItems: string[];
  extras: string[];
  drink: string | null;
  addOns: string[];
}

interface ItemCustomizationModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, customizations: ItemCustomization, quantity: number, totalPrice: number) => void;
  initialCustomizations?: ItemCustomization;
  initialQuantity?: number;
  isEditing?: boolean;
}

// ===========================
// Constants
// ===========================

// Categories that support customizations
const CUSTOMIZABLE_CATEGORIES = ['grilled-subs', 'saj-wraps', 'loaded-fries', 'rice-bowls'];

// Remove items options per category
const REMOVE_ITEMS_OPTIONS: Record<string, string[]> = {
  'grilled-subs': ['No cheese', 'No garlic', 'No salad (fries only)', 'No hot honey'],
  'saj-wraps': ['No cheese', 'No garlic', 'No salad (fries only)', 'No hot honey'],
  'loaded-fries': ['No cheese', 'No garlic', 'No salad', 'No hot honey'],
  'rice-bowls': ['No cheese', 'No garlic', 'No salad', 'No hot honey', 'No fries on top'],
};

// Extras (same for all customizable categories)
const EXTRAS_OPTIONS = [
  { name: 'Grilled Halloumi Sticks', price: 6.50 },
  { name: 'Cheesy Pizza Poppers', price: 6.50 },
];

// Add-ons per category
const ADD_ONS_OPTIONS: Record<string, Array<{ name: string; price: number }>> = {
  'grilled-subs': [
    { name: 'Chicken topping on fries', price: 3.00 },
    { name: 'Brisket topping on fries', price: 4.00 },
    { name: 'Mixed topping on fries', price: 5.00 },
  ],
  'saj-wraps': [
    { name: 'Extra shredded mozzarella in wrap', price: 1.00 },
    { name: 'Chicken topping on fries', price: 3.00 },
    { name: 'Brisket topping on fries', price: 4.00 },
    { name: 'Mixed topping on fries', price: 5.00 },
  ],
  'loaded-fries': [
    { name: 'Extra chicken', price: 3.99 },
    { name: 'Extra brisket', price: 4.99 },
    { name: 'Extra mixed', price: 5.99 },
  ],
  'rice-bowls': [
    { name: 'Extra chicken', price: 3.99 },
    { name: 'Extra brisket', price: 4.99 },
    { name: 'Extra mixed', price: 5.99 },
  ],
};

// Drinks (from the menu)
const DRINKS = MENU_DATA.find(cat => cat.id === 'drinks')?.items || [];

// ===========================
// Main Component
// ===========================

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  initialCustomizations,
  initialQuantity = 1,
  isEditing = false,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [customizations, setCustomizations] = useState<ItemCustomization>({
    spiceLevel: null,
    removeItems: [],
    extras: [],
    drink: null,
    addOns: [],
  });

  // Reset state when modal opens with a new item
  useEffect(() => {
    if (isOpen && item) {
      if (initialCustomizations) {
        setCustomizations(initialCustomizations);
      } else {
        setCustomizations({
          spiceLevel: null,
          removeItems: [],
          extras: [],
          drink: null,
          addOns: [],
        });
      }
      setQuantity(initialQuantity);
    }
  }, [isOpen, item, initialCustomizations, initialQuantity]);

  if (!isOpen || !item) return null;

  // Check if item needs customizations based on category or item ID
  const itemCategory = item.category.toLowerCase().replace(/ /g, '-');
  const needsCustomizations = CUSTOMIZABLE_CATEGORIES.includes(itemCategory) || 
                               (item.hasCustomizations && CUSTOMIZABLE_CATEGORIES.some(cat => 
                                 item.id.startsWith(cat.split('-').map(w => w[0].toUpperCase()).join(''))
                               ));

  // Calculate total price
  const calculateTotalPrice = (): number => {
    let total = item.price;

    // Add extras
    customizations.extras.forEach((extraName) => {
      const extra = EXTRAS_OPTIONS.find(e => e.name === extraName);
      if (extra) total += extra.price;
    });

    // Add drink
    if (customizations.drink) {
      const drink = DRINKS.find(d => d.id === customizations.drink);
      if (drink) total += drink.price;
    }

    // Add add-ons
    customizations.addOns.forEach((addOnName) => {
      const addOns = ADD_ONS_OPTIONS[itemCategory] || [];
      const addOn = addOns.find(a => a.name === addOnName);
      if (addOn) total += addOn.price;
    });

    return total * quantity;
  };

  // Handle spice level change
  const handleSpiceLevelChange = (level: 'Mild' | 'Spicy') => {
    setCustomizations({ ...customizations, spiceLevel: level });
  };

  // Handle remove items toggle
  const handleRemoveItemToggle = (itemName: string) => {
    const newRemoveItems = customizations.removeItems.includes(itemName)
      ? customizations.removeItems.filter(i => i !== itemName)
      : [...customizations.removeItems, itemName];
    setCustomizations({ ...customizations, removeItems: newRemoveItems });
  };

  // Handle extras toggle
  const handleExtraToggle = (extraName: string) => {
    const newExtras = customizations.extras.includes(extraName)
      ? customizations.extras.filter(e => e !== extraName)
      : [...customizations.extras, extraName];
    setCustomizations({ ...customizations, extras: newExtras });
  };

  // Handle drink selection
  const handleDrinkSelect = (drinkId: string | null) => {
    setCustomizations({ ...customizations, drink: drinkId });
  };

  // Handle add-on toggle
  const handleAddOnToggle = (addOnName: string) => {
    const newAddOns = customizations.addOns.includes(addOnName)
      ? customizations.addOns.filter(a => a !== addOnName)
      : [...customizations.addOns, addOnName];
    setCustomizations({ ...customizations, addOns: newAddOns });
  };

  // Handle add to cart
  const handleAddToCart = () => {
    // Validate required fields for customizable items
    if (needsCustomizations && !customizations.spiceLevel) {
      alert('Please select a spice level');
      return;
    }

    const totalPrice = calculateTotalPrice();
    onAddToCart(item, customizations, quantity, totalPrice);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {item.description && (
            <div>
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
              <p className="text-2xl font-bold text-gray-900 mt-4">€{item.price.toFixed(2)}</p>
            </div>
          )}

          {/* Customizations - Only for specific categories */}
          {needsCustomizations && (
            <>
              {/* A) Spice Level (Required) */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Spice Level <span className="text-red-600">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-3">Required - Choose 1</p>
                <div className="space-y-2">
                  {['Mild', 'Spicy'].map((level) => (
                    <button
                      key={level}
                      onClick={() => handleSpiceLevelChange(level as 'Mild' | 'Spicy')}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        customizations.spiceLevel === level
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {level}
                          {level === 'Spicy' && (
                            <span className="text-sm text-gray-600 ml-1">(harissa instead of hot honey)</span>
                          )}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          customizations.spiceLevel === level
                            ? 'border-orange-600 bg-orange-600'
                            : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {customizations.spiceLevel === level && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* B) Remove Items (Optional) */}
              {REMOVE_ITEMS_OPTIONS[itemCategory] && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Items</h3>
                  <p className="text-sm text-gray-600 mb-3">Optional - Free</p>
                  <div className="space-y-2">
                    {REMOVE_ITEMS_OPTIONS[itemCategory].map((itemName) => (
                      <button
                        key={itemName}
                        onClick={() => handleRemoveItemToggle(itemName)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          customizations.removeItems.includes(itemName)
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{itemName}</span>
                          <div className={`w-5 h-5 rounded border-2 ${
                            customizations.removeItems.includes(itemName)
                              ? 'border-orange-600 bg-orange-600'
                              : 'border-gray-300'
                          } flex items-center justify-center`}>
                            {customizations.removeItems.includes(itemName) && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* C) Extras (Optional, Paid) */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Extras</h3>
                <p className="text-sm text-gray-600 mb-3">Optional - Paid</p>
                <div className="space-y-2">
                  {EXTRAS_OPTIONS.map((extra) => (
                    <button
                      key={extra.name}
                      onClick={() => handleExtraToggle(extra.name)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        customizations.extras.includes(extra.name)
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{extra.name}</span>
                          <span className="text-sm text-gray-600 ml-2">+€{extra.price.toFixed(2)}</span>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 ${
                          customizations.extras.includes(extra.name)
                            ? 'border-orange-600 bg-orange-600'
                            : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {customizations.extras.includes(extra.name) && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* D) Add a Drink (Optional) */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Add a Drink</h3>
                <p className="text-sm text-gray-600 mb-3">Optional - Choose 0 or 1</p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleDrinkSelect(null)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      !customizations.drink
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">No drink</span>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        !customizations.drink
                          ? 'border-orange-600 bg-orange-600'
                          : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {!customizations.drink && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </button>
                  {DRINKS.map((drink) => (
                    <button
                      key={drink.id}
                      onClick={() => handleDrinkSelect(drink.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        customizations.drink === drink.id
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{drink.name}</span>
                          <span className="text-sm text-gray-600 ml-2">+€{drink.price.toFixed(2)}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          customizations.drink === drink.id
                            ? 'border-orange-600 bg-orange-600'
                            : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {customizations.drink === drink.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* E) Add-ons (Optional, Paid) */}
              {ADD_ONS_OPTIONS[itemCategory] && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Add-ons</h3>
                  <p className="text-sm text-gray-600 mb-3">Optional - Paid</p>
                  <div className="space-y-2">
                    {ADD_ONS_OPTIONS[itemCategory].map((addOn) => (
                      <button
                        key={addOn.name}
                        onClick={() => handleAddOnToggle(addOn.name)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          customizations.addOns.includes(addOn.name)
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{addOn.name}</span>
                            <span className="text-sm text-gray-600 ml-2">+€{addOn.price.toFixed(2)}</span>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 ${
                            customizations.addOns.includes(addOn.name)
                              ? 'border-orange-600 bg-orange-600'
                              : 'border-gray-300'
                          } flex items-center justify-center`}>
                            {customizations.addOns.includes(addOn.name) && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quantity Selector */}
          <div className="border-t pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-600 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-bold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="w-full py-4 bg-orange-600 text-white rounded-full font-bold text-lg hover:bg-orange-700 transition-colors shadow-lg"
          >
            {isEditing ? 'Update Cart' : 'Add to Cart'} • €{calculateTotalPrice().toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCustomizationModal;
