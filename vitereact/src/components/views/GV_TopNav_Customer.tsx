import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Menu, 
  X, 
  User, 
  ShoppingCart, 
  Award, 
  LogOut,
  Home,
  Package,
  MapPin,
  CreditCard,
  ChevronDown,
  Utensils,
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
// Main Component
// ===========================

const GV_TopNav_Customer: React.FC = () => {
  const navigate = useNavigate();
  
  // ===========================
  // Global State (Individual Selectors - CRITICAL)
  // ===========================
  
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const cartItems = useAppStore(state => state.cart_state.items);
  const logoutUser = useAppStore(state => state.logout_user);
  
  // ===========================
  // Derived State
  // ===========================
  
  const userDisplayName = currentUser?.first_name || 'Customer';
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
  // React Query - Loyalty Points
  // ===========================
  
  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty', currentUser?.user_id],
    queryFn: () => fetchLoyaltyAccount(authToken!),
    enabled: !!authToken && !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  const loyaltyPointsBalance = loyaltyData?.current_points_balance || 0;
  
  // ===========================
  // Event Handlers
  // ===========================
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      navigate('/');
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
  
  // ===========================
  // Click Outside Handler
  // ===========================
  
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
  
  // ===========================
  // Escape Key Handler
  // ===========================
  
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F2EFE9] shadow-md backdrop-blur-md transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* COMMANDMENT #2: Mobile Logo Centered, Hamburger Right */}
          <div className="flex items-center justify-between h-16 md:h-20">
            
            {/* Left Section: Logo & Desktop Nav Links */}
            <div className="flex items-center space-x-8 md:static absolute left-1/2 md:left-0 transform -translate-x-1/2 md:transform-none z-10">
              {/* Logo - Centered on Mobile, Left on Desktop */}
              <Link 
                to="/"
                className="flex items-center group"
                aria-label="Salama Lama Home"
              >
                <img 
                  src="/assets/salama-lama-logo.png" 
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
              
              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center space-x-6">
                <Link
                  to="/menu"
                  className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Menu
                </Link>
                <Link
                  to="/orders"
                  className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  My Orders
                </Link>
                <Link
                  to="/rewards"
                  className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Rewards
                </Link>
                <Link
                  to="/catering"
                  className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Catering
                </Link>
              </div>
            </div>
            
            {/* Right Section: Loyalty Badge, Cart, Profile, Mobile Menu Button */}
            <div className="flex items-center space-x-2 md:space-x-4 z-20">
              
              {/* Loyalty Points Badge (Desktop) - COMMANDMENT #1: 48px min */}
              <Link
                to="/rewards"
                className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-3 rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{ minHeight: '48px' }}
              >
                <Award className="h-5 w-5" />
                <span className="font-bold">{loyaltyPointsBalance}</span>
                <span className="text-sm font-medium">pts</span>
              </Link>
              
              {/* Cart Icon with Badge - COMMANDMENT #1: 48px min */}
              <Link
                to="/cart"
                className="relative p-3 text-gray-700 hover:text-orange-600 transition-colors rounded-lg"
                style={{ minHeight: '48px', minWidth: '48px' }}
                aria-label="Shopping cart"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {cartItemCount}
                  </span>
                )}
              </Link>
              
              {/* Profile Dropdown (Desktop) */}
              <div className="hidden md:block relative" ref={profileDropdownRef}>
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-md px-3 py-2"
                  aria-label="User profile menu"
                  aria-expanded={isProfileDropdownOpen}
                >
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="font-medium">{userDisplayName}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn">
                    <Link
                      to="/dashboard"
                      onClick={closeProfileDropdown}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <Home className="h-5 w-5" />
                      <span className="font-medium">Dashboard</span>
                    </Link>
                    
                    <Link
                      to="/profile"
                      onClick={closeProfileDropdown}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <User className="h-5 w-5" />
                      <span className="font-medium">My Profile</span>
                    </Link>
                    
                    <Link
                      to="/orders"
                      onClick={closeProfileDropdown}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <Package className="h-5 w-5" />
                      <span className="font-medium">My Orders</span>
                    </Link>
                    
                    <Link
                      to="/addresses"
                      onClick={closeProfileDropdown}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <MapPin className="h-5 w-5" />
                      <span className="font-medium">Saved Addresses</span>
                    </Link>
                    
                    <Link
                      to="/payment-methods"
                      onClick={closeProfileDropdown}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Payment Methods</span>
                    </Link>
                    
                    <div className="border-t border-gray-200 my-2"></div>
                    
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* COMMANDMENT #2: Hamburger Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-3 text-gray-700 hover:text-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
                style={{ minHeight: '48px', minWidth: '48px' }}
                aria-label="Toggle mobile menu"
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
        
        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={closeMobileMenu}
            ></div>
            
            {/* COMMANDMENT #2: Full-Screen Mobile Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-full bg-white shadow-2xl z-50 md:hidden overflow-y-auto animate-slideInRight">
              <div className="p-6">
                {/* Close Button - COMMANDMENT #1: 48px min */}
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Menu</h2>
                  <button
                    onClick={closeMobileMenu}
                    className="p-3 text-gray-500 hover:text-gray-700 transition-colors rounded-lg"
                    style={{ minHeight: '48px', minWidth: '48px' }}
                    aria-label="Close mobile menu"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>
                
                {/* User Info - COMMANDMENT #1: 16px spacing */}
                <div className="mb-8 p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl" style={{ marginBottom: '16px' }}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-14 w-14 bg-orange-500 rounded-full flex items-center justify-center">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">{userDisplayName}</p>
                      <p className="text-sm text-gray-600">{currentUser?.email}</p>
                    </div>
                  </div>
                  
                  {/* Loyalty Points Badge (Mobile) - COMMANDMENT #1: 48px min */}
                  <Link
                    to="/rewards"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
                    style={{ minHeight: '64px' }}
                  >
                    <div className="flex items-center space-x-3">
                      <Award className="h-6 w-6" />
                      <span className="font-bold text-base">Loyalty Points</span>
                    </div>
                    <span className="text-2xl font-bold">{loyaltyPointsBalance}</span>
                  </Link>
                </div>
                
                {/* Navigation Links - COMMANDMENT #1: Large Touch Targets */}
                <nav className="space-y-2 mb-8">
                  <Link
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <Home className="h-6 w-6" />
                    <span className="font-semibold text-lg">Dashboard</span>
                  </Link>
                  
                  <Link
                    to="/menu"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <Utensils className="h-6 w-6" />
                    <span className="font-semibold text-lg">Menu</span>
                  </Link>
                  
                  <Link
                    to="/orders"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <Package className="h-6 w-6" />
                    <span className="font-semibold text-lg">My Orders</span>
                  </Link>
                  
                  <Link
                    to="/rewards"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <Gift className="h-6 w-6" />
                    <span className="font-semibold text-lg">Rewards</span>
                  </Link>
                  
                  <Link
                    to="/catering"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <Utensils className="h-6 w-6" />
                    <span className="font-semibold text-lg">Catering</span>
                  </Link>
                </nav>
                
                {/* COMMANDMENT #1: 16px spacing, large touch targets */}
                <div className="border-t-2 border-gray-200 pt-6 space-y-2" style={{ paddingTop: '16px' }}>
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <User className="h-6 w-6" />
                    <span className="font-semibold text-lg">My Profile</span>
                  </Link>
                  
                  <Link
                    to="/addresses"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <MapPin className="h-6 w-6" />
                    <span className="font-semibold text-lg">Saved Addresses</span>
                  </Link>
                  
                  <Link
                    to="/payment-methods"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="font-semibold text-lg">Payment Methods</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center space-x-4 px-6 py-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ minHeight: '64px' }}
                  >
                    <LogOut className="h-6 w-6" />
                    <span className="font-bold text-lg">
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
      
      {/* Spacer to prevent content from hiding under fixed nav */}
      <div className="h-16 md:h-20"></div>
      
      {/* Responsive logo sizing */}
      <style>{`
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

export default GV_TopNav_Customer;