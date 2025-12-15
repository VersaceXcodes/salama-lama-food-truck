import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Activity,
  ChevronRight,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

const GV_AdminSidebar: React.FC = () => {
  const location = useLocation();
  const [is_collapsed, setIsCollapsed] = useState(false);
  const [is_mobile_open, setIsMobileOpen] = useState(false);
  const [expanded_sections, setExpandedSections] = useState<Record<string, boolean>>({
    menu: false,
  });
  
  // CRITICAL: Individual selectors for auth state - no object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const businessSettings = useAppStore(state => state.business_settings);
  const logoUrl = businessSettings.business_info.logo_url || '/assets/salama-lama-logo.png';

  // Verify admin role - return null if not admin
  if (!isAuthenticated || currentUser?.role !== 'admin') {
    return null;
  }

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

  const toggleSidebar = () => {
    setIsCollapsed(!is_collapsed);
  };

  const toggleMobileDrawer = () => {
    setIsMobileOpen(!is_mobile_open);
  };

  const closeMobileDrawer = () => {
    setIsMobileOpen(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Navigation items structure
  const navigation = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Orders',
      path: '/admin/orders',
      icon: ShoppingBag,
    },
    {
      name: 'Menu',
      icon: UtensilsCrossed,
      hasSubmenu: true,
      section: 'menu',
      submenu: [
        { name: 'Menu Items', path: '/admin/menu' },
        { name: 'Categories', path: '/admin/menu/categories' },
      ],
    },
    {
      name: 'Stock',
      path: '/admin/stock',
      icon: Package,
    },
    {
      name: 'Delivery',
      path: '/admin/delivery',
      icon: Truck,
    },
    {
      name: 'Discounts',
      path: '/admin/discounts',
      icon: Tag,
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
    },
    {
      name: 'Staff',
      path: '/admin/staff',
      icon: UserCog,
    },
    {
      name: 'Catering',
      path: '/admin/catering',
      icon: Calendar,
    },
    {
      name: 'Invoices',
      path: '/admin/invoices',
      icon: FileText,
    },
    {
      name: 'Analytics',
      path: '/admin/analytics',
      icon: BarChart3,
    },
    {
      name: 'Activity Logs',
      path: '/admin/activity-logs',
      icon: Activity,
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
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
          className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-[90]"
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Mobile drawer (< md) or Fixed sidebar (>= md) */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-gray-900 text-white flex flex-col
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
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800 flex-shrink-0">
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
            className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          <ul className="space-y-1 px-2">
            {navigation.map((item) => {
              if (item.hasSubmenu && item.submenu) {
                const isExpanded = expanded_sections[item.section || ''];
                const hasActiveSubmenu = item.submenu.some(sub => isActiveRoute(sub.path));

                return (
                  <li key={item.name}>
                    {/* Parent menu item with submenu */}
                    <button
                      onClick={() => toggleSection(item.section || '')}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        hasActiveSubmenu
                          ? 'bg-orange-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                      aria-expanded={isExpanded}
                      title={is_collapsed ? item.name : undefined}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!is_collapsed && (
                          <span className="font-medium">{item.name}</span>
                        )}
                      </div>
                      {!is_collapsed && (
                        <span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </button>

                    {/* Submenu items */}
                    {!is_collapsed && isExpanded && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.submenu.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={`block px-4 py-2 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                isActiveRoute(subItem.path)
                                  ? 'bg-orange-600 text-white font-medium'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              // Regular navigation item without submenu
              return (
                <li key={item.name}>
                  <Link
                    to={item.path || '#'}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      isActiveRoute(item.path || '')
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    title={is_collapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!is_collapsed && (
                      <span className="font-medium">{item.name}</span>
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