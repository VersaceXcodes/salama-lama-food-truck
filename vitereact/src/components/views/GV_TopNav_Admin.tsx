import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Search, Bell, User, LogOut, Settings, ChevronDown, Menu, X, House } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface AdminNotification {
  notification_id: string;
  type: 'low_stock' | 'new_catering_inquiry' | 'system';
  message: string;
  created_at: string;
}

interface NotificationsData {
  notification_count: number;
  admin_notifications: AdminNotification[];
}

interface DashboardAlertsResponse {
  low_stock_items_count: number;
  new_catering_inquiries_count: number;
  low_stock_items: Array<{
    item_id: string;
    item_name: string;
    current_stock: number;
    low_stock_threshold: number;
  }>;
}

// ===========================
// Component Implementation
// ===========================

const GV_TopNav_Admin: React.FC = () => {
  // ===========================
  // Global State Access (Individual Selectors)
  // ===========================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const logoutUser = useAppStore(state => state.logout_user);
  const businessSettings = useAppStore(state => state.business_settings);
  const logoUrl = businessSettings.business_info.logo_url || '/assets/salama-lama-logo.png';

  // ===========================
  // Local State
  // ===========================
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ===========================
  // Refs for Click Outside Detection
  // ===========================
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // ===========================
  // Router Navigation
  // ===========================
  const navigate = useNavigate();

  // ===========================
  // API Base URL
  // ===========================
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // Fetch Admin Notifications
  // ===========================
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery<NotificationsData>({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const response = await axios.get<DashboardAlertsResponse>(
        `${API_BASE_URL}/api/admin/dashboard/alerts`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const alerts = response.data;
      const notifications: AdminNotification[] = [];

      // Transform low stock items into notifications
      if (alerts.low_stock_items && alerts.low_stock_items.length > 0) {
        alerts.low_stock_items.forEach(item => {
          notifications.push({
            notification_id: `stock_${item.item_id}`,
            type: 'low_stock',
            message: `${item.item_name} is low in stock (${item.current_stock} remaining)`,
            created_at: new Date().toISOString(),
          });
        });
      }

      // Add catering inquiry notifications
      if (alerts.new_catering_inquiries_count > 0) {
        notifications.push({
          notification_id: `catering_${Date.now()}`,
          type: 'new_catering_inquiry',
          message: `${alerts.new_catering_inquiries_count} new catering inquir${
            alerts.new_catering_inquiries_count === 1 ? 'y' : 'ies'
          }`,
          created_at: new Date().toISOString(),
        });
      }

      return {
        notification_count: notifications.length,
        admin_notifications: notifications,
      };
    },
    enabled: !!authToken,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    retry: 1,
  });

  // ===========================
  // Logout Handler
  // ===========================
  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      navigate('/admin/login');
    }
  };

  // ===========================
  // Click Outside Handler
  // ===========================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close search dropdown if click outside
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }

      // Close notifications dropdown if click outside
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }

      // Close profile dropdown if click outside
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ===========================
  // Search Handler
  // ===========================
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 0) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  };

  // ===========================
  // Get Admin First Name
  // ===========================
  const adminFirstName = currentUser?.first_name || 'Admin';

  // ===========================
  // Render Component
  // ===========================
  return (
    <>
      <nav className="sticky top-0 left-0 right-0 bg-[#F2EFE9] border-b border-gray-200 shadow-sm z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* ===========================
                Left Section - Logo/Brand
                =========================== */}
            <div className="flex items-center flex-shrink-0">
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-3 group"
                aria-label="Salama Lama Admin Home"
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
                <span className="hidden md:inline text-xs text-gray-600 font-medium">Admin Panel</span>
              </Link>
            </div>

            {/* ===========================
                Center Section - Global Search (Hidden on Mobile)
                =========================== */}
            <div className="hidden md:block flex-1 max-w-2xl mx-8 relative" ref={searchRef}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchQuery.length > 0) {
                      setIsSearchOpen(true);
                    }
                  }}
                  placeholder="Search orders, customers, menu items..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm transition-all"
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-96 overflow-y-auto z-50">
                  {searchQuery.length > 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 mb-1">Global search feature</p>
                      <p className="text-xs text-gray-400">
                        The search endpoint is not yet implemented.
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Will search across orders, customers, and menu items.
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-gray-500">
                      Type to search across all admin data...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ===========================
                Right Section - Notifications, Profile & Mobile Menu
                =========================== */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Notifications - Hidden on Mobile */}
              <div className="hidden md:block relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="Notifications"
                  style={{ minHeight: '48px', minWidth: '48px' }}
                >
                  <Bell className="h-6 w-6" />
                  {notificationsData && notificationsData.notification_count > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
                      {notificationsData.notification_count}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      {notificationsData && notificationsData.notification_count > 0 && (
                        <button
                          onClick={() => refetchNotifications()}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Refresh
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                        </div>
                      ) : notificationsError ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-sm text-red-600 mb-2">Failed to load notifications</p>
                          <button
                            onClick={() => refetchNotifications()}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : notificationsData && notificationsData.admin_notifications.length > 0 ? (
                        <>
                          {notificationsData.admin_notifications.map((notification) => (
                            <div
                              key={notification.notification_id}
                              className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                                    notification.type === 'low_stock'
                                      ? 'bg-yellow-500'
                                      : notification.type === 'new_catering_inquiry'
                                      ? 'bg-blue-500'
                                      : 'bg-gray-400'
                                  }`}
                                ></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900">{notification.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(notification.created_at).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="px-4 py-2 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                navigate('/admin/dashboard');
                              }}
                              className="text-sm text-orange-600 hover:text-orange-700 font-medium w-full text-center"
                            >
                              View Dashboard
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No new notifications</p>
                          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Profile Dropdown - Hidden on Mobile */}
              <div className="hidden md:block relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ minHeight: '48px' }}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline-block">
                    {adminFirstName}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                      isProfileOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">
                        {currentUser?.first_name} {currentUser?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/admin/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-500" />
                        Admin Settings
                      </Link>
                    </div>

                    <div className="border-t border-gray-200 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3 text-red-600" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button - Only on Mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            
            {/* Mobile Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-full bg-white shadow-2xl z-50 md:hidden overflow-y-auto animate-slideInRight">
              <div className="p-6">
                {/* Close Button */}
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Admin Menu</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-3 text-gray-500 hover:text-gray-700 transition-colors rounded-lg"
                    style={{ minHeight: '48px', minWidth: '48px' }}
                    aria-label="Close mobile menu"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>
                
                {/* User Info */}
                <div className="mb-8 p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="h-14 w-14 bg-orange-500 rounded-full flex items-center justify-center">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">{adminFirstName}</p>
                      <p className="text-sm text-gray-600">{currentUser?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Notifications Section */}
                {notificationsData && notificationsData.notification_count > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-gray-900">Notifications</span>
                      </div>
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                        {notificationsData.notification_count}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">You have {notificationsData.notification_count} unread notification{notificationsData.notification_count > 1 ? 's' : ''}</p>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="space-y-2 mb-8">
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <House className="h-6 w-6" />
                    <span className="font-semibold text-lg">Home</span>
                  </Link>
                  
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Dashboard</span>
                  </Link>
                  
                  <Link
                    to="/admin/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Orders</span>
                  </Link>
                  
                  <Link
                    to="/admin/menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Menu</span>
                  </Link>
                  
                  <Link
                    to="/admin/menu/categories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Categories</span>
                  </Link>
                  
                  <Link
                    to="/admin/stock"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Stock</span>
                  </Link>
                  
                  <Link
                    to="/admin/delivery"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Delivery</span>
                  </Link>
                  
                  <Link
                    to="/admin/discounts"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Discounts</span>
                  </Link>
                  
                  <Link
                    to="/admin/customers"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Customers</span>
                  </Link>
                  
                  <Link
                    to="/admin/staff"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Staff</span>
                  </Link>
                  
                  <Link
                    to="/admin/invoices"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Invoices</span>
                  </Link>
                  
                  <Link
                    to="/admin/analytics"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Analytics</span>
                  </Link>
                  
                  <Link
                    to="/admin/activity-logs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <span className="font-semibold text-lg">Activity Logs</span>
                  </Link>
                </nav>
                
                {/* Settings & Logout */}
                <div className="border-t-2 border-gray-200 pt-6 space-y-2">
                  <Link
                    to="/admin/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-4 px-6 py-4 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <Settings className="h-6 w-6" />
                    <span className="font-semibold text-lg">Settings</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-4 px-6 py-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <LogOut className="h-6 w-6" />
                    <span className="font-bold text-lg">Logout</span>
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
          max-height: 32px !important;
          width: auto !important;
          object-fit: contain !important;
        }
      `}</style>
    </>
  );
};

export default GV_TopNav_Admin;