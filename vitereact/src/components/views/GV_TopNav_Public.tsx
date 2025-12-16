import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { ShoppingCart, Menu, X, ChevronRight, User } from 'lucide-react';

const GV_TopNav_Public: React.FC = () => {
  // ===========================
  // State Management
  // ===========================
  
  // Local UI state for mobile menu
  const [is_mobile_menu_open, set_is_mobile_menu_open] = useState(false);
  const [has_shadow, set_has_shadow] = useState(false);
  
  // Global state access - CRITICAL: Individual selectors only
  const cartItems = useAppStore(state => state.cart_state.items);
  const isAuthenticated = useAppStore(state => 
    state.authentication_state.authentication_status.is_authenticated
  );
  const businessSettings = useAppStore(state => state.business_settings);
  const logoUrl = businessSettings.business_info.logo_url || '/assets/salama-lama-logo.png';
  
  // Derive cart item count
  const cart_item_count = cartItems?.length || 0;
  
  // Get current location for active link styling
  const location = useLocation();
  
  // ===========================
  // Effects
  // ===========================
  
  // Handle scroll for shadow effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        set_has_shadow(true);
      } else {
        set_has_shadow(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu on route change
  useEffect(() => {
    set_is_mobile_menu_open(false);
  }, [location.pathname]);
  
  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (is_mobile_menu_open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [is_mobile_menu_open]);
  
  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && is_mobile_menu_open) {
        set_is_mobile_menu_open(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [is_mobile_menu_open]);
  
  // ===========================
  // Event Handlers
  // ===========================
  
  const toggleMobileMenu = () => {
    set_is_mobile_menu_open(!is_mobile_menu_open);
  };
  
  const closeMobileMenu = () => {
    set_is_mobile_menu_open(false);
  };
  
  // ===========================
  // Helper Functions
  // ===========================
  
  const isActivePath = (path: string): boolean => {
    return location.pathname === path;
  };
  
  const getCartBadgeDisplay = (): string => {
    if (cart_item_count === 0) return '';
    if (cart_item_count > 99) return '99+';
    return cart_item_count.toString();
  };
  
  // ===========================
  // Navigation Data
  // ===========================
  
  // Main navigation links for left side (only 3 links for symmetry)
  const mainNavigationLinks = [
    { path: '/menu', label: 'Menu' },
    { path: '/catering', label: 'Catering' },
    { path: '/about', label: 'About' },
  ];
  
  // All navigation links for mobile menu
  const allNavigationLinks = [
    { path: '/menu', label: 'Menu' },
    { path: '/catering', label: 'Catering' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
    { path: '/faqs', label: 'FAQs' },
  ];
  
  // Don't render if user is authenticated (other nav components handle that)
  if (isAuthenticated) {
    return null;
  }
  
  // ===========================
  // Render
  // ===========================
  
  return (
    <>
      {/* Main Navigation Bar - Fixed at top with Mobile-First Design */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          has_shadow 
            ? 'bg-[#F2EFE9]/95 backdrop-blur-md shadow-md' 
            : 'bg-[#F2EFE9] shadow-sm'
        }`}
        style={{ backgroundColor: has_shadow ? 'rgba(242, 239, 233, 0.95)' : '#F2EFE9' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Symmetrical 3-Column Layout: Left Nav | Center Logo | Right Actions */}
          <div className="relative flex items-center h-16 md:h-20">
            
            {/* LEFT GROUP: Navigation Links - Desktop Only */}
            <div className="hidden md:flex md:items-center md:gap-8 flex-1">
              {mainNavigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-base font-medium transition-all duration-200 whitespace-nowrap ${
                    isActivePath(link.path)
                      ? 'text-[#6F4E37] border-b-2 border-[#6F4E37]'
                      : 'text-[#6F4E37] hover:text-orange-600 hover:opacity-80'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* CENTER: Logo - Absolutely Centered */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <Link 
                to="/"
                className="flex items-center group"
                aria-label="Salama Lama Home"
              >
                <img 
                  src={logoUrl} 
                  alt="Salama Lama" 
                  className="w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ height: '26px', maxWidth: '150px' }}
                  onError={(e) => { 
                    // Fallback to default logo if custom logo fails to load
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/assets/salama-lama-logo.png') {
                      target.src = '/assets/salama-lama-logo.png';
                    } else {
                      // Fallback to screen-reader-only text if even default logo fails
                      target.style.display = 'none';
                      const textSpan = document.createElement('span');
                      textSpan.className = 'sr-only';
                      textSpan.textContent = 'Salama Lama';
                      target.parentElement?.appendChild(textSpan);
                    }
                  }}
                />
              </Link>
            </div>
            
            {/* RIGHT GROUP: User Actions - Log In + Cart */}
            <div className="flex items-center justify-end gap-5 flex-1 z-20">
              
              {/* Log In Link - Desktop: Text, Mobile: User Icon */}
              <Link
                to="/login"
                className="text-[#6F4E37] hover:text-orange-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
                aria-label="Log In"
              >
                {/* Desktop: Text Link */}
                <span className="hidden md:inline text-base font-medium">Log In</span>
                {/* Mobile: User Icon */}
                <User className="md:hidden h-6 w-6" />
              </Link>
              
              {/* Cart Button with Badge */}
              <Link
                to="/cart"
                className="relative text-[#6F4E37] hover:text-orange-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
                aria-label={`Shopping cart with ${cart_item_count} items`}
              >
                <ShoppingCart className="h-6 w-6" />
                {cart_item_count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 animate-bounce-subtle">
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Hamburger Menu Button - Mobile Only */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden text-[#6F4E37] hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg transition-colors duration-200"
                aria-label="Open navigation menu"
                aria-expanded={is_mobile_menu_open}
              >
                {is_mobile_menu_open ? (
                  <X className="h-7 w-7" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
              </button>
              
            </div>
          </div>
        </div>
      </nav>
      
      {/* COMMANDMENT #2: Full-Screen Mobile Drawer */}
      {is_mobile_menu_open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Mobile Menu Drawer - Full Screen, Slides from Right */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-full z-50 md:hidden shadow-2xl overflow-y-auto animate-slide-in-right" style={{ backgroundColor: 'var(--primary-bg)' }}>
            <div className="px-6 py-8 space-y-8">
              
              {/* Close Button */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Menu</h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-3 text-gray-700 hover:text-orange-600 rounded-lg"
                  style={{ minHeight: '48px', minWidth: '48px' }}
                  aria-label="Close navigation menu"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
              
              {/* Mobile Navigation Links - COMMANDMENT #1: Large Touch Targets */}
              <div className="space-y-2">
                {allNavigationLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 ${
                      isActivePath(link.path)
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-gray-50'
                    }`}
                    style={{
                      minHeight: '64px',
                      backgroundColor: isActivePath(link.path) ? 'rgba(212, 197, 176, 0.3)' : 'transparent',
                      color: 'var(--primary-text)'
                    }}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-6 w-6" />
                  </Link>
                ))}
              </div>
              
              {/* Divider - COMMANDMENT #1: 16px spacing */}
              <div className="border-t-2 border-gray-200" style={{ marginTop: '16px', marginBottom: '16px' }} />
              
              {/* Mobile Action Buttons - COMMANDMENT #1: 48px min-height, full width */}
              <div className="space-y-4">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-8 py-4 border-2 text-lg font-semibold rounded-xl bg-white focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{ 
                    borderColor: 'var(--accent-color)',
                    color: 'var(--primary-text)',
                    minHeight: '56px'
                  }}
                >
                  Log In
                </Link>
                
                <Link
                  to="/signup"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-8 py-4 border border-transparent text-lg font-bold rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{ 
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    minHeight: '56px'
                  }}
                >
                  Sign Up
                </Link>
              </div>
              
              {/* Mobile Cart Summary (if items exist) */}
              {cart_item_count > 0 && (
                <>
                  <div className="border-t-2 border-gray-200" style={{ marginTop: '16px', marginBottom: '16px' }} />
                  
                  <Link
                    to="/cart"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between px-6 py-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors duration-200"
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-orange-600 text-white rounded-full p-3">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900">
                          Your Cart
                        </p>
                        <p className="text-sm text-gray-600">
                          {cart_item_count} {cart_item_count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-orange-600" />
                  </Link>
                </>
              )}
              
            </div>
          </div>
        </>
      )}
      
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16 md:h-20" aria-hidden="true" />
      
      {/* Custom Animation Styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes bounce-subtle {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 0.5s ease-in-out;
        }
        
        /* Responsive logo sizing */
        @media (min-width: 768px) {
          nav img[alt="Salama Lama"] {
            height: 34px !important;
            max-width: 200px !important;
          }
        }
      `}</style>
    </>
  );
};

export default GV_TopNav_Public;