import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import BrandLogo from '@/components/BrandLogo';
import { 
  Menu, 
  X, 
  User, 
  ShoppingCart, 
  LogOut,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface LoyaltyAccount {
  loyalty_account_id: string;
  user_id: string;
  current_points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  created_at: string;
}

// ===========================
// API Functions
// ===========================

const fetchLoyaltyAccount = async (token: string): Promise<LoyaltyAccount> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/loyalty`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// ===========================
// CSS Variables for Header Heights
// ===========================
const HEADER_HEIGHT_MOBILE = 56; // 56px for mobile
const HEADER_HEIGHT_DESKTOP = 72; // 72px max for desktop

// ===========================
// Main Component
// ===========================

const GV_SiteHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ===========================
  // Global State (Individual Selectors - CRITICAL)
  // ===========================
  
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const cartItems = useAppStore(state => state.cart_state.items);
  const logoutUser = useAppStore(state => state.logout_user);
  
  // ===========================
  // Derived State
  // ===========================
  
  const userRole = currentUser?.role;
  const isGuest = userRole === 'guest';
  const isCustomer = userRole === 'customer';
  const userDisplayName = currentUser?.first_name || (isGuest ? 'Guest' : 'User');
  const cartItemCount = cartItems.length;
  
  // ===========================
  // Local UI State
  // ===========================
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // ===========================
  // Refs for Click Outside Detection
  // ===========================
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  // ===========================
  // React Query - Loyalty Points (only for authenticated customers)
  // ===========================
  
  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty', currentUser?.user_id],
    queryFn: () => fetchLoyaltyAccount(authToken!),
    enabled: !!authToken && !!currentUser && isCustomer,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // ===========================
  // Navigation Links Configuration
  // ===========================
  
  const navigationLinks = [
    { path: '/menu', label: 'Menu' },
    { path: '/catering', label: 'Catering' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
    { path: '/faqs', label: 'FAQs' },
    { path: '/track-order', label: 'Track Order' },
  ];
  
  // ===========================
  // Event Handlers
  // ===========================
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear guest session if guest user
      if (isGuest) {
        // Clear guest-specific cookies/flags
        document.cookie = 'guest_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'checkout_intent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      
      await logoutUser();
      
      // Redirect to home or menu page
      navigate(isGuest ? '/menu' : '/');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };
  
  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };
  
  const closeProfileDropdown = () => {
    setIsProfileDropdownOpen(false);
  };
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  const isActivePath = (path: string): boolean => {
    return location.pathname === path;
  };
  
  const getCartBadgeDisplay = (): string => {
    if (cartItemCount === 0) return '';
    if (cartItemCount > 99) return '99+';
    return cartItemCount.toString();
  };
  
  // ===========================
  // Effects
  // ===========================
  
  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
    closeProfileDropdown();
  }, [location.pathname]);
  
  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);
  
  // Click outside handler for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        closeProfileDropdown();
      }
    };
    
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);
  
  // Escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProfileDropdown();
        closeMobileMenu();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);
  
  // ===========================
  // Render
  // ===========================
  
  return (
    <>
      {/* Main Navigation Bar - Sticky with iOS safe area */}
      <header 
        className="site-header sticky top-0 left-0 right-0 bg-[#F5F0EB] border-b border-[#2C1A16]/10 z-50"
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ======================================
              MOBILE HEADER (< 1024px)
              Height: 56px, clean single row
              Left: Hamburger | Center: Logo | Right: Cart + User
              ====================================== */}
          <div className="flex lg:hidden items-center justify-between flex-nowrap overflow-hidden" style={{ height: `${HEADER_HEIGHT_MOBILE}px` }}>
            {/* Left: Hamburger Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="flex items-center justify-center w-11 h-11 text-[#2C1A16] hover:text-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg transition-colors duration-200"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Center: Brand Logo - Small for Mobile */}
            <Link 
              to="/"
              className="flex items-center justify-center"
              aria-label="Salama Lama Home"
            >
              <img
                src="/logo-salama-lama.jpg"
                alt="Salama Lama"
                className="h-7 w-auto object-contain"
                style={{ maxHeight: '28px' }}
              />
            </Link>
            
            {/* Right: Cart + User Icon */}
            <div className="flex items-center gap-1 flex-nowrap flex-shrink-0">
              {/* Cart Icon with Badge */}
              <Link
                to="/cart"
                className="relative flex items-center justify-center w-11 h-11 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 pointer-events-none">
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* User Icon (simplified for mobile) */}
              {isAuthenticated ? (
                <div className="flex items-center justify-center w-9 h-9 bg-[#2C1A16] rounded-full">
                  <User className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center w-11 h-11 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                  aria-label="Log In"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
          
          {/* ======================================
              DESKTOP HEADER (≥ 1024px)
              Height: 72px max
              Left: Logo | Center: Nav Links | Right: Cart + Auth
              ====================================== */}
          <div className="hidden lg:flex items-center justify-between flex-nowrap" style={{ height: `${HEADER_HEIGHT_DESKTOP}px` }}>
            
            {/* Left: Logo (clickable → /) */}
            <Link 
              to="/"
              className="flex items-center flex-shrink-0"
              aria-label="Salama Lama Home"
            >
              <img
                src="/logo-salama-lama.jpg"
                alt="Salama Lama"
                className="h-10 w-auto object-contain transition-transform duration-200 hover:scale-105"
                style={{ maxHeight: '40px' }}
              />
            </Link>
            
            {/* Center: Nav Links - Horizontally centered and evenly spaced */}
            <nav className="flex items-center justify-center flex-1 px-8" aria-label="Main navigation">
              <ul className="flex items-center gap-8">
                {navigationLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`text-sm font-medium transition-colors duration-200 whitespace-nowrap py-2 ${
                        isActivePath(link.path)
                          ? 'text-[#D97706]'
                          : 'text-[#2C1A16] hover:text-[#D97706]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            
            {/* Right: Cart + Auth Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              
              {/* Cart Button with Badge */}
              <Link
                to="/cart"
                className="relative flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 pointer-events-none">
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Authenticated Users: Account Dropdown */}
              {isAuthenticated && !isGuest && (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2C1A16] bg-white border-2 border-[#2C1A16] rounded-full hover:bg-[#F5F0EB] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Account Menu"
                    aria-expanded={isProfileDropdownOpen}
                    aria-haspopup="menu"
                  >
                    <User className="h-4 w-4" />
                    <span className="max-w-24 truncate">{userDisplayName}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <Link
                        to="/orders"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#2C1A16] hover:bg-[#F5F0EB] transition-colors"
                        role="menuitem"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>My Orders</span>
                      </Link>
                      
                      <Link
                        to="/dashboard"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#2C1A16] hover:bg-[#F5F0EB] transition-colors"
                        role="menuitem"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                      
                      <div className="border-t border-gray-200 my-2" />
                      
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{isLoggingOut ? 'Signing Out...' : 'Logout'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Not Authenticated: Login + Sign Up Buttons */}
              {!isAuthenticated && (
                <>
                  {/* Log In Button - Pill style */}
                  <Link
                    to="/login"
                    className="px-5 py-2 text-sm font-semibold text-[#2C1A16] bg-white border-2 border-[#2C1A16] rounded-full hover:bg-[#F5F0EB] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Log In"
                  >
                    Log In
                  </Link>
                  
                  {/* Sign Up Button - Filled pill style */}
                  <Link
                    to="/signup"
                    className="px-5 py-2 text-sm font-bold text-white bg-[#2C1A16] rounded-full hover:bg-[#1A0F0D] hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Sign Up"
                  >
                    Sign Up
                  </Link>
                </>
              )}
              
            </div>
          </div>
        </nav>
      </header>
      
      {/* ======================================
          MOBILE MENU DRAWER - Left Slide
          ====================================== */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Drawer - Slides from LEFT */}
          <aside 
            id="mobile-menu"
            className="fixed top-0 left-0 bottom-0 w-full max-w-xs bg-white shadow-2xl z-[101] lg:hidden overflow-y-auto animate-slide-in-left"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-[#E8E1D6] px-4 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-[#2C1A16]">Menu</h2>
              <button
                onClick={closeMobileMenu}
                className="flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:bg-[#F5F0EB] rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="px-4 py-6 space-y-6">
              
              {/* User Info Card (if authenticated) */}
              {isAuthenticated && (
                <div className="p-4 bg-gradient-to-br from-[#F5F0EB] to-[#E8E1D6] rounded-2xl border border-[#E8E1D6]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-[#2C1A16] rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-base text-[#2C1A16] truncate">
                        {userDisplayName}
                      </p>
                      {!isGuest && currentUser?.email && (
                        <p className="text-sm text-[#2C1A16]/70 truncate">
                          {currentUser.email}
                        </p>
                      )}
                      {isGuest && (
                        <p className="text-sm text-[#2C1A16]/70">
                          Guest checkout
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation Links */}
              <nav aria-label="Mobile navigation">
                <ul className="border border-[#E8E1D6] rounded-2xl divide-y divide-[#E8E1D6] overflow-hidden">
                  {navigationLinks.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        onClick={closeMobileMenu}
                        className={`flex items-center justify-between px-4 py-4 text-base font-medium transition-colors ${
                          isActivePath(link.path)
                            ? 'bg-[#F5F0EB] text-[#D97706]'
                            : 'text-[#2C1A16] hover:bg-[#F5F0EB]'
                        }`}
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-5 w-5 opacity-40" />
                      </Link>
                    </li>
                  ))}
                  
                  {/* View Cart (if items in cart) */}
                  {cartItemCount > 0 && (
                    <li>
                      <Link
                        to="/cart"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between px-4 py-4 text-base font-medium text-[#2C1A16] hover:bg-[#F5F0EB] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          <span>View Cart</span>
                          <span className="bg-[#2C1A16] text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                            {cartItemCount}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 opacity-40" />
                      </Link>
                    </li>
                  )}
                </ul>
              </nav>
              
              {/* Auth / Account Buttons */}
              <div className="space-y-3 pt-2">
                {isAuthenticated ? (
                  <>
                    {isCustomer && (
                      <>
                        <Link
                          to="/dashboard"
                          onClick={closeMobileMenu}
                          className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[#2C1A16] text-base font-semibold rounded-full text-[#2C1A16] bg-white hover:bg-[#F5F0EB] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                        >
                          My Account
                        </Link>
                        
                        <Link
                          to="/orders"
                          onClick={closeMobileMenu}
                          className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[#2C1A16] text-base font-semibold rounded-full text-[#2C1A16] bg-white hover:bg-[#F5F0EB] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                        >
                          My Orders
                        </Link>
                      </>
                    )}
                    
                    {isGuest && (
                      <Link
                        to="/checkout/order-type"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[#2C1A16] text-base font-semibold rounded-full text-[#2C1A16] bg-white hover:bg-[#F5F0EB] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                      >
                        Continue Ordering
                      </Link>
                    )}
                    
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        handleLogout();
                      }}
                      disabled={isLoggingOut}
                      className="flex items-center justify-center w-full px-6 py-3.5 text-base font-bold rounded-full text-white bg-[#2C1A16] hover:bg-[#1A0F0D] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[#2C1A16] text-base font-semibold rounded-full text-[#2C1A16] bg-white hover:bg-[#F5F0EB] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                    >
                      Log In
                    </Link>
                    
                    <Link
                      to="/signup"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center w-full px-6 py-3.5 text-base font-bold rounded-full text-white bg-[#2C1A16] hover:bg-[#1A0F0D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
      
      {/* Spacer div to prevent content from being hidden under the fixed/sticky header */}
      {/* This ensures the first section is fully visible below the header */}
      <div 
        aria-hidden="true" 
        className="header-spacer"
        style={{ 
          height: 0, // Sticky header doesn't need a spacer, content flows naturally
          // If using fixed positioning, change to: height: `${HEADER_HEIGHT_MOBILE}px` (mobile) or `${HEADER_HEIGHT_DESKTOP}px` (desktop)
        }} 
      />

      {/* Custom Animation Styles */}
      <style>{`
        /* CSS Custom Property for header height */
        :root {
          --header-height-mobile: ${HEADER_HEIGHT_MOBILE}px;
          --header-height-desktop: ${HEADER_HEIGHT_DESKTOP}px;
        }
        
        /* Slide in from left animation */
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out;
        }
        
        /* CRITICAL: Ensure header NEVER wraps into multiple rows */
        .site-header,
        .site-header nav,
        .site-header nav > div {
          overflow: visible;
        }
        
        /* Mobile header: strict no-wrap single row */
        .site-header .flex {
          flex-wrap: nowrap !important;
        }
        
        /* Logo should never be clipped and should shrink if needed */
        .site-header img {
          display: block;
          flex-shrink: 1;
          min-width: 0;
        }
        
        /* Ensure hamburger and action icons don't shrink */
        .site-header button,
        .site-header a[aria-label] {
          flex-shrink: 0;
        }
        
        /* iOS safe area support for the header */
        @supports (padding-top: env(safe-area-inset-top)) {
          .site-header {
            padding-top: env(safe-area-inset-top);
          }
        }
      `}</style>
    </>
  );
};

export default GV_SiteHeader;
