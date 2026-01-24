import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Search,
  Plus,
  Edit,
  Copy,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle,
  Loader2,
  Folder,
  X,
  Info,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

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
  limited_edition_end_date: string | null;
  is_active: boolean;
  available_for_collection: boolean;
  available_for_delivery: boolean;
  stock_tracked: boolean;
  current_stock: number | null;
  low_stock_threshold: number | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  category_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface MenuItemsResponse {
  items: MenuItem[];
  total: number;
}

interface CategoriesResponse {
  categories: Category[];
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchMenuItems = async (
  token: string,
  category?: string | null,
  isActive?: string | null,
  search?: string
): Promise<MenuItemsResponse> => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (isActive) params.append('is_active', isActive);
  if (search) params.append('search', search);
  params.append('_t', Date.now().toString());

  const response = await axios.get(
    `${API_BASE_URL}/api/admin/menu/items?${params.toString()}`,
    {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    }
  );

  return {
    ...response.data,
    items: response.data.items.map((item: any) => ({
      ...item,
      price: Number(item.price || 0),
      current_stock: item.current_stock !== null ? Number(item.current_stock) : null,
      low_stock_threshold: item.low_stock_threshold !== null ? Number(item.low_stock_threshold) : null,
      sort_order: Number(item.sort_order || 0),
    })),
  };
};

const fetchCategories = async (token: string): Promise<CategoriesResponse> => {
  const response = await axios.get(`${API_BASE_URL}/api/admin/menu/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const toggleItemStatus = async (
  token: string,
  itemId: string,
  isActive: boolean
): Promise<void> => {
  await axios.put(
    `${API_BASE_URL}/api/admin/menu/items/${itemId}`,
    { is_active: isActive },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

const deleteMenuItem = async (token: string, itemId: string): Promise<{ success: boolean; deletedId: string }> => {
  const response = await axios.delete(`${API_BASE_URL}/api/admin/menu/items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (response.status === 200 || response.status === 204) {
    return { success: true, deletedId: itemId };
  }
  
  throw new Error('Failed to delete item');
};

const duplicateMenuItem = async (
  token: string,
  itemId: string
): Promise<{ item: MenuItem }> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/admin/menu/items/${itemId}/duplicate`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return {
    item: {
      ...response.data.item,
      price: Number(response.data.item.price || 0),
      current_stock: response.data.item.current_stock !== null ? Number(response.data.item.current_stock) : null,
      sort_order: Number(response.data.item.sort_order || 0),
    },
  };
};

const syncMenuFromPDF = async (token: string): Promise<{ success: boolean; summary: any; source: any }> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/admin/menu/sync-from-pdf`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_AdminMenuList: React.FC = () => {
  const authToken = useAppStore((state) => state.authentication_state.auth_token);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // URL param state
  const categoryParam = searchParams.get('category');
  const statusParam = searchParams.get('status');

  // Local state
  const [selectedCategoryFilter] = useState<string | null>(categoryParam);
  const [selectedStatusFilter] = useState<string | null>(statusParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('featured');

  // Category refs for intersection observer
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync filters with URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategoryFilter) params.set('category', selectedCategoryFilter);
    if (selectedStatusFilter) params.set('status', selectedStatusFilter);
    setSearchParams(params, { replace: true });
  }, [selectedCategoryFilter, selectedStatusFilter, setSearchParams]);

  // Intersection Observer for scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      {
        threshold: [0.1, 0.5, 0.8],
        rootMargin: '-100px 0px -70% 0px',
      }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Fetch categories
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => fetchCategories(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch menu items
  const {
    data: menuItemsData,
    isLoading: itemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: ['admin-menu-items', selectedCategoryFilter, selectedStatusFilter, debouncedSearch],
    queryFn: async () => {
      const result = await fetchMenuItems(
        authToken!,
        selectedCategoryFilter,
        selectedStatusFilter,
        debouncedSearch
      );
      return result;
    },
    enabled: !!authToken,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Toggle item status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ itemId, isActive }: { itemId: string; isActive: boolean }) =>
      toggleItemStatus(authToken!, itemId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      setSuccessMessage('Item status updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => deleteMenuItem(authToken!, itemId),
    onMutate: async (itemId: string) => {
      setDeletingItemId(itemId);
      await queryClient.cancelQueries({ queryKey: ['admin-menu-items'] });
      const previousData = queryClient.getQueryData(['admin-menu-items', selectedCategoryFilter, selectedStatusFilter, debouncedSearch]);
      return { previousData };
    },
    onSuccess: (data, itemId) => {
      queryClient.setQueryData(
        ['admin-menu-items', selectedCategoryFilter, selectedStatusFilter, debouncedSearch],
        (old: MenuItemsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((item) => item.item_id !== itemId),
            total: old.total - 1,
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      setDeleteConfirmItemId(null);
      setDeletingItemId(null);
      setSuccessMessage('Item deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any, itemId, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['admin-menu-items', selectedCategoryFilter, selectedStatusFilter, debouncedSearch],
          context.previousData
        );
      }
      setDeletingItemId(null);
      setDeleteConfirmItemId(null);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to delete item';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Duplicate item mutation
  const duplicateItemMutation = useMutation({
    mutationFn: (itemId: string) => duplicateMenuItem(authToken!, itemId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      navigate(`/admin/menu/item?item_id=${data.item.item_id}`);
    },
  });

  // PDF Sync mutation
  const syncPDFMutation = useMutation({
    mutationFn: () => syncMenuFromPDF(authToken!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
      const summary = data.summary;
      setSuccessMessage(
        `Menu synced from PDF! ${summary.totalCategories} categories, ${summary.totalItems} items (${summary.itemsCreated} new, ${summary.itemsUpdated} updated)`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to sync menu from PDF';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Handlers
  const handleToggleItemStatus = (itemId: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ itemId, isActive: !currentStatus });
  };

  const handleDeleteItem = (itemId: string) => {
    setDeleteConfirmItemId(itemId);
  };

  const confirmDelete = () => {
    if (deleteConfirmItemId) {
      deleteItemMutation.mutate(deleteConfirmItemId);
    }
  };

  const handleDuplicateItem = (itemId: string) => {
    duplicateItemMutation.mutate(itemId);
  };

  // Smooth scroll to category
  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveCategory(categoryId);
    }
  };

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const categories = categoriesData?.categories || [];
    const items = menuItemsData?.items || [];
    
    const grouped: Record<string, { category: Category; items: MenuItem[] }> = {};
    
    categories.forEach(cat => {
      grouped[cat.category_id] = { category: cat, items: [] };
    });
    
    items.forEach(item => {
      if (grouped[item.category_id]) {
        grouped[item.category_id].items.push(item);
      }
    });
    
    return Object.values(grouped).filter(g => g.items.length > 0);
  }, [categoriesData, menuItemsData]);

  // Featured items
  const featuredItems = useMemo(() => {
    return (menuItemsData?.items || []).filter(item => item.is_featured);
  }, [menuItemsData]);

  // Filtered data based on search
  const filteredCategories = useMemo(() => {
    if (!debouncedSearch.trim()) return itemsByCategory;
    
    return itemsByCategory.map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    })).filter(group => group.items.length > 0);
  }, [itemsByCategory, debouncedSearch]);

  // Filtered featured items
  const filteredFeaturedItems = useMemo(() => {
    if (!debouncedSearch.trim()) return featuredItems;
    return featuredItems.filter(item =>
      item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [featuredItems, debouncedSearch]);

  // Stock status helper
  const getStockStatus = (item: MenuItem): { status: string; color: string } => {
    if (!item.stock_tracked) {
      return { status: 'Not Tracked', color: 'gray' };
    }
    if (item.current_stock === null || item.current_stock === 0) {
      return { status: 'Out of Stock', color: 'red' };
    }
    if (
      item.low_stock_threshold !== null &&
      item.current_stock <= item.low_stock_threshold
    ) {
      return { status: 'Low Stock', color: 'yellow' };
    }
    return { status: 'In Stock', color: 'green' };
  };

  // Render loading state
  if (categoriesLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading menu items...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (categoriesError || itemsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Data</h2>
          <p className="text-gray-600 mb-6">
            {(categoriesError as Error)?.message || (itemsError as Error)?.message}
          </p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
              queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
            }}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const categories = categoriesData?.categories || [];
  const menuItems = menuItemsData?.items || [];

  return (
    <div className="bg-white min-h-screen font-sans text-[#2C1A16]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
            
            {/* Search Bar */}
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border-none rounded-full focus:ring-2 focus:ring-[#2C1A16]/10 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => syncPDFMutation.mutate()}
                disabled={syncPDFMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-[#2C1A16] rounded-lg text-sm font-medium text-[#2C1A16] bg-white hover:bg-[#F9F5F0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync menu from PDF in storage"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncPDFMutation.isPending ? 'animate-spin' : ''}`} />
                {syncPDFMutation.isPending ? 'Syncing...' : 'Sync from PDF'}
              </button>
              <Link
                to="/admin/menu/categories"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Folder className="h-4 w-4 mr-2" />
                Categories
              </Link>
              <Link
                to="/admin/menu/item"
                className="inline-flex items-center px-4 py-2 bg-[#2C1A16] text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Layout (3-Column) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 relative">
          
          {/* LEFT COLUMN: Navigation Sidebar (Sticky) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-thin">
              <nav className="space-y-1">
                {featuredItems.length > 0 && (
                  <button
                    onClick={() => scrollToCategory('featured')}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === 'featured'
                        ? 'bg-[#2C1A16] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-[#F9F5F0] hover:text-[#2C1A16]'
                    }`}
                  >
                    Featured Items
                  </button>
                )}
                {categories.map((category) => (
                  <button
                    key={category.category_id}
                    onClick={() => scrollToCategory(category.category_id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === category.category_id
                        ? 'bg-[#2C1A16] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-[#F9F5F0] hover:text-[#2C1A16]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* CENTER COLUMN: Menu Feed */}
          <main className="flex-1 min-w-0">
            {/* Featured Items Section */}
            {!debouncedSearch && filteredFeaturedItems.length > 0 && (
              <section
                id="featured"
                ref={(el) => (categoryRefs.current['featured'] = el)}
                className="mb-10 scroll-mt-24"
              >
                <h2 className="text-xl font-bold mb-6 text-[#2C1A16]">Featured Items</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredFeaturedItems.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <div
                        key={item.item_id}
                        className={`group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all flex flex-col h-full relative ${
                          !item.is_active ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Status Badge */}
                        <div className="absolute top-2 left-2 z-10 flex gap-1">
                          {!item.is_active && (
                            <span className="px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded">
                              Inactive
                            </span>
                          )}
                          {item.is_limited_edition && (
                            <span className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded">
                              Limited
                            </span>
                          )}
                        </div>

                        <div className="relative aspect-[4/3] bg-[#F9F5F0] rounded-lg overflow-hidden mb-4">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                              <Package className="w-12 h-12 text-orange-300" />
                            </div>
                          )}
                          
                          {/* Admin Action Buttons */}
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            <button
                              onClick={() => handleToggleItemStatus(item.item_id, item.is_active)}
                              className="w-8 h-8 rounded-full bg-white text-gray-600 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
                              title={item.is_active ? 'Disable' : 'Enable'}
                            >
                              {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <Link
                              to={`/admin/menu/item?item_id=${item.item_id}`}
                              className="w-8 h-8 rounded-full bg-white text-blue-600 shadow-md flex items-center justify-center hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDuplicateItem(item.item_id)}
                              className="w-8 h-8 rounded-full bg-white text-green-600 shadow-md flex items-center justify-center hover:bg-green-50 transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.item_id)}
                              className="w-8 h-8 rounded-full bg-white text-red-600 shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-900 group-hover:text-[#2C1A16] transition-colors">
                              {item.name}
                            </h3>
                          </div>
                          <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#2C1A16]">
                              €{item.price.toFixed(2)}
                            </span>
                            <div className="flex gap-1">
                              {item.dietary_tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* Stock Status */}
                          {item.stock_tracked && (
                            <div className="mt-2">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded ${
                                  stockStatus.color === 'red'
                                    ? 'bg-red-100 text-red-700'
                                    : stockStatus.color === 'yellow'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {stockStatus.status}{item.current_stock !== null && ` (${item.current_stock})`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Menu Categories */}
            {filteredCategories.map((group) => (
              <section
                key={group.category.category_id}
                id={group.category.category_id}
                ref={(el) => (categoryRefs.current[group.category.category_id] = el)}
                className="mb-10 scroll-mt-24"
              >
                <div className="flex items-baseline justify-between mb-4 border-b border-gray-100 pb-2">
                  <h2 className="text-xl font-bold text-[#2C1A16]">{group.category.name}</h2>
                  <span className="text-sm text-gray-400">{group.items.length} items</span>
                </div>

                {group.category.description && (
                  <p className="text-sm text-gray-500 mb-6 bg-[#F9F5F0] p-3 rounded-lg inline-block">
                    <Info className="w-4 h-4 inline mr-2 text-[#2C1A16]" />
                    {group.category.description}
                  </p>
                )}

                <div className="space-y-4">
                  {group.items.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <div
                        key={item.item_id}
                        className={`group bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all flex justify-between gap-4 relative ${
                          !item.is_active ? 'opacity-60 bg-gray-50' : ''
                        }`}
                      >
                        {/* Left Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 group-hover:text-[#2C1A16] transition-colors">
                              {item.name}
                            </h3>
                            {!item.is_active && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                                Inactive
                              </span>
                            )}
                            {item.is_featured && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                                Featured
                              </span>
                            )}
                            {item.is_limited_edition && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                Limited
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-3 mt-auto">
                            <span className="font-semibold text-[#2C1A16]">
                              €{item.price.toFixed(2)}
                            </span>
                            {item.dietary_tags?.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {item.stock_tracked && (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  stockStatus.color === 'red'
                                    ? 'bg-red-100 text-red-700'
                                    : stockStatus.color === 'yellow'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {stockStatus.status}{item.current_stock !== null && ` (${item.current_stock})`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Visual & Actions */}
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                          <div className="w-full h-full bg-[#F9F5F0] rounded-xl overflow-hidden">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          
                          {/* Admin Action Buttons */}
                          <div className="absolute -bottom-2 -right-2 flex gap-1 z-10">
                            <button
                              onClick={() => handleToggleItemStatus(item.item_id, item.is_active)}
                              className="w-8 h-8 rounded-full bg-white text-gray-600 shadow-md border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              title={item.is_active ? 'Disable' : 'Enable'}
                            >
                              {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <Link
                              to={`/admin/menu/item?item_id=${item.item_id}`}
                              className="w-8 h-8 rounded-full bg-white text-blue-600 shadow-md border border-gray-100 flex items-center justify-center hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDuplicateItem(item.item_id)}
                              className="w-8 h-8 rounded-full bg-white text-green-600 shadow-md border border-gray-100 flex items-center justify-center hover:bg-green-50 transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.item_id)}
                              className="w-8 h-8 rounded-full bg-white text-red-600 shadow-md border border-gray-100 flex items-center justify-center hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            
            {/* No Results Message */}
            {debouncedSearch && filteredCategories.length === 0 && filteredFeaturedItems.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500">
                  Try searching for something else
                </p>
              </div>
            )}

            {/* Empty State */}
            {!debouncedSearch && menuItems.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-600 mb-6">
                  Get started by adding your first menu item
                </p>
                <Link
                  to="/admin/menu/item"
                  className="inline-flex items-center px-6 py-3 bg-[#2C1A16] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add First Item
                </Link>
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: Quick Stats (Sticky) */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
              <div className="p-5 border-b border-gray-100 bg-[#F9F5F0]">
                <h2 className="text-lg font-bold text-[#2C1A16] flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Menu Stats
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F9F5F0] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#2C1A16]">{menuItems.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Total Items</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {menuItems.filter(i => i.is_active).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Active</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {menuItems.filter(i => !i.is_active).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Inactive</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {menuItems.filter(i => i.is_featured).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Featured</div>
                  </div>
                </div>

                {/* Categories Breakdown */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Items by Category</h3>
                  <div className="space-y-2">
                    {categories.map(cat => {
                      const count = menuItems.filter(i => i.category_id === cat.category_id).length;
                      return (
                        <div key={cat.category_id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{cat.name}</span>
                          <span className="font-medium text-[#2C1A16]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Low Stock Alert */}
                {menuItems.some(i => i.stock_tracked && i.current_stock !== null && i.low_stock_threshold !== null && i.current_stock <= i.low_stock_threshold) && (
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Low Stock Items
                    </h3>
                    <div className="space-y-2">
                      {menuItems
                        .filter(i => i.stock_tracked && i.current_stock !== null && i.low_stock_threshold !== null && i.current_stock <= i.low_stock_threshold)
                        .map(item => (
                          <div key={item.item_id} className="flex justify-between text-sm bg-red-50 p-2 rounded">
                            <span className="text-gray-700 truncate">{item.name}</span>
                            <span className="font-medium text-red-600">{item.current_stock}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                <Link
                  to="/admin/menu/item"
                  className="w-full py-3 bg-[#2C1A16] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add New Item
                </Link>
                <Link
                  to="/admin/menu/categories"
                  className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Folder className="w-5 h-5" />
                  Manage Categories
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmItemId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Menu Item</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete this item? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmItemId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingItemId !== null || deleteItemMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {deletingItemId !== null ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Item'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UV_AdminMenuList;
