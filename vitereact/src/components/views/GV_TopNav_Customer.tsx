import React, { useState, useEffect } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const businessSettings = useAppStore(state => state.business_settings);
  const logoUrl = businessSettings.business_info.logo_url || '/assets/salama-lama-logo.png';
  
  // ===========================
  // Derived State
  // ===========================
  
  const userDisplayName = currentUser?.first_name || 'Customer';
  const cartItemCount = cartItems.length;
  
  // ===========================
  // Local UI State
  // ===========================
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
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
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  // ===========================
  // Escape Key Handler
  // ===========================
  
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
      <nav className="sticky top-0 left-0 right-0 bg-[#F2EFE9] shadow-md border-b border-gray-200 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between h-16">
            {/* Left: Hamburger Menu */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-[#2E211D] hover:text-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Center: Logo */}
            <Link 
              to="/"
              className="flex items-center group"
              aria-label="Salama Lama Home"
            >
              <img 
                src={logoUrl} 
                alt="Salama Lama" 
                className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                onError={(e) => { 
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/assets/salama-lama-logo.png') {
                    target.src = '/assets/salama-lama-logo.png';
                  }
                }}
              />
            </Link>
            
            {/* Right: Cart Icon */}
            <Link
              to="/cart"
              className="relative p-2 text-[#2E211D] hover:text-orange-600 transition-colors rounded-lg"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
          
          {/* Desktop Header */}
          <div className="hidden md:flex items-center h-16 relative">
            
            {/* Left Section: Desktop Nav Links */}
            <div className="flex items-center gap-6">
              <Link
                to="/menu"
                className="text-gray-700 hover:text-orange-600 text-sm font-medium transition-colors"
              >
                Menu
              </Link>
              <Link
                to="/catering"
                className="text-gray-700 hover:text-orange-600 text-sm font-medium transition-colors"
              >
                Catering
              </Link>
              <Link
                to="/about"
                className="text-gray-700 hover:text-orange-600 text-sm font-medium transition-colors"
              >
                About
              </Link>
            </div>
            
            {/* Center: Logo - Absolutely Centered */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Link 
                to="/"
                className="flex items-center group"
                aria-label="Salama Lama Home"
              >
                <img 
                  src={logoUrl} 
                  alt="Salama Lama" 
                  className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/assets/salama-lama-logo.png') {
                      target.src = '/assets/salama-lama-logo.png';
                    }
                  }}
                />
              </Link>
            </div>
            
            {/* Right Section: Cart, Profile */}
            <div className="flex items-center gap-3 ml-auto">
              
              {/* Loyalty Points Badge (Desktop) */}
              <Link
                to="/rewards"
                className="hidden md:flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Award className="h-4 w-4" />
                <span className="font-bold text-sm">{loyaltyPointsBalance}</span>
                <span className="text-xs font-medium">pts</span>
              </Link>
              
              {/* Cart Icon with Badge */}
              <Link
                to="/cart"
                className="relative p-2 text-[#2E211D] hover:text-orange-600 transition-colors rounded-lg"
                aria-label="Shopping cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                    {cartItemCount}
                  </span>
                )}
              </Link>
              
              {/* Profile Dropdown (Desktop) */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm data-[state=open]:bg-gray-50"
                      aria-label="User profile menu"
                    >
                      <User className="h-4 w-4" />
                      <span>{userDisplayName}</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent 
                    align="end" 
                    sideOffset={8}
                    className="w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2"
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        <Home className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        <User className="h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link
                        to="/orders"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        <Package className="h-4 w-4" />
                        <span>My Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link
                        to="/addresses"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>Saved Addresses</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link
                        to="/payment-methods"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Payment Methods</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="my-2 bg-gray-200" />
                    
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
            
            {/* Off-Canvas Mobile Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#F2EFE9] shadow-2xl z-50 md:hidden overflow-y-auto animate-slideInRight">
              <div className="p-6">
                {/* Close Button - Top Right Corner */}
                <div className="flex items-center justify-end mb-8">
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 text-[#2E211D] hover:text-[#1a0f0d] hover:bg-[#E8E1D6] rounded-lg transition-all duration-200"
                    style={{ minHeight: '48px', minWidth: '48px' }}
                    aria-label="Close mobile menu"
                  >
                    <X className="h-7 w-7" strokeWidth={2.5} />
                  </button>
                </div>
                
                {/* User Info */}
                <div className="mb-8 p-5 bg-[#E8E1D6] rounded-xl" style={{ marginBottom: '16px' }}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-14 w-14 bg-[#2E211D] rounded-full flex items-center justify-center">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-[#2E211D]">{userDisplayName}</p>
                      <p className="text-sm text-[#4A3B32]">{currentUser?.email}</p>
                    </div>
                  </div>
                  
                  {/* Loyalty Points Badge (Mobile) */}
                  <Link
                    to="/rewards"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between p-4 bg-[#2E211D] text-white rounded-xl hover:bg-[#1a0f0d] transition-all duration-200 shadow-lg"
                    style={{ minHeight: '64px' }}
                  >
                    <div className="flex items-center space-x-3">
                      <Award className="h-6 w-6" />
                      <span className="font-bold text-base">Loyalty Points</span>
                    </div>
                    <span className="text-2xl font-bold">{loyaltyPointsBalance}</span>
                  </Link>
                </div>
                
                {/* Navigation Links - Bold Dark Brown with Large Padding */}
                <nav className="space-y-3 mb-8">
                  <Link
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-5 text-[#2E211D] hover:bg-[#E8E1D6] rounded-xl transition-colors font-bold text-xl"
                    style={{ minHeight: '64px' }}
                  >
                    <Home className="h-6 w-6" />
                    <span>Dashboard</span>
                  </Link>
                  
                  <Link
                    to="/menu"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-5 text-[#2E211D] hover:bg-[#E8E1D6] rounded-xl transition-colors font-bold text-xl"
                    style={{ minHeight: '64px' }}
                  >
                    <Utensils className="h-6 w-6" />
                    <span>Menu</span>
                  </Link>
                  
                  <Link
                    to="/orders"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-5 text-[#2E211D] hover:bg-[#E8E1D6] rounded-xl transition-colors font-bold text-xl"
                    style={{ minHeight: '64px' }}
                  >
                    <Package className="h-6 w-6" />
                    <span>My Orders</span>
                  </Link>
                  
                  <Link
                    to="/rewards"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-5 text-[#2E211D] hover:bg-[#E8E1D6] rounded-xl transition-colors font-bold text-xl"
                    style={{ minHeight: '64px' }}
                  >
                    <Gift className="h-6 w-6" />
                    <span>Rewards</span>
                  </Link>
                  
                  <Link
                    to="/catering"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-4 px-6 py-5 text-[#2E211D] hover:bg-[#E8E1D6] rounded-xl transition-colors font-bold text-xl"
                    style={{ minHeight: '64px' }}
                  >
                    <Utensils className="h-6 w-6" />
                    <span>Catering</span>
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
      
      {/* No spacer needed for sticky navbar */}
      
      {/* Logo size consistency */}
      <style>{`
        nav img[alt="Salama Lama"] {
          max-height: 40px !important;
          width: auto !important;
          object-fit: contain !important;
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
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default GV_TopNav_Customer;