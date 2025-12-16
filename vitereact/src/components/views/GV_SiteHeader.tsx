import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { MobileDrawer } from '@/components/ui/mobile-drawer';
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
  const [hasShadow, setHasShadow] = useState(false);
  
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
    { path: '/track-order', label: 'Track Order' },
    { path: '/contact', label: 'Contact' },
    { path: '/faqs', label: 'FAQs' },
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
  
  // Handle scroll for shadow effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setHasShadow(true);
      } else {
        setHasShadow(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
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
      {/* Main Navigation Bar - Floating container with 20px top margin */}
      <nav 
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
          hasShadow 
            ? 'top-3 md:top-5' 
            : 'top-3 md:top-5'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-200 ${
            hasShadow 
              ? 'bg-[rgba(245,240,235,0.7)] backdrop-blur-xl shadow-xl' 
              : 'bg-[rgba(245,240,235,0.7)] shadow-md'
          }`}
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(62, 47, 38, 0.1)',
            borderRadius: '100px'
          }}>
          {/* ======================================
              MOBILE HEADER - flex md:hidden
              ====================================== */}
          <div className="flex md:hidden items-center h-14 py-2 px-4">
            <div className="flex items-center justify-between w-full gap-3">
              {/* Left: Cart Icon */}
              <Link
                to="/cart"
                className="relative flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                aria-label={`Shopping cart with ${cartItemCount} items`}
              >
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Center: Brand Logo - Real logo with fallback only on error */}
              <Link 
                to="/"
                className="flex items-center justify-center group flex-1"
                aria-label="Salama Lama Home"
              >
                <img
                  src="/brand/salama-lama-logo.png"
                  alt="Salama Lama"
                  loading="eager"
                  className="h-7 w-auto max-w-[140px] object-contain transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    // Only show SL fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="hidden items-center justify-center bg-[#D97706] text-white font-bold rounded-full w-8 h-8 text-xs"
                  title="Salama Lama"
                >
                  SL
                </div>
              </Link>
              
              {/* Right: Account Icon (if not authenticated) or Hamburger Menu */}
              <div className="flex items-center gap-2">
                {/* Show Account Icon for non-authenticated users */}
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                    aria-label="Account - Log In or Sign Up"
                  >
                    <User className="h-6 w-6" />
                  </Link>
                )}
                
                {/* Hamburger Menu */}
                <button
                  onClick={toggleMobileMenu}
                  className="flex items-center justify-center w-10 h-10 text-[#2C1A16] hover:text-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg transition-colors duration-200"
                  aria-label="Toggle navigation menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* ======================================
              DESKTOP HEADER - hidden md:flex
              ====================================== */}
          <div className="hidden md:flex items-center justify-between h-20 px-6" style={{ flexWrap: 'nowrap' }}>
            
            {/* Left Section: Navigation Links (Menu, Catering, About) */}
            <div className="flex items-center space-x-8" style={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
              {navigationLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-base font-medium transition-all duration-200 pb-1 whitespace-nowrap ${
                    isActivePath(link.path)
                      ? 'text-[#D97706] border-b-2 border-[#D97706]'
                      : 'text-[#2C1A16] hover:text-[#D97706]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Center Section: Logo */}
            <div className="flex-shrink-0 absolute left-1/2 transform -translate-x-1/2">
              <Link 
                to="/"
                className="flex items-center group"
                aria-label="Salama Lama Home"
              >
                <BrandLogo variant="header" />
              </Link>
            </div>
            
            {/* Right Section: Cart + Account (Authenticated) OR Cart + Login/Signup (Not Authenticated) */}
            <div className="flex items-center gap-4" style={{ flexWrap: 'nowrap' }}>
              
              {/* Cart Button with Badge */}
              <Link
                to="/cart"
                className="relative p-3 text-[#2C1A16] hover:text-[#D97706] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg"
                style={{ minHeight: '48px', minWidth: '48px' }}
                aria-label={`Shopping cart with ${cartItemCount} items`}
              >
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                    {getCartBadgeDisplay()}
                  </span>
                )}
              </Link>
              
              {/* Authenticated Users: Account Dropdown */}
              {isAuthenticated && !isGuest && (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2C1A16] bg-white border-2 border-[#2C1A16] rounded-lg hover:bg-[#F5F0EB] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Account Menu"
                    aria-expanded={isProfileDropdownOpen}
                  >
                    <User className="h-4 w-4" />
                    <span>Account</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn">
                      <Link
                        to="/orders"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#2C1A16] hover:bg-[#F5F0EB] transition-colors"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>My Orders / Tickets</span>
                      </Link>
                      
                      <Link
                        to="/dashboard"
                        onClick={closeProfileDropdown}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#2C1A16] hover:bg-[#F5F0EB] transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                      
                      <div className="border-t border-gray-200 my-2" />
                      
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
                  {/* Log In Button - Secondary Style */}
                  <Link
                    to="/login"
                    className="px-5 py-2 text-sm font-semibold text-[#2C1A16] bg-white border-2 border-[#2C1A16] rounded-lg hover:bg-[#F5F0EB] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Log In"
                  >
                    Log In
                  </Link>
                  
                  {/* Sign Up Button - Primary Style */}
                  <Link
                    to="/signup"
                    className="px-5 py-2 text-sm font-bold text-white bg-[#2C1A16] rounded-lg hover:bg-[#1A0F0D] hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 shadow-sm whitespace-nowrap"
                    aria-label="Sign Up"
                  >
                    Sign Up
                  </Link>
                </>
              )}
              
            </div>
          </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Drawer - Hidden on Desktop */}
      {isMobileMenuOpen && (
        <MobileDrawer
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
          title="Menu"
          className="md:hidden"
        >
          <div className="space-y-6">
          {/* User Info Card */}
          {isAuthenticated && (
            <div className="p-4 bg-gradient-to-br from-[var(--primary-bg)] to-[var(--accent-color)] rounded-[var(--radius-card)] border border-[var(--border-light)]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-[var(--btn-bg)] rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-base text-[var(--primary-text)] truncate">
                    {userDisplayName}
                  </p>
                  {/* Only show email for non-guest users */}
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
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Links - Clean List */}
          <div className="border border-[var(--border-light)] rounded-[var(--radius-card)] divide-y divide-[var(--border-light)] overflow-hidden">
            {navigationLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeMobileMenu}
                className={`
                  flex items-center justify-between px-4 py-3.5
                  text-base font-medium
                  transition-colors
                  ${isActivePath(link.path)
                    ? 'bg-[var(--primary-bg)] text-[var(--btn-bg)]'
                    : 'text-[var(--primary-text)] hover:bg-[var(--primary-bg)]'
                  }
                `}
                style={{ minHeight: '52px' }}
              >
                <span>{link.label}</span>
                <ChevronRight className="h-5 w-5 opacity-40" />
              </Link>
            ))}
            
            {/* View Cart Row (only if cart has items) */}
            {cartItemCount > 0 && (
              <Link
                to="/cart"
                onClick={closeMobileMenu}
                className="flex items-center justify-between px-4 py-3.5 text-base font-medium text-[var(--primary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                style={{ minHeight: '52px' }}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>View Cart</span>
                  <span className="bg-[var(--btn-bg)] text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 opacity-40" />
              </Link>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {isAuthenticated ? (
              <>
                {isCustomer && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[var(--primary-text)] text-base font-semibold rounded-[var(--radius-btn)] text-[var(--primary-text)] bg-white hover:bg-[var(--primary-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all duration-200"
                      style={{ minHeight: 'var(--tap-target-comfortable)' }}
                    >
                      My Account
                    </Link>
                    
                    <Link
                      to="/orders"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[var(--primary-text)] text-base font-semibold rounded-[var(--radius-btn)] text-[var(--primary-text)] bg-white hover:bg-[var(--primary-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all duration-200"
                      style={{ minHeight: 'var(--tap-target-comfortable)' }}
                    >
                      My Orders
                    </Link>
                  </>
                )}
                
                {isGuest && (
                  <Link
                    to="/checkout/order-type"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[var(--primary-text)] text-base font-semibold rounded-[var(--radius-btn)] text-[var(--primary-text)] bg-white hover:bg-[var(--primary-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all duration-200"
                    style={{ minHeight: 'var(--tap-target-comfortable)' }}
                  >
                    Continue Ordering
                  </Link>
                )}
                
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-transparent text-base font-bold rounded-[var(--radius-btn)] text-white bg-[var(--btn-bg)] hover:bg-[#1A0F0D] focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: 'var(--tap-target-comfortable)' }}
                >
                  {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-6 py-3.5 border-2 border-[var(--primary-text)] text-base font-semibold rounded-[var(--radius-btn)] text-[var(--primary-text)] bg-white hover:bg-[var(--primary-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all duration-200"
                  style={{ minHeight: 'var(--tap-target-comfortable)' }}
                >
                  Log In
                </Link>
                
                <Link
                  to="/signup"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center w-full px-6 py-3.5 text-base font-bold rounded-[var(--radius-btn)] text-white bg-[var(--btn-bg)] hover:bg-[#1A0F0D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all duration-200"
                  style={{ minHeight: 'var(--tap-target-comfortable)' }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
        </MobileDrawer>
      )}
      
      {/* Spacer to prevent content from going under floating navbar */}
      <div className="h-[68px] md:h-[108px]" aria-hidden="true" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />
      
      {/* Custom Animation Styles */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        /* Responsive logo sizing */
        nav img[alt="Salama Lama"] {
          height: 28px;
          width: auto;
          max-width: 140px;
          object-fit: contain;
        }
        
        @media (min-width: 640px) {
          nav img[alt="Salama Lama"] {
            height: 30px;
            max-width: 150px;
          }
        }
        
        @media (min-width: 768px) {
          nav img[alt="Salama Lama"] {
            height: 36px;
            max-width: 180px;
          }
        }
        
        /* Mobile header optimization */
        @media (max-width: 767px) {
          nav {
            min-height: 56px;
          }
        }
      `}</style>
    </>
  );
};

export default GV_SiteHeader;
