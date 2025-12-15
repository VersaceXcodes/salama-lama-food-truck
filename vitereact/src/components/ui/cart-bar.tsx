import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ChevronRight } from 'lucide-react';

interface CartBarProps {
  itemCount: number;
  total: number;
  isVisible?: boolean;
  hideOnOverlay?: boolean;
  className?: string;
}

/**
 * CartBar Component
 * 
 * Mobile-optimized bottom cart bar with:
 * - Safe area inset support
 * - Clean layout with icon, count, and total
 * - Tap to view cart
 * - Auto-hide when cart is empty
 */
export const CartBar: React.FC<CartBarProps> = ({
  itemCount,
  total,
  isVisible = true,
  hideOnOverlay = false,
  className = '',
}) => {
  // Don't render if cart is empty, explicitly hidden, or overlay is open
  if (itemCount === 0 || !isVisible || hideOnOverlay) {
    return null;
  }

  return (
    <Link
      to="/cart"
      data-floating-cart
      className={`
        fixed bottom-0 left-0 right-0 
        bg-gradient-to-t from-[var(--btn-bg)] to-[#1A0F0D]
        text-white
        shadow-[0_-8px_32px_0_rgb(44_26_22/0.25)]
        z-40
        lg:hidden
        hover:from-[#1A0F0D] hover:to-[var(--btn-bg)]
        transition-all duration-200
        ${className}
      `}
      style={{
        height: 'var(--bottom-bar-height)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label={`View cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, total €${total.toFixed(2)}`}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 h-full">
        {/* Left: Cart Icon + Item Info */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 bg-[var(--primary-bg)] rounded-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-[var(--primary-text)]" aria-hidden="true" />
            </div>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-[var(--primary-text)]">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--primary-bg)]">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-xs text-[var(--primary-bg)] opacity-75">
              Tap to view cart
            </span>
          </div>
        </div>
        
        {/* Right: Total Display + Arrow */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-[var(--primary-bg)] opacity-75">Total</span>
            <span className="text-2xl font-bold text-[var(--primary-bg)]" style={{ letterSpacing: '-0.02em' }}>
              €{total.toFixed(2)}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--primary-bg)] opacity-75" />
        </div>
      </div>
    </Link>
  );
};

export default CartBar;
