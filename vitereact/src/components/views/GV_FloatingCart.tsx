import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useOverlayState } from '@/hooks/use-overlay-state';
import { CartBar } from '@/components/ui/cart-bar';
import { ShoppingCart } from 'lucide-react';

const GV_FloatingCart: React.FC = () => {
  // ===========================
  // Global State Access (Zustand - Individual Selectors)
  // ===========================
  
  // CRITICAL: Individual selectors, no object destructuring to prevent infinite re-renders
  const cartItems = useAppStore(state => state.cart_state.items);
  const cartSubtotal = useAppStore(state => state.cart_state.subtotal);
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
  // Early Return - Hide When Empty
  // ===========================
  
  if (isEmpty) {
    return null;
  }

  // ===========================
  // Render - Dual Layout (Desktop + Mobile)
  // ===========================
  
  return (
    <>
      {/* ==================================================
          DESKTOP FLOATING CART - Bottom Right Corner
          ================================================== */}
      <Link
        to="/cart"
        className={`
          fixed bottom-6 right-6 
          bg-orange-600 text-white 
          rounded-full shadow-2xl 
          hover:bg-orange-700 
          transition-all duration-200 
          hover:scale-105 
          z-50 
          hidden lg:flex 
          items-center space-x-3 
          px-5 py-4
          ${isAnimating ? 'animate-bounce' : ''}
        `}
        aria-label={`View cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, total €${cartTotal.toFixed(2)}`}
      >
        {/* Cart Icon with Badge */}
        <div className="relative">
          <ShoppingCart className="h-6 w-6" aria-hidden="true" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
            {itemCount}
          </span>
        </div>
        
        {/* Cart Summary */}
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium opacity-90">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          <span className="text-lg font-bold">
            €{cartTotal.toFixed(2)}
          </span>
        </div>
      </Link>

      {/* ==================================================
          MOBILE FLOATING CART - Use CartBar Component
          ================================================== */}
      <CartBar
        itemCount={itemCount}
        total={cartTotal}
        isVisible={!isEmpty}
        hideOnOverlay={isOverlayOpen}
        className={isAnimating ? 'animate-pulse' : ''}
      />
    </>
  );
};

export default GV_FloatingCart;