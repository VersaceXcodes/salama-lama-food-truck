import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Bell, Package, ShoppingCart, User, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ===========================
// Types & Interfaces
// ===========================

interface StaffNotification {
  notification_id: string;
  type: 'low_stock_alert' | 'new_order' | 'order_update';
  message: string;
  created_at: string;
  item_id?: string;
  order_id?: string;
}

interface StaffDashboardResponse {
  total_orders_today: number;
  orders_in_progress: number;
  orders_completed_today: number;
  low_stock_items: Array<{
    item_id: string;
    name: string;
    current_stock: number;
    low_stock_threshold: number;
  }>;
}

// ===========================
// API Functions
// ===========================

const fetchStaffNotifications = async (token: string): Promise<StaffNotification[]> => {
  const response = await axios.get<StaffDashboardResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // Transform low stock items into notifications
  const notifications: StaffNotification[] = response.data.low_stock_items.map((item) => ({
    notification_id: `stock_${item.item_id}`,
    type: 'low_stock_alert',
    message: `${item.name} is running low (${item.current_stock} left)`,
    created_at: new Date().toISOString(),
    item_id: item.item_id,
  }));

  return notifications;
};

const logoutStaff = async (token: string): Promise<void> => {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

// ===========================
// Main Component
// ===========================

const GV_TopNav_Staff: React.FC = () => {
  const navigate = useNavigate();

  // ===========================
  // Zustand State (Individual Selectors)
  // ===========================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const logoutUser = useAppStore(state => state.logout_user);
  const businessSettings = useAppStore(state => state.business_settings);
  const logoUrl = businessSettings.business_info.logo_url || '/assets/salama-lama-logo.png';



  // ===========================
  // React Query - Fetch Notifications
  // ===========================
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['staff-notifications'],
    queryFn: () => fetchStaffNotifications(authToken || ''),
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds
    retry: 1,
  });

  // ===========================
  // Computed Values
  // ===========================
  const notificationCount = notifications.length;
  const staffName = currentUser?.first_name || 'Staff';

  // ===========================
  // Event Handlers
  // ===========================

  const handleLogout = async () => {
    try {
      if (authToken) {
        await logoutStaff(authToken);
      }
      // Clear global auth state
      await logoutUser();
      // Redirect to staff login
      navigate('/staff/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still log out locally even if API call fails
      await logoutUser();
      navigate('/staff/login');
    }
  };

  const handleNotificationItemClick = (notification: StaffNotification) => {
    if (notification.type === 'low_stock_alert' && notification.item_id) {
      navigate('/staff/stock');
    } else if (notification.order_id) {
      navigate(`/staff/orders/${notification.order_id}`);
    }
  };

  // ===========================
  // Render
  // ===========================

  return (
    <>
      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Left Section: Logo + Main Navigation */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link
                to="/staff/dashboard"
                className="flex items-center gap-2 group"
                aria-label="Salama Lama Staff Home"
              >
                <img 
                  src={logoUrl} 
                  alt="Salama Lama" 
                  className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                  style={{ filter: 'brightness(0) invert(1)' }}
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/assets/salama-lama-logo.png') {
                      target.src = '/assets/salama-lama-logo.png';
                    }
                  }}
                />
                <span className="hidden sm:inline text-white font-bold text-base">Staff</span>
              </Link>

              {/* Main Navigation Links */}
              <div className="hidden md:flex items-center space-x-2">
                <Link
                  to="/staff/orders"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium hover:bg-orange-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600"
                  aria-label="View Orders"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Orders</span>
                </Link>

                <Link
                  to="/staff/stock"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium hover:bg-orange-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600"
                  aria-label="View Stock"
                >
                  <Package className="h-5 w-5" />
                  <span>Stock</span>
                </Link>
              </div>
            </div>

            {/* Right Section: Notifications + Profile */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <DropdownMenu onOpenChange={(open) => open && refetchNotifications()}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative p-2 rounded-lg text-white hover:bg-orange-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600 data-[state=open]:bg-orange-800"
                    aria-label="Notifications"
                  >
                    <Bell className="h-6 w-6" />
                    {notificationCount > 0 && (
                      <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-600 rounded-full border-2 border-orange-700">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent 
                  align="end" 
                  sideOffset={8}
                  className="w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden py-0"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notifications ({notificationCount})
                    </h3>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="px-4 py-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No notifications</p>
                        <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <li key={notification.notification_id}>
                            <DropdownMenuItem
                              onClick={() => handleNotificationItemClick(notification)}
                              className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-start space-x-3">
                                {/* Icon */}
                                <div
                                  className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                                    notification.type === 'low_stock_alert'
                                      ? 'bg-yellow-500'
                                      : 'bg-blue-500'
                                  }`}
                                ></div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 font-medium">
                                    {notification.type === 'low_stock_alert'
                                      ? 'Low Stock Alert'
                                      : 'Order Update'}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(notification.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/staff/dashboard"
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium focus:outline-none focus:underline"
                        >
                          View Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Staff Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white hover:bg-orange-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600 data-[state=open]:bg-orange-800"
                    aria-label="Staff Profile Menu"
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">{staffName}</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent 
                  align="end" 
                  sideOffset={8}
                  className="w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden py-0"
                >
                  {/* User Info */}
                  <DropdownMenuLabel className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{staffName}</p>
                    <p className="text-xs text-gray-600 mt-1 font-normal">{currentUser?.email}</p>
                    <p className="text-xs text-gray-500 mt-1 capitalize font-normal">
                      {currentUser?.role || 'Staff'}
                    </p>
                  </DropdownMenuLabel>

                  {/* Menu Items */}
                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link
                        to="/staff/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <User className="h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        to="/staff/reports"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Package className="h-4 w-4" />
                        <span>Reports</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-gray-100" />

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Navigation Links */}
          <div className="md:hidden border-t border-orange-800 py-2">
            <div className="flex items-center space-x-2">
              <Link
                to="/staff/orders"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white text-sm font-medium hover:bg-orange-800 transition-all duration-200"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Orders</span>
              </Link>

              <Link
                to="/staff/stock"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white text-sm font-medium hover:bg-orange-800 transition-all duration-200"
              >
                <Package className="h-4 w-4" />
                <span>Stock</span>
              </Link>
            </div>
          </div>
        </div>
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

export default GV_TopNav_Staff;