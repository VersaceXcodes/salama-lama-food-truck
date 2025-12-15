import React, { useState, useEffect, useRef } from 'react';
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
      {/* Main Navigation Bar - Sticky at top */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          hasShadow 
            ? 'bg-[#F2EFE9]/95 backdrop-blur-md shadow-lg' 
            : 'bg-[#F2EFE9] shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            
            {/* Left Section: Logo (Centered on Mobile, Left on Desktop) */}
            <div className="flex-shrink-0 md:static absolute left-1/2 md:left-0 transform -translate-x-1/2 md:transform-none z-10">
              <Link 
                to="/"
                className="flex items-center group"
                aria-label="Salama Lama Home"
              >
                <img 
                  src="/salama-lama-logo.png" 
                  alt="Salama Lama" 
                  className="w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ height: '26px', maxWidth: '150px' }}
                  onError={(e) => { 
                    // Fallback to screen-reader-only text if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const textSpan = document.createElement('span');
                    textSpan.className = 'sr-only';
                    textSpan.textContent = 'Salama Lama';
                    target.parentElement?.appendChild(textSpan);
                  }}
                />
              </Link>
            </div>
            
            {/* Center Section: Desktop Navigation Links */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-base font-medium transition-all duration-200 pb-1 ${
                    isActivePath(link.path)
                      ? 'text-[#D97706] border-b-2 border-[#D97706]'
                      : 'text-[#2C1A16] hover:text-[#D97706]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Right Section: Cart, Profile/Auth, Mobile Menu */}
            <div className="flex items-center space-x-2 md:space-x-4 z-20">
              
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
              
              {/* Authenticated User - Desktop Profile Dropdown */}
              {isAuthenticated && (
                <div className="hidden md:block relative" ref={profileDropdownRef}>
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center space-x-2 text-[#2C1A16] hover:text-[#D97706] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg px-3 py-2"
                    style={{ minHeight: '48px' }}
                    aria-label="User profile menu"
                    aria-expanded={isProfileDropdownOpen}
                  >
                    <div className="h-8 w-8 bg-[#D4C5B0] rounded-full flex items-center justify-center border-2 border-[#2C1A16]">
                      <User className="h-5 w-5 text-[#2C1A16]" />
                    </div>
                    <span className="font-medium text-[#2C1A16]">{userDisplayName}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Desktop Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border-2 border-[#D4C5B0] py-2 z-50 animate-fadeIn">
                      {isCustomer && (
                        <>
                          <Link
                            to="/dashboard"
                            onClick={closeProfileDropdown}
                            className="flex items-center space-x-3 px-4 py-3 text-[#2C1A16] hover:bg-[#F2EFE9] hover:text-[#D97706] transition-colors"
                          >
                            <User className="h-5 w-5" />
                            <span className="font-medium">My Account</span>
                          </Link>
                          
                          <Link
                            to="/orders"
                            onClick={closeProfileDropdown}
                            className="flex items-center space-x-3 px-4 py-3 text-[#2C1A16] hover:bg-[#F2EFE9] hover:text-[#D97706] transition-colors"
                          >
                            <ShoppingCart className="h-5 w-5" />
                            <span className="font-medium">My Orders</span>
                          </Link>
                          
                          <div className="border-t border-[#D4C5B0] my-2"></div>
                        </>
                      )}
                      
                      {isGuest && (
                        <>
                          <Link
                            to="/checkout/order-type"
                            onClick={closeProfileDropdown}
                            className="flex items-center space-x-3 px-4 py-3 text-[#2C1A16] hover:bg-[#F2EFE9] hover:text-[#D97706] transition-colors"
                          >
                            <ShoppingCart className="h-5 w-5" />
                            <span className="font-medium">Continue Ordering</span>
                          </Link>
                          
                          <div className="border-t border-[#D4C5B0] my-2"></div>
                        </>
                      )}
                      
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-[#DC2626] hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">
                          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Guest/Unauthenticated - Desktop Auth Buttons */}
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="hidden md:inline-flex items-center px-6 py-3 border-2 border-[#2C1A16] text-base font-medium rounded-lg text-[#2C1A16] bg-white hover:bg-[#F2EFE9] hover:border-[#D97706] hover:text-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                    style={{ minHeight: '48px' }}
                  >
                    Log In
                  </Link>
                  
                  <Link
                    to="/signup"
                    className="hidden md:inline-flex items-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-[#D97706] hover:bg-[#B45309] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                    style={{ minHeight: '48px' }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
              
              {/* Mobile Menu Hamburger Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-3 text-[#2C1A16] hover:text-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 rounded-lg transition-colors duration-200"
                style={{ minHeight: '48px', minWidth: '48px' }}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-7 w-7" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
              </button>
              
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Mobile Drawer - Full Screen, Slides from Right */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-full z-50 md:hidden bg-white shadow-2xl overflow-y-auto animate-slideInRight">
            <div className="px-6 py-8 space-y-8">
              
              {/* Close Button */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#2C1A16]">Menu</h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-3 text-[#2C1A16] hover:text-[#D97706] rounded-lg"
                  style={{ minHeight: '48px', minWidth: '48px' }}
                  aria-label="Close navigation menu"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
              
              {/* User Info Section (if authenticated) */}
              {isAuthenticated && (
                <div className="p-5 bg-gradient-to-br from-[#F2EFE9] to-[#D4C5B0] rounded-xl border-2 border-[#2C1A16]/10">
                  <div className="flex items-center space-x-4">
                    <div className="h-14 w-14 bg-[#D97706] rounded-full flex items-center justify-center">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-[#2C1A16]">{userDisplayName}</p>
                      <p className="text-sm text-[#2C1A16]/70">{currentUser?.email}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mobile Navigation Links */}
              <div className="space-y-2">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 ${
                      isActivePath(link.path)
                        ? 'bg-[#F2EFE9] text-[#D97706]'
                        : 'text-[#2C1A16] hover:bg-[#F2EFE9]'
                    }`}
                    style={{ minHeight: '64px' }}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-6 w-6" />
                  </Link>
                ))}
              </div>
              
              {/* Divider */}
              <div className="border-t-2 border-[#D4C5B0]" />
              
              {/* Mobile Action Buttons */}
              <div className="space-y-4">
                {isAuthenticated ? (
                  <>
                    {isCustomer && (
                      <>
                        <Link
                          to="/dashboard"
                          onClick={closeMobileMenu}
                          className="flex items-center justify-center w-full px-8 py-4 border-2 border-[#2C1A16] text-lg font-semibold rounded-xl text-[#2C1A16] bg-white hover:bg-[#F2EFE9] focus:outline-none focus:ring-2 transition-all duration-200"
                          style={{ minHeight: '56px' }}
                        >
                          My Account
                        </Link>
                        
                        <Link
                          to="/orders"
                          onClick={closeMobileMenu}
                          className="flex items-center justify-center w-full px-8 py-4 border-2 border-[#2C1A16] text-lg font-semibold rounded-xl text-[#2C1A16] bg-white hover:bg-[#F2EFE9] focus:outline-none focus:ring-2 transition-all duration-200"
                          style={{ minHeight: '56px' }}
                        >
                          My Orders
                        </Link>
                      </>
                    )}
                    
                    {isGuest && (
                      <Link
                        to="/checkout/order-type"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-center w-full px-8 py-4 border-2 border-[#2C1A16] text-lg font-semibold rounded-xl text-[#2C1A16] bg-white hover:bg-[#F2EFE9] focus:outline-none focus:ring-2 transition-all duration-200"
                        style={{ minHeight: '56px' }}
                      >
                        Continue Ordering
                      </Link>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center justify-center w-full px-8 py-4 border-2 border-[#DC2626] text-lg font-bold rounded-xl text-[#DC2626] bg-white hover:bg-red-50 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ minHeight: '56px' }}
                    >
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center w-full px-8 py-4 border-2 border-[#2C1A16] text-lg font-semibold rounded-xl text-[#2C1A16] bg-white hover:bg-[#F2EFE9] focus:outline-none focus:ring-2 transition-all duration-200"
                      style={{ minHeight: '56px' }}
                    >
                      Log In
                    </Link>
                    
                    <Link
                      to="/signup"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center w-full px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-[#D97706] hover:bg-[#B45309] hover:shadow-lg focus:outline-none focus:ring-2 transition-all duration-200"
                      style={{ minHeight: '56px' }}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
              
              {/* Mobile Cart Summary (if items exist) */}
              {cartItemCount > 0 && (
                <>
                  <div className="border-t-2 border-[#D4C5B0]" />
                  
                  <Link
                    to="/cart"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F2EFE9] to-[#D4C5B0] rounded-xl hover:shadow-lg transition-all duration-200 border-2 border-[#2C1A16]/10"
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-[#D97706] text-white rounded-full p-3">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#2C1A16]">
                          Your Cart
                        </p>
                        <p className="text-sm text-[#2C1A16]/70">
                          {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-[#D97706]" />
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

export default GV_SiteHeader;
