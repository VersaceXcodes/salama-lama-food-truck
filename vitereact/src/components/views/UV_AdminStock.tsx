import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Edit3,
  X,
  Search
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface StockItem {
  item_id: string;
  name: string;
  category_name: string;
  current_stock: number | null;
  low_stock_threshold: number | null;
  stock_status: 'ok' | 'low_stock' | 'out_of_stock';
  last_updated?: string;
}



interface StockOverviewResponse {
  total_items_tracked: number;
  low_stock_count: number;
  out_of_stock_count: number;
  items: StockItem[];
}

interface StockAdjustmentPayload {
  change_type: 'restock' | 'adjustment' | 'waste';
  quantity: number;
  reason?: string | null;
  notes?: string | null;
}

interface Category {
  category_id: string;
  name: string;
}

// ===========================
// API Functions
// ===========================

const fetchStockOverview = async (
  token: string,
  category?: string | null,
  status?: string | null
): Promise<StockOverviewResponse> => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (status) params.append('status', status);

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/stock?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

const adjustStockLevel = async (
  token: string,
  item_id: string,
  payload: StockAdjustmentPayload
): Promise<any> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/stock/${item_id}`,
    payload,
    {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

const fetchCategories = async (token: string): Promise<Category[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/menu/categories`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data.categories || [];
};

// ===========================
// Main Component
// ===========================

const UV_AdminStock: React.FC = () => {
  // ===========================
  // Global State (Individual Selectors)
  // ===========================
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // ===========================
  // URL Parameters
  // ===========================
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const statusParam = searchParams.get('status');

  // ===========================
  // Local State
  // ===========================
  const [category_filter, setCategoryFilter] = useState<string | null>(categoryParam);
  const [status_filter, setStatusFilter] = useState<string | null>(statusParam);
  const [selected_item, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustment_modal_visible, setAdjustmentModalVisible] = useState(false);
  const [adjustment_form, setAdjustmentForm] = useState({
    change_type: 'restock' as 'restock' | 'adjustment' | 'waste',
    quantity: 0,
    reason: '',
    notes: '',
  });
  const [form_errors, setFormErrors] = useState<Record<string, string>>({});
  const [search_query, setSearchQuery] = useState('');

  // ===========================
  // React Query
  // ===========================
  const queryClient = useQueryClient();

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => fetchCategories(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch stock overview
  const {
    data: stock_data,
    isLoading: is_loading_stock,
    isError: is_error_stock,
    error: stock_error,
  } = useQuery({
    queryKey: ['admin-stock-overview', category_filter, status_filter],
    queryFn: () => fetchStockOverview(auth_token!, category_filter, status_filter),
    enabled: !!auth_token,
    staleTime: 60 * 1000, // 1 minute
    select: (data) => ({
      ...data,
      items: data.items.map(item => ({
        ...item,
        current_stock: item.current_stock !== null ? Number(item.current_stock) : null,
        low_stock_threshold: item.low_stock_threshold !== null ? Number(item.low_stock_threshold) : null,
      }))
    }),
  });

  // Stock adjustment mutation
  const adjust_stock_mutation = useMutation({
    mutationFn: ({ item_id, payload }: { item_id: string; payload: StockAdjustmentPayload }) =>
      adjustStockLevel(auth_token!, item_id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stock-overview'] });
      setAdjustmentModalVisible(false);
      resetAdjustmentForm();
      setSelectedItem(null);
    },
    onError: (error: any) => {
      console.error('Stock adjustment failed:', error);
      setFormErrors({ submit: error.response?.data?.message || 'Failed to adjust stock' });
    },
  });

  // ===========================
  // Effects
  // ===========================

  // Sync filters with URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (category_filter) params.set('category', category_filter);
    if (status_filter) params.set('status', status_filter);
    setSearchParams(params, { replace: true });
  }, [category_filter, status_filter, setSearchParams]);

  // ===========================
  // Helper Functions
  // ===========================

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      change_type: 'restock',
      quantity: 0,
      reason: '',
      notes: '',
    });
    setFormErrors({});
  };

  const openAdjustmentModal = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustmentModalVisible(true);
    resetAdjustmentForm();
  };

  const closeAdjustmentModal = () => {
    setAdjustmentModalVisible(false);
    setSelectedItem(null);
    resetAdjustmentForm();
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors: Record<string, string> = {};

    if (adjustment_form.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    if (adjustment_form.change_type === 'waste' && !adjustment_form.reason?.trim()) {
      errors.reason = 'Reason is required for waste adjustments';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!selected_item) return;

    const payload: StockAdjustmentPayload = {
      change_type: adjustment_form.change_type,
      quantity: adjustment_form.quantity,
      reason: adjustment_form.reason?.trim() || null,
      notes: adjustment_form.notes?.trim() || null,
    };

    adjust_stock_mutation.mutate({ item_id: selected_item.item_id, payload });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-1.5"></div>
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low Stock
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  const filtered_items = stock_data?.items.filter(item =>
    item.name.toLowerCase().includes(search_query.toLowerCase())
  ) || [];

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Monitor inventory levels, adjust stock, and manage reorder alerts
                </p>
              </div>
              <Link
                to="/admin/menu"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Package className="w-4 h-4 mr-2" />
                Manage Menu
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          {is_loading_stock ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : stock_data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Items Tracked */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Items Tracked</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stock_data.total_items_tracked}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Low Stock Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
                    <p className="mt-2 text-3xl font-bold text-yellow-600">
                      {stock_data.low_stock_count}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Out of Stock Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">
                      {stock_data.out_of_stock_count}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={category_filter || ''}
                  onChange={(e) => setCategoryFilter(e.target.value || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Status
                </label>
                <select
                  id="status-filter"
                  value={status_filter || ''}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">All Status</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Items
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by name..."
                    value={search_query}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {(category_filter || status_filter || search_query) && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setCategoryFilter(null);
                    setStatusFilter(null);
                    setSearchQuery('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Stock Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {is_loading_stock ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading stock data...</p>
              </div>
            ) : is_error_stock ? (
              <div className="p-12 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">Failed to load stock data</p>
                <p className="text-sm text-gray-600 mt-2">
                  {stock_error instanceof Error ? stock_error.message : 'Unknown error'}
                </p>
              </div>
            ) : filtered_items.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No items found</p>
                <p className="text-sm text-gray-500 mt-2">
                  {stock_data?.items.length === 0 
                    ? 'No stock items are being tracked yet.'
                    : 'Try adjusting your filters or search query.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Threshold
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filtered_items.map((item) => (
                        <tr key={item.item_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{item.category_name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`font-bold ${
                              item.stock_status === 'out_of_stock' ? 'text-red-600' :
                              item.stock_status === 'low_stock' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {item.current_stock !== null ? item.current_stock : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm text-gray-600">
                              {item.low_stock_threshold !== null ? item.low_stock_threshold : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {getStatusBadge(item.stock_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openAdjustmentModal(item)}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                              >
                                <Edit3 className="w-4 h-4 mr-1.5" />
                                Adjust
                              </button>
                              <Link
                                to={`/admin/stock/${item.item_id}/history`}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                              >
                                History
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-200">
                  {filtered_items.map((item) => (
                    <div key={item.item_id} className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.category_name}</p>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(item.stock_status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Current Stock</p>
                          <p className={`text-lg font-bold ${
                            item.stock_status === 'out_of_stock' ? 'text-red-600' :
                            item.stock_status === 'low_stock' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {item.current_stock !== null ? item.current_stock : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Threshold</p>
                          <p className="text-lg font-bold text-gray-900">
                            {item.low_stock_threshold !== null ? item.low_stock_threshold : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => openAdjustmentModal(item)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Adjust Stock
                        </button>
                        <Link
                          to={`/admin/stock/${item.item_id}/history`}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          History
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustment_modal_visible && selected_item && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="adjustment-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeAdjustmentModal}
          ></div>

          {/* Modal */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 transform transition-all">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 id="adjustment-modal-title" className="text-xl font-bold text-gray-900">
                    Adjust Stock
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{selected_item.name}</p>
                </div>
                <button
                  onClick={closeAdjustmentModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Current Stock Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Stock</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {selected_item.current_stock !== null ? selected_item.current_stock : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Threshold</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {selected_item.low_stock_threshold !== null ? selected_item.low_stock_threshold : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Adjustment Form */}
              <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                {/* Change Type */}
                <div>
                  <label htmlFor="change-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Change Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="change-type"
                    value={adjustment_form.change_type}
                    onChange={(e) => {
                      setAdjustmentForm(prev => ({ ...prev, change_type: e.target.value as any }));
                      setFormErrors(prev => ({ ...prev, change_type: '' }));
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    <option value="restock">Restock (Add Inventory)</option>
                    <option value="adjustment">Adjustment (Correct Count)</option>
                    <option value="waste">Waste (Remove Spoiled)</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    {adjustment_form.change_type === 'restock' ? (
                      <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
                    )}
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      value={adjustment_form.quantity || ''}
                      onChange={(e) => {
                        setAdjustmentForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }));
                        setFormErrors(prev => ({ ...prev, quantity: '' }));
                      }}
                      className={`w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:ring-4 transition-all ${
                        form_errors.quantity 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                      placeholder="Enter quantity"
                    />
                  </div>
                  {form_errors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{form_errors.quantity}</p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason {adjustment_form.change_type === 'waste' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="reason"
                    type="text"
                    value={adjustment_form.reason}
                    onChange={(e) => {
                      setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }));
                      setFormErrors(prev => ({ ...prev, reason: '' }));
                    }}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-4 transition-all ${
                      form_errors.reason 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                    placeholder="e.g., Weekly delivery, End of day count"
                  />
                  {form_errors.reason && (
                    <p className="mt-1 text-sm text-red-600">{form_errors.reason}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={adjustment_form.notes}
                    onChange={(e) => setAdjustmentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="Optional internal notes..."
                  />
                </div>

                {/* Submit Error */}
                {form_errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="text-sm">{form_errors.submit}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeAdjustmentModal}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                    disabled={adjust_stock_mutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjust_stock_mutation.isPending}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {adjust_stock_mutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adjusting...
                      </span>
                    ) : (
                      'Confirm Adjustment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminStock;