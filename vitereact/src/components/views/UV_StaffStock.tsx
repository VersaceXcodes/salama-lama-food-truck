import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  RefreshCw,



  BarChart3
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface StockItem {
  item_id: string;
  name: string;
  category_id: string;
  category_name: string;
  current_stock: number | null;
  low_stock_threshold: number | null;
  stock_tracked: boolean;
  stock_status: 'ok' | 'low_stock' | 'out_of_stock';
  is_active: boolean;
  image_url: string | null;
}

interface StockSummary {
  total_items_tracked: number;
  low_stock_count: number;
  out_of_stock_count: number;
  items_ok_count: number;
}

interface Category {
  category_id: string;
  name: string;
}

interface StockUpdatePayload {
  item_id: string;
  change_type: 'restock' | 'adjustment' | 'waste';
  quantity: number;
  reason?: string;
  notes?: string;
}

interface StockAPIResponse {
  items: Array<{
    item_id: string;
    name: string;
    category_id: string;
    category_name: string;
    current_stock: number | null;
    low_stock_threshold: number | null;
    stock_tracked: boolean;
    is_active: boolean;
    image_url: string | null;
  }>;
}

// ===========================
// API Functions
// ===========================

const fetchStockLevels = async (
  token: string | null,
  category: string | null,
  status: string | null
): Promise<{ stock_items: StockItem[]; stock_summary: StockSummary }> => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (status && status !== 'all') params.append('status', status);

  const response = await axios.get<StockAPIResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/stock`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    }
  );

  const items = response.data.items;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let itemsOkCount = 0;

  const stockItems: StockItem[] = items.map((item) => {
    let stock_status: 'ok' | 'low_stock' | 'out_of_stock' = 'ok';
    
    if (item.stock_tracked) {
      if (item.current_stock === 0) {
        stock_status = 'out_of_stock';
        outOfStockCount++;
      } else if (
        item.current_stock !== null &&
        item.low_stock_threshold !== null &&
        item.current_stock <= item.low_stock_threshold
      ) {
        stock_status = 'low_stock';
        lowStockCount++;
      } else {
        itemsOkCount++;
      }
    } else {
      itemsOkCount++;
    }

    return {
      item_id: item.item_id,
      name: item.name,
      category_id: item.category_id,
      category_name: item.category_name,
      current_stock: item.current_stock,
      low_stock_threshold: item.low_stock_threshold,
      stock_tracked: item.stock_tracked,
      stock_status,
      is_active: item.is_active,
      image_url: item.image_url,
    };
  });

  return {
    stock_items: stockItems,
    stock_summary: {
      total_items_tracked: items.filter((i) => i.stock_tracked).length,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      items_ok_count: itemsOkCount,
    },
  };
};

const updateItemStock = async (
  token: string | null,
  payload: StockUpdatePayload
): Promise<any> => {
  const { item_id, ...body } = payload;
  
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/stock/${item_id}`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

const fetchCategories = async (token: string | null): Promise<Category[]> => {
  const response = await axios.get<{ categories: Category[] }>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/menu/categories`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.categories;
};

// ===========================
// Main Component
// ===========================

const UV_StaffStock: React.FC = () => {
  // URL params for filters
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Global state access - CRITICAL: Individual selectors
  const authToken = useAppStore((state) => state.authentication_state.auth_token);
  // const currentUser = useAppStore((state) => state.authentication_state.current_user);
  
  // Local state
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [stockUpdateLoading, setStockUpdateLoading] = useState<Record<string, boolean>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [updateForms, setUpdateForms] = useState<Record<string, {
    change_type: 'restock' | 'adjustment' | 'waste';
    quantity: string;
    reason: string;
    notes: string;
  }>>({});

  // React Query client
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['staff-categories'],
    queryFn: () => fetchCategories(authToken),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stock levels
  const {
    data: stockData,
    isLoading: stockLoading,
    error: stockError,
    refetch: refetchStock,
  } = useQuery({
    queryKey: [
      'staff-stock',
      selectedCategory === 'all' ? null : selectedCategory,
      selectedStatus,
    ],
    queryFn: () =>
      fetchStockLevels(
        authToken,
        selectedCategory === 'all' ? null : selectedCategory,
        selectedStatus
      ),
    enabled: !!authToken,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stock_items = stockData?.stock_items || [];
  const stock_summary = stockData?.stock_summary || {
    total_items_tracked: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    items_ok_count: 0,
  };

  // Stock update mutation
  const stockUpdateMutation = useMutation({
    mutationFn: (payload: StockUpdatePayload) => updateItemStock(authToken, payload),
    onSuccess: (data, variables) => {
      // Refetch stock data
      queryClient.invalidateQueries({ queryKey: ['staff-stock'] });
      
      // Clear loading state
      setStockUpdateLoading((prev) => ({ ...prev, [variables.item_id]: false }));
      
      // Collapse form
      setExpandedItemId(null);
      
      // Clear form
      setUpdateForms((prev) => {
        const updated = { ...prev };
        delete updated[variables.item_id];
        return updated;
      });
    },
    onError: (error, variables) => {
      setStockUpdateLoading((prev) => ({ ...prev, [variables.item_id]: false }));
      console.error('Stock update failed:', error);
    },
  });

  // Mark out of stock mutation
  const markOutOfStockMutation = useMutation({
    mutationFn: (item_id: string) =>
      updateItemStock(authToken, {
        item_id,
        change_type: 'adjustment',
        quantity: 0,
        reason: 'ran_out_during_service',
        notes: 'Marked out of stock by staff during service',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-stock'] });
    },
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedStatus !== 'all') params.set('status', selectedStatus);
    setSearchParams(params);
  }, [selectedCategory, selectedStatus, setSearchParams]);

  // WebSocket real-time updates
  useEffect(() => {
    const socket = useAppStore.getState().websocket_state.socket;
    
    if (socket?.connected) {
      const handleStockUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['staff-stock'] });
      };

      socket.on('stock.updated', handleStockUpdate);
      socket.on('stock.low', handleStockUpdate);

      return () => {
        socket.off('stock.updated', handleStockUpdate);
        socket.off('stock.low', handleStockUpdate);
      };
    }
  }, [queryClient]);

  // Handlers
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  const handleToggleUpdateForm = (item_id: string) => {
    if (expandedItemId === item_id) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(item_id);
      // Initialize form if not exists
      if (!updateForms[item_id]) {
        setUpdateForms((prev) => ({
          ...prev,
          [item_id]: {
            change_type: 'restock',
            quantity: '',
            reason: '',
            notes: '',
          },
        }));
      }
    }
  };

  const handleFormChange = (
    item_id: string,
    field: keyof typeof updateForms[string],
    value: string
  ) => {
    setUpdateForms((prev) => ({
      ...prev,
      [item_id]: {
        ...prev[item_id],
        [field]: value,
      },
    }));
  };

  const handleSubmitUpdate = (item_id: string) => {
    const form = updateForms[item_id];
    if (!form || !form.quantity) return;

    const quantity = parseInt(form.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setStockUpdateLoading((prev) => ({ ...prev, [item_id]: true }));

    stockUpdateMutation.mutate({
      item_id,
      change_type: form.change_type,
      quantity,
      reason: form.reason || undefined,
      notes: form.notes || undefined,
    });
  };

  const handleMarkOutOfStock = (item_id: string, item_name: string) => {
    if (
      window.confirm(
        `Mark "${item_name}" as out of stock? This will notify the admin.`
      )
    ) {
      markOutOfStockMutation.mutate(item_id);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5" />
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  // Get status border color
  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'border-green-200';
      case 'low_stock':
        return 'border-yellow-200';
      case 'out_of_stock':
        return 'border-red-200';
      default:
        return 'border-gray-200';
    }
  };

  // Render loading state
  if (stockLoading && !stockData) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading stock levels...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render error state
  if (stockError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Failed to Load Stock Data
              </h3>
              <p className="text-red-700 mb-4">
                {axios.isAxiosError(stockError)
                  ? stockError.response?.data?.message || stockError.message
                  : 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => refetchStock()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Monitor and update inventory levels in real-time
                </p>
              </div>
              <button
                onClick={() => refetchStock()}
                disabled={stockLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${stockLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Items Tracked</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stock_summary.total_items_tracked}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-green-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Stock</p>
                    <p className="mt-2 text-3xl font-bold text-green-700">
                      {stock_summary.items_ok_count}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-yellow-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="mt-2 text-3xl font-bold text-yellow-700">
                      {stock_summary.low_stock_count}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border-2 border-red-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                      {stock_summary.out_of_stock_count}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Status
                  </label>
                  <select
                    id="status-filter"
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    <option value="all">All Items</option>
                    <option value="low_stock">Low Stock Only</option>
                    <option value="out_of_stock">Out of Stock Only</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleClearFilters}
                    disabled={selectedCategory === 'all' && selectedStatus === 'all'}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Items Grid */}
          {stock_items.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Found</h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters to see more items.'
                  : 'No stock items are currently being tracked.'}
              </p>
              {(selectedCategory !== 'all' || selectedStatus !== 'all') && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stock_items.map((item) => {
                const isExpanded = expandedItemId === item.item_id;
                const form = updateForms[item.item_id] || {
                  change_type: 'restock',
                  quantity: '',
                  reason: '',
                  notes: '',
                };
                const isUpdating = stockUpdateLoading[item.item_id] || false;

                return (
                  <div
                    key={item.item_id}
                    className={`bg-white rounded-xl border-2 ${getStatusBorderColor(
                      item.stock_status
                    )} shadow-sm overflow-hidden transition-all hover:shadow-lg`}
                  >
                    {/* Item Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600">{item.category_name}</p>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(item.stock_status)}
                        </div>
                      </div>

                      {/* Stock Info */}
                      {item.stock_tracked ? (
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">
                              Current Stock:
                            </span>
                            <span className="text-2xl font-bold text-gray-900">
                              {item.current_stock !== null ? item.current_stock : 'N/A'}
                            </span>
                          </div>
                          {item.low_stock_threshold !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Low threshold:</span>
                              <span className="text-sm font-medium text-gray-700">
                                {item.low_stock_threshold}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 text-center">
                            Stock not tracked for this item
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {item.stock_tracked && (
                        <div className="space-y-2">
                          <button
                            onClick={() => handleToggleUpdateForm(item.item_id)}
                            disabled={isUpdating}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isExpanded ? 'Cancel Update' : 'Update Stock'}
                          </button>

                          {item.stock_status !== 'out_of_stock' && (
                            <button
                              onClick={() => handleMarkOutOfStock(item.item_id, item.name)}
                              disabled={isUpdating || markOutOfStockMutation.isPending}
                              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Mark Out of Stock
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Update Form */}
                    {isExpanded && item.stock_tracked && (
                      <div className="border-t-2 border-gray-100 p-6 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">
                          Update Stock Level
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Action Type
                            </label>
                            <select
                              value={form.change_type}
                              onChange={(e) =>
                                handleFormChange(
                                  item.item_id,
                                  'change_type',
                                  e.target.value
                                )
                              }
                              disabled={isUpdating}
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            >
                              <option value="restock">Restock</option>
                              <option value="adjustment">Adjustment</option>
                              <option value="waste">Waste</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={form.quantity}
                              onChange={(e) =>
                                handleFormChange(item.item_id, 'quantity', e.target.value)
                              }
                              disabled={isUpdating}
                              placeholder="Enter quantity"
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reason (optional)
                            </label>
                            <input
                              type="text"
                              value={form.reason}
                              onChange={(e) =>
                                handleFormChange(item.item_id, 'reason', e.target.value)
                              }
                              disabled={isUpdating}
                              placeholder="e.g., Delivery received"
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes (optional)
                            </label>
                            <textarea
                              value={form.notes}
                              onChange={(e) =>
                                handleFormChange(item.item_id, 'notes', e.target.value)
                              }
                              disabled={isUpdating}
                              placeholder="Additional details..."
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                            />
                          </div>

                          <button
                            onClick={() => handleSubmitUpdate(item.item_id)}
                            disabled={isUpdating || !form.quantity}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isUpdating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Updating...
                              </>
                            ) : (
                              'Submit Update'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_StaffStock;