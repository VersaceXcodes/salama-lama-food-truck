import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, ChevronRight, Truck, Store } from 'lucide-react';

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
 * Modern floating bottom cart bar (mobile-first) with:
 * - iOS safe area inset support
 * - Floating "sheet" style design
 * - Order type display (Delivery/Collection)
 * - Context-aware CTA (View Cart on Menu, Proceed to Checkout on Cart)
 * - Auto-hide when cart is empty or on checkout/confirmation pages
 */
export const CartBar: React.FC<CartBarProps> = ({
  itemCount,
  total,
  isVisible = true,
  hideOnOverlay = false,
  className = '',
}) => {
  const location = useLocation();
  const [orderType, setOrderType] = useState<'collection' | 'delivery' | null>(null);
  
  // Read order type from sessionStorage
  useEffect(() => {
    const storedOrderType = sessionStorage.getItem('checkout_order_type') as 'collection' | 'delivery' | null;
    setOrderType(storedOrderType);
  }, [location.pathname]); // Re-check when route changes
  
  // Routes where cart bar should be hidden
  // Note: /cart has its own mobile footer bar
  const hiddenRoutes = [
    '/cart',
    '/checkout',
    '/order-confirmation',
    '/admin',
    '/staff',
  ];
  
  // Check if we're on a hidden route
  const isHiddenRoute = hiddenRoutes.some(route => location.pathname.startsWith(route));
  
  // Don't render if cart is empty, explicitly hidden, overlay is open, or on hidden routes
  if (itemCount === 0 || !isVisible || hideOnOverlay || isHiddenRoute) {
    return null;
  }
  
  // Determine CTA based on current page
  const isCartPage = location.pathname === '/cart';
  const ctaText = isCartPage ? 'Proceed to Checkout' : 'View Cart';
  const ctaHref = isCartPage ? '/checkout/order-type' : '/cart';
  
  // Order type icon and label
  const OrderTypeIcon = orderType === 'delivery' ? Truck : Store;
  const orderTypeLabel = orderType === 'delivery' ? 'Delivery' : orderType === 'collection' ? 'Collection' : null;

  return (
    <div
      data-floating-cart
      className={`
        fixed z-40 lg:hidden
        left-4 right-4
        transition-all duration-300 ease-out
        ${className}
      `}
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Link
        to={ctaHref}
        className="
          flex items-center justify-between
          w-full
          bg-[var(--btn-bg)]
          text-[var(--btn-text)]
          rounded-2xl
          shadow-[0_8px_32px_rgba(44,26,22,0.25),0_2px_8px_rgba(44,26,22,0.15)]
          px-4 py-3.5
          hover:bg-[#1A0F0D]
          active:scale-[0.98]
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
        "
        aria-label={`${ctaText}. ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, total €${total.toFixed(2)}`}
      >
        {/* Left: Cart Icon + Info */}
        <div className="flex items-center gap-3">
          {/* Cart icon with badge */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-[var(--btn-text)]" aria-hidden="true" />
            </div>
            <span 
              className="
                absolute -top-1 -right-1 
                bg-red-500 text-white 
                text-[0.625rem] font-bold 
                rounded-full 
                h-[1.125rem] min-w-[1.125rem] px-1
                flex items-center justify-center
                shadow-md
                border border-[var(--btn-bg)]
              "
              aria-hidden="true"
            >
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          </div>
          
          {/* Item count and order type */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[var(--btn-text)] truncate">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            {orderTypeLabel && (
              <span className="flex items-center gap-1 text-xs text-[var(--btn-text)]/70">
                <OrderTypeIcon className="h-3 w-3" aria-hidden="true" />
                {orderTypeLabel}
              </span>
            )}
          </div>
        </div>
        
        {/* Right: Total + CTA */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-[var(--btn-text)]/70">Total</span>
            <span 
              className="text-xl font-bold text-[var(--btn-text)] tracking-tight"
            >
              €{total.toFixed(2)}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--btn-text)]/70" aria-hidden="true" />
        </div>
      </Link>
    </div>
  );
};

export default CartBar;
