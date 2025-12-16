import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useOverlayState } from '@/hooks/use-overlay-state';
import { CartBar } from '@/components/ui/cart-bar';
import { ShoppingCart } from 'lucide-react';

const GV_FloatingCart: React.FC = () => {
  const location = useLocation();
  
  // ===========================
  // Global State Access (Zustand - Individual Selectors)
  // ===========================
  
  // CRITICAL: Individual selectors, no object destructuring to prevent infinite re-renders
  const cartItems = useAppStore(state => state.cart_state.items);
  const cartTotal = useAppStore(state => state.cart_state.total);
  
  // Check if any overlay is open
  const isOverlayOpen = useOverlayState(state => state.isOverlayOpen);
  
  // ===========================
  // Local State (Animation)
  // ===========================
  
  const [isAnimating, setIsAnimating] = useState(false);
  
  // ===========================
  // Derived State
  // ===========================
  
  // Calculate total item count (sum of all quantities)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = itemCount === 0;
  
  // Routes where floating cart should be hidden
  const hiddenRoutes = [
    '/checkout',
    '/order-confirmation',
    '/admin',
    '/staff',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ];
  
  // Check if we're on a hidden route
  const isHiddenRoute = hiddenRoutes.some(route => location.pathname.startsWith(route));

  // ===========================
  // Effects - Animation Trigger
  // ===========================
  
  useEffect(() => {
    if (itemCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [itemCount, cartTotal]); // Trigger on cart content or total changes

  // ===========================
  // Early Return - Hide When Empty or on Hidden Routes
  // ===========================
  
  if (isEmpty || isHiddenRoute) {
    return null;
  }

  // ===========================
  // Render - Dual Layout (Desktop + Mobile)
  // ===========================
  
  return (
    <>
      {/* ==================================================
          DESKTOP FLOATING CART - Bottom Right Corner
          Shown on lg screens and up
          ================================================== */}
      <Link
        to="/cart"
        className={`
          fixed bottom-6 right-6 
          bg-[var(--btn-bg)] text-[var(--btn-text)]
          rounded-2xl shadow-2xl 
          hover:bg-[#1A0F0D] 
          transition-all duration-200 
          hover:scale-105 
          z-50 
          hidden lg:flex 
          items-center gap-3 
          px-5 py-4
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
          ${isAnimating ? 'animate-bounce-subtle' : ''}
        `}
        aria-label={`View cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, total €${cartTotal.toFixed(2)}`}
      >
        {/* Cart Icon with Badge */}
        <div className="relative">
          <ShoppingCart className="h-6 w-6" aria-hidden="true" />
          <span 
            className="
              absolute -top-2 -right-2 
              bg-red-500 text-white 
              text-xs font-bold 
              rounded-full 
              h-5 min-w-5 
              flex items-center justify-center px-1
              shadow-md
            "
            aria-hidden="true"
          >
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        </div>
        
        {/* Cart Summary */}
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium opacity-80">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          <span className="text-lg font-bold tracking-tight">
            €{cartTotal.toFixed(2)}
          </span>
        </div>
      </Link>

      {/* ==================================================
          MOBILE FLOATING CART - Bottom Bar
          Uses modern floating CartBar component
          ================================================== */}
      <CartBar
        itemCount={itemCount}
        total={cartTotal}
        isVisible={!isEmpty}
        hideOnOverlay={isOverlayOpen}
        className={isAnimating ? 'animate-pulse-soft' : ''}
      />
      
      {/* Animation styles */}
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        
        @keyframes pulse-soft {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 0.5s ease-in-out;
        }
        
        .animate-pulse-soft {
          animation: pulse-soft 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default GV_FloatingCart;
