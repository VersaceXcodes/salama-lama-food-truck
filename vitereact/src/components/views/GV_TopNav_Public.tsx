import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { ShoppingCart, Menu, X, ChevronRight } from 'lucide-react';

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
  
  const navigationLinks = [
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
      {/* Main Navigation Bar - Fixed at top with Glassmorphism */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          has_shadow 
            ? 'bg-[#F2EFE9]/95 backdrop-blur-md shadow-md' 
            : 'bg-[#F2EFE9] shadow-sm'
        }`}
        style={{ backgroundColor: has_shadow ? 'rgba(242, 239, 233, 0.95)' : '#F2EFE9' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link 
                to="/"
                className="flex items-center group"
                aria-label="Salama Lama Home"
              >
                <img 
                  src="./logo.png" 
                  alt="Salama Lama Logo" 
                  height="50"
                  className="h-[45px] md:h-[45px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ height: '50px', width: 'auto' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </Link>
            </div>
            
            {/* Desktop Navigation Links - Hidden on mobile */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-base font-medium transition-colors duration-200 ${
                    isActivePath(link.path)
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-700 hover:text-orange-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Actions Group */}
            <div className="flex items-center space-x-4">
              
              {/* Cart Button with Badge */}
              <Link
                to="/cart"
                className="relative p-2 text-gray-700 hover:text-orange-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
                aria-label={`Shopping cart with ${cart_item_count} items`}
              >
                <ShoppingCart className="h-6 w-6" />
                {cart_item_count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 animate-bounce-subtle">
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Login Button - Desktop */}
              <Link
                to="/login"
                className="hidden md:inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-orange-600 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200"
              >
                Log In
              </Link>
              
              {/* Sign Up Button - Desktop */}
              <Link
                to="/signup"
                className="hidden md:inline-flex items-center px-6 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-orange-600 hover:bg-orange-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
              >
                Sign Up
              </Link>
              
              {/* Mobile Hamburger Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 text-gray-700 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg transition-colors duration-200"
                aria-label="Open navigation menu"
                aria-expanded={is_mobile_menu_open}
              >
                {is_mobile_menu_open ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Overlay and Panel */}
      {is_mobile_menu_open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Mobile Menu Panel */}
          <div className="fixed top-16 right-0 bottom-0 w-full max-w-sm z-50 md:hidden shadow-2xl overflow-y-auto animate-slide-in-right" style={{ backgroundColor: 'var(--primary-bg)' }}>
            <div className="px-4 py-6 space-y-6">
              
              {/* Mobile Navigation Links */}
              <div className="space-y-1">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActivePath(link.path)
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-gray-50'
                    }`}
                    style={isActivePath(link.path) 
                      ? { backgroundColor: 'rgba(212, 197, 176, 0.3)', color: 'var(--primary-text)' }
                      : { color: 'var(--primary-text)' }
                    }
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                ))}
              </div>
              
              {/* Divider */}
              <div className="border-t border-gray-200" />
              
              {/* Mobile Action Buttons */}
              <div className="space-y-3">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-6 py-3 border text-base font-medium rounded-lg bg-white focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{ 
                    borderColor: 'var(--accent-color)',
                    color: 'var(--primary-text)',
                    minHeight: '48px'
                  }}
                >
                  Log In
                </Link>
                
                <Link
                  to="/signup"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-semibold rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{ 
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    minHeight: '48px'
                  }}
                >
                  Sign Up
                </Link>
              </div>
              
              {/* Mobile Cart Summary (if items exist) */}
              {cart_item_count > 0 && (
                <>
                  <div className="border-t border-gray-200" />
                  
                  <Link
                    to="/cart"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between px-4 py-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-orange-600 text-white rounded-full p-2">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Your Cart
                        </p>
                        <p className="text-xs text-gray-600">
                          {cart_item_count} {cart_item_count === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange-600" />
                  </Link>
                </>
              )}
              
            </div>
          </div>
        </>
      )}
      
      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" aria-hidden="true" />
      
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
        
        /* Mobile-specific logo styling */
        @media (max-width: 768px) {
          nav img[alt="Salama Lama Logo"] {
            height: 50px !important;
          }
          
          /* Center logo on mobile */
          nav .flex.items-center.justify-between > div.flex-shrink-0:first-child {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
          }
          
          /* Ensure hamburger menu stays on right */
          nav .flex.items-center.justify-between > div:last-child {
            margin-left: auto;
            z-index: 20;
          }
        }
      `}</style>
    </>
  );
};

export default GV_TopNav_Public;