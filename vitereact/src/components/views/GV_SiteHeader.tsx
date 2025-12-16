import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Menu, 
  X, 
  User, 
  ShoppingCart, 
  LogOut,
  ChevronDown,
  ChevronRight,
  Home,
  UtensilsCrossed,
  Info,
  Phone,
  HelpCircle,
  MapPin
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
// Constants
// ===========================
const HEADER_HEIGHT_MOBILE = 56;
const HEADER_HEIGHT_DESKTOP = 72;

// Navigation links configuration
const NAVIGATION_LINKS = [
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/catering', label: 'Catering', icon: UtensilsCrossed },
  { path: '/about', label: 'About', icon: Info },
  { path: '/contact', label: 'Contact', icon: Phone },
  { path: '/track-order', label: 'Track Order', icon: MapPin },
];

// ===========================
// Main Component
// ===========================

const GV_SiteHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ===========================
  // Global State
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
  // Refs
  // ===========================
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  
  // ===========================
  // React Query - Loyalty Points
  // ===========================
  
  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty', currentUser?.user_id],
    queryFn: () => fetchLoyaltyAccount(authToken!),
    enabled: !!authToken && !!currentUser && isCustomer,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // ===========================
  // Event Handlers
  // ===========================
  
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      if (isGuest) {
        document.cookie = 'guest_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'checkout_intent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      await logoutUser();
      navigate(isGuest ? '/menu' : '/');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  }, [isGuest, logoutUser, navigate]);
  
  const toggleProfileDropdown = useCallback(() => {
    setIsProfileDropdownOpen(prev => !prev);
  }, []);
  
  const closeProfileDropdown = useCallback(() => {
    setIsProfileDropdownOpen(false);
  }, []);
  
  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);
  
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);
  
  const isActivePath = useCallback((path: string): boolean => {
    return location.pathname === path;
  }, [location.pathname]);
  
  const getCartBadgeDisplay = useCallback((): string => {
    if (cartItemCount === 0) return '';
    if (cartItemCount > 99) return '99+';
    return cartItemCount.toString();
  }, [cartItemCount]);
  
  // ===========================
  // Effects
  // ===========================
  
  // Close menus on route change
  useEffect(() => {
    closeMobileMenu();
    closeProfileDropdown();
  }, [location.pathname, closeMobileMenu, closeProfileDropdown]);
  
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
  }, [isProfileDropdownOpen, closeProfileDropdown]);
  
  // Click outside handler for mobile drawer (backdrop click)
  useEffect(() => {
    const handleBackdropClick = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        closeMobileMenu();
      }
    };
    
    if (isMobileMenuOpen) {
      // Small delay to prevent immediate close
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleBackdropClick);
      }, 10);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleBackdropClick);
      };
    }
  }, [isMobileMenuOpen, closeMobileMenu]);
  
  // Escape key handler for both dropdown and drawer
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobileMenuOpen) {
          closeMobileMenu();
        }
        if (isProfileDropdownOpen) {
          closeProfileDropdown();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen, isProfileDropdownOpen, closeMobileMenu, closeProfileDropdown]);
  
  // ===========================
  // Render
  // ===========================
  
  return (
    <>
      {/* ======================================
          MAIN HEADER - Single Sticky Bar
          Uses CSS media queries for responsive
          Only ONE header rendered at a time
          ====================================== */}
      <header 
        className="site-header sticky top-0 left-0 right-0 bg-[#F5F0EB] border-b border-[#2C1A16]/10 z-50"
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ======================================
              MOBILE HEADER (< 1024px)
              Single row: [Hamburger] [Logo] [Cart + Profile]
              ====================================== */}
          <div 
            className="flex lg:hidden items-center justify-between"
            style={{ 
              height: `${HEADER_HEIGHT_MOBILE}px`,
              minHeight: `${HEADER_HEIGHT_MOBILE}px`,
              maxHeight: `${HEADER_HEIGHT_MOBILE}px`,
            }}
          >
            {/* Left Section - Fixed width */}
            <div className="flex items-center justify-start" style={{ width: '48px', flexShrink: 0 }}>
              <button
                onClick={openMobileMenu}
                className="flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:text-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg transition-colors duration-200"
                aria-label="Open navigation menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-drawer"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
            
            {/* Center Section - Logo (flexible but constrained) */}
            <div className="flex items-center justify-center flex-1 min-w-0 px-2">
              <Link 
                to="/"
                className="flex items-center justify-center"
                aria-label="Salama Lama Home"
              >
                <img
                  src="/logo-salama-lama.jpg"
                  alt="Salama Lama"
                  className="h-8 w-auto object-contain"
                  style={{ maxHeight: '32px', maxWidth: '120px' }}
                />
              </Link>
            </div>
            
            {/* Right Section - Cart + Profile icon (fixed width) */}
            <div className="flex items-center justify-end gap-1" style={{ width: '88px', flexShrink: 0 }}>
              {/* Cart Icon with Badge */}
              <Link
                to="/cart"
                className="relative flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span 
                    className="absolute flex items-center justify-center bg-[#DC2626] text-white text-[10px] font-bold rounded-full pointer-events-none"
                    style={{
                      top: '2px',
                      right: '2px',
                      height: '16px',
                      minWidth: '16px',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                    }}
                  >
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Profile/Account Icon - Always visible */}
              {isAuthenticated ? (
                <div className="flex items-center justify-center w-8 h-8 bg-[#2C1A16] rounded-full flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                  aria-label="Log In"
                >
                  <User className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
          
          {/* ======================================
              DESKTOP HEADER (≥ 1024px)
              [Logo] [Nav Links] [Cart + Auth Buttons]
              ====================================== */}
          <div 
            className="hidden lg:flex items-center justify-between"
            style={{ 
              height: `${HEADER_HEIGHT_DESKTOP}px`,
              minHeight: `${HEADER_HEIGHT_DESKTOP}px`,
              maxHeight: `${HEADER_HEIGHT_DESKTOP}px`,
            }}
          >
            {/* Left: Logo */}
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
            
            {/* Center: Nav Links */}
            <nav className="flex items-center justify-center flex-1 px-8" aria-label="Main navigation">
              <ul className="flex items-center gap-8">
                {NAVIGATION_LINKS.map((link) => (
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
                  <span 
                    className="absolute flex items-center justify-center bg-[#DC2626] text-white text-xs font-bold rounded-full pointer-events-none"
                    style={{
                      top: '-4px',
                      right: '-4px',
                      height: '20px',
                      minWidth: '20px',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                    }}
                  >
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Authenticated: Account Dropdown */}
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
              
              {/* Not Authenticated: Log In + Sign Up Buttons */}
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="px-5 py-2 text-sm font-semibold text-[#2C1A16] bg-white border-2 border-[#2C1A16] rounded-full hover:bg-[#F5F0EB] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Log In"
                  >
                    Log In
                  </Link>
                  
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
          MOBILE NAVIGATION DRAWER
          Slides in from left
          ====================================== */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay - closes drawer on click */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Drawer panel */}
          <aside 
            ref={drawerRef}
            id="mobile-drawer"
            className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-white shadow-2xl z-[101] lg:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{ 
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              animation: 'slideInLeft 0.25s ease-out',
            }}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-[#E8E1D6] px-4 py-4 flex items-center justify-between z-10">
              <Link 
                to="/" 
                onClick={closeMobileMenu}
                className="flex items-center"
                aria-label="Salama Lama Home"
              >
                <img
                  src="/logo-salama-lama.jpg"
                  alt="Salama Lama"
                  className="h-8 w-auto object-contain"
                  style={{ maxHeight: '32px' }}
                />
              </Link>
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
              
              {/* User Info Card (authenticated users) */}
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
                      {loyaltyData && loyaltyData.current_points_balance > 0 && (
                        <p className="text-sm text-[#D97706] font-medium mt-1">
                          {loyaltyData.current_points_balance} loyalty points
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation Links */}
              <nav aria-label="Mobile navigation">
                <ul className="border border-[#E8E1D6] rounded-2xl divide-y divide-[#E8E1D6] overflow-hidden">
                  {/* Home link */}
                  <li>
                    <Link
                      to="/"
                      onClick={closeMobileMenu}
                      className={`flex items-center justify-between px-4 py-4 text-base font-medium transition-colors ${
                        isActivePath('/')
                          ? 'bg-[#F5F0EB] text-[#D97706]'
                          : 'text-[#2C1A16] hover:bg-[#F5F0EB]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Home className="h-5 w-5 opacity-60" />
                        <span>Home</span>
                      </div>
                      <ChevronRight className="h-5 w-5 opacity-40" />
                    </Link>
                  </li>
                  
                  {/* Main nav links */}
                  {NAVIGATION_LINKS.map((link) => (
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
                        <div className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 opacity-60" />
                          <span>{link.label}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 opacity-40" />
                      </Link>
                    </li>
                  ))}
                  
                  {/* FAQs */}
                  <li>
                    <Link
                      to="/faqs"
                      onClick={closeMobileMenu}
                      className={`flex items-center justify-between px-4 py-4 text-base font-medium transition-colors ${
                        isActivePath('/faqs')
                          ? 'bg-[#F5F0EB] text-[#D97706]'
                          : 'text-[#2C1A16] hover:bg-[#F5F0EB]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle className="h-5 w-5 opacity-60" />
                        <span>FAQs</span>
                      </div>
                      <ChevronRight className="h-5 w-5 opacity-40" />
                    </Link>
                  </li>
                  
                  {/* View Cart (if items) */}
                  {cartItemCount > 0 && (
                    <li>
                      <Link
                        to="/cart"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between px-4 py-4 text-base font-medium text-[#2C1A16] hover:bg-[#F5F0EB] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="h-5 w-5 opacity-60" />
                          <span>View Cart</span>
                          <span className="bg-[#DC2626] text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
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
                      className="flex items-center justify-center gap-2 w-full px-6 py-3.5 text-base font-bold rounded-full text-white bg-[#2C1A16] hover:bg-[#1A0F0D] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="h-5 w-5" />
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Log In and Sign Up moved to drawer for mobile */}
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
      
      {/* Animation Keyframes */}
      <style>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        /* Ensure header never causes horizontal scroll */
        .site-header {
          overflow-x: hidden;
        }
        
        /* iOS safe area insets */
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
