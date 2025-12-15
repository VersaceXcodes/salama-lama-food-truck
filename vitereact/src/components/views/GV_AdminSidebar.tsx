import React, { useState } from 'react';
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
  const [expanded_sections, setExpandedSections] = useState<Record<string, boolean>>({
    menu: false,
  });
  
  // CRITICAL: Individual selectors for auth state - no object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // Verify admin role - return null if not admin
  if (!isAuthenticated || currentUser?.role !== 'admin') {
    return null;
  }

  const toggleSidebar = () => {
    setIsCollapsed(!is_collapsed);
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
      {/* Fixed Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gray-900 text-white z-30 transition-all duration-300 flex flex-col ${
          is_collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800 flex-shrink-0">
          {!is_collapsed && (
            <Link to="/admin/dashboard" className="flex items-center">
              <img 
                src="/assets/salama-lama-logo.png" 
                alt="Salama Lama" 
                className="w-auto object-contain"
                style={{ height: '32px', maxWidth: '180px' }}
              />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label={is_collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {is_collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
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