import React, { useEffect, useMemo, useState } from 'react';
import { X, Minus, Plus, Check, AlertCircle } from 'lucide-react';
import { useOverlayState } from '@/hooks/use-overlay-state';

// ===========================
// Type Definitions
// ===========================

interface CustomizationOption {
  option_id: string;
  name: string;
  additional_price: number;
  is_default: boolean;
  sort_order: number;
}

interface CustomizationGroup {
  group_id: string;
  name: string;
  type: 'single' | 'multiple';
  is_required: boolean;
  sort_order: number;
  options: CustomizationOption[];
}

interface SelectedCustomization {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  additional_price: number;
}

interface MenuItem {
  item_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  customization_groups: CustomizationGroup[];
}

interface ProductCustomizerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  selectedCustomizations: SelectedCustomization[];
  quantity: number;
  totalPrice: number;
  onCustomizationChange: (
    groupId: string,
    groupName: string,
    groupType: 'single' | 'multiple',
    option: CustomizationOption
  ) => void;
  onQuantityChange: (newQuantity: number) => void;
  onAddToCart: () => void;
  isLoading?: boolean;
}

// ===========================
// OptionGroup Sub-component
// ===========================

interface OptionGroupProps {
  group: CustomizationGroup;
  selectedOptions: SelectedCustomization[];
  onOptionChange: (
    groupId: string,
    groupName: string,
    groupType: 'single' | 'multiple',
    option: CustomizationOption
  ) => void;
  showError?: boolean;
}

const OptionGroup: React.FC<OptionGroupProps> = ({
  group,
  selectedOptions,
  onOptionChange,
  showError = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden">
      {/* Group Header */}
      <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[var(--border-light)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-[var(--primary-text)] uppercase tracking-wide">
            {group.name}
          </h4>
          {group.is_required && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              Required
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--primary-text)]/60">
          {group.type === 'single' ? 'Select one' : 'Select any'}
        </span>
      </div>

      {/* Options List */}
      <div className="divide-y divide-[var(--border-light)]">
        {group.options.map((option) => {
          const isSelected = selectedOptions.some(
            (c) => c.group_id === group.group_id && c.option_id === option.option_id
          );

          return (
            <label
              key={option.option_id}
              className={`
                flex items-center gap-3 px-4 py-3.5 cursor-pointer 
                transition-colors duration-150 
                active:bg-[var(--primary-bg)]
                ${isSelected ? 'bg-[var(--primary-bg)]' : 'hover:bg-[#FAFAF8]'}
              `}
              style={{ minHeight: '56px' }}
            >
              {/* Custom Radio/Checkbox */}
              <div
                className={`
                  flex-shrink-0 flex items-center justify-center
                  w-6 h-6 border-2 transition-all duration-150
                  ${group.type === 'single' ? 'rounded-full' : 'rounded-md'}
                  ${isSelected 
                    ? 'bg-[var(--btn-bg)] border-[var(--btn-bg)]' 
                    : 'bg-white border-[var(--border-light)]'
                  }
                `}
              >
                {isSelected && (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                )}
              </div>

              {/* Hidden actual input for accessibility */}
              <input
                type={group.type === 'single' ? 'radio' : 'checkbox'}
                name={group.group_id}
                checked={isSelected}
                onChange={() =>
                  onOptionChange(group.group_id, group.name, group.type, option)
                }
                className="sr-only"
              />

              {/* Option Label */}
              <span className={`flex-1 text-base ${isSelected ? 'font-semibold text-[var(--primary-text)]' : 'text-[var(--primary-text)]'}`}>
                {option.name}
              </span>

              {/* Price Delta */}
              {Number(option.additional_price) > 0 && (
                <span className={`flex-shrink-0 text-sm font-medium ${isSelected ? 'text-[var(--btn-bg)]' : 'text-[var(--primary-text)]/60'}`}>
                  +€{Number(option.additional_price).toFixed(2)}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Error Message */}
      {showError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-600">Please select an option</span>
        </div>
      )}
    </div>
  );
};

// ===========================
// QuantitySelector Sub-component
// ===========================

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
}) => {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className={`
          w-14 h-14 flex items-center justify-center
          rounded-full border-2 border-[var(--primary-text)]
          bg-white text-[var(--primary-text)]
          active:scale-95 transition-all duration-150
          disabled:opacity-30 disabled:cursor-not-allowed
          hover:bg-[var(--primary-bg)]
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)] focus:ring-offset-2
        `}
        aria-label="Decrease quantity"
        type="button"
      >
        <Minus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      <div className="w-16 text-center">
        <span className="text-3xl font-bold text-[var(--primary-text)]">
          {value}
        </span>
      </div>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className={`
          w-14 h-14 flex items-center justify-center
          rounded-full bg-[var(--btn-bg)] text-white
          active:scale-95 transition-all duration-150
          disabled:opacity-30 disabled:cursor-not-allowed
          hover:bg-[#1A0F0D]
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)] focus:ring-offset-2
        `}
        aria-label="Increase quantity"
        type="button"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>
    </div>
  );
};

// ===========================
// Main ProductCustomizerSheet Component
// ===========================

export const ProductCustomizerSheet: React.FC<ProductCustomizerSheetProps> = ({
  isOpen,
  onClose,
  item,
  selectedCustomizations,
  quantity,
  totalPrice,
  onCustomizationChange,
  onQuantityChange,
  onAddToCart,
  isLoading = false,
}) => {
  const { openOverlay, closeOverlay } = useOverlayState();
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Track which required groups are missing selections
  const missingRequiredGroups = useMemo(() => {
    if (!item) return new Set<string>();
    const selectedGroupIds = new Set(selectedCustomizations.map((c) => c.group_id));
    const missing = new Set<string>();
    item.customization_groups.forEach((group) => {
      if (group.is_required && !selectedGroupIds.has(group.group_id)) {
        missing.add(group.group_id);
      }
    });
    return missing;
  }, [item, selectedCustomizations]);

  const hasValidationErrors = missingRequiredGroups.size > 0;

  // Reset attempted submit when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAttemptedSubmit(false);
    }
  }, [isOpen]);

  // Handle body scroll lock and overlay state
  useEffect(() => {
    if (isOpen) {
      openOverlay('customization');
      // Save scroll position and lock
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.touchAction = 'none';

      return () => {
        closeOverlay();
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.touchAction = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, openOverlay, closeOverlay]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleAddToCartClick = () => {
    setAttemptedSubmit(true);
    if (!hasValidationErrors) {
      onAddToCart();
    }
  };

  if (!isOpen) return null;

  const lineTotal = Number(totalPrice) * quantity;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container - Mobile: bottom sheet, Desktop: centered modal */}
      <div
        className={`
          fixed z-[101] bg-white
          flex flex-col overflow-hidden
          
          /* Mobile: bottom sheet */
          bottom-0 left-0 right-0
          rounded-t-3xl
          max-h-[92vh]
          animate-slideUp
          
          /* Desktop: centered modal */
          md:bottom-auto md:left-1/2 md:top-1/2
          md:-translate-x-1/2 md:-translate-y-1/2
          md:rounded-2xl md:max-w-lg md:w-[calc(100%-2rem)]
          md:max-h-[85vh]
          md:animate-scaleIn
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
      >
        {/* Drag Handle - Mobile only */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-light)] bg-white sticky top-0 z-10">
          <h2
            id="customizer-title"
            className="text-lg font-bold text-[var(--primary-text)] truncate pr-4"
          >
            {item?.name || 'Customize'}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--primary-bg)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--primary-text)]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          {item ? (
            <>
              {/* Product Header Card */}
              <div className="flex gap-4 p-4 bg-[#FAFAF8] rounded-2xl">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-[var(--primary-text)] leading-tight mb-1">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-[var(--primary-text)]/60 line-clamp-2 leading-relaxed mb-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-lg font-bold text-[var(--primary-text)]">
                    €{Number(item.price).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Customization Groups */}
              {item.customization_groups.length > 0 && (
                <div className="space-y-3">
                  {item.customization_groups
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((group) => (
                      <OptionGroup
                        key={group.group_id}
                        group={group}
                        selectedOptions={selectedCustomizations}
                        onOptionChange={onCustomizationChange}
                        showError={attemptedSubmit && missingRequiredGroups.has(group.group_id)}
                      />
                    ))}
                </div>
              )}

              {/* Quantity Section */}
              <div className="bg-white rounded-2xl border border-[var(--border-light)] p-4">
                <h4 className="text-sm font-bold text-[var(--primary-text)] uppercase tracking-wide mb-4 text-center">
                  Quantity
                </h4>
                <QuantitySelector
                  value={quantity}
                  onChange={onQuantityChange}
                  min={1}
                  max={99}
                />
              </div>

              {/* Spacer for sticky footer */}
              <div className="h-2" />
            </>
          ) : (
            /* Loading State */
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--primary-bg)] rounded-full mb-4 animate-pulse">
                <svg
                  className="w-6 h-6 text-[var(--primary-text)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <p className="text-[var(--primary-text)]/70">Loading...</p>
            </div>
          )}
        </div>

        {/* Sticky Footer with Total and Add to Cart */}
        {item && (
          <div className="sticky bottom-0 bg-white border-t border-[var(--border-light)] px-4 py-4 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            {/* Total Row */}
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-[var(--primary-text)]/70">
                Total
              </span>
              <span className="text-2xl font-bold text-[var(--primary-text)]">
                €{lineTotal.toFixed(2)}
              </span>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCartClick}
              disabled={isLoading}
              className={`
                w-full py-4 rounded-xl font-bold text-base
                flex items-center justify-center gap-2
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--btn-bg)]
                ${hasValidationErrors && attemptedSubmit
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : isLoading
                  ? 'bg-[var(--btn-bg)] text-white opacity-75 cursor-wait'
                  : 'bg-[var(--btn-bg)] text-white hover:bg-[#1A0F0D] active:scale-[0.98]'
                }
              `}
              style={{ minHeight: '56px' }}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Adding to Cart...</span>
                </>
              ) : (
                <>
                  <span>Add to Cart</span>
                  <span className="opacity-75">•</span>
                  <span>€{lineTotal.toFixed(2)}</span>
                </>
              )}
            </button>

            {/* Validation Error Hint */}
            {hasValidationErrors && attemptedSubmit && (
              <p className="text-center text-sm text-red-600">
                Please complete required selections above
              </p>
            )}
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default ProductCustomizerSheet;
