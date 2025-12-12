import React, { useState, useEffect } from 'react';
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
  ToggleLeft,
  ToggleRight,
  Package,
  AlertCircle,
  CheckCircle,
  Loader2,
  GripVertical,
  Folder,
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

  const response = await axios.get(
    `${API_BASE_URL}/api/admin/menu/items?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  // CRITICAL: Convert NUMERIC fields from strings to numbers
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

const deleteMenuItem = async (token: string, itemId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/admin/menu/items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
  
  // Convert NUMERIC fields
  return {
    item: {
      ...response.data.item,
      price: Number(response.data.item.price || 0),
      current_stock: response.data.item.current_stock !== null ? Number(response.data.item.current_stock) : null,
      sort_order: Number(response.data.item.sort_order || 0),
    },
  };
};

const updateItemSortOrder = async (
  token: string,
  itemId: string,
  sortOrder: number
): Promise<void> => {
  await axios.put(
    `${API_BASE_URL}/api/admin/menu/items/${itemId}`,
    { sort_order: sortOrder },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

// ===========================
// Main Component
// ===========================

const UV_AdminMenuList: React.FC = () => {
  // Global state - CRITICAL: Individual selectors only
  const authToken = useAppStore((state) => state.authentication_state.auth_token);

  // Router hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // URL param state
  const categoryParam = searchParams.get('category');
  const statusParam = searchParams.get('status');

  // Local state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(
    categoryParam
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(
    statusParam
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [dragReorderActive, setDragReorderActive] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);

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

  // Fetch categories
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => fetchCategories(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch menu items
  const {
    data: menuItemsData,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: [
      'admin-menu-items',
      selectedCategoryFilter,
      selectedStatusFilter,
      debouncedSearch,
    ],
    queryFn: () =>
      fetchMenuItems(
        authToken!,
        selectedCategoryFilter,
        selectedStatusFilter,
        debouncedSearch
      ),
    enabled: !!authToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      setSuccessMessage('Item deleted successfully');
      setDeleteConfirmItemId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
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

  // Update sort order mutation
  const updateSortOrderMutation = useMutation({
    mutationFn: ({ itemId, sortOrder }: { itemId: string; sortOrder: number }) =>
      updateItemSortOrder(authToken!, itemId, sortOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      setSuccessMessage('Items reordered successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Handlers
  const handleCategoryFilterChange = (categoryId: string | null) => {
    setSelectedCategoryFilter(categoryId);
    setSelectedItems([]); // Clear selections on filter change
  };

  const handleStatusFilterChange = (status: string | null) => {
    setSelectedStatusFilter(status);
    setSelectedItems([]); // Clear selections on filter change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedItems([]); // Clear selections on search
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === menuItemsData?.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(menuItemsData?.items.map((item) => item.item_id) || []);
    }
  };

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

  const handleBulkEnable = async () => {
    for (const itemId of selectedItems) {
      await toggleStatusMutation.mutateAsync({ itemId, isActive: true });
    }
    setSelectedItems([]);
    setSuccessMessage(`${selectedItems.length} items enabled successfully`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleBulkDisable = async () => {
    for (const itemId of selectedItems) {
      await toggleStatusMutation.mutateAsync({ itemId, isActive: false });
    }
    setSelectedItems([]);
    setSuccessMessage(`${selectedItems.length} items disabled successfully`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedItems.length} items? This cannot be undone.`)) {
      for (const itemId of selectedItems) {
        await deleteItemMutation.mutateAsync(itemId);
      }
      setSelectedItems([]);
      setSuccessMessage(`${selectedItems.length} items deleted successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    
    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      return;
    }

    const items = menuItemsData?.items || [];
    const draggedIndex = items.findIndex((item) => item.item_id === draggedItemId);
    const targetIndex = items.findIndex((item) => item.item_id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder items
    const reorderedItems = [...items];
    const [draggedItem] = reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, draggedItem);

    // Update sort_order for affected items
    const updates: Array<{ itemId: string; sortOrder: number }> = [];
    reorderedItems.forEach((item, index) => {
      if (item.sort_order !== index) {
        updates.push({ itemId: item.item_id, sortOrder: index });
      }
    });

    // Batch update sort orders
    Promise.all(
      updates.map((update) =>
        updateSortOrderMutation.mutateAsync(update)
      )
    ).then(() => {
      refetchItems();
    });

    setDraggedItemId(null);
  };

  // Get category name helper
  const getCategoryName = (categoryId: string): string => {
    const category = categoriesData?.categories.find((cat) => cat.category_id === categoryId);
    return category?.name || 'Unknown';
  };

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
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading menu items...</p>
          </div>
        </div>
      </>
    );
  }

  // Render error state
  if (categoriesError || itemsError) {
    return (
      <>
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
      </>
    );
  }

  const categories = categoriesData?.categories || [];
  const menuItems = menuItemsData?.items || [];
  const allSelected = selectedItems.length === menuItems.length && menuItems.length > 0;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your menu items, categories, and availability
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/admin/menu/categories"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Manage Categories
                </Link>
                <Link
                  to="/admin/menu/item"
                  className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Item
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search menu items..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="sm:w-64">
                <select
                  value={selectedCategoryFilter || ''}
                  onChange={(e) =>
                    handleCategoryFilterChange(e.target.value || null)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusFilterChange(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatusFilter === null
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleStatusFilterChange('true')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatusFilter === 'true'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => handleStatusFilterChange('false')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatusFilter === 'false'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedItems.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-orange-900">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedItems([])}
                  className="text-orange-700 hover:text-orange-900 text-sm font-medium"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkEnable}
                  disabled={toggleStatusMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enable All
                </button>
                <button
                  onClick={handleBulkDisable}
                  disabled={toggleStatusMutation.isPending}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disable All
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleteItemMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete All
                </button>
              </div>
            </div>
          )}

          {/* Reorder Mode Toggle */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Drag & Drop Reordering</h3>
              <p className="text-sm text-gray-600 mt-1">
                Enable to reorder items by dragging them
              </p>
            </div>
            <button
              onClick={() => setDragReorderActive(!dragReorderActive)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                dragReorderActive
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {dragReorderActive ? 'Disable Reordering' : 'Enable Reordering'}
            </button>
          </div>

          {/* Menu Items Grid */}
          {menuItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No menu items found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategoryFilter || selectedStatusFilter
                  ? 'Try adjusting your filters or search query'
                  : 'Get started by adding your first menu item'}
              </p>
              <Link
                to="/admin/menu/item"
                className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add First Item
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Checkbox */}
              <div className="flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Select All</span>
              </div>

              {/* Items List */}
              {menuItems.map((item) => {
                const stockStatus = getStockStatus(item);
                const isSelected = selectedItems.includes(item.item_id);

                return (
                  <div
                    key={item.item_id}
                    draggable={dragReorderActive}
                    onDragStart={(e) => handleDragStart(e, item.item_id)}
                    onDragOver={dragReorderActive ? handleDragOver : undefined}
                    onDrop={dragReorderActive ? (e) => handleDrop(e, item.item_id) : undefined}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all ${
                      dragReorderActive ? 'cursor-move' : ''
                    } ${draggedItemId === item.item_id ? 'opacity-50' : ''} ${
                      isSelected ? 'ring-2 ring-orange-500' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Drag Handle & Checkbox */}
                      <div className="flex flex-col items-center gap-2">
                        {dragReorderActive && (
                          <GripVertical className="h-6 w-6 text-gray-400" />
                        )}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectItem(item.item_id)}
                          className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                      </div>

                      {/* Item Image */}
                      <div className="flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-24 w-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xl font-bold text-gray-900">
                            €{item.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Category & Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {getCategoryName(item.category_id)}
                          </span>
                          {item.dietary_tags &&
                            item.dietary_tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                              item.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {item.is_featured && (
                            <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                              Featured
                            </span>
                          )}
                          {item.is_limited_edition && (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                              Limited Edition
                            </span>
                          )}
                          {item.stock_tracked && (
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                                stockStatus.color === 'red'
                                  ? 'bg-red-100 text-red-800'
                                  : stockStatus.color === 'yellow'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {stockStatus.status}
                              {item.current_stock !== null && ` (${item.current_stock})`}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleToggleItemStatus(item.item_id, item.is_active)
                            }
                            disabled={toggleStatusMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            {item.is_active ? (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-1" />
                                Disable
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4 mr-1" />
                                Enable
                              </>
                            )}
                          </button>
                          <Link
                            to={`/admin/menu/item?item_id=${item.item_id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDuplicateItem(item.item_id)}
                            disabled={duplicateItemMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.item_id)}
                            disabled={deleteItemMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  disabled={deleteItemMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteItemMutation.isPending ? 'Deleting...' : 'Delete Item'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminMenuList;