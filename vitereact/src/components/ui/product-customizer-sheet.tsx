import React, { useEffect, useMemo, useState, useRef } from 'react';
import { X, Minus, Plus, Check, AlertCircle, Loader2, ShoppingBag } from 'lucide-react';
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
    <div className={`bg-white rounded-2xl border overflow-hidden ${showError ? 'border-red-300' : 'border-[var(--border-light)]'}`}>
      {/* Group Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[#FAFAF8] border-b border-[var(--border-light)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-xs sm:text-sm font-bold text-[var(--primary-text)] uppercase tracking-wide">
            {group.name}
          </h4>
          {group.is_required && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap">
              Required
            </span>
          )}
        </div>
        <span className="text-[10px] sm:text-xs text-[var(--primary-text)]/60 whitespace-nowrap">
          {group.type === 'single' ? 'Select one' : 'Select any'}
        </span>
      </div>

      {/* Options List */}
      <div className="divide-y divide-[var(--border-light)]">
        {group.options
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((option) => {
          const isSelected = selectedOptions.some(
            (c) => c.group_id === group.group_id && c.option_id === option.option_id
          );

          return (
            <label
              key={option.option_id}
              className={`
                flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer 
                transition-colors duration-150 touch-manipulation
                active:bg-[var(--primary-bg)]
                ${isSelected ? 'bg-[var(--primary-bg)]' : 'hover:bg-[#FAFAF8]'}
              `}
              style={{ minHeight: '52px' }}
            >
              {/* Custom Radio/Checkbox - Larger tap target on mobile */}
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
              <span className={`flex-1 text-sm sm:text-base leading-tight ${isSelected ? 'font-semibold text-[var(--primary-text)]' : 'text-[var(--primary-text)]'}`}>
                {option.name}
              </span>

              {/* Price Delta */}
              {Number(option.additional_price) > 0 && (
                <span className={`flex-shrink-0 text-xs sm:text-sm font-medium ${isSelected ? 'text-[var(--btn-bg)]' : 'text-[var(--primary-text)]/60'}`}>
                  +€{Number(option.additional_price).toFixed(2)}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Error Message */}
      {showError && (
        <div className="px-3 sm:px-4 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-red-600">Please select an option</span>
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
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center
          rounded-full border-2 border-[var(--primary-text)]
          bg-white text-[var(--primary-text)]
          active:scale-95 transition-all duration-150 touch-manipulation
          disabled:opacity-30 disabled:cursor-not-allowed
          hover:bg-[var(--primary-bg)]
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)] focus:ring-offset-2
        `}
        aria-label="Decrease quantity"
        type="button"
      >
        <Minus className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
      </button>

      <div className="w-12 sm:w-16 text-center">
        <span className="text-2xl sm:text-3xl font-bold text-[var(--primary-text)]" aria-live="polite">
          {value}
        </span>
      </div>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center
          rounded-full bg-[var(--btn-bg)] text-white
          active:scale-95 transition-all duration-150 touch-manipulation
          disabled:opacity-30 disabled:cursor-not-allowed
          hover:bg-[#1A0F0D]
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)] focus:ring-offset-2
        `}
        aria-label="Increase quantity"
        type="button"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
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
  const [isRendered, setIsRendered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Reset attempted submit when modal closes and handle render state
  useEffect(() => {
    if (!isOpen) {
      setAttemptedSubmit(false);
      setIsRendered(false);
    } else {
      // Small delay to ensure DOM is ready before animating
      const timer = setTimeout(() => {
        setIsRendered(true);
      }, 50);
      return () => clearTimeout(timer);
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

  // Check if item has no customizations (allow direct add)
  const hasNoCustomizations = item && item.customization_groups.length === 0;

  return (
    <>
      {/* Backdrop - prevents interaction with background */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]
          transition-opacity duration-200
          ${isRendered ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden="true"
        style={{ touchAction: 'none' }}
      />

      {/* Sheet Container - Mobile-first bottom sheet, Desktop centered modal */}
      <div
        data-product-customizer="true"
        className={`
          fixed z-[9999] bg-white
          flex flex-col
          
          /* Mobile: Bottom sheet that slides up */
          inset-x-0 bottom-0
          rounded-t-[24px]
          
          /* Desktop: Centered modal */
          md:inset-auto md:left-1/2 md:top-1/2
          md:-translate-x-1/2 md:-translate-y-1/2
          md:rounded-[20px] md:w-full md:max-w-[480px]
          
          /* Transition for smooth appearance */
          transition-transform duration-300 ease-out
          ${isRendered ? 'translate-y-0 md:scale-100' : 'translate-y-full md:scale-95'}
        `}
        style={{
          // Mobile: Use dvh (dynamic viewport height) for better mobile browser support
          maxHeight: 'min(92dvh, 92vh)',
          // Safe area padding for iPhone notch/home indicator
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
      >
        {/* Drag Handle - Visual indicator for mobile bottom sheet */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header - Sticky with close button */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-light)] bg-white">
          <h2
            id="customizer-title"
            className="text-lg font-bold text-[var(--primary-text)] truncate flex-1 pr-4"
          >
            {item?.name || 'Customize Your Order'}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--primary-bg)] active:bg-[var(--primary-bg)] transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--primary-text)]" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            minHeight: '200px',
          }}
        >
          <div className="px-4 py-4 space-y-4">
            {item ? (
              <>
                {/* Product Header Card */}
                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-[#FAFAF8] rounded-2xl">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-xl flex-shrink-0"
                      loading="eager"
                    />
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-base sm:text-lg font-bold text-[var(--primary-text)] leading-tight mb-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs sm:text-sm text-[var(--primary-text)]/60 line-clamp-2 leading-relaxed mb-1 sm:mb-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-base sm:text-lg font-bold text-[var(--primary-text)]">
                      €{Number(item.price).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Customization Groups */}
                {item.customization_groups.length > 0 ? (
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
                ) : (
                  /* No customizations available message */
                  <div className="py-6 text-center bg-[#FAFAF8] rounded-2xl">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-[var(--primary-text)]/40" />
                    <p className="text-sm text-[var(--primary-text)]/60">
                      No customization options for this item.
                    </p>
                    <p className="text-sm text-[var(--primary-text)]/60 mt-1">
                      Select quantity below and add to cart.
                    </p>
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

                {/* Spacer to ensure footer doesn't cover last content */}
                <div className="h-4" aria-hidden="true" />
              </>
            ) : (
              /* Loading State - Show while item data is loading */
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-12 h-12 mb-4 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--primary-text)] animate-spin" />
                </div>
                <p className="text-[var(--primary-text)]/70 text-sm">Loading options...</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer with Total and Add to Cart */}
        {item && (
          <div 
            className="flex-shrink-0 bg-white border-t border-[var(--border-light)] px-4 py-3 sm:py-4"
            style={{
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Total Row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm sm:text-base font-medium text-[var(--primary-text)]/70">
                Total
              </span>
              <span className="text-xl sm:text-2xl font-bold text-[var(--primary-text)]">
                €{lineTotal.toFixed(2)}
              </span>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCartClick}
              disabled={isLoading}
              type="button"
              className={`
                w-full py-3.5 sm:py-4 rounded-xl font-bold text-base
                flex items-center justify-center gap-2
                transition-all duration-200 touch-manipulation
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--btn-bg)]
                ${hasValidationErrors && attemptedSubmit
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : isLoading
                  ? 'bg-[var(--btn-bg)] text-white opacity-75 cursor-wait'
                  : 'bg-[var(--btn-bg)] text-white hover:bg-[#1A0F0D] active:scale-[0.98] active:bg-[#1A0F0D]'
                }
              `}
              style={{ minHeight: '52px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <span>Adding to Cart...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>Add to Cart</span>
                  <span className="opacity-75 mx-1">•</span>
                  <span>€{lineTotal.toFixed(2)}</span>
                </>
              )}
            </button>

            {/* Validation Error Hint */}
            {hasValidationErrors && attemptedSubmit && (
              <p className="text-center text-sm text-red-600 mt-2">
                Please complete required selections above
              </p>
            )}
          </div>
        )}
      </div>

      {/* Keyframe animations injected into page */}
      <style>{`
        /* Ensure the sheet is above everything */
        [data-product-customizer] {
          isolation: isolate;
        }
        
        /* Prevent body scroll when sheet is open */
        body:has([data-product-customizer]) {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
        }
        
        /* Custom scrollbar for content area */
        [data-product-customizer] .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        [data-product-customizer] .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        [data-product-customizer] .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        
        /* Smooth transitions */
        @media (prefers-reduced-motion: no-preference) {
          [data-product-customizer] {
            transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),
                        opacity 0.3s ease-out;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          [data-product-customizer] {
            transition: none;
          }
        }
      `}</style>
    </>
  );
};

export default ProductCustomizerSheet;
