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
  MapPin,
  Package,
  Gift
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
// Navigation links configuration
// ===========================
const NAVIGATION_LINKS = [
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/catering', label: 'Catering', icon: UtensilsCrossed },
  { path: '/about', label: 'About', icon: Info },
  { path: '/contact', label: 'Contact', icon: Phone },
  { path: '/faqs', label: 'FAQs', icon: HelpCircle },
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
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // ===========================
  // Local UI State
  // ===========================
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // ===========================
  // Refs
  // ===========================
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  
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
    // Return focus to hamburger button for accessibility
    setTimeout(() => {
      hamburgerRef.current?.focus();
    }, 100);
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
  
  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close menus on route change
  useEffect(() => {
    closeMobileMenu();
    closeProfileDropdown();
  }, [location.pathname, closeMobileMenu, closeProfileDropdown]);
  
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
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
          MAIN HEADER - Sticky with scroll effects
          Uses CSS variables for all sizing
          ====================================== */}
      <header 
        className={`
          site-header fixed top-0 left-0 right-0 z-50
          transition-all duration-300 ease-out
          ${isScrolled 
            ? 'bg-[var(--primary-bg)]/95 backdrop-blur-md shadow-md' 
            : 'bg-[var(--primary-bg)]'
          }
        `}
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
        role="banner"
      >
        <nav 
          className="max-w-7xl mx-auto"
          aria-label="Main navigation"
        >
          
          {/* ======================================
              MOBILE HEADER (< 1024px)
              Single row: [Hamburger] [Logo] [Cart + Account]
              ====================================== */}
          <div 
            className="flex lg:hidden items-center justify-between h-14 px-4"
          >
            {/* Left Section - Hamburger Menu */}
            <div className="flex items-center justify-start w-12 flex-shrink-0">
              <button
                ref={hamburgerRef}
                onClick={openMobileMenu}
                className="
                  flex items-center justify-center 
                  w-11 h-11 
                  text-[var(--primary-text)] 
                  hover:bg-[var(--accent-color)]/30
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)] focus-visible:ring-offset-2
                  rounded-xl
                  transition-colors duration-200
                  active:scale-95
                "
                aria-label="Open navigation menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-drawer"
                aria-haspopup="dialog"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            
            {/* Center Section - Logo */}
            <div className="flex items-center justify-center flex-1 min-w-0 px-2">
              <Link 
                to="/"
                className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)] focus-visible:ring-offset-2 rounded-lg"
                aria-label="Salama Lama Home"
              >
                <img
                  src="/logo-salama-lama.jpg"
                  alt="Salama Lama"
                  className="h-8 w-auto object-contain max-w-[7.5rem]"
                />
              </Link>
            </div>
            
            {/* Right Section - Cart + Account icon */}
            <div className="flex items-center justify-end gap-1 w-auto flex-shrink-0">
              {/* Cart Icon with Badge */}
              <Link
                to="/cart"
                className="
                  relative flex items-center justify-center 
                  w-11 h-11 
                  text-[var(--primary-text)] 
                  hover:bg-[var(--accent-color)]/30
                  transition-colors duration-200 
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)] focus-visible:ring-offset-2 
                  rounded-xl
                  active:scale-95
                "
                aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {cartItemCount > 0 && (
                  <span 
                    className="
                      absolute flex items-center justify-center 
                      bg-red-600 text-white 
                      text-[0.625rem] font-bold 
                      rounded-full 
                      pointer-events-none
                      min-w-[1.125rem] h-[1.125rem] px-1
                      -top-0.5 -right-0.5
                    "
                    aria-hidden="true"
                  >
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Account Icon */}
              {isAuthenticated ? (
                <div 
                  className="
                    flex items-center justify-center 
                    w-9 h-9 
                    bg-[var(--primary-text)] 
                    rounded-full 
                    flex-shrink-0
                  "
                  aria-label={`Logged in as ${userDisplayName}`}
                >
                  <User className="h-4 w-4 text-[var(--btn-text)]" aria-hidden="true" />
                </div>
              ) : (
                <Link
                  to="/login"
                  className="
                    flex items-center justify-center 
                    w-11 h-11 
                    text-[var(--primary-text)] 
                    hover:bg-[var(--accent-color)]/30
                    transition-colors duration-200 
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)] focus-visible:ring-offset-2 
                    rounded-xl
                    active:scale-95
                  "
                  aria-label="Log In"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          
          {/* ======================================
              DESKTOP HEADER (>= 1024px)
              [Logo] [Nav Links] [Cart + Auth Buttons]
              ====================================== */}
          <div 
            className="hidden lg:flex items-center justify-between h-[4.5rem] px-6"
          >
            {/* Left: Logo */}
            <Link 
              to="/"
              className="flex items-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)] focus-visible:ring-offset-2 rounded-lg"
              aria-label="Salama Lama Home"
            >
              <img
                src="/logo-salama-lama.jpg"
                alt="Salama Lama"
                className="h-10 w-auto object-contain transition-transform duration-200 hover:scale-105"
              />
            </Link>
            
            {/* Center: Nav Links */}
            <nav className="flex items-center justify-center flex-1 px-8" aria-label="Primary navigation">
              <ul className="flex items-center gap-8">
                {NAVIGATION_LINKS.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`
                        text-sm font-medium 
                        transition-colors duration-200 
                        whitespace-nowrap 
                        py-2
                        focus:outline-none focus-visible:underline focus-visible:underline-offset-4
                        ${isActivePath(link.path)
                          ? 'text-amber-700'
                          : 'text-[var(--primary-text)] hover:text-amber-700'
                        }
                      `}
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
                className="
                  relative flex items-center justify-center 
                  w-11 h-11 
                  text-[var(--primary-text)] 
                  hover:bg-[var(--accent-color)]/30
                  transition-colors duration-200 
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)] focus-visible:ring-offset-2 
                  rounded-xl
                "
                aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {cartItemCount > 0 && (
                  <span 
                    className="
                      absolute flex items-center justify-center 
                      bg-red-600 text-white 
                      text-xs font-bold 
                      rounded-full 
                      pointer-events-none
                      min-w-5 h-5 px-1
                      -top-1 -right-1
                    "
                    aria-hidden="true"
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
                    className="
                      flex items-center gap-2 
                      px-4 py-2.5 
                      text-sm font-semibold 
                      text-[var(--primary-text)] 
                      bg-white 
                      border-2 border-[var(--primary-text)] 
                      rounded-full 
                      hover:bg-[var(--primary-bg)] 
                      transition-all duration-200 
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                      shadow-sm 
                      whitespace-nowrap
                    "
                    aria-label="Account Menu"
                    aria-expanded={isProfileDropdownOpen}
                    aria-haspopup="menu"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span className="max-w-24 truncate">{userDisplayName}</span>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} 
                      aria-hidden="true"
                    />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div 
                      className="
                        absolute right-0 mt-2 
                        w-56 
                        bg-white 
                        rounded-xl 
                        shadow-xl 
                        border border-[var(--border-light)]
                        py-2 
                        z-50
                        animate-scale-in
                      "
                      role="menu"
                      aria-orientation="vertical"
                      aria-label="User menu"
                    >
                      <Link
                        to="/dashboard"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--primary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                        role="menuitem"
                      >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        <span>Dashboard</span>
                      </Link>
                      
                      <Link
                        to="/orders"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--primary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                        role="menuitem"
                      >
                        <Package className="h-4 w-4" aria-hidden="true" />
                        <span>My Orders</span>
                      </Link>
                      
                      <Link
                        to="/rewards"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--primary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                        role="menuitem"
                      >
                        <Gift className="h-4 w-4" aria-hidden="true" />
                        <span>Rewards</span>
                        {loyaltyData && loyaltyData.current_points_balance > 0 && (
                          <span className="ml-auto text-xs font-bold text-amber-600">
                            {loyaltyData.current_points_balance} pts
                          </span>
                        )}
                      </Link>
                      
                      <Link
                        to="/profile"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--primary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                        role="menuitem"
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                        <span>Profile</span>
                      </Link>
                      
                      <div className="border-t border-[var(--border-light)] my-2" role="separator" />
                      
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        <span>{isLoggingOut ? 'Signing Out...' : 'Logout'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Guest user - Show Continue button */}
              {isAuthenticated && isGuest && (
                <Link
                  to="/checkout/order-type"
                  className="
                    px-5 py-2.5 
                    text-sm font-bold 
                    text-[var(--btn-text)] 
                    bg-[var(--btn-bg)] 
                    rounded-full 
                    hover:bg-[#1A0F0D] hover:shadow-md 
                    transition-all duration-200 
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                    shadow-sm 
                    whitespace-nowrap
                  "
                >
                  Continue Order
                </Link>
              )}
              
              {/* Not Authenticated: Log In + Sign Up Buttons */}
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="
                      px-5 py-2.5 
                      text-sm font-semibold 
                      text-[var(--primary-text)] 
                      bg-white 
                      border-2 border-[var(--primary-text)] 
                      rounded-full 
                      hover:bg-[var(--primary-bg)] 
                      transition-all duration-200 
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                      shadow-sm 
                      whitespace-nowrap
                    "
                    aria-label="Log In"
                  >
                    Log In
                  </Link>
                  
                  <Link
                    to="/signup"
                    className="
                      px-5 py-2.5 
                      text-sm font-bold 
                      text-[var(--btn-text)] 
                      bg-[var(--btn-bg)] 
                      rounded-full 
                      hover:bg-[#1A0F0D] hover:shadow-md 
                      transition-all duration-200 
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                      shadow-sm 
                      whitespace-nowrap
                    "
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
      
      {/* Spacer to prevent content from being hidden under fixed header */}
      <div 
        className="h-14 lg:h-[4.5rem]" 
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)' 
        }}
        aria-hidden="true" 
      />
      
      {/* ======================================
          MOBILE NAVIGATION DRAWER
          Slides in from left
          ====================================== */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay - closes drawer on click */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden animate-fade-in"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Drawer panel */}
          <aside 
            ref={drawerRef}
            id="mobile-drawer"
            className="
              fixed top-0 left-0 bottom-0 
              w-[85vw] max-w-xs
              bg-white 
              shadow-2xl 
              z-[101] 
              lg:hidden 
              overflow-y-auto
              overscroll-contain
              animate-slide-in-left
            "
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{ 
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drawer Header - 3-column grid for perfect centering */}
            <div className="sticky top-0 bg-white border-b border-[var(--border-light)] px-3 py-2.5 z-10">
              <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
                {/* Left placeholder - matches close button width for centering */}
                <div className="w-11 h-11" aria-hidden="true" />
                
                {/* Center - Logo (clickable, navigates home and closes drawer) */}
                <Link 
                  to="/" 
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)] focus-visible:ring-offset-2 rounded-lg"
                  aria-label="Salama Lama Home"
                >
                  <img
                    src="/logo-salama-lama.jpg"
                    alt="Salama Lama"
                    className="max-h-10 w-auto object-contain"
                  />
                </Link>
                
                {/* Right - Close button */}
                <button
                  onClick={closeMobileMenu}
                  className="
                    flex items-center justify-center 
                    w-11 h-11 
                    text-[var(--primary-text)] 
                    hover:bg-[var(--primary-bg)] 
                    rounded-xl 
                    transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-text)]
                  "
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
            
            {/* Drawer Content */}
            <div className="px-4 py-5 space-y-5">
              
              {/* User Info Card (authenticated users) */}
              {isAuthenticated && (
                <div className="p-4 bg-gradient-to-br from-[var(--primary-bg)] to-[var(--accent-color)]/50 rounded-2xl border border-[var(--border-light)]">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-[var(--btn-bg)] rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-[var(--btn-text)]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-base text-[var(--primary-text)] truncate">
                        {userDisplayName}
                      </p>
                      {!isGuest && currentUser?.email && (
                        <p className="text-sm text-[var(--primary-text)]/70 truncate">
                          {currentUser.email}
                        </p>
                      )}
                      {isGuest && (
                        <p className="text-sm text-[var(--primary-text)]/70">
                          Guest checkout
                        </p>
                      )}
                      {loyaltyData && loyaltyData.current_points_balance > 0 && (
                        <p className="text-sm text-amber-700 font-medium mt-1">
                          {loyaltyData.current_points_balance} loyalty points
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation Links */}
              <nav aria-label="Mobile navigation">
                <ul className="border border-[var(--border-light)] rounded-2xl divide-y divide-[var(--border-light)] overflow-hidden">
                  {/* Home link */}
                  <li>
                    <Link
                      to="/"
                      onClick={closeMobileMenu}
                      className={`
                        flex items-center justify-between 
                        px-4 py-4 
                        text-base font-medium 
                        transition-colors min-h-[3.25rem]
                        ${isActivePath('/')
                          ? 'bg-[var(--primary-bg)] text-amber-700'
                          : 'text-[var(--primary-text)] hover:bg-[var(--primary-bg)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Home className="h-5 w-5 opacity-60" aria-hidden="true" />
                        <span>Home</span>
                      </div>
                      <ChevronRight className="h-5 w-5 opacity-40" aria-hidden="true" />
                    </Link>
                  </li>
                  
                  {/* Main nav links */}
                  {NAVIGATION_LINKS.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        onClick={closeMobileMenu}
                        className={`
                          flex items-center justify-between 
                          px-4 py-4 
                          text-base font-medium 
                          transition-colors min-h-[3.25rem]
                          ${isActivePath(link.path)
                            ? 'bg-[var(--primary-bg)] text-amber-700'
                            : 'text-[var(--primary-text)] hover:bg-[var(--primary-bg)]'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 opacity-60" aria-hidden="true" />
                          <span>{link.label}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 opacity-40" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  
                  {/* View Cart (if items) */}
                  {cartItemCount > 0 && (
                    <li>
                      <Link
                        to="/cart"
                        onClick={closeMobileMenu}
                        className="
                          flex items-center justify-between 
                          px-4 py-4 
                          text-base font-medium 
                          text-[var(--primary-text)] 
                          hover:bg-[var(--primary-bg)] 
                          transition-colors min-h-[3.25rem]
                        "
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="h-5 w-5 opacity-60" aria-hidden="true" />
                          <span>View Cart</span>
                          <span className="bg-red-600 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                            {cartItemCount}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 opacity-40" aria-hidden="true" />
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
                          className="
                            flex items-center justify-center 
                            w-full 
                            px-6 py-3.5 
                            border-2 border-[var(--primary-text)] 
                            text-base font-semibold 
                            rounded-full 
                            text-[var(--primary-text)] 
                            bg-white 
                            hover:bg-[var(--primary-bg)] 
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                            transition-all duration-200
                          "
                        >
                          My Account
                        </Link>
                        
                        <Link
                          to="/orders"
                          onClick={closeMobileMenu}
                          className="
                            flex items-center justify-center 
                            w-full 
                            px-6 py-3.5 
                            border-2 border-[var(--primary-text)] 
                            text-base font-semibold 
                            rounded-full 
                            text-[var(--primary-text)] 
                            bg-white 
                            hover:bg-[var(--primary-bg)] 
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                            transition-all duration-200
                          "
                        >
                          My Orders
                        </Link>
                      </>
                    )}
                    
                    {isGuest && (
                      <Link
                        to="/checkout/order-type"
                        onClick={closeMobileMenu}
                        className="
                          flex items-center justify-center 
                          w-full 
                          px-6 py-3.5 
                          border-2 border-[var(--primary-text)] 
                          text-base font-semibold 
                          rounded-full 
                          text-[var(--primary-text)] 
                          bg-white 
                          hover:bg-[var(--primary-bg)] 
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                          transition-all duration-200
                        "
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
                      className="
                        flex items-center justify-center gap-2 
                        w-full 
                        px-6 py-3.5 
                        text-base font-bold 
                        rounded-full 
                        text-[var(--btn-text)] 
                        bg-[var(--btn-bg)] 
                        hover:bg-[#1A0F0D] 
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                        transition-all duration-200 
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      <LogOut className="h-5 w-5" aria-hidden="true" />
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Log In and Sign Up moved to drawer for mobile */}
                    <Link
                      to="/login"
                      onClick={closeMobileMenu}
                      className="
                        flex items-center justify-center 
                        w-full 
                        px-6 py-3.5 
                        border-2 border-[var(--primary-text)] 
                        text-base font-semibold 
                        rounded-full 
                        text-[var(--primary-text)] 
                        bg-white 
                        hover:bg-[var(--primary-bg)] 
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                        transition-all duration-200
                      "
                    >
                      Log In
                    </Link>
                    
                    <Link
                      to="/signup"
                      onClick={closeMobileMenu}
                      className="
                        flex items-center justify-center 
                        w-full 
                        px-6 py-3.5 
                        text-base font-bold 
                        rounded-full 
                        text-[var(--btn-text)] 
                        bg-[var(--btn-bg)] 
                        hover:bg-[#1A0F0D] hover:shadow-lg 
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 
                        transition-all duration-200
                      "
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
        @keyframes slide-in-left {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        /* Ensure header never causes horizontal scroll */
        .site-header {
          overflow-x: hidden;
        }
      `}</style>
    </>
  );
};

export default GV_SiteHeader;
