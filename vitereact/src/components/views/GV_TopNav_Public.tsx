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
  
  // Main navigation links for left side (4 links now including Track Order)
  const mainNavigationLinks = [
    { path: '/menu', label: 'Menu' },
    { path: '/catering', label: 'Catering' },
    { path: '/about', label: 'About' },
    { path: '/track-order', label: 'Track Order' },
  ];
  
  // All navigation links for mobile menu
  const allNavigationLinks = [
    { path: '/menu', label: 'Menu' },
    { path: '/catering', label: 'Catering' },
    { path: '/about', label: 'About' },
    { path: '/track-order', label: 'Track Order' },
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
        className={`fixed top-0 left-0 right-0 transition-all duration-200`}
        style={{ zIndex: 9999 }}
      >
        <div className={`w-[95%] md:max-w-7xl mx-auto ${
          has_shadow 
            ? 'mt-[10px]' 
            : 'mt-[10px]'
        }`}>
          <div className={`bg-[#F2EFE9] transition-all duration-200`}
          style={{ 
            backgroundColor: has_shadow ? 'rgba(242, 239, 233, 0.95)' : '#F2EFE9',
            borderRadius: '50px',
            boxShadow: has_shadow 
              ? '0 4px 20px rgba(0, 0, 0, 0.08), 0 8px 32px rgba(0, 0, 0, 0.05)' 
              : '0 4px 10px rgba(0, 0, 0, 0.05)',
          }}
          >
            {/* Mobile Layout: Logo Left | Hamburger Right (No Cart - using bottom sticky cart) */}
            {/* Desktop Layout: Left Nav | Center Logo | Right Actions */}
            <div className="h-16 md:h-20" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
              
              {/* LEFT GROUP: Logo on Mobile, Navigation Links on Desktop */}
              <div className="flex items-center flex-1">
                {/* Mobile Logo - Left Aligned with Padding */}
                <div className="md:hidden" style={{ overflow: 'hidden' }}>
                  <Link 
                    to="/"
                    className="flex items-center group py-2"
                    aria-label="Salama Lama Home"
                  >
                    <img 
                      src="/logo-salama-lama.jpg" 
                      alt="Salama Lama" 
                      className="transition-transform duration-200 group-hover:scale-105"
                      style={{ 
                        maxHeight: '40px', 
                        width: 'auto', 
                        objectFit: 'contain', 
                        display: 'block' 
                      }}
                      onError={(e) => { 
                        // Fallback to default logo if custom logo fails to load
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/logo-salama-lama.jpg') {
                          target.src = '/logo-salama-lama.jpg';
                        } else {
                          // Show text fallback
                          target.style.display = 'none';
                          const textSpan = document.createElement('span');
                          textSpan.className = 'text-lg font-bold text-[#6F4E37]';
                          textSpan.textContent = 'Salama Lama';
                          target.parentElement?.appendChild(textSpan);
                        }
                      }}
                    />
                  </Link>
                </div>
                
                {/* Desktop Navigation Links - Hidden on Mobile */}
                <div className="hidden md:flex md:items-center md:gap-8">
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
              </div>
              
              {/* CENTER: Logo - Desktop Only, Absolutely Centered */}
              <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ overflow: 'hidden' }}>
                <Link 
                  to="/"
                  className="flex items-center group"
                  aria-label="Salama Lama Home"
                >
                  <img 
                    src="/logo-salama-lama.jpg" 
                    alt="Salama Lama" 
                    className="transition-transform duration-200 group-hover:scale-105"
                    style={{ 
                      maxHeight: '40px', 
                      width: 'auto', 
                      objectFit: 'contain', 
                      display: 'block' 
                    }}
                    onError={(e) => { 
                      // Fallback to default logo if custom logo fails to load
                      const target = e.target as HTMLImageElement;
                      if (target.src !== '/logo-salama-lama.jpg') {
                        target.src = '/logo-salama-lama.jpg';
                      } else {
                        // Show text fallback
                        target.style.display = 'none';
                        const textSpan = document.createElement('span');
                        textSpan.className = 'text-xl font-bold text-[#6F4E37]';
                        textSpan.textContent = 'Salama Lama';
                        target.parentElement?.appendChild(textSpan);
                      }
                    }}
                  />
                </Link>
              </div>
              
              {/* RIGHT GROUP: Menu/Auth Actions (Cart removed on mobile - using sticky bottom cart) */}
              <div className="flex items-center" style={{ gap: '15px' }}>
                
                {/* Desktop: Log In + Sign Up Buttons - Hidden on Mobile */}
                <div className="hidden md:flex items-center gap-3">
                  {/* Log In Button - Secondary Style */}
                  <Link
                    to="/login"
                    className="px-5 py-2 text-sm font-semibold text-[#6F4E37] bg-white border-2 border-[#6F4E37] rounded-lg hover:bg-[#F2EFE9] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Log In"
                  >
                    Log In
                  </Link>
                  
                  {/* Sign Up Button - Primary Style */}
                  <Link
                    to="/signup"
                    className="px-5 py-2 text-sm font-bold text-white bg-[#6F4E37] rounded-lg hover:bg-[#5a3d2a] hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Sign Up"
                  >
                    Sign Up
                  </Link>
                </div>
                
                {/* Cart Button with Badge - Desktop Only (Mobile uses sticky bottom cart) */}
                <Link
                  to="/cart"
                  className="hidden md:flex relative text-[#2E211D] hover:text-[#1a0f0d] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2E211D] focus:ring-offset-2 rounded-lg"
                  aria-label={`Shopping cart with ${cart_item_count} items`}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cart_item_count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 animate-bounce-subtle">
                      {getCartBadgeDisplay()}
                    </span>
                  )}
                </Link>
                
                {/* Hamburger Menu Button - Mobile Only - Always Visible */}
                <button
                  onClick={toggleMobileMenu}
                  className="md:hidden text-[#2E211D] hover:text-[#1a0f0d] focus:outline-none focus:ring-2 focus:ring-[#2E211D] focus:ring-offset-2 rounded-lg transition-colors duration-200 p-1.5"
                  aria-label="Open navigation menu"
                  aria-expanded={is_mobile_menu_open}
                >
                  <Menu className="h-7 w-7" />
                </button>
                
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Off-Canvas Mobile Menu Drawer */}
      {is_mobile_menu_open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[90] md:hidden transition-opacity duration-300"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Mobile Menu Drawer - Off-Canvas, Slides from Right */}
          <div className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-[95] md:hidden shadow-2xl overflow-y-auto animate-slide-in-right bg-[#F2EFE9]">
            <div className="px-6 py-8 space-y-8">
              
              {/* Close Button - Top Right Corner */}
              <div className="flex items-center justify-end">
                <button
                  onClick={closeMobileMenu}
                  className="p-2 text-[#2E211D] hover:text-[#1a0f0d] hover:bg-[#E8E1D6] rounded-lg transition-all duration-200"
                  style={{ minHeight: '48px', minWidth: '48px' }}
                  aria-label="Close navigation menu"
                >
                  <X className="h-7 w-7" strokeWidth={2.5} />
                </button>
              </div>
              
              {/* Mobile Navigation Links - Large 24px text in Dark Brown Serif Font */}
              <div className="space-y-4">
                {allNavigationLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between px-6 py-6 rounded-xl transition-all duration-200 ${
                      isActivePath(link.path)
                        ? 'bg-[#E8E1D6] text-[#2E211D]'
                        : 'text-[#2E211D] hover:bg-[#E8E1D6]'
                    }`}
                    style={{
                      fontSize: '24px',
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontWeight: '600',
                      minHeight: '72px',
                    }}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-6 w-6" />
                  </Link>
                ))}
              </div>
              
              {/* Divider */}
              <div className="border-t-2 border-[#D4C5B0]" style={{ marginTop: '16px', marginBottom: '16px' }} />
              
              {/* Mobile Action Buttons - Full Width with Large Padding */}
              <div className="space-y-4">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-8 py-4 border-2 border-[#2E211D] text-lg font-bold rounded-xl bg-white hover:bg-[#2E211D] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2E211D] transition-all duration-200 text-[#2E211D]"
                  style={{ 
                    minHeight: '56px'
                  }}
                >
                  Log In
                </Link>
                
                <Link
                  to="/signup"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-8 py-4 border border-transparent text-lg font-bold rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2E211D] transition-all duration-200 bg-[#2E211D] text-white hover:bg-[#1a0f0d]"
                  style={{ 
                    minHeight: '56px'
                  }}
                >
                  Sign Up
                </Link>
              </div>
              
              {/* Mobile Cart Summary (if items exist) */}
              {cart_item_count > 0 && (
                <>
                  <div className="border-t-2 border-[#D4C5B0]" style={{ marginTop: '16px', marginBottom: '16px' }} />
                  
                  <Link
                    to="/cart"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between px-6 py-4 bg-[#E8E1D6] rounded-xl hover:bg-[#D4C5B0] transition-colors duration-200"
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-[#2E211D] text-white rounded-full p-3">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#2E211D]">
                          Your Cart
                        </p>
                        <p className="text-sm text-[#4A3B32]">
                          {cart_item_count} {cart_item_count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-[#2E211D]" />
                  </Link>
                </>
              )}
              
            </div>
          </div>
        </>
      )}
      
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-20 md:h-24" aria-hidden="true" />
      
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
        
        /* STRICT CSS OVERRIDES - Mobile Navigation Logo Fix */
        nav img[alt="Salama Lama"] {
          max-height: 40px !important;
          width: auto !important;
          object-fit: contain !important;
          display: block !important;
        }
        
        /* Ensure hamburger is visible on mobile only */
        @media (max-width: 767px) {
          button[aria-label="Open navigation menu"] {
            display: flex !important;
          }
        }
        
        @media (min-width: 768px) {
          button[aria-label="Open navigation menu"] {
            display: none !important;
          }
        }
        
        /* Mobile pill navbar - smooth transitions */
        @media (max-width: 767px) {
          nav > div {
            transition: all 0.2s ease-out;
          }
        }
      `}</style>
    </>
  );
};

export default GV_TopNav_Public;