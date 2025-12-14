import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Search, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';

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

  // ===========================
  // Local State
  // ===========================
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F2EFE9] border-b border-gray-200 shadow-sm backdrop-blur-md transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ===========================
                Left Section - Logo/Brand
                =========================== */}
            <div className="flex items-center flex-shrink-0">
              <Link
                to="/admin/dashboard"
                className="flex items-center space-x-3 group"
              >
                <img 
                  src="./logo.png" 
                  alt="Salama Lama Logo" 
                  height="50"
                  className="h-[45px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ height: '50px', width: 'auto' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-600 leading-none">Admin Panel</span>
                </div>
              </Link>
            </div>

            {/* ===========================
                Center Section - Global Search
                =========================== */}
            <div className="flex-1 max-w-2xl mx-8 relative" ref={searchRef}>
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
                Right Section - Notifications & Profile
                =========================== */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="Notifications"
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

              {/* Admin Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden under fixed navbar */}
      <div className="h-16"></div>
    </>
  );
};

export default GV_TopNav_Admin;