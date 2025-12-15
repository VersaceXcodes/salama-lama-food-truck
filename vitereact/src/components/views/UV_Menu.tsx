import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { QuantityStepper } from '@/components/ui/quantity-stepper';

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
  const { toast } = useToast();

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
    onSuccess: (response) => {
      // Update Zustand cart state with the backend response
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
      toast({
        title: 'Success',
        description: 'Item added to cart!'
      });
    },
    onError: (error: any) => {
      // Clear loading state
      setLoadingItemId(null);
      
      // Show error notification
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add item to cart'
      });
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
            toast({
              title: 'Success',
              description: `${pendingItem.item_name} added to cart!`
            });
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
    // Safety check: Don't open if item is null
    if (!item) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to load product details. Please try again.'
      });
      return;
    }

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

    // IMPORTANT: Set product data first, then open sheet in next frame
    // This ensures the sheet content is ready before animation starts
    setCustomizationModal({
      is_open: false,
      item,
      selected_customizations: defaultSelections,
      total_price: totalPrice,
      quantity: 1,
    });

    // Open sheet in next frame to ensure state is ready
    requestAnimationFrame(() => {
      setCustomizationModal(prev => ({
        ...prev,
        is_open: true,
      }));
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
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: `Please select an option for "${group.name}"`
        });
        return;
      }
    }

    // Check stock
    if (customizationModal.item.stock_tracked && customizationModal.item.current_stock !== null) {
      if (customizationModal.item.current_stock < customizationModal.quantity) {
        toast({
          variant: 'destructive',
          title: 'Stock Error',
          description: 'Insufficient stock available'
        });
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

    // Call backend API to persist cart item (for both authenticated and guest users)
    addToCartMutation.mutate({
      item_id: customizationModal.item.item_id,
      quantity: customizationModal.quantity,
      selected_customizations: customizationsObject,
    });
  };

  const handleQuickAddToCart = (item: MenuItem) => {
    // Check if item has ANY customization groups (not just required ones)
    // If it has customizations, show the sheet so user can see all options
    if (item.customization_groups.length > 0) {
      // Open customization modal for items with options
      handleOpenCustomizationModal(item);
    } else {
      // For items without ANY customizations, add directly to cart
      // Prepare item data for modal state (needed for onSuccess callback)
      setCustomizationModal({
        is_open: false,
        item: item,
        selected_customizations: [],
        total_price: Number(item.price),
        quantity: 1,
      });

      // Make API call to add to cart (for both authenticated and guest users)
      addToCartMutation.mutate({
        item_id: item.item_id,
        quantity: 1,
        selected_customizations: {},
      });
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

  // Handle ESC key to close customization modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && customizationModal.is_open) {
        handleCloseCustomizationModal();
      }
    };

    if (customizationModal.is_open) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [customizationModal.is_open]);

  // Lock body scroll when customization modal is open
  useEffect(() => {
    if (customizationModal.is_open) {
      // Store original styles
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const originalTouchAction = document.body.style.touchAction;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Lock scroll with comprehensive approach
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.touchAction = 'none';
      
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.touchAction = originalTouchAction;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [customizationModal.is_open]);

  // Failsafe: Auto-close sheet if content is missing
  useEffect(() => {
    if (customizationModal.is_open && !customizationModal.item) {
      // Wait a short moment to allow state to update
      const timer = setTimeout(() => {
        if (customizationModal.is_open && !customizationModal.item) {
          handleCloseCustomizationModal();
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Unable to load product details. Please try again.'
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [customizationModal.is_open, customizationModal.item]);

  return (
    <>
      {/* Page Header */}
      <div style={{ backgroundColor: 'var(--primary-bg)', paddingTop: 'env(safe-area-inset-top)' }} className="border-b border-[#D4C5B0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight" style={{ color: 'var(--primary-text)' }}>
            Our Menu
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg leading-relaxed" style={{ color: '#4A3B32' }}>
            Discover our delicious selection of authentic dishes
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-12" 
        style={{ 
          backgroundColor: 'var(--primary-bg)',
          paddingBottom: 'calc(96px + env(safe-area-inset-bottom) + 12px)'
        }}
      >
        {/* Compact Search & Filter Controls */}
        <div className="mb-6 space-y-3">
          {/* Search Input - Full Width */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--primary-text)] opacity-40"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="search"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-3 text-base bg-white border-2 border-[var(--border-light)] rounded-[var(--radius-btn)] text-[var(--primary-text)] placeholder:text-[var(--primary-text)]/40 focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--primary-text)]/10 focus:outline-none transition-colors"
              style={{ minHeight: 'var(--tap-target-comfortable)' }}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--primary-text)] opacity-40 hover:opacity-100 transition-opacity p-1"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>

          {/* Filter and Sort Row - 2 Column Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setFilterPanelOpen(true)}
              className="relative flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-[var(--border-light)] rounded-[var(--radius-btn)] text-[var(--primary-text)] font-medium hover:border-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/10 transition-colors sm:hidden"
              style={{ minHeight: 'var(--tap-target-comfortable)' }}
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              <span>Filters</span>
              {dietaryFilters.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--btn-bg)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {dietaryFilters.length}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="px-4 py-3 bg-white border-2 border-[var(--border-light)] rounded-[var(--radius-btn)] text-[var(--primary-text)] font-medium focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--primary-text)]/10 focus:outline-none transition-colors appearance-none bg-[length:1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10"
              style={{ 
                minHeight: 'var(--tap-target-comfortable)',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232C1A16' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
              }}
            >
              <option value="default">Sort by</option>
              <option value="name">Name (A-Z)</option>
              <option value="price_low_high">Price: Low-High</option>
              <option value="price_high_low">Price: High-Low</option>
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

        {/* Category Selection - Responsive */}
        <div className="mb-6">
          {/* Mobile Dropdown (< 768px) */}
          <div className="block md:hidden">
            <label htmlFor="categorySelect" className="block text-sm font-medium text-[var(--primary-text)] mb-2">
              Category
            </label>
            <select
              id="categorySelect"
              value={activeCategory || ''}
              onChange={(e) => {
                handleCategoryChange(e.target.value || null);
                setFilterPanelOpen(false);
              }}
              className="w-full px-4 py-3 bg-white border-2 border-[#D4C5B0] text-[var(--primary-text)] font-medium focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--primary-text)]/10 focus:outline-none transition-colors appearance-none bg-[length:1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10"
              style={{ 
                height: '44px',
                borderRadius: '12px',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232C1A16' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
              }}
            >
              <option value="">All Items</option>
              {categories.map(category => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop/Tablet Chips (≥ 768px) */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide -mx-4 sm:mx-0">
            <div className="flex gap-2 pb-2 px-4 sm:px-0" style={{ minWidth: '100%', width: 'max-content' }} aria-label="Categories">
              <button
                onClick={() => handleCategoryChange(null)}
                className={`
                  inline-flex items-center justify-center px-4 rounded-full text-sm font-semibold whitespace-nowrap
                  transition-all duration-200 flex-shrink-0
                  ${activeCategory === null
                    ? 'bg-[#2C1A16] text-white shadow-md'
                    : 'bg-white text-[#2C1A16] border-2 border-[#D4C5B0] hover:border-[#2C1A16]'
                  }
                `}
                style={{ height: '44px', minHeight: '44px' }}
              >
                All Items
              </button>
              
              {categories.map(category => (
                <button
                  key={category.category_id}
                  onClick={() => handleCategoryChange(category.category_id)}
                  className={`
                    inline-flex items-center justify-center px-4 rounded-full text-sm font-semibold whitespace-nowrap
                    transition-all duration-200 flex-shrink-0
                    ${activeCategory === category.category_id
                      ? 'bg-[#2C1A16] text-white shadow-md'
                      : 'bg-white text-[#2C1A16] border-2 border-[#D4C5B0] hover:border-[#2C1A16]'
                    }
                  `}
                  style={{ height: '44px', minHeight: '44px' }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
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
                    className="px-6 py-3 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: 'var(--btn-bg)', 
                      color: 'var(--btn-text)',
                      minHeight: '48px'
                    }}
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
                    className="px-6 py-3 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: 'var(--btn-bg)', 
                      color: 'var(--btn-text)',
                      minHeight: '48px'
                    }}
                  >
                    Clear all filters
                  </button>
              </div>
            ) : (
              // Mobile-First Product Grid: 1 col mobile, 2 cols tablet, 3 cols desktop
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                {menuItems.map(item => {
                  const stockStatus = getStockStatus(item);
                  const isOutOfStock = stockStatus === 'out_of_stock';
                  const isLowStock = stockStatus === 'low_stock';

                  return (
                    <div
                      key={item.item_id}
                      className={`bg-white overflow-hidden transition-all duration-200 border border-[var(--border-light)] hover:shadow-soft-lg hover:-translate-y-1 ${
                        isOutOfStock ? 'opacity-60' : ''
                      }`}
                      style={{ borderRadius: 'var(--radius-card)' }}
                    >
                      {/* Item Image - 16:9 aspect ratio for consistency */}
                      <div className="relative w-full bg-gray-50" style={{ aspectRatio: '16/9' }}>
                        <img
                          src={item.image_url || ''}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          {item.is_limited_edition && (
                            <span className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-full shadow-md backdrop-blur-sm">
                              Limited Edition
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full shadow-md backdrop-blur-sm">
                              Sold Out
                            </span>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full shadow-md backdrop-blur-sm">
                              Only {item.current_stock} left
                            </span>
                          )}
                        </div>

                        {/* Dietary Tags */}
                        {item.dietary_tags && item.dietary_tags.length > 0 && (
                          <div className="absolute bottom-3 left-3 flex gap-1.5">
                            {item.dietary_tags.map(tag => {
                              const option = dietaryOptions.find(d => d.value === tag);
                              return option ? (
                                <span
                                  key={tag}
                                  className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center text-lg shadow-md border border-gray-100"
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
                      <div className="p-5 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-tight">
                          {item.name}
                        </h3>
                        
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-[#2C1A16]" style={{ letterSpacing: '-0.01em' }}>
                            €{Number(item.price).toFixed(2)}
                          </span>

                          {item.customization_groups.length > 0 && (
                            <span className="px-2.5 py-1 bg-[#F2EFE9] text-[#2C1A16] text-xs font-semibold rounded-full border border-[#D4C5B0]">
                              Customizable
                            </span>
                          )}
                        </div>

                        {/* Add to Cart Button */}
                        <button
                          onClick={() => handleQuickAddToCart(item)}
                          disabled={isOutOfStock || loadingItemId === item.item_id}
                          className={`w-full px-5 py-3.5 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center add-to-cart-btn ${
                            isOutOfStock
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : loadingItemId === item.item_id
                              ? 'opacity-75 cursor-wait'
                              : 'hover:shadow-lg hover:-translate-y-0.5'
                          }`}
                          style={!isOutOfStock ? { 
                            backgroundColor: 'var(--btn-bg)', 
                            color: 'var(--btn-text)',
                            minHeight: '52px'
                          } : {
                            minHeight: '52px'
                          }}
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

      {/* Mobile Filter Panel - BottomSheet */}
      <BottomSheet
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        title="Dietary Filters"
        maxHeight="80vh"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => {
                setDietaryFilters([]);
                setFilterPanelOpen(false);
              }}
              className="flex-1 px-6 py-3 border-2 border-[var(--primary-text)] rounded-[var(--radius-btn)] text-[var(--primary-text)] font-semibold hover:bg-[var(--primary-bg)] transition-colors"
              style={{ minHeight: 'var(--tap-target-comfortable)' }}
            >
              Clear
            </button>
            <button
              onClick={() => setFilterPanelOpen(false)}
              className="flex-1 px-6 py-3 rounded-[var(--radius-btn)] bg-[var(--btn-bg)] text-white font-bold hover:bg-[#1A0F0D] transition-colors"
              style={{ minHeight: 'var(--tap-target-comfortable)' }}
            >
              Apply
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {dietaryOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-3 rounded-[var(--radius-card)] hover:bg-[var(--primary-bg)] transition-colors cursor-pointer"
              style={{ minHeight: '52px' }}
            >
              <input
                type="checkbox"
                checked={dietaryFilters.includes(option.value)}
                onChange={() => handleDietaryFilterToggle(option.value)}
                className="w-6 h-6 text-[var(--btn-bg)] border-2 border-[var(--border-light)] rounded focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all"
              />
              <span className="text-2xl flex-shrink-0">{option.icon}</span>
              <span className="text-base font-medium text-[var(--primary-text)] flex-1">{option.label}</span>
            </label>
          ))}
        </div>
      </BottomSheet>

      {/* Original Mobile Filter Panel - Keep for debugging */}
      {false && filterPanelOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
                    className="w-full px-6 py-3 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: 'var(--btn-bg)', 
                      color: 'var(--btn-text)',
                      minHeight: '48px'
                    }}
                  >
                    Apply Filters
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Customization Modal - Using BottomSheet */}
      {customizationModal.is_open && (
        <BottomSheet
          isOpen={customizationModal.is_open}
          onClose={handleCloseCustomizationModal}
          title={customizationModal.item?.name || 'Product Details'}
          maxHeight="85vh"
          footer={customizationModal.item ? (
            <div className="space-y-3">
              {/* Total Price Display */}
              <div className="flex items-center justify-between px-1">
                <span className="text-lg font-semibold text-[var(--primary-text)]">Total:</span>
                <span className="text-3xl font-bold text-[var(--primary-text)]" style={{ letterSpacing: '-0.02em' }}>
                  €{(Number(customizationModal.total_price) * customizationModal.quantity).toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseCustomizationModal}
                  className="flex-1 px-6 py-3 border-2 border-[var(--primary-text)] rounded-[var(--radius-btn)] text-[var(--primary-text)] font-semibold hover:bg-[var(--primary-bg)] transition-colors"
                  style={{ minHeight: 'var(--tap-target-comfortable)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending}
                  className="flex-1 px-6 py-3 rounded-[var(--radius-btn)] bg-[var(--btn-bg)] text-white font-bold hover:bg-[#1A0F0D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ minHeight: 'var(--tap-target-comfortable)' }}
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
          ) : undefined}
        >
          {/* Error State: Product not found */}
          {!customizationModal.item ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-2">
                Something went wrong
              </h3>
              <p className="text-[var(--primary-text)]/70 mb-6">
                Unable to load product details. Please try again.
              </p>
              <button
                onClick={handleCloseCustomizationModal}
                className="px-6 py-3 rounded-[var(--radius-btn)] bg-[var(--btn-bg)] text-white font-bold hover:bg-[#1A0F0D] transition-colors"
                style={{ minHeight: 'var(--tap-target-comfortable)' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Item Header with Image */}
              <div className="flex gap-4 mb-6 p-4 bg-[var(--primary-bg)] rounded-[var(--radius-card)]">
            <img
              src={customizationModal.item.image_url || ''}
              alt={customizationModal.item.name}
              className="w-20 h-20 object-cover flex-shrink-0"
              style={{ borderRadius: 'var(--radius-card)' }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[var(--primary-text)] mb-1 leading-tight">
                {customizationModal.item.name}
              </h3>
              {customizationModal.item.description && (
                <p className="text-sm text-[var(--primary-text)]/70 line-clamp-2 leading-relaxed">
                  {customizationModal.item.description}
                </p>
              )}
            </div>
          </div>

          {/* Customization Groups */}
          {customizationModal.item.customization_groups.length > 0 ? (
            <div className="space-y-6">
              {customizationModal.item.customization_groups.map(group => (
                <div key={group.group_id} className="space-y-3">
                  <h4 className="text-base font-semibold text-[var(--primary-text)]">
                    {group.name}
                    {group.is_required && (
                      <span className="ml-2 text-red-600 text-sm">*</span>
                    )}
                  </h4>

                  <div className="space-y-2">
                    {group.options.map(option => {
                      const isSelected = customizationModal.selected_customizations.some(
                        c => c.group_id === group.group_id && c.option_id === option.option_id
                      );

                      return (
                        <label
                          key={option.option_id}
                          className={`flex items-center justify-between p-3 border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[var(--btn-bg)] bg-[var(--primary-bg)]'
                              : 'border-[var(--border-light)] hover:border-[var(--primary-text)]'
                          }`}
                          style={{ 
                            borderRadius: 'var(--radius-card)',
                            minHeight: '52px'
                          }}
                        >
                          <div className="flex items-center gap-3">
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
                              className={`w-5 h-5 text-[var(--btn-bg)] border-2 border-[var(--border-light)] focus:ring-2 focus:ring-[var(--primary-text)]/20 transition-all ${
                                group.type === 'single' ? '' : 'rounded'
                              }`}
                            />
                            <span className="text-[var(--primary-text)] font-medium">
                              {option.name}
                            </span>
                          </div>

                          {Number(option.additional_price) > 0 && (
                            <span className="text-[var(--primary-text)]/70 font-semibold">
                              +€{Number(option.additional_price).toFixed(2)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[var(--primary-text)]/70">Select quantity and add to your cart.</p>
            </div>
          )}

              {/* Quantity Selector - Using QuantityStepper */}
              <div className="mt-6 space-y-3">
                <h4 className="text-base font-semibold text-[var(--primary-text)]">Quantity</h4>
                <div className="flex justify-center">
                  <QuantityStepper
                    value={customizationModal.quantity}
                    onChange={(newQuantity) => setCustomizationModal(prev => ({
                      ...prev,
                      quantity: newQuantity
                    }))}
                    min={1}
                    max={99}
                    size="lg"
                  />
                </div>
              </div>
            </>
          )}
        </BottomSheet>
      )}
    </>
  );
};

export default UV_Menu;