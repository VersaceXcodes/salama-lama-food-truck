import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface MenuItem {
  item_id: string;
  name: string;
  description: string | null;
  category_id: string;
  price: number;
  image_url: string | null;
  dietary_tags: string[] | null;
  is_limited_edition: boolean;
  is_active: boolean;
  current_stock: number | null;
  stock_tracked: boolean;
  customization_groups: CustomizationGroup[];
}

interface Category {
  category_id: string;
  name: string;
  sort_order: number;
}

interface CustomizationGroup {
  group_id: string;
  name: string;
  type: 'single' | 'multiple';
  is_required: boolean;
  sort_order: number;
  options: CustomizationOption[];
}

interface CustomizationOption {
  option_id: string;
  name: string;
  additional_price: number;
  is_default: boolean;
  sort_order: number;
}

interface SelectedCustomization {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  additional_price: number;
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchMenuItems = async (params: {
  category?: string;
  search?: string;
  dietary_filters?: string[];
  sort?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append('category', params.category);
  if (params.search) queryParams.append('search', params.search);
  if (params.dietary_filters && params.dietary_filters.length > 0) {
    params.dietary_filters.forEach(filter => queryParams.append('dietary_filters', filter));
  }
  if (params.sort) queryParams.append('sort', params.sort);
  queryParams.append('is_active', 'true');
  queryParams.append('limit', '50');
  queryParams.append('offset', '0');

  const response = await axios.get(`${API_BASE_URL}/api/menu/items?${queryParams.toString()}`);
  return response.data;
};

const fetchCategories = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/menu/categories`);
  return response.data;
};

const addItemToCart = async (data: {
  item_id: string;
  quantity: number;
  selected_customizations: Record<string, any>;
}, authToken: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await axios.post(
    `${API_BASE_URL}/api/cart/items`,
    data,
    { headers }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_Menu: React.FC = () => {
  // URL Params
  const [searchParams, setSearchParams] = useSearchParams();

  // Individual Zustand selectors (CRITICAL: No object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const addToCartAction = useAppStore(state => state.add_to_cart);

  // State Variables
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get('category') || null
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('search') || ''
  );
  const [dietaryFilters, setDietaryFilters] = useState<string[]>(
    searchParams.get('dietary_filters')?.split(',').filter(Boolean) || []
  );
  const [sortOption, setSortOption] = useState<string>(
    searchParams.get('sort') || 'default'
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [customizationModal, setCustomizationModal] = useState<{
    is_open: boolean;
    item: MenuItem | null;
    selected_customizations: SelectedCustomization[];
    total_price: number;
    quantity: number;
  }>({
    is_open: false,
    item: null,
    selected_customizations: [],
    total_price: 0,
    quantity: 1,
  });
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // React Query: Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const categories: Category[] = useMemo(() => {
    return categoriesData?.categories || [];
  }, [categoriesData]);

  // React Query: Fetch Menu Items
  const { data: menuItemsData, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['menu-items', activeCategory, searchQuery, dietaryFilters, sortOption],
    queryFn: () => fetchMenuItems({
      category: activeCategory || undefined,
      search: searchQuery || undefined,
      dietary_filters: dietaryFilters.length > 0 ? dietaryFilters : undefined,
      sort: sortOption !== 'default' ? sortOption : undefined,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const menuItems: MenuItem[] = useMemo(() => {
    if (!menuItemsData?.items) return [];
    
    // Transform items to ensure proper data types (CRITICAL: PostgreSQL NUMERIC -> number)
    return menuItemsData.items.map((item: any) => ({
      ...item,
      price: Number(item.price || 0),
      current_stock: item.current_stock !== null ? Number(item.current_stock) : null,
      image_url: item.image_url || `https://picsum.photos/300/300?random=${item.item_id}`,
      dietary_tags: item.dietary_tags || [],
      customization_groups: (item.customization_groups || []).map((group: any) => ({
        ...group,
        options: (group.options || []).map((option: any) => ({
          ...option,
          additional_price: Number(option.additional_price || 0),
        })),
      })),
    }));
  }, [menuItemsData]);

  // React Query: Add to Cart Mutation
  const addToCartMutation = useMutation({
    mutationFn: (data: { item_id: string; quantity: number; selected_customizations: Record<string, any> }) => {
      setLoadingItemId(data.item_id);
      return addItemToCart(data, authToken);
    },
    onSuccess: () => {
      // Update Zustand cart state
      if (customizationModal.item) {
        const item = customizationModal.item;
        const cartItem = {
          item_id: item.item_id,
          item_name: item.name,
          quantity: customizationModal.quantity,
          unit_price: Number(item.price),
          customizations: customizationModal.selected_customizations.map(c => ({
            group_name: c.group_name,
            option_name: c.option_name,
            additional_price: Number(c.additional_price),
          })),
          line_total: Number(customizationModal.total_price) * customizationModal.quantity,
        };
        addToCartAction(cartItem);
      }

      // Clear loading state
      setLoadingItemId(null);

      // Close modal and reset
      setCustomizationModal({
        is_open: false,
        item: null,
        selected_customizations: [],
        total_price: 0,
        quantity: 1,
      });

      // Show success notification
      setNotification({ type: 'success', message: 'Item added to cart!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      // Clear loading state
      setLoadingItemId(null);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        setNotification({ type: 'error', message: 'Please log in or register to add items to your cart.' });
        setTimeout(() => {
          setNotification(null);
          window.location.href = '/login?redirect=/menu';
        }, 2000);
      } else {
        setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to add item to cart' });
        setTimeout(() => setNotification(null), 3000);
      }
    },
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (searchQuery) params.set('search', searchQuery);
    if (dietaryFilters.length > 0) params.set('dietary_filters', dietaryFilters.join(','));
    if (sortOption !== 'default') params.set('sort', sortOption);
    
    setSearchParams(params, { replace: true });
  }, [activeCategory, searchQuery, dietaryFilters, sortOption, setSearchParams]);

  // Process pending cart item after login
  useEffect(() => {
    if (authToken) {
      const pendingItemStr = localStorage.getItem('pendingCartItem');
      if (pendingItemStr) {
        try {
          const pendingItem = JSON.parse(pendingItemStr);
          // Check if item is not too old (within last 30 minutes)
          if (Date.now() - pendingItem.timestamp < 30 * 60 * 1000) {
            // Add the pending item to cart
            addToCartMutation.mutate({
              item_id: pendingItem.item_id,
              quantity: pendingItem.quantity,
              selected_customizations: pendingItem.selected_customizations,
            });
            // Show success notification
            setNotification({ type: 'success', message: `${pendingItem.item_name} added to cart!` });
            setTimeout(() => setNotification(null), 3000);
          }
        } catch (error) {
          console.error('Failed to process pending cart item:', error);
        } finally {
          // Clear pending item from localStorage
          localStorage.removeItem('pendingCartItem');
        }
      }
    }
  }, [authToken]);

  // Handlers
  const handleCategoryChange = (categoryId: string | null) => {
    setActiveCategory(categoryId);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleDietaryFilterToggle = (filter: string) => {
    setDietaryFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  const handleClearFilters = () => {
    setActiveCategory(null);
    setSearchQuery('');
    setDietaryFilters([]);
    setSortOption('default');
  };

  const handleOpenCustomizationModal = (item: MenuItem) => {
    // Initialize with default selections
    const defaultSelections: SelectedCustomization[] = [];
    item.customization_groups.forEach(group => {
      const defaultOption = group.options.find(opt => opt.is_default);
      if (defaultOption && group.type === 'single') {
        defaultSelections.push({
          group_id: group.group_id,
          group_name: group.name,
          option_id: defaultOption.option_id,
          option_name: defaultOption.name,
          additional_price: Number(defaultOption.additional_price),
        });
      }
    });

    const basePrice = Number(item.price);
    const customizationPrice = defaultSelections.reduce((sum, c) => sum + Number(c.additional_price), 0);
    const totalPrice = basePrice + customizationPrice;

    setCustomizationModal({
      is_open: true,
      item,
      selected_customizations: defaultSelections,
      total_price: totalPrice,
      quantity: 1,
    });
  };

  const handleCloseCustomizationModal = () => {
    setCustomizationModal({
      is_open: false,
      item: null,
      selected_customizations: [],
      total_price: 0,
      quantity: 1,
    });
  };

  const handleCustomizationChange = (
    groupId: string,
    groupName: string,
    groupType: 'single' | 'multiple',
    option: CustomizationOption
  ) => {
    setCustomizationModal(prev => {
      let newSelections = [...prev.selected_customizations];

      if (groupType === 'single') {
        // Remove existing selection for this group
        newSelections = newSelections.filter(s => s.group_id !== groupId);
        // Add new selection
        newSelections.push({
          group_id: groupId,
          group_name: groupName,
          option_id: option.option_id,
          option_name: option.name,
          additional_price: Number(option.additional_price),
        });
      } else {
        // Multiple choice: toggle selection
        const existingIndex = newSelections.findIndex(
          s => s.group_id === groupId && s.option_id === option.option_id
        );
        if (existingIndex >= 0) {
          newSelections.splice(existingIndex, 1);
        } else {
          newSelections.push({
            group_id: groupId,
            group_name: groupName,
            option_id: option.option_id,
            option_name: option.name,
            additional_price: Number(option.additional_price),
          });
        }
      }

      // Recalculate total price
      const basePrice = Number(prev.item?.price || 0);
      const customizationPrice = newSelections.reduce((sum, c) => sum + Number(c.additional_price), 0);
      const totalPrice = basePrice + customizationPrice;

      return {
        ...prev,
        selected_customizations: newSelections,
        total_price: totalPrice,
      };
    });
  };

  const handleQuantityChange = (delta: number) => {
    setCustomizationModal(prev => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + delta),
    }));
  };

  const handleAddToCart = () => {
    if (!customizationModal.item) return;

    // Validate required customizations
    const requiredGroups = customizationModal.item.customization_groups.filter(g => g.is_required);
    const selectedGroupIds = new Set(customizationModal.selected_customizations.map(c => c.group_id));
    
    for (const group of requiredGroups) {
      if (!selectedGroupIds.has(group.group_id)) {
        setNotification({ type: 'error', message: `Please select an option for "${group.name}"` });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    // Check stock
    if (customizationModal.item.stock_tracked && customizationModal.item.current_stock !== null) {
      if (customizationModal.item.current_stock < customizationModal.quantity) {
        setNotification({ type: 'error', message: 'Insufficient stock available' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    // Prepare customizations object
    const customizationsObject: Record<string, any> = {};
    customizationModal.selected_customizations.forEach(c => {
      if (!customizationsObject[c.group_id]) {
        customizationsObject[c.group_id] = [];
      }
      customizationsObject[c.group_id].push({
        option_id: c.option_id,
        option_name: c.option_name,
        additional_price: c.additional_price,
      });
    });

    // If user is authenticated, sync with backend
    if (authToken) {
      addToCartMutation.mutate({
        item_id: customizationModal.item.item_id,
        quantity: customizationModal.quantity,
        selected_customizations: customizationsObject,
      });
    } else {
      // For guest users, add directly to local Zustand cart
      const item = customizationModal.item;
      const cartItem = {
        item_id: item.item_id,
        item_name: item.name,
        quantity: customizationModal.quantity,
        unit_price: Number(item.price),
        customizations: customizationModal.selected_customizations.map(c => ({
          group_name: c.group_name,
          option_name: c.option_name,
          additional_price: Number(c.additional_price),
        })),
        line_total: Number(customizationModal.total_price) * customizationModal.quantity,
      };
      addToCartAction(cartItem);

      // Clear loading state
      setLoadingItemId(null);

      // Close modal and reset
      setCustomizationModal({
        is_open: false,
        item: null,
        selected_customizations: [],
        total_price: 0,
        quantity: 1,
      });

      // Show success notification
      setNotification({ type: 'success', message: 'Item added to cart!' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleQuickAddToCart = (item: MenuItem) => {
    // For items without customizations or without required customizations
    if (item.customization_groups.length === 0 || !item.customization_groups.some(g => g.is_required)) {
      // If user is authenticated, sync with backend
      if (authToken) {
        // Make API call to add to cart
        addToCartMutation.mutate({
          item_id: item.item_id,
          quantity: 1,
          selected_customizations: {},
        });
      } else {
        // For guest users, add directly to local Zustand cart
        const cartItem = {
          item_id: item.item_id,
          item_name: item.name,
          quantity: 1,
          unit_price: Number(item.price),
          customizations: [],
          line_total: Number(item.price),
        };
        addToCartAction(cartItem);

        // Show success notification
        setNotification({ type: 'success', message: 'Item added to cart!' });
        setTimeout(() => setNotification(null), 3000);
      }
    } else {
      // Open customization modal (will handle auth check inside modal)
      handleOpenCustomizationModal(item);
    }
  };

  // Dietary filter options
  const dietaryOptions = [
    { value: 'vegan', label: 'Vegan', icon: '🌱' },
    { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
    { value: 'gluten_free', label: 'Gluten-Free', icon: '🌾' },
    { value: 'halal', label: 'Halal', icon: '☪️' },
    { value: 'dairy_free', label: 'Dairy-Free', icon: '🥛' },
  ];

  // Stock status helper
  const getStockStatus = (item: MenuItem): 'in_stock' | 'low_stock' | 'out_of_stock' => {
    if (!item.stock_tracked || item.current_stock === null) return 'in_stock';
    if (item.current_stock === 0) return 'out_of_stock';
    if (item.current_stock <= 5) return 'low_stock'; // Assuming 5 is the threshold
    return 'in_stock';
  };

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-20 right-4 z-[9999] px-6 py-4 rounded-lg shadow-2xl border-2 ${
          notification.type === 'success' 
            ? 'bg-green-600 text-white border-green-700' 
            : 'bg-red-600 text-white border-red-700'
        } animate-in slide-in-from-right duration-300`}>
          <div className="flex items-center gap-3">
            <span className="text-lg">{notification.type === 'success' ? '✓' : '✗'}</span>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Our Menu
          </h1>
          <p className="mt-2 text-base md:text-lg text-gray-600 leading-relaxed">
            Discover our delicious selection of authentic dishes
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Search & Filter Bar */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full px-4 py-3 pl-11 pr-10 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-200 outline-none"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              )}
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setFilterPanelOpen(true)}
              className="sm:hidden px-6 py-3 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              <span>Filters</span>
              {dietaryFilters.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-600 text-white text-xs font-medium rounded-full">
                  {dietaryFilters.length}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-200 outline-none font-medium text-gray-700 bg-white"
            >
              <option value="default">Sort by: Default</option>
              <option value="name">Name (A-Z)</option>
              <option value="price_low_high">Price (Low to High)</option>
              <option value="price_high_low">Price (High to Low)</option>
            </select>
          </div>

          {/* Active Filters Display */}
          {(activeCategory || dietaryFilters.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              
              {activeCategory && (
                <span className="inline-flex items-center px-3 py-1.5 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                  {categories.find(c => c.category_id === activeCategory)?.name || activeCategory}
                  <button
                    onClick={() => handleCategoryChange(null)}
                    className="ml-2 text-orange-600 hover:text-orange-800"
                    aria-label="Remove category filter"
                  >
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </span>
              )}

              {dietaryFilters.map(filter => (
                <span
                  key={filter}
                  className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-full"
                >
                  {dietaryOptions.find(d => d.value === filter)?.label || filter}
                  <button
                    onClick={() => handleDietaryFilterToggle(filter)}
                    className="ml-2 text-green-600 hover:text-green-800"
                    aria-label={`Remove ${filter} filter`}
                  >
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </span>
              ))}

              <button
                onClick={handleClearFilters}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-8 border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-8 min-w-max" aria-label="Categories">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeCategory === null
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Items
            </button>
            
            {categories.map(category => (
              <button
                key={category.category_id}
                onClick={() => handleCategoryChange(category.category_id)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeCategory === category.category_id
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Desktop Filter Sidebar */}
        <div className="flex gap-8">
          {/* Filters Sidebar (Desktop) */}
          <aside className="hidden sm:block w-64 flex-shrink-0">
            <div className="sticky top-4 bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dietary Filters
              </h3>

              <div className="space-y-3">
                {dietaryOptions.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center space-x-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={dietaryFilters.includes(option.value)}
                      onChange={() => handleDietaryFilterToggle(option.value)}
                      className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 transition-all"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors flex items-center space-x-2">
                      <span className="text-lg">{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Menu Items Grid */}
          <div className="flex-1">
            {itemsLoading ? (
              // Loading Skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse"
                  >
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-6 space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : itemsError ? (
              // Error State
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Failed to load menu items
                </h3>
                <p className="text-gray-600 mb-6">
                  Please try again later or contact support if the problem persists.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : menuItems.length === 0 ? (
              // Empty State
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No menu items found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters or search terms
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              // Menu Items
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map(item => {
                  const stockStatus = getStockStatus(item);
                  const isOutOfStock = stockStatus === 'out_of_stock';
                  const isLowStock = stockStatus === 'low_stock';

                  return (
                    <div
                      key={item.item_id}
                      className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg ${
                        isOutOfStock ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Item Image */}
                      <div className="relative h-48 bg-gray-100">
                        <img
                          src={item.image_url || ''}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          {item.is_limited_edition && (
                            <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-lg">
                              Limited Edition
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg">
                              Sold Out
                            </span>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                              Only {item.current_stock} left
                            </span>
                          )}
                        </div>

                        {/* Dietary Tags */}
                        {item.dietary_tags && item.dietary_tags.length > 0 && (
                          <div className="absolute bottom-3 left-3 flex gap-1">
                            {item.dietary_tags.map(tag => {
                              const option = dietaryOptions.find(d => d.value === tag);
                              return option ? (
                                <span
                                  key={tag}
                                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg shadow-md"
                                  title={option.label}
                                >
                                  {option.icon}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
                          {item.name}
                        </h3>
                        
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-gray-900">
                            €{Number(item.price).toFixed(2)}
                          </span>

                          {item.customization_groups.length > 0 && (
                            <span className="text-xs text-gray-500 font-medium">
                              Customizable
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (item.customization_groups.length > 0) {
                              handleOpenCustomizationModal(item);
                            } else {
                              handleQuickAddToCart(item);
                            }
                          }}
                          disabled={isOutOfStock || loadingItemId === item.item_id}
                          className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                            isOutOfStock
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : loadingItemId === item.item_id
                              ? 'bg-orange-600 text-white opacity-75 cursor-wait'
                              : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg'
                          }`}
                        >
                          {loadingItemId === item.item_id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Adding...
                            </>
                          ) : isOutOfStock ? (
                            'Out of Stock'
                          ) : item.customization_groups.length > 0 ? (
                            'Customize & Add'
                          ) : (
                            'Add to Cart'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Panel */}
      {filterPanelOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setFilterPanelOpen(false)}
          ></div>

          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-full bg-white shadow-xl">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Dietary Filters
                </h3>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close filters"
                >
                  <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {dietaryOptions.map(option => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={dietaryFilters.includes(option.value)}
                        onChange={() => handleDietaryFilterToggle(option.value)}
                        className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 transition-all"
                      />
                      <span className="text-base font-medium text-gray-700 flex items-center space-x-2">
                        <span className="text-xl">{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customization Modal */}
      {customizationModal.is_open && customizationModal.item && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseCustomizationModal}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={handleCloseCustomizationModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>

              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start space-x-4">
                  <img
                    src={customizationModal.item.image_url || ''}
                    alt={customizationModal.item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {customizationModal.item.name}
                    </h2>
                    {customizationModal.item.description && (
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {customizationModal.item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {customizationModal.item.customization_groups.length === 0 ? (
                  <p className="text-gray-600">No customization options available for this item.</p>
                ) : (
                  customizationModal.item.customization_groups.map(group => (
                    <div key={group.group_id} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.name}
                        {group.is_required && (
                          <span className="ml-2 text-red-600 text-sm">*</span>
                        )}
                      </h3>

                      <div className="space-y-2">
                        {group.options.map(option => {
                          const isSelected = customizationModal.selected_customizations.some(
                            c => c.group_id === group.group_id && c.option_id === option.option_id
                          );

                          return (
                            <label
                              key={option.option_id}
                              className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-orange-600 bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type={group.type === 'single' ? 'radio' : 'checkbox'}
                                  name={group.group_id}
                                  checked={isSelected}
                                  onChange={() => handleCustomizationChange(
                                    group.group_id,
                                    group.name,
                                    group.type,
                                    option
                                  )}
                                  className={`w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-500 focus:ring-2 transition-all ${
                                    group.type === 'single' ? '' : 'rounded'
                                  }`}
                                />
                                <span className="text-gray-900 font-medium">
                                  {option.name}
                                </span>
                              </div>

                              {Number(option.additional_price) > 0 && (
                                <span className="text-gray-600 font-medium">
                                  +€{Number(option.additional_price).toFixed(2)}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {/* Quantity Selector */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Quantity</h3>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={customizationModal.quantity <= 1}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Decrease quantity"
                    >
                      <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M20 12H4"></path>
                      </svg>
                    </button>

                    <span className="text-2xl font-bold text-gray-900 w-12 text-center">
                      {customizationModal.quantity}
                    </span>

                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 4v16m8-8H4"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-3xl font-bold text-orange-600">
                    €{(Number(customizationModal.total_price) * customizationModal.quantity).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseCustomizationModal}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={addToCartMutation.isPending}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {addToCartMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      'Add to Cart'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Menu;