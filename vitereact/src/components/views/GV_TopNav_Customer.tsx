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
          <div className="flex items-center justify-between h-16">
            
            {/* Left Section: Logo & Desktop Nav Links */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link 
                to="/dashboard"
                className="flex items-center group"
              >
                <img 
                  src="/logo-salama-lama.jpg" 
                  alt="Salama Lama Logo" 
                  className="h-[45px] md:h-[45px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ maxHeight: '45px' }}
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
            <div className="flex items-center space-x-4">
              
              {/* Loyalty Points Badge (Desktop) */}
              <Link
                to="/rewards"
                className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Award className="h-5 w-5" />
                <span className="font-semibold">{loyaltyPointsBalance}</span>
                <span className="text-sm">pts</span>
              </Link>
              
              {/* Cart Icon with Badge */}
              <Link
                to="/cart"
                className="relative p-2 text-gray-700 hover:text-orange-600 transition-colors"
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
              
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 text-gray-700 hover:text-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-md"
                aria-label="Toggle mobile menu"
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
        
        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={closeMobileMenu}
            ></div>
            
            {/* Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-80 max-w-full bg-white shadow-2xl z-50 md:hidden overflow-y-auto animate-slideInRight">
              <div className="p-6">
                {/* Close Button */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close mobile menu"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {/* User Info */}
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{userDisplayName}</p>
                      <p className="text-sm text-gray-600">{currentUser?.email}</p>
                    </div>
                  </div>
                  
                  {/* Loyalty Points Badge (Mobile) */}
                  <Link
                    to="/rewards"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span className="font-semibold">Loyalty Points</span>
                    </div>
                    <span className="text-lg font-bold">{loyaltyPointsBalance}</span>
                  </Link>
                </div>
                
                {/* Navigation Links */}
                <nav className="space-y-2 mb-6">
                  <Link
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                  >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                  
                  <Link
                    to="/menu"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                  >
                    <Utensils className="h-5 w-5" />
                    <span className="font-medium">Menu</span>
                  </Link>
                  
                  <Link
                    to="/orders"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                  >
                    <Package className="h-5 w-5" />
                    <span className="font-medium">My Orders</span>
                  </Link>
                  
                  <Link
                    to="/rewards"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                  >
                    <Gift className="h-5 w-5" />
                    <span className="font-medium">Rewards</span>
                  </Link>
                  
                  <Link
                    to="/catering"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                  >
                    <Utensils className="h-5 w-5" />
                    <span className="font-medium">Catering</span>
                  </Link>
                </nav>
                
                <div className="border-t border-gray-200 pt-6 space-y-2">
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">My Profile</span>
                  </Link>
                  
                  <Link
                    to="/addresses"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">Saved Addresses</span>
                  </Link>
                  
                  <Link
                    to="/payment-methods"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="font-medium">Payment Methods</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">
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
      <div className="h-16"></div>
    </>
  );
};

export default GV_TopNav_Customer;