import React, { useState, useEffect, useMemo } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';
import { MenuItem, MENU_DATA } from '@/data/justEatMenuData';
import { attachModifiersToItem, ModifierGroup } from '@/utils/menuModifiers';

// ===========================
// Types
// ===========================

export interface ModifierSelection {
  groupId: string;
  groupTitle: string;
  selections: {
    optionId: string;
    label: string;
    priceDelta: number;
  }[];
}

interface ItemCustomizationModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    selectedModifiers: ModifierSelection[],
    quantity: number,
    totalPrice: number
  ) => void;
  initialQuantity?: number;
}

// ===========================
// Helper Functions
// ===========================

const resolveCategory = (item: MenuItem): string => {
  const catLower = item.category.toLowerCase();
  
  // Direct mapping if already in correct format or close to it
  if (catLower.includes('grilled sub')) return 'grilled-subs';
  if (catLower.includes('saj wrap')) return 'saj-wraps';
  if (catLower.includes('loaded fries')) return 'loaded-fries';
  if (catLower.includes('rice bowl')) return 'rice-bowls';

  // Check name for Most Popular items
  const nameLower = item.name.toLowerCase();
  if (nameLower.includes('grilled sub')) return 'grilled-subs';
  if (nameLower.includes('saj wrap')) return 'saj-wraps';
  if (nameLower.includes('loaded fries')) return 'loaded-fries';
  if (nameLower.includes('rice bowl')) return 'rice-bowls';

  // Default fallback (cleanup spaces)
  return catLower.replace(/\s+/g, '-');
};

// ===========================
// Main Component
// ===========================

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  initialQuantity = 1,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  
  // Store selections as map: groupId -> Set<optionId>
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  
  // Validation touch state
  const [touched, setTouched] = useState(false);
  
  // Derived state: modified item with customization groups
  const modifiedItem = useMemo(() => {
    if (!item) return null;

    // Get drinks for the drink modifier options
    const drinkCategory = MENU_DATA.find(cat => cat.id === 'drinks');
    const drinkItems = drinkCategory?.items.map(d => ({
      id: d.id,
      name: d.name,
      price: d.price
    })) || [];

    // Prepare item for the utility function
    const itemForUtils = {
      ...item,
      category_id: resolveCategory(item),
      item_id: item.id, // map id to item_id for the utility
    };

    return attachModifiersToItem(itemForUtils, drinkItems);
  }, [item]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && modifiedItem?.modifiers) {
      setQuantity(initialQuantity);
      
      // Initialize default selections
      const initialSelections: Record<string, Set<string>> = {};
      
      modifiedItem.modifiers.forEach((group: any) => {
        initialSelections[group.id] = new Set();
      });
      
      setSelections(initialSelections);
    }
  }, [isOpen, modifiedItem, initialQuantity]);

  if (!isOpen || !item || !modifiedItem) return null;

  // Check if we actually have groups (if not, it's not a customizable item)
  const groups = modifiedItem.modifiers || [];
  const hasCustomizations = groups.length > 0;

  // Calculate totals
  const calculateTotals = () => {
    let modifiersPrice = 0;
    const modifierSelections: ModifierSelection[] = [];

    groups.forEach((group: any) => {
      const groupSelections = selections[group.group_id] || new Set();
      const selectedOptions: any[] = [];

      group.options.forEach((option: any) => {
        if (groupSelections.has(option.option_id)) {
          modifiersPrice += option.additional_price;
          selectedOptions.push({
            optionId: option.option_id,
            label: option.name,
            priceDelta: option.additional_price
          });
        }
      });

      if (selectedOptions.length > 0) {
        modifierSelections.push({
          groupId: group.group_id,
          groupTitle: group.name,
          selections: selectedOptions
        });
      }
    });

    const unitTotal = item.price + modifiersPrice;
    const lineTotal = unitTotal * quantity;

    return { unitTotal, lineTotal, modifierSelections };
  };


  const { unitTotal, lineTotal, modifierSelections } = calculateTotals();

  // Handlers
  const handleOptionToggle = (group: any, optionId: string) => {
    setSelections(prev => {
      const currentSet = new Set(prev[group.group_id] || []);
      const isSelected = currentSet.has(optionId);

      // Single Select Logic (radio)
      if (group.type === 'single') {
        return {
          ...prev,
          [group.group_id]: new Set([optionId])
        };
      }
      
      // Single Optional Logic (select/radio with None)
      if (group.type === 'single_optional') {
        // If clicking same, toggle off
        if (isSelected) {
             return {
                ...prev,
                [group.group_id]: new Set()
             }
        }
        return {
          ...prev,
          [group.group_id]: new Set([optionId])
        };
      }

      // Multi Select Logic (checkbox)
      if (group.type === 'multiple') { 
        if (isSelected) {
          currentSet.delete(optionId);
        } else {
          currentSet.add(optionId);
        }
        return {
          ...prev,
          [group.group_id]: currentSet
        };
      }

      return prev;
    });
  };

  // Validation
  const getValidationErrors = () => {
    const errors: Record<string, string> = {};
    groups.forEach((group: any) => {
      if (group.is_required) {
        const groupSelections = selections[group.group_id];
        if (!groupSelections || groupSelections.size === 0) {
          errors[group.group_id] = 'Required';
        }
      }
    });
    return errors;
  };

  const validationErrors = getValidationErrors();
  const isValid = Object.keys(validationErrors).length === 0;

  const handleAddToCartClick = () => {
    setTouched(true);
    if (!isValid) {
      return;
    }
    onAddToCart(item, modifierSelections, quantity, unitTotal);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white w-full sm:max-w-[600px] sm:rounded-2xl rounded-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex-none p-6 pb-4 border-b border-gray-100 relative bg-white z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="pr-8">
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">{item.name}</h2>
              <span className="text-xl font-bold text-gray-900 flex-shrink-0">€{item.price.toFixed(2)}</span>
            </div>
            {item.description && (
              <p className="text-gray-500 text-sm leading-relaxed mt-2">{item.description}</p>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          <div className="p-6 space-y-8">
            {hasCustomizations ? (
              groups.map((group: any) => {
                const isRadio = group.type === 'single' || group.type === 'single_optional';
                
                return (
                  <div key={group.group_id} className="">
                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 py-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-2">
                         {/* Validation Message if touched and invalid */}
                         {touched && validationErrors[group.group_id] && (
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase tracking-wider">
                            Required
                          </span>
                        )}

                        {/* Badge */}
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          group.is_required 
                            ? 'bg-gray-100 text-gray-600' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {group.is_required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0 divide-y divide-gray-100 border-t border-b border-gray-100">
                      {group.options.map((option: any) => {
                        const isSelected = selections[group.group_id]?.has(option.option_id);
                        return (
                          <label
                            key={option.option_id}
                            className={`flex items-center justify-between py-4 cursor-pointer group hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-lg ${
                              isSelected ? 'bg-[#2C1A16]/5' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`relative flex items-center justify-center flex-shrink-0 transition-all ${
                                isRadio ? 'w-5 h-5 rounded-full border-2' : 'w-5 h-5 rounded border-2'
                              } ${
                                isSelected 
                                  ? 'border-[#2C1A16] bg-[#2C1A16]' 
                                  : 'border-gray-300 group-hover:border-[#2C1A16]'
                              }`}>
                                {isSelected && (
                                  isRadio ? (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                  )
                                )}
                                <input
                                  type={isRadio ? "radio" : "checkbox"}
                                  name={group.group_id}
                                  checked={!!isSelected}
                                  onChange={() => handleOptionToggle(group, option.option_id)}
                                  className="sr-only"
                                />
                              </div>
                              <span className={`font-medium text-sm ${isSelected ? 'text-[#2C1A16]' : 'text-gray-700'}`}>
                                {option.name}
                              </span>
                            </div>
                            
                            {option.additional_price > 0 && (
                              <span className="text-sm text-gray-500 font-medium">
                                + €{option.additional_price.toFixed(2)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                <p>No customization options available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-none p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <div className="flex items-center gap-4">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-gray-200 rounded-full h-12 px-1 flex-shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#2C1A16] hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-[#2C1A16] text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#2C1A16] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddToCartClick}
                disabled={!isValid}
                className={`flex-1 h-12 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md ${
                  isValid 
                    ? 'bg-[#2C1A16] text-white hover:bg-[#3E2620] active:scale-[0.98]' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Add to Order</span>
                <span>-</span>
                <span>€{lineTotal.toFixed(2)}</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};


export default ItemCustomizationModal;
