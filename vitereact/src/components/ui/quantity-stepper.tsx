import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * QuantityStepper Component
 * 
 * A mobile-optimized quantity stepper with:
 * - Large tap targets (44-48px)
 * - Clear visual feedback
 * - Accessible controls
 * - Min/max constraints
 */
export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-11 w-11',
    lg: 'h-12 w-12',
  };

  const numberSizeClasses = {
    sm: 'min-w-[3rem] text-base',
    md: 'min-w-[3.5rem] text-lg',
    lg: 'min-w-[4rem] text-xl',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Decrement Button */}
      <button
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-[var(--radius-btn)] 
          border-2 border-[var(--primary-text)]
          bg-white
          text-[var(--primary-text)]
          hover:bg-[var(--primary-bg)]
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)] focus:ring-offset-2
        `}
        aria-label="Decrease quantity"
        type="button"
      >
        <Minus className="h-5 w-5" />
      </button>

      {/* Quantity Display */}
      <div 
        className={`
          ${numberSizeClasses[size]}
          flex items-center justify-center
          font-semibold
          text-[var(--primary-text)]
          select-none
        `}
        aria-live="polite"
        aria-atomic="true"
      >
        {value}
      </div>

      {/* Increment Button */}
      <button
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-[var(--radius-btn)]
          border-2 border-[var(--primary-text)]
          bg-[var(--primary-text)]
          text-white
          hover:bg-[#1A0F0D]
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)] focus:ring-offset-2
        `}
        aria-label="Increase quantity"
        type="button"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
};

export default QuantityStepper;
