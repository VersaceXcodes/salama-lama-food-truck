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
    <div className="flex items-center justify-center gap-1.5 py-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const hasSelection = selections.some(s => s.step_id === step.step_id && s.items.length > 0);
        const isValid = !step.is_required || hasSelection;

        return (
          <React.Fragment key={step.step_id}>
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-200
                ${isCompleted && isValid
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-[var(--btn-bg)] text-white ring-4 ring-[var(--btn-bg)]/20'
                  : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {isCompleted && isValid ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  w-6 sm:w-8 h-1 rounded-full transition-all duration-200
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
    <div className="space-y-3">
      {/* Step Header */}
      <div className="text-center mb-4">
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
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-600">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">Please select an option to continue</span>
        </div>
      )}

      {/* Options Grid */}
      <div 
        className="grid grid-cols-1 gap-2" 
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
                  w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all duration-150
                  text-left touch-manipulation
                  ${isSelected
                    ? 'border-[var(--btn-bg)] bg-[var(--primary-bg)]'
                    : 'border-[var(--border-light)] bg-white hover:border-[var(--primary-text)]/30'
                  }
                `}
                style={{ minHeight: '64px' }}
              >
                {/* Selection Indicator */}
                <div
                  className={`
                    flex-shrink-0 w-6 h-6 flex items-center justify-center border-2 transition-all duration-150
                    ${step.step_type === 'single' ? 'rounded-full' : 'rounded-md'}
                    ${isSelected
                      ? 'bg-[var(--btn-bg)] border-[var(--btn-bg)]'
                      : 'bg-white border-[var(--border-light)]'
                    }
                  `}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </div>

                {/* Item Image (if available) */}
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />
                )}

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <span className={`block text-sm sm:text-base font-semibold ${isSelected ? 'text-[var(--primary-text)]' : 'text-[var(--primary-text)]'}`}>
                    {item.name}
                  </span>
                  {item.description && (
                    <span className="block text-xs sm:text-sm text-[var(--primary-text)]/60 line-clamp-1 mt-0.5">
                      {item.description}
                    </span>
                  )}
                </div>

                {/* Price */}
                {price > 0 && (
                  <span className={`flex-shrink-0 text-sm sm:text-base font-bold ${isSelected ? 'text-[var(--btn-bg)]' : 'text-[var(--primary-text)]/70'}`}>
                    +€{price.toFixed(2)}
                  </span>
                )}
                {price === 0 && (
                  <span className="flex-shrink-0 text-xs sm:text-sm text-green-600 font-semibold">
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
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--primary-text)]">
          Review Your Order
        </h3>
        <p className="text-sm text-[var(--primary-text)]/60 mt-1">
          Check your selections before adding to cart
        </p>
      </div>

      {/* Order Summary Card */}
      <div className="bg-[#FAFAF8] rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-[var(--primary-text)] text-base">
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
                  <div key={item.item_id} className="flex justify-between items-center mt-1">
                    <span className="text-sm text-[var(--primary-text)]">{item.name}</span>
                    {item.price > 0 && (
                      <span className="text-sm font-medium text-[var(--primary-text)]">
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
          <div className="flex justify-between items-center pt-2 border-t border-[var(--border-light)]">
            <span className="text-sm text-[var(--primary-text)]/70">Base Price</span>
            <span className="text-sm font-medium text-[var(--primary-text)]">€{basePrice.toFixed(2)}</span>
          </div>
        )}

        {/* Unit Price */}
        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-light)]">
          <span className="text-sm font-semibold text-[var(--primary-text)]">Price per item</span>
          <span className="text-base font-bold text-[var(--primary-text)]">€{unitPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="bg-white rounded-2xl border border-[var(--border-light)] p-4">
        <h4 className="text-sm font-bold text-[var(--primary-text)] uppercase tracking-wide mb-4 text-center">
          Quantity
        </h4>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => quantity > 1 && onQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-[var(--primary-text)] bg-white text-[var(--primary-text)] active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-2xl font-bold text-[var(--primary-text)] w-12 text-center">
            {quantity}
          </span>
          <button
            onClick={() => quantity < 99 && onQuantityChange(quantity + 1)}
            disabled={quantity >= 99}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--btn-bg)] text-white active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-[var(--btn-bg)] text-white rounded-2xl p-4 flex justify-between items-center">
        <span className="font-semibold">Total</span>
        <span className="text-2xl font-bold">€{lineTotal.toFixed(2)}</span>
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

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      openOverlay('builder');
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
          fixed z-[9999] bg-white flex flex-col overflow-hidden
          
          /* Mobile: Full-height bottom sheet */
          left-0 right-0 bottom-0 w-full max-w-full rounded-t-[24px]
          
          /* Desktop: Centered modal */
          md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto
          md:-translate-x-1/2 md:-translate-y-1/2
          md:rounded-[20px] md:w-full md:max-w-[520px]
          
          transition-transform duration-300 ease-out
          ${isRendered ? 'translate-y-0 md:translate-y-[-50%]' : 'translate-y-full md:translate-y-[-50%] md:scale-95'}
        `}
        style={{
          maxHeight: 'min(95dvh, 95vh)',
          height: 'auto',
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
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-light)] bg-white">
          <div className="flex-1 min-w-0">
            <h2 id="builder-title" className="text-lg font-bold text-[var(--primary-text)] truncate">
              Build Your {productName}
            </h2>
            <p className="text-xs text-[var(--primary-text)]/60">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--primary-bg)] active:bg-[var(--primary-bg)] transition-colors touch-manipulation ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--primary-text)]" />
          </button>
        </div>

        {/* Step Progress */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--border-light)] bg-[#FAFAF8]">
          <StepProgress steps={steps} currentStep={currentStep} selections={selections} />
        </div>

        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            flexBasis: '0%',
            minHeight: '200px',
          }}
        >
          <div className="px-4 py-4">
            {isLoading && steps.length === 0 ? (
              // Loading state
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-[var(--btn-bg)] animate-spin mb-4" />
                  <p className="text-sm text-[var(--primary-text)]/70 font-medium">Loading customization options...</p>
                </div>
              </div>
            ) : steps.length === 0 ? (
              // Error state - no steps available
              <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-6 text-center">
                  <div className="mb-3">
                    <svg className="w-12 h-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-red-900 mb-2">Configuration Error</h4>
                  <p className="text-sm text-red-700 mb-4">
                    This item's customization options are not configured. Please contact support.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Close
                  </button>
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
          className="flex-shrink-0 bg-white border-t border-[var(--border-light)] px-4 py-3"
          style={{
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
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
                style={{ minHeight: '52px' }}
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
                style={{ minHeight: '52px' }}
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
        [data-product-builder] {
          isolation: isolate;
          contain: layout style paint;
        }
        
        [data-product-builder] * {
          box-sizing: border-box;
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
      `}</style>
    </>
  );
};

export default ProductBuilderSheet;
