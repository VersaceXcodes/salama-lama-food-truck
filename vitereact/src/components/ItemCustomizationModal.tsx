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
  
  if (catLower.includes('grilled sub')) return 'grilled-subs';
  if (catLower.includes('saj wrap')) return 'saj-wraps';
  if (catLower.includes('loaded fries')) return 'loaded-fries';
  if (catLower.includes('rice bowl')) return 'rice-bowls';

  const nameLower = item.name.toLowerCase();
  if (nameLower.includes('grilled sub')) return 'grilled-subs';
  if (nameLower.includes('saj wrap')) return 'saj-wraps';
  if (nameLower.includes('loaded fries')) return 'loaded-fries';
  if (nameLower.includes('rice bowl')) return 'rice-bowls';

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
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [touched, setTouched] = useState(false);
  
  const modifiedItem = useMemo(() => {
    if (!item) return null;
    const drinkCategory = MENU_DATA.find(cat => cat.id === 'drinks');
    const drinkItems = drinkCategory?.items.map(d => ({
      id: d.id,
      name: d.name,
      price: d.price
    })) || [];

    const itemForUtils = {
      ...item,
      category_id: resolveCategory(item),
      item_id: item.id,
    };

    return attachModifiersToItem(itemForUtils, drinkItems);
  }, [item]);

  useEffect(() => {
    if (isOpen && modifiedItem?.modifiers) {
      setQuantity(initialQuantity);
      const initialSelections: Record<string, Set<string>> = {};
      modifiedItem.modifiers.forEach((group: ModifierGroup) => {
        initialSelections[group.id] = new Set();
        // Auto-select defaults if needed (e.g. "Mild" if it was pre-selected in data, but currently data doesn't have defaults)
      });
      setSelections(initialSelections);
      setTouched(false);
    }
  }, [isOpen, modifiedItem, initialQuantity]);

  if (!isOpen || !item || !modifiedItem) return null;

  const groups = modifiedItem.modifiers || [];

  // Calculation Logic
  const calculateTotals = () => {
    let modifiersPrice = 0;
    const modifierSelections: ModifierSelection[] = [];

    groups.forEach((group: ModifierGroup) => {
      const groupSelections = selections[group.id] || new Set();
      const selectedOptions: any[] = [];

      group.options.forEach((option: any) => {
        if (groupSelections.has(option.id)) {
          modifiersPrice += option.priceDelta;
          selectedOptions.push({
            optionId: option.id,
            label: option.label,
            priceDelta: option.priceDelta
          });
        }
      });

      if (selectedOptions.length > 0) {
        modifierSelections.push({
          groupId: group.id,
          groupTitle: group.title,
          selections: selectedOptions
        });
      }
    });

    const unitTotal = item.price + modifiersPrice;
    const lineTotal = unitTotal * quantity;

    return { unitTotal, lineTotal, modifierSelections };
  };

  const { lineTotal, modifierSelections, unitTotal } = calculateTotals();

  // Handlers
  const handleOptionToggle = (group: ModifierGroup, optionId: string) => {
    setSelections(prev => {
      const currentSet = new Set(prev[group.id] || []);
      const isSelected = currentSet.has(optionId);

      if (group.type === 'single') {
        return { ...prev, [group.id]: new Set([optionId]) };
      }
      
      if (group.type === 'single_optional') {
        if (isSelected) return { ...prev, [group.id]: new Set() };
        return { ...prev, [group.id]: new Set([optionId]) };
      }

      if (group.type === 'multi') { 
        if (isSelected) currentSet.delete(optionId);
        else currentSet.add(optionId);
        return { ...prev, [group.id]: currentSet };
      }

      return prev;
    });
  };

  // Validation
  const getValidationErrors = () => {
    const errors: Record<string, string> = {};
    groups.forEach((group: ModifierGroup) => {
      if (group.required) {
        const groupSelections = selections[group.id];
        if (!groupSelections || groupSelections.size === 0) {
          errors[group.id] = 'Required';
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
      // Find first error and scroll to it
      const firstErrorId = Object.keys(validationErrors)[0];
      const element = document.getElementById(`group-${firstErrorId}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    onAddToCart(item, modifierSelections, quantity, unitTotal);
  };

  // Render Helpers
  const renderGroup = (group: ModifierGroup) => {
    const isError = touched && validationErrors[group.id];
    const isPill = group.title.toLowerCase().includes('spice');
    const isThumbnail = group.title.toLowerCase().includes('meal') || group.options.some((o: any) => !!o.image);
    const isRadio = group.type === 'single' || group.type === 'single_optional';

    return (
      <div key={group.id} id={`group-${group.id}`} className="py-6 border-b border-gray-100 last:border-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{group.title}</h3>
          <div className="flex items-center gap-2">
             {isError && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase tracking-wider">
                Required
              </span>
            )}
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              group.required ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {group.required ? 'Required' : 'Optional'}
            </span>
          </div>
        </div>

        {/* Layout Variants */}
        {isPill ? (
           <div className="flex flex-wrap gap-3">
             {group.options.map(option => {
               const isSelected = selections[group.id]?.has(option.id);
               return (
                 <button
                   key={option.id}
                   onClick={() => handleOptionToggle(group, option.id)}
                   className={`px-6 py-3 rounded-full font-medium text-sm transition-all border-2 ${
                     isSelected 
                       ? 'border-[#2C1A16] bg-[#2C1A16] text-white shadow-md' 
                       : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                   }`}
                 >
                   {option.label}
                 </button>
               )
             })}
           </div>
        ) : isThumbnail ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.options.map(option => {
              const isSelected = selections[group.id]?.has(option.id);
              return (
                 <label
                  key={option.id}
                  className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-[#2C1A16] bg-[#2C1A16]/5' 
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden ${isSelected ? 'ring-2 ring-[#2C1A16] ring-offset-1' : ''}`}>
                    {option.image ? (
                       <div className="w-full h-full bg-orange-100 flex items-center justify-center text-xs text-orange-800 font-bold p-1 text-center leading-none">
                         {/* Placeholder for real image */}
                         {option.label.split(' ')[0]}
                       </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                         <div className="w-6 h-6 rounded-full bg-gray-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                     <div className="font-bold text-gray-900">{option.label}</div>
                     <div className="text-[#2C1A16] font-medium">+ €{option.priceDelta.toFixed(2)}</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-[#2C1A16] border-[#2C1A16]' : 'border-gray-300'
                  }`}>
                     {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={!!isSelected}
                    onChange={() => handleOptionToggle(group, option.id)}
                    className="sr-only"
                  />
                </label>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {group.options.map(option => {
               const isSelected = selections[group.id]?.has(option.id);
               return (
                <label
                  key={option.id}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected 
                       ? 'border-[#2C1A16] bg-[#2C1A16]/5' 
                       : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                   <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 flex items-center justify-center border-2 transition-colors ${
                        isRadio ? 'rounded-full' : 'rounded-md'
                      } ${
                        isSelected ? 'border-[#2C1A16] bg-[#2C1A16]' : 'border-gray-300'
                      }`}>
                         {isSelected && (
                           isRadio ? <div className="w-2 h-2 bg-white rounded-full" /> : <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                         )}
                      </div>
                      <span className={`font-medium ${isSelected ? 'text-[#2C1A16]' : 'text-gray-700'}`}>
                        {option.label}
                        {option.note && <span className="text-gray-500 font-normal ml-1">({option.note})</span>}
                      </span>
                   </div>
                   {option.priceDelta > 0 && (
                     <span className="font-medium text-gray-500">+ €{option.priceDelta.toFixed(2)}</span>
                   )}
                   <input
                      type={isRadio ? "radio" : "checkbox"}
                      name={group.id}
                      checked={!!isSelected}
                      onChange={() => handleOptionToggle(group, option.id)}
                      className="sr-only"
                    />
                </label>
               );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative w-full h-[92vh] sm:h-[85vh] sm:max-h-[700px] sm:max-w-5xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col sm:flex-row overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-10 sm:fade-in sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        
        {/* Close Button (Absolute) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-600 hover:text-[#2C1A16] transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* LEFT COLUMN: Image */}
        <div className="w-full sm:w-1/2 h-56 sm:h-full relative flex-shrink-0 bg-gray-100">
          {item.image ? (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
               {/* In a real app, <img src={item.image} className="w-full h-full object-cover" /> */}
               <span className="text-4xl font-bold text-orange-900/20">{item.name}</span>
            </div>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 font-medium">No Image</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Content */}
        <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
          
          {/* Header */}
          <div className="p-6 pb-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{item.name}</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">{item.description}</p>
            <div className="text-2xl font-bold text-[#2C1A16]">€{item.price.toFixed(2)}</div>
          </div>

          {/* Scrollable Modifiers */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {groups.length > 0 ? (
              groups.map(renderGroup)
            ) : (
               <div className="py-8 text-center text-gray-500">No customization options available</div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-full h-14 px-2">
                   <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#2C1A16] disabled:opacity-30 disabled:hover:bg-transparent"
                   >
                     <Minus className="w-5 h-5" />
                   </button>
                   <span className="w-8 text-center font-bold text-lg text-[#2C1A16]">{quantity}</span>
                   <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#2C1A16]"
                   >
                     <Plus className="w-5 h-5" />
                   </button>
                </div>

                <button
                  onClick={handleAddToCartClick}
                  disabled={!isValid}
                  className={`flex-1 h-14 rounded-full font-bold text-lg flex items-center justify-between px-8 transition-all shadow-lg transform active:scale-[0.98] ${
                    isValid
                      ? 'bg-[#2C1A16] text-white hover:bg-[#3E2620]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>Add to Order</span>
                  <span>€{lineTotal.toFixed(2)}</span>
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ItemCustomizationModal;
