import React, { useState, useEffect } from 'react';
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
  Mail
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface NotificationSummary {
  contact_new_count: number;
  catering_new_count: number;
  orders_pending_count: number;
  total_new: number;
}

const GV_AdminSidebar: React.FC = () => {
  const location = useLocation();
  const [is_collapsed] = useState(false);
  const [is_mobile_open, setIsMobileOpen] = useState(false);
  
  // CRITICAL: Individual selectors for auth state - no object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const businessSettings = useAppStore(state => state.business_settings);
  const logoUrl = businessSettings.business_info.logo_url || '/assets/salama-lama-logo.png';
  
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
  }, [location.pathname]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && is_mobile_open) {
        closeMobileDrawer();
      }
    };
    
    if (is_mobile_open) {
      document.addEventListener('keydown', handleEscape);
    }
    
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

  const isActiveRoute = (path: string) => {
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

  return (
    <>
      {/* Mobile Top Bar - Only visible on mobile (< md) */}
      <div 
        className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 text-white z-50 flex items-center px-4 border-b border-gray-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          onClick={toggleMobileDrawer}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/admin/dashboard" className="flex items-center ml-4">
          <img 
            src={logoUrl} 
            alt="Salama Lama" 
            className="w-auto object-contain"
            style={{ height: '28px', maxWidth: '150px' }}
            onError={(e) => { 
              const target = e.target as HTMLImageElement;
              if (target.src !== '/assets/salama-lama-logo.png') {
                target.src = '/assets/salama-lama-logo.png';
              }
            }}
          />
        </Link>
      </div>

      {/* Overlay - Only visible when mobile drawer is open */}
      {is_mobile_open && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 z-[90]"
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Mobile drawer (< md) or Fixed sidebar (>= md) */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-gray-900 text-white flex flex-col overflow-y-auto
          md:z-30 md:w-64 md:translate-x-0
          z-[100] w-[80vw] max-w-[320px] transition-transform duration-200
          ${is_mobile_open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${is_mobile_open ? 'pointer-events-auto' : 'pointer-events-none md:pointer-events-auto'}
        `}
        style={{ 
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)'
        }}
      >
        {/* Sidebar Header - Sticky to keep close button visible */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b border-gray-800 flex-shrink-0 bg-gray-900">
          <Link to="/admin/dashboard" className="flex items-center">
            <img 
              src={logoUrl} 
              alt="Salama Lama" 
              className="w-auto object-contain"
              style={{ height: '32px', maxWidth: '180px' }}
              onError={(e) => { 
                const target = e.target as HTMLImageElement;
                if (target.src !== '/assets/salama-lama-logo.png') {
                  target.src = '/assets/salama-lama-logo.png';
                }
              }}
            />
          </Link>
          <button
            onClick={closeMobileDrawer}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          <ul className="space-y-1 px-2">
            {navigation.map((item) => {
              return (
                <li key={item.name}>
                  <Link
                    to={item.path || '#'}
                    onClick={() => {
                      // Close mobile drawer when navigating
                      if (is_mobile_open) {
                        closeMobileDrawer();
                      }
                    }}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      isActiveRoute(item.path || '')
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    title={is_collapsed ? item.name : undefined}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                    {!is_collapsed && (
                      <span className="font-medium flex-1">{item.name}</span>
                    )}
                    {!is_collapsed && item.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
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
        {!is_collapsed && (
          <div className="border-t border-gray-800 p-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-semibold text-lg">
                {currentUser?.first_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser?.first_name} {currentUser?.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">Administrator</p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed state - Admin avatar only */}
        {is_collapsed && (
          <div className="border-t border-gray-800 p-2 flex-shrink-0 flex justify-center">
            <div 
              className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-semibold text-lg"
              title={`${currentUser?.first_name} ${currentUser?.last_name}`}
            >
              {currentUser?.first_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default GV_AdminSidebar;