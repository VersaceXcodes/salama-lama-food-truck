import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Calendar, 
  Package, 
  Search, 
  Filter, 
  Download, 
  RotateCcw, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface OrderItem {
  order_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  selected_customizations: Record<string, any> | null;
  line_total: number;
}

interface Order {
  order_id: string;
  order_number: string;
  user_id: string;
  order_type: 'collection' | 'delivery';
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  collection_time_slot: string | null;
  delivery_address_snapshot: Record<string, any> | null;
  items: OrderItem[];
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number | null;
  tax_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  special_instructions: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
}

interface InvoiceResponse {
  invoice_url: string;
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

const fetchOrders = async (params: {
  auth_token: string;
  status?: string | null;
  order_type?: string | null;
  date_range?: string | null;
  query?: string;
  limit: number;
  offset: number;
}): Promise<OrdersResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params.status) queryParams.append('status', params.status);
  if (params.order_type) queryParams.append('order_type', params.order_type);
  if (params.date_range) queryParams.append('date_range', params.date_range);
  if (params.query) queryParams.append('query', params.query);
  queryParams.append('limit', params.limit.toString());
  queryParams.append('offset', params.offset.toString());

  const response = await axios.get<OrdersResponse>(
    `${API_BASE_URL}/orders?${queryParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${params.auth_token}`,
      },
    }
  );

  return response.data;
};

const fetchInvoice = async (order_id: string, auth_token: string): Promise<InvoiceResponse> => {
  const response = await axios.get<InvoiceResponse>(
    `${API_BASE_URL}/orders/${order_id}/invoice`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );

  return response.data;
};

// ===========================
// Helper Functions
// ===========================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const getStatusBadgeClasses = (status: Order['status']): string => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  switch (status) {
    case 'received':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'preparing':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'ready':
    case 'completed':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'out_for_delivery':
      return `${baseClasses} bg-purple-100 text-purple-800`;
    case 'cancelled':
      return `${baseClasses} bg-red-100 text-red-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const getStatusIcon = (status: Order['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 mr-1" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 mr-1" />;
    case 'preparing':
      return <Clock className="w-4 h-4 mr-1" />;
    default:
      return <AlertCircle className="w-4 h-4 mr-1" />;
  }
};

const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ===========================
// Main Component
// ===========================

const UV_OrderHistory: React.FC = () => {
  // ===========================
  // Zustand State Access (Individual Selectors)
  // ===========================
  
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  // const current_user = useAppStore(state => state.authentication_state.current_user);
  const add_to_cart = useAppStore(state => state.add_to_cart);
  const cart_items = useAppStore(state => state.cart_state.items);
  const clear_cart = useAppStore(state => state.clear_cart);

  // ===========================
  // URL Params & Navigation
  // ===========================
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ===========================
  // Local State
  // ===========================
  
  const [search_query, set_search_query] = useState('');
  const [search_input, set_search_input] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [confirmReorderModal, setConfirmReorderModal] = useState<{isOpen: boolean, order: Order | null}>({isOpen: false, order: null});

  // Extract filters from URL params
  const filter_status = searchParams.get('status');
  const filter_date_range = searchParams.get('date_range');
  const filter_order_type = searchParams.get('order_type');
  const current_page = parseInt(searchParams.get('page') || '1', 10);

  const orders_per_page = 20;

  // ===========================
  // React Query - Fetch Orders
  // ===========================
  
  const {
    data: orders_data,
    isLoading: is_loading,
    isError: is_error,
    error: fetch_error,
    refetch: refetch_orders,
  } = useQuery<OrdersResponse, Error>({
    queryKey: ['orders', filter_status, filter_date_range, filter_order_type, search_query, current_page],
    queryFn: () => fetchOrders({
      auth_token: auth_token!,
      status: filter_status,
      order_type: filter_order_type,
      date_range: filter_date_range,
      query: search_query,
      limit: orders_per_page,
      offset: (current_page - 1) * orders_per_page,
    }),
    enabled: !!auth_token,
    staleTime: 60000, // 1 minute
    retry: 1,
  });

  const orders_list = orders_data?.orders || [];
  const total_orders = orders_data?.total || 0;
  const total_pages = Math.ceil(total_orders / orders_per_page);

  // ===========================
  // React Query - Download Invoice
  // ===========================
  
  const download_invoice_mutation = useMutation<InvoiceResponse, Error, string>({
    mutationFn: (order_id: string) => fetchInvoice(order_id, auth_token!),
    onSuccess: (data) => {
      // Open invoice in new tab
      window.open(data.invoice_url, '_blank');
    },
    onError: (error) => {
      console.error('Failed to download invoice:', error);
      setNotification({ type: 'error', message: 'Failed to download invoice. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  // ===========================
  // Filter Handlers
  // ===========================
  
  const handle_filter_change = (key: string, value: string | null) => {
    const new_params = new URLSearchParams(searchParams);
    
    if (value) {
      new_params.set(key, value);
    } else {
      new_params.delete(key);
    }
    
    // Reset to page 1 when filters change
    new_params.delete('page');
    
    setSearchParams(new_params);
  };

  const handle_clear_filters = () => {
    setSearchParams(new URLSearchParams());
    set_search_query('');
    set_search_input('');
  };

  // ===========================
  // Search Handler (Debounced)
  // ===========================
  
  useEffect(() => {
    const timer = setTimeout(() => {
      set_search_query(search_input);
      
      // Reset to page 1 when searching
      const new_params = new URLSearchParams(searchParams);
      new_params.delete('page');
      setSearchParams(new_params);
    }, 500);

    return () => clearTimeout(timer);
  }, [search_input]);

  // ===========================
  // Pagination Handlers
  // ===========================
  
  const handle_page_change = (new_page: number) => {
    if (new_page < 1 || new_page > total_pages) return;
    
    const new_params = new URLSearchParams(searchParams);
    new_params.set('page', new_page.toString());
    setSearchParams(new_params);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===========================
  // Reorder Handler
  // ===========================
  
  const handle_reorder = (order: Order) => {
    // Confirm action if cart has items
    if (cart_items.length > 0) {
      setConfirmReorderModal({isOpen: true, order});
      return;
    }

    // Add all items from order to cart
    if (!order.items || order.items.length === 0) {
      setNotification({ type: 'error', message: 'This order has no items to reorder.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    order.items.forEach((item) => {
      // Convert order item to cart item format
      const customizations = item.selected_customizations
        ? Object.entries(item.selected_customizations).map(([group_name, option]) => ({
            group_name,
            option_name: typeof option === 'string' ? option : option.name || '',
            additional_price: 0, // We don't have this from order schema
          }))
        : [];

      add_to_cart({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        customizations,
        line_total: item.line_total,
      });
    });

    // Navigate to cart
    navigate('/cart');
  };

  const confirmReorder = () => {
    if (confirmReorderModal.order) {
      clear_cart();
      const order = confirmReorderModal.order;
      
      if (!order.items || order.items.length === 0) {
        setNotification({ type: 'error', message: 'This order has no items to reorder.' });
        setTimeout(() => setNotification(null), 3000);
        setConfirmReorderModal({isOpen: false, order: null});
        return;
      }

      order.items.forEach((item) => {
        const customizations = item.selected_customizations
          ? Object.entries(item.selected_customizations).map(([group_name, option]) => ({
              group_name,
              option_name: typeof option === 'string' ? option : option.name || '',
              additional_price: 0,
            }))
          : [];

        add_to_cart({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          customizations,
          line_total: item.line_total,
        });
      });

      setConfirmReorderModal({isOpen: false, order: null});
      navigate('/cart');
    }
  };

  // ===========================
  // Download Invoice Handler
  // ===========================
  
  const handle_download_invoice = (order_id: string) => {
    download_invoice_mutation.mutate(order_id);
  };

  // ===========================
  // Active Filters Count
  // ===========================
  
  const active_filters_count = useMemo(() => {
    let count = 0;
    if (filter_status) count++;
    if (filter_date_range) count++;
    if (filter_order_type) count++;
    if (search_query) count++;
    return count;
  }, [filter_status, filter_date_range, filter_order_type, search_query]);

  // ===========================
  // Render
  // ===========================
  
  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Confirm Reorder Modal */}
      {confirmReorderModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setConfirmReorderModal({isOpen: false, order: null})}></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Replace Cart Items?
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Your cart will be cleared and replaced with items from this order. Continue?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={confirmReorder}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:col-start-2 sm:text-sm"
                >
                  Yes, Replace Cart
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReorderModal({isOpen: false, order: null})}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
            <p className="text-gray-600">
              View and manage all your past orders
            </p>
          </div>

          {/* Filters & Search Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              {/* Search Input */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by order number..."
                    value={search_input}
                    onChange={(e) => set_search_input(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filter Toggle & Clear */}
              <div className="flex items-center gap-3">
                {active_filters_count > 0 && (
                  <button
                    onClick={handle_clear_filters}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear Filters ({active_filters_count})
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Status
                </label>
                <select
                  value={filter_status || ''}
                  onChange={(e) => handle_filter_change('status', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="received">Received</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date Range
                </label>
                <select
                  value={filter_date_range || ''}
                  onChange={(e) => handle_filter_change('date_range', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">All Time</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_3_months">Last 3 Months</option>
                </select>
              </div>

              {/* Order Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Order Type
                </label>
                <select
                  value={filter_order_type || ''}
                  onChange={(e) => handle_filter_change('order_type', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="collection">Collection</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {is_loading ? (
            // Loading State
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading your orders...</p>
              </div>
            </div>
          ) : is_error ? (
            // Error State
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Failed to Load Orders
                </h3>
                <p className="text-gray-600 mb-4">
                  {fetch_error?.message || 'An error occurred while loading your orders'}
                </p>
                <button
                  onClick={() => refetch_orders()}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : orders_list.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {search_query || active_filters_count > 0 ? 'No Orders Found' : 'No Orders Yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {search_query || active_filters_count > 0
                    ? 'Try adjusting your filters or search terms'
                    : "You haven't placed any orders yet. Start ordering now!"}
                </p>
                {(search_query || active_filters_count > 0) ? (
                  <button
                    onClick={handle_clear_filters}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <Link
                    to="/menu"
                    className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    Browse Menu
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Orders Table - Desktop */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders_list.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/orders/${order.order_id}`}
                            className="text-sm font-medium text-orange-600 hover:text-orange-700"
                          >
                            #{order.order_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(order.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            {order.order_type === 'delivery' ? (
                              <>
                                <Truck className="w-4 h-4 mr-1.5" />
                                Delivery
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-4 h-4 mr-1.5" />
                                Collection
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadgeClasses(order.status)}>
                            {getStatusIcon(order.status)}
                            {formatStatus(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/orders/${order.order_id}`}
                              className="text-gray-600 hover:text-gray-900 transition-colors p-1.5 rounded hover:bg-gray-100"
                              title="View Details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            
                            {order.status === 'completed' && (
                              <>
                                <button
                                  onClick={() => handle_reorder(order)}
                                  className="text-orange-600 hover:text-orange-700 transition-colors p-1.5 rounded hover:bg-orange-50"
                                  title="Reorder"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => handle_download_invoice(order.order_id)}
                                  disabled={download_invoice_mutation.isPending}
                                  className="text-blue-600 hover:text-blue-700 transition-colors p-1.5 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Download Invoice"
                                >
                                  <Download className={`w-4 h-4 ${download_invoice_mutation.isPending ? 'animate-spin' : ''}`} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Orders Cards - Mobile */}
              <div className="lg:hidden space-y-4 mb-6">
                {orders_list.map((order) => (
                  <div
                    key={order.order_id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Link
                          to={`/orders/${order.order_id}`}
                          className="text-lg font-semibold text-orange-600 hover:text-orange-700"
                        >
                          #{order.order_number}
                        </Link>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <span className={getStatusBadgeClasses(order.status)}>
                        {getStatusIcon(order.status)}
                        {formatStatus(order.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Type</div>
                        <div className="flex items-center text-sm text-gray-900">
                          {order.order_type === 'delivery' ? (
                            <>
                              <Truck className="w-4 h-4 mr-1.5" />
                              Delivery
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-4 h-4 mr-1.5" />
                              Collection
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase mb-1">Items</div>
                        <div className="text-sm text-gray-900">
                          {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          to={`/orders/${order.order_id}`}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors text-center"
                        >
                          View Details
                        </Link>
                        
                        {order.status === 'completed' && (
                          <button
                            onClick={() => handle_reorder(order)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium text-sm hover:bg-orange-700 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4 inline mr-1" />
                            Reorder
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {total_pages > 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(current_page - 1) * orders_per_page + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(current_page * orders_per_page, total_orders)}
                      </span>{' '}
                      of <span className="font-medium">{total_orders}</span> orders
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handle_page_change(current_page - 1)}
                        disabled={current_page === 1}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, total_pages) }, (_, i) => {
                          let page_number;
                          if (total_pages <= 5) {
                            page_number = i + 1;
                          } else if (current_page <= 3) {
                            page_number = i + 1;
                          } else if (current_page >= total_pages - 2) {
                            page_number = total_pages - 4 + i;
                          } else {
                            page_number = current_page - 2 + i;
                          }

                          return (
                            <button
                              key={page_number}
                              onClick={() => handle_page_change(page_number)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                current_page === page_number
                                  ? 'bg-orange-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page_number}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handle_page_change(current_page + 1)}
                        disabled={current_page === total_pages}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_OrderHistory;