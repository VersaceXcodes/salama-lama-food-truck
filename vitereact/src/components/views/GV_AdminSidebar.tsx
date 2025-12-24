import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Package,
  Truck,
  Tag,
  Users,
  UserCog,
  FileText,
  BarChart3,
  Settings,
  Activity,
  Menu,
  X,
  House,
  Mail,
  Bell,
  LogOut,
  Layers
} from 'lucide-react';

// Fallback logo path - served from public_assets directory
const LOGO_FALLBACK_PATH = '/logo.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface NotificationSummary {
  contact_new_count: number;
  catering_new_count: number;
  orders_pending_count: number;
  total_new: number;
}

// Stable logo component with fallback - memoized to prevent re-renders
const SidebarLogo = memo(({ 
  logoUrl, 
  className = "h-8 w-auto object-contain",
  showLabel = true 
}: { 
  logoUrl: string | null | undefined; 
  className?: string;
  showLabel?: boolean;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine the effective logo URL - use fallback for invalid paths
  const effectiveLogoUrl = useMemo(() => {
    if (!logoUrl || logoUrl === '/assets/salama-lama-logo.png' || logoUrl.includes('undefined')) {
      return LOGO_FALLBACK_PATH;
    }
    return logoUrl;
  }, [logoUrl]);

  // Reset error state when URL changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [effectiveLogoUrl]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Brand initials fallback component
  const BrandFallback = () => (
    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white font-bold text-sm shadow-sm flex-shrink-0">
      SL
    </div>
  );

  return (
    <div className="flex items-center gap-3 min-h-[32px]">
      {/* Fixed-size container to prevent layout shift */}
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        {hasError ? (
          <BrandFallback />
        ) : (
          <>
            {/* Placeholder while loading - same size as logo */}
            {!isLoaded && (
              <div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
            )}
            <img 
              src={effectiveLogoUrl}
              alt="Salama Lama" 
              className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
              style={{ maxHeight: '32px' }}
              onError={handleError}
              onLoad={handleLoad}
              loading="eager"
              decoding="async"
            />
          </>
        )}
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-300 hidden sm:inline whitespace-nowrap">Admin</span>
      )}
    </div>
  );
});

SidebarLogo.displayName = 'SidebarLogo';

const GV_AdminSidebar: React.FC = () => {
  const location = useLocation();
  const [is_mobile_open, setIsMobileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // CRITICAL: Individual selectors for auth state - no object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const logoutUser = useAppStore(state => state.logout_user);
  // Memoize logo URL to prevent unnecessary re-renders
  const logoUrl = useAppStore(state => state.business_settings?.business_info?.logo_url);
  
  // Fetch notification summary with polling
  const { data: notifications } = useQuery<NotificationSummary>({
    queryKey: ['admin-notifications-summary'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/admin/notifications/summary`, {
        headers: { Authorization: `Bearer ${auth_token}` },
      });
      return response.data;
    },
    enabled: !!auth_token && isAuthenticated && currentUser?.role === 'admin',
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Poll every minute
  });

  // Body scroll lock when mobile drawer is open
  useEffect(() => {
    if (is_mobile_open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [is_mobile_open]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setIsNotificationsOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (is_mobile_open) {
          closeMobileDrawer();
        }
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [is_mobile_open]);

  const toggleMobileDrawer = () => {
    setIsMobileOpen(!is_mobile_open);
  };

  const closeMobileDrawer = () => {
    setIsMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/admin/login';
    }
  };

  const isActiveRoute = (path: string) => {
    if (path === '/admin/dashboard') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Verify admin role - return null if not admin
  if (!isAuthenticated || currentUser?.role !== 'admin') {
    return null;
  }

  // Navigation items structure with badge counts
  const navigation = [
    {
      name: 'Home',
      path: '/',
      icon: House,
      badge: 0,
    },
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      name: 'Orders',
      path: '/admin/orders',
      icon: ShoppingBag,
      badge: notifications?.orders_pending_count || 0,
    },
    {
      name: 'Menu Items',
      path: '/admin/menu',
      icon: UtensilsCrossed,
      badge: 0,
    },
    {
      name: 'Categories',
      path: '/admin/menu/categories',
      icon: Tag,
      badge: 0,
    },
    {
      name: 'Menu Builder',
      path: '/admin/menu/builder',
      icon: Layers,
      badge: 0,
    },
    {
      name: 'Stock',
      path: '/admin/stock',
      icon: Package,
      badge: 0,
    },
    {
      name: 'Delivery',
      path: '/admin/delivery',
      icon: Truck,
      badge: 0,
    },
    {
      name: 'Discounts',
      path: '/admin/discounts',
      icon: Tag,
      badge: 0,
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
      badge: 0,
    },
    {
      name: 'Staff',
      path: '/admin/staff',
      icon: UserCog,
      badge: 0,
    },
    {
      name: 'Invoices',
      path: '/admin/invoices',
      icon: FileText,
      badge: 0,
    },
    {
      name: 'Messages',
      path: '/admin/messages',
      icon: Mail,
      badge: notifications?.contact_new_count || 0,
    },
    {
      name: 'Analytics',
      path: '/admin/analytics',
      icon: BarChart3,
      badge: 0,
    },
    {
      name: 'Activity Logs',
      path: '/admin/activity-logs',
      icon: Activity,
      badge: 0,
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
      badge: 0,
    },
  ];

  const totalNotifications = (notifications?.orders_pending_count || 0) + (notifications?.contact_new_count || 0);

  return (
    <>
      {/* Mobile Top Bar - Fixed header for mobile/tablet (< lg) */}
      <header 
        className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 text-white z-50 flex items-center justify-between px-3 sm:px-4 border-b border-gray-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Left: Hamburger */}
        <button
          onClick={toggleMobileDrawer}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label="Open menu"
          aria-expanded={is_mobile_open}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Center: Logo */}
        <Link to="/admin/dashboard" className="flex items-center">
          <SidebarLogo logoUrl={logoUrl} className="h-7 w-auto object-contain" showLabel={false} />
        </Link>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {totalNotifications > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                  {totalNotifications > 99 ? '99+' : totalNotifications}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  {totalNotifications > 0 ? (
                    <div className="py-2">
                      {(notifications?.orders_pending_count || 0) > 0 && (
                        <Link
                          to="/admin/orders?status=received"
                          className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsNotificationsOpen(false)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                          <span className="text-sm text-gray-700">
                            {notifications?.orders_pending_count} pending order{notifications?.orders_pending_count !== 1 ? 's' : ''}
                          </span>
                        </Link>
                      )}
                      {(notifications?.contact_new_count || 0) > 0 && (
                        <Link
                          to="/admin/messages"
                          className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsNotificationsOpen(false)}
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                          <span className="text-sm text-gray-700">
                            {notifications?.contact_new_count} new message{notifications?.contact_new_count !== 1 ? 's' : ''}
                          </span>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No new notifications</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Profile"
            >
              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-semibold">
                {currentUser?.first_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {currentUser?.first_name} {currentUser?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                  </div>
                  <Link
                    to="/admin/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className="w-4 h-4 mr-3 text-gray-500" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Overlay - Only visible when mobile drawer is open */}
      {is_mobile_open && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-[55] transition-opacity backdrop-blur-sm"
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Mobile drawer (< lg) or Fixed sidebar (>= lg) */}
      <aside
        className={`
          fixed left-0 top-0 h-full bg-gray-900 text-white flex flex-col
          lg:z-30 lg:w-64 lg:translate-x-0
          z-[60] w-[280px] max-w-[85vw] transition-transform duration-300 ease-in-out
          ${is_mobile_open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)'
        }}
      >
        {/* Sidebar Header - Fixed height with consistent padding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800 flex-shrink-0">
          <Link to="/admin/dashboard" className="flex items-center">
            <SidebarLogo logoUrl={logoUrl} showLabel={true} />
          </Link>
          <button
            onClick={closeMobileDrawer}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          <ul className="space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = isActiveRoute(item.path);
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    onClick={closeMobileDrawer}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 
                      focus:outline-none focus:ring-2 focus:ring-orange-500
                      ${isActive
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <div className="relative flex-shrink-0">
                      <item.icon className="w-5 h-5" />
                      {item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="font-medium flex-1 truncate">{item.name}</span>
                    {item.badge > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Admin Info */}
        <div className="border-t border-gray-800 p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
              {currentUser?.first_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {currentUser?.first_name} {currentUser?.last_name}
              </p>
              <p className="text-xs text-gray-400 truncate">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors hidden lg:block"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default GV_AdminSidebar;
