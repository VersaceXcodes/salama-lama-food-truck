import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { X, Check, ChevronLeft, ChevronRight, Loader2, ShoppingBag } from 'lucide-react';
import { useOverlayState } from '@/hooks/use-overlay-state';

// ===========================
// Type Definitions
// ===========================

export interface BuilderStepItem {
  step_item_id: string;
  item_id: string;
  name: string;
  description: string | null;
  price: number;
  override_price: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface BuilderStep {
  step_id: string;
  step_name: string;
  step_key: string;
  step_type: 'single' | 'multiple';
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  sort_order: number;
  items: BuilderStepItem[];
}

export interface BuilderSelection {
  step_id: string;
  step_key: string;
  step_name: string;
  items: {
    item_id: string;
    name: string;
    price: number;
  }[];
}

interface ProductBuilderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productImageUrl?: string | null;
  basePrice: number;
  steps: BuilderStep[];
  onAddToCart: (selections: BuilderSelection[], totalPrice: number, quantity: number) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// ===========================
// Step Progress Indicator
// ===========================

interface StepProgressProps {
  steps: BuilderStep[];
  currentStep: number;
  selections: BuilderSelection[];
}

const StepProgress: React.FC<StepProgressProps> = ({ steps, currentStep, selections }) => {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-2 w-full max-w-full overflow-hidden">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const hasSelection = selections.some(s => s.step_id === step.step_id && s.items.length > 0);
        const isValid = !step.is_required || hasSelection;

        return (
          <React.Fragment key={step.step_id}>
            <div
              className={`
                w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold
                flex-shrink-0 transition-all duration-200
                ${isCompleted && isValid
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-[var(--btn-bg)] text-white ring-2 sm:ring-4 ring-[var(--btn-bg)]/20'
                  : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {isCompleted && isValid ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  flex-1 min-w-[12px] max-w-8 h-1 rounded-full transition-all duration-200
                  ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ===========================
// Step Content Component
// ===========================

interface StepContentProps {
  step: BuilderStep;
  selection: BuilderSelection | undefined;
  onSelectionChange: (item: BuilderStepItem) => void;
  showError?: boolean;
}

const StepContent: React.FC<StepContentProps> = ({
  step,
  selection,
  onSelectionChange,
  showError = false,
}) => {
  const selectedItemIds = useMemo(() => {
    return new Set(selection?.items.map(i => i.item_id) || []);
  }, [selection]);

  const getEffectivePrice = (item: BuilderStepItem): number => {
    return item.override_price !== null ? Number(item.override_price) : Number(item.price);
  };

  return (
    <div className="space-y-3 w-full max-w-full overflow-hidden box-border">
      {/* Step Header */}
      <div className="text-center mb-4 px-1">
        <h3 id={`step-${step.step_id}-title`} className="text-lg sm:text-xl font-bold text-[var(--primary-text)]">
          {step.step_name}
        </h3>
        <p id={`step-${step.step_id}-description`} className="text-sm text-[var(--primary-text)]/60 mt-1">
          {step.step_type === 'single' 
            ? 'Select one option'
            : step.max_selections
            ? `Select up to ${step.max_selections} options`
            : 'Select as many as you like'
          }
          {step.is_required && <span className="text-red-500 ml-1">(Required)</span>}
        </p>
      </div>

      {/* Error Message */}
      {showError && step.is_required && selectedItemIds.size === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-3 flex items-center gap-2 text-red-600">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">Please select an option to continue</span>
        </div>
      )}

      {/* Options Grid */}
      <div 
        className="flex flex-col gap-2 w-full max-w-full overflow-hidden" 
        role={step.step_type === 'single' ? 'radiogroup' : 'group'}
        aria-labelledby={`step-${step.step_id}-title`}
        aria-describedby={`step-${step.step_id}-description`}
        aria-required={step.is_required}
      >
        {(() => {
          const activeItems = step.items
            .filter(item => item.is_active)
            .sort((a, b) => a.sort_order - b.sort_order);
          
          // Show empty state if no active items
          if (activeItems.length === 0) {
            console.warn(`No active items for step: ${step.step_name} (${step.step_key})`);
            return (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-6 text-center">
                <div className="mb-3">
                  <svg className="w-12 h-12 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="font-bold text-amber-900 mb-2">No Options Available</h4>
                <p className="text-sm text-amber-700">
                  No {step.step_key} options have been configured yet. Please contact support or try again later.
                </p>
              </div>
            );
          }

          return activeItems.map((item) => {
            const isSelected = selectedItemIds.has(item.item_id);
            const price = getEffectivePrice(item);

            return (
              <button
                key={item.step_item_id}
                onClick={() => onSelectionChange(item)}
                role={step.step_type === 'single' ? 'radio' : 'checkbox'}
                aria-checked={isSelected}
                aria-label={`${item.name}${item.description ? `, ${item.description}` : ''}${price > 0 ? `, plus €${price.toFixed(2)}` : ', included'}`}
                className={`
                  w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all duration-150
                  text-left touch-manipulation box-border
                  ${isSelected
                    ? 'border-[var(--btn-bg)] bg-[var(--primary-bg)]'
                    : 'border-[var(--border-light)] bg-white hover:border-[var(--primary-text)]/30'
                  }
                `}
                style={{ minHeight: '60px' }}
              >
                {/* Selection Indicator */}
                <div
                  className={`
                    flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center border-2 transition-all duration-150
                    ${step.step_type === 'single' ? 'rounded-full' : 'rounded-md'}
                    ${isSelected
                      ? 'bg-[var(--btn-bg)] border-[var(--btn-bg)]'
                      : 'bg-white border-[var(--border-light)]'
                    }
                  `}
                >
                  {isSelected && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />}
                </div>

                {/* Item Image (if available) */}
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />
                )}

                {/* Item Details - CRITICAL: min-w-0 allows text to shrink and wrap properly */}
                <div className="flex-1 min-w-0">
                  <span className={`block text-sm sm:text-base font-semibold leading-snug truncate ${isSelected ? 'text-[var(--primary-text)]' : 'text-[var(--primary-text)]'}`}>
                    {item.name}
                  </span>
                  {item.description && (
                    <span className="block text-xs sm:text-sm text-[var(--primary-text)]/60 truncate mt-0.5 leading-tight">
                      {item.description}
                    </span>
                  )}
                </div>

                {/* Price - CRITICAL: whitespace-nowrap ensures price stays on one line */}
                {price > 0 && (
                  <span className={`flex-shrink-0 text-xs sm:text-sm font-bold whitespace-nowrap ${isSelected ? 'text-[var(--btn-bg)]' : 'text-[var(--primary-text)]/70'}`}>
                    +€{price.toFixed(2)}
                  </span>
                )}
                {price === 0 && (
                  <span className="flex-shrink-0 text-xs text-green-600 font-semibold whitespace-nowrap">
                    Included
                  </span>
                )}
              </button>
            );
          });
        })()}
      </div>
    </div>
  );
};

// ===========================
// Review Step Component
// ===========================

interface ReviewStepProps {
  productName: string;
  basePrice: number;
  selections: BuilderSelection[];
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  productName,
  basePrice,
  selections,
  quantity,
  onQuantityChange,
}) => {
  const totalItemsPrice = useMemo(() => {
    return selections.reduce((total, sel) => {
      return total + sel.items.reduce((sum, item) => sum + item.price, 0);
    }, 0);
  }, [selections]);

  const unitPrice = basePrice + totalItemsPrice;
  const lineTotal = unitPrice * quantity;

  // Generate a display name from selections
  const displayName = useMemo(() => {
    const base = selections.find(s => s.step_key === 'base')?.items[0]?.name;
    const protein = selections.find(s => s.step_key === 'protein')?.items[0]?.name;
    if (base && protein) {
      return `${productName} - ${base} + ${protein}`;
    }
    return productName;
  }, [productName, selections]);

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden box-border">
      <div className="text-center mb-4 px-1">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--primary-text)]">
          Review Your Order
        </h3>
        <p className="text-sm text-[var(--primary-text)]/60 mt-1">
          Check your selections before adding to cart
        </p>
      </div>

      {/* Order Summary Card */}
      <div className="bg-[#FAFAF8] rounded-2xl p-3 sm:p-4 space-y-3 w-full box-border">
        <h4 className="font-bold text-[var(--primary-text)] text-sm sm:text-base break-words">
          {displayName}
        </h4>

        {/* Selections Breakdown */}
        <div className="space-y-2 divide-y divide-[var(--border-light)]">
          {selections.map((sel) => (
            sel.items.length > 0 && (
              <div key={sel.step_id} className="pt-2 first:pt-0">
                <span className="text-xs font-semibold text-[var(--primary-text)]/60 uppercase tracking-wide">
                  {sel.step_name}
                </span>
                {sel.items.map((item) => (
                  <div key={item.item_id} className="flex justify-between items-center gap-2 mt-1">
                    <span className="text-sm text-[var(--primary-text)] truncate flex-1 min-w-0">{item.name}</span>
                    {item.price > 0 && (
                      <span className="text-sm font-medium text-[var(--primary-text)] flex-shrink-0 whitespace-nowrap">
                        +€{item.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          ))}
        </div>

        {/* Base Price (if applicable) */}
        {basePrice > 0 && (
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-[var(--border-light)]">
            <span className="text-sm text-[var(--primary-text)]/70">Base Price</span>
            <span className="text-sm font-medium text-[var(--primary-text)] whitespace-nowrap">€{basePrice.toFixed(2)}</span>
          </div>
        )}

        {/* Unit Price */}
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-[var(--border-light)]">
          <span className="text-sm font-semibold text-[var(--primary-text)]">Price per item</span>
          <span className="text-base font-bold text-[var(--primary-text)] whitespace-nowrap">€{unitPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="bg-white rounded-2xl border border-[var(--border-light)] p-3 sm:p-4 w-full box-border">
        <h4 className="text-sm font-bold text-[var(--primary-text)] uppercase tracking-wide mb-3 sm:mb-4 text-center">
          Quantity
        </h4>
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={() => quantity > 1 && onQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 border-[var(--primary-text)] bg-white text-[var(--primary-text)] active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xl sm:text-2xl font-bold text-[var(--primary-text)] w-10 sm:w-12 text-center">
            {quantity}
          </span>
          <button
            onClick={() => quantity < 99 && onQuantityChange(quantity + 1)}
            disabled={quantity >= 99}
            className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-[var(--btn-bg)] text-white active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-[var(--btn-bg)] text-white rounded-2xl p-3 sm:p-4 flex justify-between items-center w-full box-border">
        <span className="font-semibold text-sm sm:text-base">Total</span>
        <span className="text-xl sm:text-2xl font-bold whitespace-nowrap">€{lineTotal.toFixed(2)}</span>
      </div>
    </div>
  );
};

// ===========================
// Main ProductBuilderSheet Component
// ===========================

export const ProductBuilderSheet: React.FC<ProductBuilderSheetProps> = ({
  isOpen,
  onClose,
  productName,
  productImageUrl,
  basePrice,
  steps,
  onAddToCart,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const { openOverlay, closeOverlay } = useOverlayState();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<BuilderSelection[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Total number of steps including review
  const totalSteps = steps.length + 1; // +1 for review step
  const isReviewStep = currentStep === steps.length;
  const currentStepData = !isReviewStep ? steps[currentStep] : null;

  // Initialize selections when steps change
  useEffect(() => {
    if (steps.length > 0 && selections.length === 0) {
      const initialSelections: BuilderSelection[] = steps.map(step => ({
        step_id: step.step_id,
        step_key: step.step_key,
        step_name: step.step_name,
        items: [],
      }));
      setSelections(initialSelections);
    }
  }, [steps, selections.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setSelections([]);
      setQuantity(1);
      setAttemptedNext(false);
      setIsRendered(false);
    } else {
      const timer = setTimeout(() => setIsRendered(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle body scroll lock and iOS Safari viewport height fix
  useEffect(() => {
    if (isOpen) {
      openOverlay('builder');
      const scrollY = window.scrollY;
      
      // iOS Safari viewport height fix
      const setVh = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      setVh();
      window.addEventListener('resize', setVh);
      window.addEventListener('orientationchange', setVh);
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.touchAction = 'none';

      return () => {
        closeOverlay();
        window.removeEventListener('resize', setVh);
        window.removeEventListener('orientationchange', setVh);
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

  // Get current selection for step
  const getCurrentSelection = useCallback(() => {
    if (!currentStepData) return undefined;
    return selections.find(s => s.step_id === currentStepData.step_id);
  }, [currentStepData, selections]);

  // Handle selection change
  const handleSelectionChange = useCallback((item: BuilderStepItem) => {
    if (!currentStepData) return;

    const price = item.override_price !== null ? Number(item.override_price) : Number(item.price);

    setSelections(prev => {
      const newSelections = [...prev];
      const selectionIndex = newSelections.findIndex(s => s.step_id === currentStepData.step_id);

      if (selectionIndex === -1) return prev;

      const currentSelection = newSelections[selectionIndex];

      if (currentStepData.step_type === 'single') {
        // Single selection - replace
        newSelections[selectionIndex] = {
          ...currentSelection,
          items: [{
            item_id: item.item_id,
            name: item.name,
            price: price,
          }],
        };
      } else {
        // Multiple selection - toggle
        const existingIndex = currentSelection.items.findIndex(i => i.item_id === item.item_id);
        if (existingIndex >= 0) {
          // Remove
          newSelections[selectionIndex] = {
            ...currentSelection,
            items: currentSelection.items.filter(i => i.item_id !== item.item_id),
          };
        } else {
          // Add (check max selections)
          if (currentStepData.max_selections === null || currentSelection.items.length < currentStepData.max_selections) {
            newSelections[selectionIndex] = {
              ...currentSelection,
              items: [...currentSelection.items, {
                item_id: item.item_id,
                name: item.name,
                price: price,
              }],
            };
          }
        }
      }

      return newSelections;
    });
  }, [currentStepData]);

  // Check if current step is valid
  const isCurrentStepValid = useCallback(() => {
    if (!currentStepData) return true; // Review step is always valid if we got here

    const selection = selections.find(s => s.step_id === currentStepData.step_id);
    if (!currentStepData.is_required) return true;
    return selection && selection.items.length >= currentStepData.min_selections;
  }, [currentStepData, selections]);

  // Handle next step
  const handleNext = () => {
    setAttemptedNext(true);

    if (!isCurrentStepValid()) {
      // Scroll to top to show error
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setAttemptedNext(false);
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setAttemptedNext(false);
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    const totalItemsPrice = selections.reduce((total, sel) => {
      return total + sel.items.reduce((sum, item) => sum + item.price, 0);
    }, 0);
    const totalPrice = basePrice + totalItemsPrice;

    onAddToCart(selections, totalPrice, quantity);
  };

  // Calculate running total
  const runningTotal = useMemo(() => {
    const itemsPrice = selections.reduce((total, sel) => {
      return total + sel.items.reduce((sum, item) => sum + item.price, 0);
    }, 0);
    return (basePrice + itemsPrice) * quantity;
  }, [basePrice, selections, quantity]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
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

      {/* Sheet Container */}
      <div
        data-product-builder="true"
        className={`
          fixed z-[9999] bg-white flex flex-col transform-gpu
          
          /* Mobile: Full-height bottom sheet - CRITICAL: no horizontal overflow */
          left-0 right-0 bottom-0 rounded-t-[24px]
          
          /* Desktop: Centered modal */
          md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto
          md:-translate-x-1/2 md:-translate-y-1/2
          md:rounded-[20px] md:w-full md:max-w-[520px]
          
          transition-transform duration-300 ease-out
          ${isRendered ? 'translate-y-0 md:translate-y-[-50%]' : 'translate-y-full md:translate-y-[-50%] md:scale-95'}
        `}
        style={{
          /* iOS Safari safe viewport height with fallback */
          height: '92dvh',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          /* Prevent any overflow issues - CRITICAL for mobile */
          overflow: 'hidden',
          overflowX: 'hidden',
          /* Mobile: ensure no horizontal scroll - use 100% instead of 100vw to avoid scrollbar issues */
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-title"
      >
        {/* Drag Handle (Mobile) */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-[var(--border-light)] bg-white w-full box-border">
          <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
            <h2 id="builder-title" className="text-sm sm:text-lg font-bold text-[var(--primary-text)] truncate">
              {productName}
            </h2>
            <span className="text-xs text-[var(--primary-text)]/60 whitespace-nowrap flex-shrink-0">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-[var(--primary-bg)] active:bg-[var(--primary-bg)] transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--primary-text)]" />
          </button>
        </div>

        {/* Step Progress */}
        <div className="flex-shrink-0 px-2 sm:px-4 py-2 border-b border-[var(--border-light)] bg-[#FAFAF8] w-full box-border overflow-hidden">
          <StepProgress steps={steps} currentStep={currentStep} selections={selections} />
        </div>

        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain w-full"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            /* Critical: flex-1 with min-height ensures content is visible */
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: '0%',
            minHeight: '150px',
            /* Allow scroll within this container */
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            maxWidth: '100%',
          }}
        >
          <div className="px-3 sm:px-4 py-4 flex-1 w-full box-border overflow-hidden">
            {isLoading && steps.length === 0 ? (
              // Loading state with skeleton placeholders
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-10 h-10 text-[var(--btn-bg)] animate-spin mb-4" />
                  <p className="text-sm text-[var(--primary-text)]/70 font-medium">Loading customization options...</p>
                </div>
                {/* Skeleton placeholders for options */}
                <div className="space-y-3">
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-2/3 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mx-auto" />
                  <div className="space-y-2 mt-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse border border-gray-200" />
                    ))}
                  </div>
                </div>
              </div>
            ) : error ? (
              // Error state with retry button
              <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-6 text-center">
                  <div className="mb-3">
                    <svg className="w-12 h-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-red-900 mb-2">We couldn't load options</h4>
                  <p className="text-sm text-red-700 mb-4">
                    {error || "Something went wrong. Please try again."}
                  </p>
                  <div className="flex gap-3 justify-center">
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="px-6 py-2 bg-[var(--btn-bg)] text-white rounded-lg font-semibold hover:opacity-90 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : steps.length === 0 ? (
              // Empty state - no steps configured
              <div className="space-y-4">
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-6 text-center">
                  <div className="mb-3">
                    <svg className="w-12 h-12 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-amber-900 mb-2">No Options Available</h4>
                  <p className="text-sm text-amber-700 mb-4">
                    This item's customization options are not configured yet. Please contact support or try again later.
                  </p>
                  <div className="flex gap-3 justify-center">
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="px-6 py-2 bg-[var(--btn-bg)] text-white rounded-lg font-semibold hover:opacity-90 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : isReviewStep ? (
              <ReviewStep
                productName={productName}
                basePrice={basePrice}
                selections={selections}
                quantity={quantity}
                onQuantityChange={setQuantity}
              />
            ) : currentStepData ? (
              <StepContent
                step={currentStepData}
                selection={getCurrentSelection()}
                onSelectionChange={handleSelectionChange}
                showError={attemptedNext}
              />
            ) : null}
          </div>
        </div>

        {/* Footer with Navigation */}
        <div
          className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t border-[var(--border-light)] px-3 sm:px-4 py-3 sticky bottom-0 z-10 w-full box-border"
          style={{
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
            paddingBottom: 'max(12px, calc(12px + env(safe-area-inset-bottom, 0px)))',
            paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
            paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
            touchAction: 'manipulation',
          }}
        >
          {/* Running Total (only show on non-review steps) */}
          {!isReviewStep && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-[var(--primary-text)]/70">Running total</span>
              <span className="font-bold text-[var(--primary-text)]">€{runningTotal.toFixed(2)}</span>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                type="button"
                className="flex-1 py-3.5 rounded-xl font-bold text-[var(--primary-text)] border-2 border-[var(--primary-text)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all touch-manipulation"
                style={{ minHeight: '52px', pointerEvents: 'auto', touchAction: 'manipulation' }}
                aria-label="Go back to previous step"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            )}

            {isReviewStep ? (
              <button
                onClick={handleAddToCart}
                disabled={isLoading}
                type="button"
                className={`
                  flex-1 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2
                  transition-all touch-manipulation
                  ${isLoading 
                    ? 'bg-[var(--btn-bg)] opacity-75 cursor-wait' 
                    : 'bg-[var(--btn-bg)] active:scale-[0.98] hover:bg-[#1A0F0D]'
                  }
                `}
                style={{ minHeight: '52px' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    Add to Cart - €{runningTotal.toFixed(2)}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                type="button"
                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[var(--btn-bg)] flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-[#1A0F0D] transition-all touch-manipulation"
                style={{ minHeight: '52px', pointerEvents: 'auto', touchAction: 'manipulation' }}
                aria-label="Continue to next step"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* iOS Safari viewport height fix */
        :root {
          --vh: 1vh;
        }
        
        [data-product-builder] {
          isolation: isolate;
          contain: layout style paint;
          overscroll-behavior: contain;
          /* Force GPU acceleration for smoother animations */
          /* transform: translateZ(0); - Removed to fix desktop positioning */
          /* -webkit-transform: translateZ(0); - Removed to fix desktop positioning */
          /* Ensure flex layout works correctly */
          display: flex !important;
          flex-direction: column !important;
          /* CRITICAL: Prevent ALL horizontal overflow */
          overflow-x: hidden !important;
          box-sizing: border-box !important;
        }
        
        [data-product-builder] *,
        [data-product-builder] *::before,
        [data-product-builder] *::after {
          box-sizing: border-box !important;
        }
        
        /* Mobile: Full viewport height with safe areas */
        @media (max-width: 768px) {
          [data-product-builder] {
            /* Use dvh for dynamic viewport on iOS Safari */
            height: 92dvh !important;
            max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
            /* Fallback for older browsers */
            max-height: calc(100vh - env(safe-area-inset-top, 0px));
            /* Prevent iOS address bar resize issues */
            min-height: 400px;
            /* CRITICAL: prevent horizontal overflow - use 100% not 100vw */
            max-width: 100% !important;
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
          }
          
          /* Ensure body doesn't scroll horizontally when modal is open */
          /* body:has([data-product-builder]) {
            overflow-x: hidden !important;
          } */
        }
        
        /* Desktop: constrain height */
        @media (min-width: 769px) {
          [data-product-builder] {
            height: auto !important;
            max-height: min(90vh, 90dvh) !important;
          }
        }
        
        /* Scrollable content area - CRITICAL for mobile */
        [data-product-builder] .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          /* Ensure this takes available space */
          flex: 1 1 0% !important;
          min-height: 0 !important; /* Critical for flex children to scroll */
          overflow-x: hidden !important;
          max-width: 100% !important;
        }
        
        [data-product-builder] .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        [data-product-builder] .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        [data-product-builder] .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        
        /* Header - fixed at top */
        [data-product-builder] > .flex-shrink-0:first-of-type {
          flex-shrink: 0 !important;
        }
        
        /* Footer - always visible at bottom with safe area */
        [data-product-builder] > .flex-shrink-0:last-of-type {
          flex-shrink: 0 !important;
          position: relative;
          z-index: 10;
          background: white;
          pointer-events: auto;
        }
        
        /* Ensure all direct children respect flex layout and don't overflow */
        [data-product-builder] > * {
          /* transform: translateZ(0); */
          /* -webkit-transform: translateZ(0); */
          flex-shrink: 0;
          max-width: 100% !important;
          overflow-x: hidden;
        }
        
        /* The scrollable content area should be the only one that grows */
        [data-product-builder] > .flex-1 {
          flex: 1 1 0% !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        
        /* Ensure buttons in footer don't overflow */
        [data-product-builder] button {
          max-width: 100%;
        }
        
        /* Safe area support for notched devices */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          [data-product-builder] > .flex-shrink-0:last-of-type {
            padding-bottom: max(12px, calc(12px + env(safe-area-inset-bottom)));
          }
        }
      `}</style>
    </>
  );
};

export default ProductBuilderSheet;
