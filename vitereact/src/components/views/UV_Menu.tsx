import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ProductCustomizerSheet } from '@/components/ui/product-customizer-sheet';
import { ProductBuilderSheet, BuilderStep, BuilderSelection } from '@/components/ui/product-builder-sheet';
import { attachModifiersToItem } from '@/utils/menuModifiers';

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

// Fetch builder config to determine which categories trigger the builder
const fetchBuilderConfig = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/menu/builder-config`);
    return response.data;
  } catch {
    // If builder config doesn't exist, return empty config
    return { config: null, builder_category_ids: [] };
  }
};

// Fetch builder steps with items
const fetchBuilderSteps = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/menu/builder-steps`);
    return response.data;
  } catch {
    return { steps: [] };
  }
};

// Add builder item to cart
const addBuilderItemToCart = async (data: {
  item_id: string;
  quantity: number;
  builder_selections: any;
}, authToken: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await axios.post(
    `${API_BASE_URL}/api/cart/builder`,
    data,
    { headers }
  );
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

  // Builder modal state
  const [builderModal, setBuilderModal] = useState<{
    is_open: boolean;
    item: MenuItem | null;
  }>({
    is_open: false,
    item: null,
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

  // React Query: Fetch Builder Config
  const { data: builderConfigData } = useQuery({
    queryKey: ['builder-config'],
    queryFn: fetchBuilderConfig,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const builderCategoryIds: string[] = useMemo(() => {
    return builderConfigData?.config?.builder_category_ids || [];
  }, [builderConfigData]);

  const builderEnabled = builderConfigData?.config?.enabled ?? false;
  const includeBaseItemPrice = builderConfigData?.config?.include_base_item_price ?? false;

  // React Query: Fetch Builder Steps (only when builder modal is open)
  const { data: builderStepsData, isLoading: builderStepsLoading, error: builderStepsError, refetch: refetchBuilderSteps } = useQuery({
    queryKey: ['builder-steps'],
    queryFn: fetchBuilderSteps,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: builderModal.is_open, // Only fetch when modal is open
    retry: 2, // Retry failed requests twice
  });

  const builderSteps: BuilderStep[] = useMemo(() => {
    return builderStepsData?.steps || [];
  }, [builderStepsData]);

  // Log errors for debugging
  useEffect(() => {
    if (builderStepsError) {
      console.error('Failed to load builder steps:', builderStepsError);
    }
  }, [builderStepsError]);

  // Check if an item should use the builder flow
  const isBuilderItem = (item: MenuItem): boolean => {
    return builderEnabled && builderCategoryIds.includes(item.category_id);
  };

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
    
    // Get drink items for modifier generation (if available)
    const drinkItems = menuItemsData.items
      .filter((item: any) => item.category_id === 'drinks' || (item.category_id && item.category_id.toLowerCase().includes('drink')))
      .map((item: any) => ({
        item_id: item.item_id,
        name: item.name,
        price: Number(item.price || 0),
      }));
    
    // Transform items to ensure proper data types (CRITICAL: PostgreSQL NUMERIC -> number)
    return menuItemsData.items.map((item: any) => {
      const transformedItem = {
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
      };
      
      // Attach modifiers dynamically if the item doesn't have customizations from DB
      return attachModifiersToItem(transformedItem, drinkItems);
    });
  }, [menuItemsData]);

  // React Query: Add to Cart Mutation
  const addToCartMutation = useMutation({
    mutationFn: (data: { item_id: string; quantity: number; selected_customizations: Record<string, any> }) => {
      setLoadingItemId(data.item_id);
      return addItemToCart(data, authToken);
    },
    onSuccess: () => {
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

  // React Query: Add Builder Item to Cart Mutation
  const addBuilderToCartMutation = useMutation({
    mutationFn: (data: { item_id: string; quantity: number; builder_selections: any; builder_unit_price: number }) => {
      if (builderModal.item) {
        setLoadingItemId(builderModal.item.item_id);
      }
      return addBuilderItemToCart(data, authToken);
    },
    onSuccess: (_response, variables) => {
      // Generate display name from selections
      const selections = variables.builder_selections;
      const base = selections.base?.name;
      const protein = selections.protein?.name;
      const itemName = builderModal.item?.name || 'Custom Item';
      const displayName = base && protein ? `${itemName} - ${base} + ${protein}` : itemName;

      // Update Zustand cart state
      if (builderModal.item) {
        const cartItem = {
          item_id: builderModal.item.item_id,
          item_name: displayName,
          quantity: variables.quantity,
          unit_price: variables.builder_unit_price,
          customizations: [], // Builder items have structure flattened or handled differently in cart display
          line_total: variables.builder_unit_price * variables.quantity,
          is_builder_item: true,
        };
        addToCartAction(cartItem);
      }

      // Clear loading state
      setLoadingItemId(null);

      // Close builder modal
      setBuilderModal({
        is_open: false,
        item: null,
      });

      // Show success notification
      toast({
        title: 'Success',
        description: 'Custom item added to cart!'
      });
    },
    onError: (error: any) => {
      // Clear loading state
      setLoadingItemId(null);
      
      // Show error notification
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add custom item to cart'
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
  }, [authToken, addToCartMutation, toast]);

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
      console.error('[Customization] Error: Item is null or undefined');
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

    // Set all state at once - no race condition, no requestAnimationFrame needed
    // The sheet will be rendered with the item data immediately
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

  // Builder modal handlers
  const handleOpenBuilderModal = (item: MenuItem) => {
    if (!item) {
      console.error('[Builder] Error: Item is null or undefined');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to load builder. Please try again.'
      });
      return;
    }

    setBuilderModal({
      is_open: true,
      item,
    });
  };

  const handleCloseBuilderModal = () => {
    setBuilderModal({
      is_open: false,
      item: null,
    });
  };

  const handleBuilderAddToCart = (selections: BuilderSelection[], totalPrice: number, quantity: number) => {
    if (!builderModal.item) return;

    // Transform selections to backend format
    const baseSelection = selections.find(s => s.step_key === 'base')?.items[0];
    const proteinSelection = selections.find(s => s.step_key === 'protein')?.items[0];
    const sauceSelection = selections.find(s => s.step_key === 'sauce')?.items[0];
    const toppingSelections = selections.find(s => s.step_key === 'toppings')?.items || [];

    if (!baseSelection || !proteinSelection || !sauceSelection) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please complete all required selections'
      });
      return;
    }

    // Build the backend-expected format
    const builderSelections = {
      base: {
        item_id: baseSelection.item_id,
        name: baseSelection.name,
        price: baseSelection.price
      },
      protein: {
        item_id: proteinSelection.item_id,
        name: proteinSelection.name,
        price: proteinSelection.price
      },
      sauce: {
        item_id: sauceSelection.item_id,
        name: sauceSelection.name,
        price: sauceSelection.price
      },
      toppings: toppingSelections.map(t => ({
        item_id: t.item_id,
        name: t.name,
        price: t.price
      }))
    };

    // Call backend API with proper format
    addBuilderToCartMutation.mutate({
      item_id: builderModal.item.item_id,
      quantity,
      builder_selections: builderSelections,
      builder_unit_price: totalPrice,
    });
  };

  const handleCustomizationChange = (
    groupId: string,
    groupName: string,
    groupType: 'single' | 'multiple' | 'single_optional',
    option: CustomizationOption
  ) => {
    setCustomizationModal(prev => {
      let newSelections = [...prev.selected_customizations];

      if (groupType === 'single' || groupType === 'single_optional') {
        // Remove existing selection for this group
        newSelections = newSelections.filter(s => s.group_id !== groupId);
        // Add new selection (unless it's "None" option being deselected)
        if (option.option_id !== 'none' || groupType === 'single_optional') {
          newSelections.push({
            group_id: groupId,
            group_name: groupName,
            option_id: option.option_id,
            option_name: option.name,
            additional_price: Number(option.additional_price),
          });
        }
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
    // Check if this item should use the builder flow (Subs/Wraps categories)
    if (isBuilderItem(item)) {
      handleOpenBuilderModal(item);
      return;
    }

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



  return (
    <>
      {/* Page Header - Optimized for Mobile */}
      <div style={{ backgroundColor: 'var(--primary-bg)', paddingTop: 'env(safe-area-inset-top)' }} className="border-b border-[#D4C5B0]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-8">
          <h1 className="text-[28px] sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight" style={{ color: 'var(--primary-text)' }}>
            Our Menu
          </h1>
          <p className="mt-2 text-[15px] sm:text-base lg:text-lg leading-relaxed" style={{ color: '#4A3B32', opacity: '0.9' }}>
            Discover our delicious selection of authentic dishes
          </p>
        </div>
      </div>

      {/* Main Content - Optimized Mobile Spacing */}
      <div 
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-8 lg:py-12" 
        style={{ 
          backgroundColor: 'var(--primary-bg)',
          paddingBottom: 'calc(96px + env(safe-area-inset-bottom) + 16px)'
        }}
      >
        {/* Compact Search & Filter Controls */}
        <div className="mb-5 space-y-3 sm:space-y-4">
          {/* Search Input - Full Width - Mobile Optimized */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--primary-text)] opacity-40"
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
              className="w-full pl-11 pr-11 py-3.5 text-[15px] bg-white border-2 border-[var(--border-light)] rounded-[14px] text-[var(--primary-text)] placeholder:text-[var(--primary-text)]/40 focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--primary-text)]/10 focus:outline-none transition-colors active:border-[var(--primary-text)]"
              style={{ minHeight: '50px', fontSize: '16px' }}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--primary-text)] opacity-40 hover:opacity-100 active:opacity-100 transition-opacity p-2"
                aria-label="Clear search"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>

          {/* Filter and Sort Row - 2 Column Grid - Mobile Optimized */}
          <div className="grid grid-cols-2 gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setFilterPanelOpen(true)}
              className="relative flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-[var(--border-light)] rounded-[14px] text-[var(--primary-text)] font-semibold hover:border-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/10 active:border-[var(--primary-text)] active:bg-[var(--primary-bg)] transition-colors sm:hidden"
              style={{ minHeight: '50px' }}
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              <span className="text-[15px]">Filters</span>
              {dietaryFilters.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[var(--btn-bg)] text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md">
                  {dietaryFilters.length}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="px-4 py-3.5 bg-white border-2 border-[var(--border-light)] rounded-[14px] text-[var(--primary-text)] font-semibold focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--primary-text)]/10 focus:outline-none active:border-[var(--primary-text)] transition-colors appearance-none bg-[length:1.25rem] bg-[position:right_1rem_center] bg-no-repeat pr-11"
              style={{ 
                minHeight: '50px',
                fontSize: '15px',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232C1A16' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
              }}
            >
              <option value="default">Sort by</option>
              <option value="name">Name (A-Z)</option>
              <option value="price_low_high">Price: Low-High</option>
              <option value="price_high_low">Price: High-Low</option>
            </select>
          </div>

          {/* Active Filters Display - Mobile Optimized */}
          {(activeCategory || dietaryFilters.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-700">Active filters:</span>
              
              {activeCategory && (
                <span className="inline-flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-800 text-[13px] font-semibold rounded-full">
                  {categories.find(c => c.category_id === activeCategory)?.name || activeCategory}
                  <button
                    onClick={() => handleCategoryChange(null)}
                    className="text-orange-600 hover:text-orange-800 active:text-orange-900 p-0.5"
                    aria-label="Remove category filter"
                    style={{ minWidth: '20px', minHeight: '20px' }}
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
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 text-[13px] font-semibold rounded-full"
                >
                  {dietaryOptions.find(d => d.value === filter)?.label || filter}
                  <button
                    onClick={() => handleDietaryFilterToggle(filter)}
                    className="text-green-600 hover:text-green-800 active:text-green-900 p-0.5"
                    aria-label={`Remove ${filter} filter`}
                    style={{ minWidth: '20px', minHeight: '20px' }}
                  >
                    <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </span>
              ))}

              <button
                onClick={handleClearFilters}
                className="text-[13px] text-orange-600 hover:text-orange-700 active:text-orange-800 font-semibold underline px-2 py-2"
                style={{ minHeight: '32px' }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Category Selection - Responsive - Mobile Optimized */}
        <div className="mb-5 sm:mb-6">
          {/* Mobile Dropdown (< 768px) */}
          <div className="block md:hidden">
            <label htmlFor="categorySelect" className="block text-[13px] font-bold text-[var(--primary-text)] mb-2 uppercase tracking-wide">
              Category
            </label>
            <select
              id="categorySelect"
              value={activeCategory || ''}
              onChange={(e) => {
                handleCategoryChange(e.target.value || null);
                setFilterPanelOpen(false);
              }}
              className="w-full px-4 py-3.5 bg-white border-2 border-[#D4C5B0] text-[var(--primary-text)] font-semibold focus:border-[var(--primary-text)] focus:ring-2 focus:ring-[var(--primary-text)]/10 focus:outline-none active:border-[var(--primary-text)] transition-colors appearance-none bg-[length:1.25rem] bg-[position:right_1rem_center] bg-no-repeat pr-11"
              style={{ 
                minHeight: '50px',
                borderRadius: '14px',
                fontSize: '15px',
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
                  inline-flex items-center justify-center px-5 rounded-full text-sm font-semibold whitespace-nowrap
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
                    inline-flex items-center justify-center px-5 rounded-full text-sm font-semibold whitespace-nowrap
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
              // Loading Skeleton - Mobile Optimized
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden animate-pulse"
                  >
                    <div className="h-56 bg-gray-200"></div>
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-full"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
                      <div className="h-[52px] bg-gray-200 rounded-[14px] mt-4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : itemsError ? (
              // Error State - Mobile Optimized
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full mb-4">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-[18px] sm:text-lg font-bold text-gray-900 mb-2">
                  Failed to load menu items
                </h3>
                <p className="text-[14px] sm:text-base text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                  Please try again later or contact support if the problem persists.
                </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 rounded-[14px] font-bold text-[15px] transition-colors active:scale-95"
                    style={{ 
                      backgroundColor: 'var(--btn-bg)', 
                      color: 'var(--btn-text)',
                      minHeight: '52px'
                    }}
                  >
                    Retry
                  </button>
              </div>
            ) : menuItems.length === 0 ? (
              // Empty State - Mobile Optimized
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-[18px] sm:text-lg font-bold text-gray-900 mb-2">
                  No menu items found
                </h3>
                <p className="text-[14px] sm:text-base text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                  Try adjusting your filters or search terms
                </p>
                  <button
                    onClick={handleClearFilters}
                    className="px-8 py-4 rounded-[14px] font-bold text-[15px] transition-colors active:scale-95"
                    style={{ 
                      backgroundColor: 'var(--btn-bg)', 
                      color: 'var(--btn-text)',
                      minHeight: '52px'
                    }}
                  >
                    Clear all filters
                  </button>
              </div>
            ) : (
              // Mobile-First Product Grid: 1 col mobile, 2 cols tablet, 3 cols desktop - Optimized
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                {menuItems.map(item => {
                  const stockStatus = getStockStatus(item);
                  const isOutOfStock = stockStatus === 'out_of_stock';
                  const isLowStock = stockStatus === 'low_stock';

                  return (
                    <div
                      key={item.item_id}
                      className={`bg-white overflow-hidden transition-all duration-200 border-2 border-[var(--border-light)] hover:shadow-soft-lg hover:border-[var(--primary-text)]/20 sm:hover:-translate-y-1 ${
                        isOutOfStock ? 'opacity-60' : ''
                      }`}
                      style={{ borderRadius: '16px' }}
                    >
                      {/* Item Image - 4:3 aspect ratio for better mobile display */}
                      <div className="relative w-full bg-gray-50" style={{ aspectRatio: '4/3' }}>
                        <img
                          src={item.image_url || ''}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* Badges - Mobile Optimized */}
                        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex flex-col gap-1.5 sm:gap-2">
                          {item.is_limited_edition && (
                            <span className="px-2.5 py-1.5 bg-purple-600 text-white text-[11px] sm:text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                              Limited Edition
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="px-2.5 py-1.5 bg-red-600 text-white text-[11px] sm:text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                              Sold Out
                            </span>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <span className="px-2.5 py-1.5 bg-orange-500 text-white text-[11px] sm:text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                              Only {item.current_stock} left
                            </span>
                          )}
                        </div>

                        {/* Dietary Tags - Mobile Optimized */}
                        {item.dietary_tags && item.dietary_tags.length > 0 && (
                          <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 flex gap-1.5">
                            {item.dietary_tags.map(tag => {
                              const option = dietaryOptions.find(d => d.value === tag);
                              return option ? (
                                <span
                                  key={tag}
                                  className="w-8 h-8 sm:w-9 sm:h-9 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center text-base sm:text-lg shadow-lg border border-gray-100"
                                  title={option.label}
                                >
                                  {option.icon}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      {/* Item Details - Mobile Optimized */}
                      <div className="p-4 sm:p-5">
                        <h3 className="text-[17px] sm:text-lg font-bold text-gray-900 mb-2 leading-tight">
                          {item.name}
                        </h3>
                        
                        {item.description && (
                          <p className="text-gray-600 text-[14px] sm:text-sm mb-3.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mb-3.5">
                          <span className="text-[22px] sm:text-2xl font-bold text-[#2C1A16]" style={{ letterSpacing: '-0.01em' }}>
                            €{Number(item.price).toFixed(2)}
                          </span>

                          {item.customization_groups.length > 0 && (
                            <span className="px-2.5 py-1 bg-[#F2EFE9] text-[#2C1A16] text-[11px] sm:text-xs font-bold rounded-full border border-[#D4C5B0]">
                              Customizable
                            </span>
                          )}
                        </div>

                        {/* Add to Cart Button - Mobile Optimized */}
                        <button
                          onClick={() => handleQuickAddToCart(item)}
                          disabled={isOutOfStock || loadingItemId === item.item_id}
                          className={`w-full px-5 py-4 rounded-[14px] font-bold text-[15px] transition-all duration-200 flex items-center justify-center add-to-cart-btn ${
                            isOutOfStock
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : loadingItemId === item.item_id
                              ? 'opacity-75 cursor-wait'
                              : 'active:scale-[0.98] sm:hover:shadow-lg sm:hover:-translate-y-0.5'
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
                          ) : isBuilderItem(item) ? (
                            'Build Your Own'
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

      {/* Product Customization Modal - Using ProductCustomizerSheet */}
      <ProductCustomizerSheet
        isOpen={customizationModal.is_open}
        onClose={handleCloseCustomizationModal}
        item={customizationModal.item}
        selectedCustomizations={customizationModal.selected_customizations}
        quantity={customizationModal.quantity}
        totalPrice={customizationModal.total_price}
        onCustomizationChange={handleCustomizationChange}
        onQuantityChange={(newQuantity) => setCustomizationModal(prev => ({
          ...prev,
          quantity: newQuantity
        }))}
        onAddToCart={handleAddToCart}
        isLoading={addToCartMutation.isPending}
      />

      {/* Product Builder Modal - For Subs/Wraps categories */}
      <ProductBuilderSheet
        isOpen={builderModal.is_open}
        onClose={handleCloseBuilderModal}
        productName={builderModal.item?.name || 'Custom Item'}
        productImageUrl={builderModal.item?.image_url}
        basePrice={includeBaseItemPrice ? Number(builderModal.item?.price || 0) : 0}
        steps={builderSteps}
        onAddToCart={handleBuilderAddToCart}
        isLoading={addBuilderToCartMutation.isPending || builderStepsLoading}
        error={builderStepsError ? (builderStepsError as Error).message || 'Failed to load customization options' : null}
        onRetry={() => refetchBuilderSteps()}
      />
    </>
  );
};

export default UV_Menu;