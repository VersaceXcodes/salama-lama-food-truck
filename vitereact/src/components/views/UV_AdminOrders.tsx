import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ShoppingBag,
  AlertCircle,
  Eye,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';

// ===========================
// Type Definitions
// ===========================

interface Order {
  order_id: string;
  order_number: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  order_type: 'collection' | 'delivery';
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  total_amount: number;
  created_at: string;
}

interface PaginationState {
  current_page: number;
  limit: number;
  offset: number;
  total: number;
  total_pages: number;
}

interface SortConfig {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

interface RefundModalState {
  visible: boolean;
  order_id: string;
  order_number: string;
  total_amount: number;
  refund_amount: number;
  refund_reason: string;
}

interface CancelModalState {
  visible: boolean;
  order_id: string;
  order_number: string;
  cancellation_reason: string;
  issue_refund: boolean;
}

// ===========================
// API Functions
// ===========================

const fetchOrders = async (params: {
  status: string | null;
  order_type: string | null;
  payment_status: string | null;
  date_range: string | null;
  customer_search: string;
  limit: number;
  offset: number;
  sort_by: string;
  sort_order: string;
  auth_token: string;
}) => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/orders`,
    {
      params: {
        status: params.status || undefined,
        order_type: params.order_type || undefined,
        payment_status: params.payment_status || undefined,
        date_range: params.date_range || undefined,
        customer_search: params.customer_search || undefined,
        limit: params.limit,
        offset: params.offset,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      },
      headers: {
        Authorization: `Bearer ${params.auth_token}`,
      },
    }
  );
  return data;
};

const updateOrderStatus = async (params: {
  order_id: string;
  status: string;
  auth_token: string;
}) => {
  const { data } = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/orders/${params.order_id}`,
    {
      status: params.status,
    },
    {
      headers: {
        Authorization: `Bearer ${params.auth_token}`,
      },
    }
  );
  return data;
};

const refundOrder = async (params: {
  order_id: string;
  refund_amount: number;
  refund_reason: string;
  auth_token: string;
}) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/orders/${params.order_id}/refund`,
    {
      refund_amount: params.refund_amount,
      refund_reason: params.refund_reason,
    },
    {
      headers: {
        Authorization: `Bearer ${params.auth_token}`,
      },
    }
  );
  return data;
};

const cancelOrder = async (params: {
  order_id: string;
  cancellation_reason: string;
  issue_refund: boolean;
  auth_token: string;
}) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/orders/${params.order_id}/cancel`,
    {
      cancellation_reason: params.cancellation_reason,
      issue_refund: params.issue_refund,
    },
    {
      headers: {
        Authorization: `Bearer ${params.auth_token}`,
      },
    }
  );
  return data;
};

// ===========================
// Helper Functions
// ===========================

const getStatusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    preparing: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPaymentStatusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusIcon = (status: string) => {
  const icons: Record<string, React.ReactNode> = {
    received: <Clock className="w-4 h-4" />,
    preparing: <RefreshCw className="w-4 h-4" />,
    ready: <CheckCircle className="w-4 h-4" />,
    out_for_delivery: <Truck className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
    cancelled: <XCircle className="w-4 h-4" />,
  };
  return icons[status] || <Clock className="w-4 h-4" />;
};

// ===========================
// Main Component
// ===========================

const UV_AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Get auth token from store - CRITICAL: Individual selector
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Initialize state from URL params
  const [status_filter, setStatusFilter] = useState<string | null>(searchParams.get('status'));
  const [order_type_filter, setOrderTypeFilter] = useState<string | null>(searchParams.get('order_type'));
  const [payment_status_filter, setPaymentStatusFilter] = useState<string | null>(searchParams.get('payment_status'));
  const [date_range_filter, setDateRangeFilter] = useState<string | null>(searchParams.get('date_range'));
  const [customer_search_query, setCustomerSearchQuery] = useState<string>(searchParams.get('customer_search') || '');
  const [search_input, setSearchInput] = useState<string>(customer_search_query);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    current_page: 1,
    limit: 50,
    offset: 0,
    total: 0,
    total_pages: 0,
  });

  // Sort state
  const [sort_config, setSortConfig] = useState<SortConfig>({
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Selection state
  const [selected_orders, setSelectedOrders] = useState<string[]>([]);

  // Modal states
  const [refund_modal, setRefundModal] = useState<RefundModalState>({
    visible: false,
    order_id: '',
    order_number: '',
    total_amount: 0,
    refund_amount: 0,
    refund_reason: '',
  });

  const [cancel_modal, setCancelModal] = useState<CancelModalState>({
    visible: false,
    order_id: '',
    order_number: '',
    cancellation_reason: '',
    issue_refund: false,
  });

  const [show_filters, setShowFilters] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomerSearchQuery(search_input);
      setPagination(prev => ({ ...prev, current_page: 1, offset: 0 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [search_input]);

  // Sync URL params with state
  useEffect(() => {
    const params: Record<string, string> = {};
    if (status_filter) params.status = status_filter;
    if (order_type_filter) params.order_type = order_type_filter;
    if (payment_status_filter) params.payment_status = payment_status_filter;
    if (date_range_filter) params.date_range = date_range_filter;
    if (customer_search_query) params.customer_search = customer_search_query;

    setSearchParams(params);
  }, [status_filter, order_type_filter, payment_status_filter, date_range_filter, customer_search_query, setSearchParams]);

  // Fetch orders with React Query
  const {
    data: orders_data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'admin',
      'orders',
      status_filter,
      order_type_filter,
      payment_status_filter,
      date_range_filter,
      customer_search_query,
      pagination.limit,
      pagination.offset,
      sort_config.sort_by,
      sort_config.sort_order,
    ],
    queryFn: () =>
      fetchOrders({
        status: status_filter,
        order_type: order_type_filter,
        payment_status: payment_status_filter,
        date_range: date_range_filter,
        customer_search: customer_search_query,
        limit: pagination.limit,
        offset: pagination.offset,
        sort_by: sort_config.sort_by,
        sort_order: sort_config.sort_order,
        auth_token: auth_token || '',
      }),
    enabled: !!auth_token,
    staleTime: 30000, // 30 seconds
    select: (data) => {
      return {
        orders: data.orders.map((order: any) => ({
          order_id: order.order_id,
          order_number: order.order_number,
          user_id: order.user_id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          order_type: order.order_type,
          status: order.status,
          payment_status: order.payment_status,
          total_amount: Number(order.total_amount || 0),
          created_at: order.created_at,
        })),
        total: data.total,
      };
    },
  });

  // Update pagination total when data changes
  useEffect(() => {
    if (orders_data) {
      setPagination(prev => ({
        ...prev,
        total: orders_data.total,
        total_pages: Math.ceil(orders_data.total / prev.limit),
      }));
    }
  }, [orders_data]);

  const orders_list: Order[] = orders_data?.orders || [];

  // Mutations
  const update_status_mutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });

  const refund_mutation = useMutation({
    mutationFn: refundOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setRefundModal({
        visible: false,
        order_id: '',
        order_number: '',
        total_amount: 0,
        refund_amount: 0,
        refund_reason: '',
      });
    },
  });

  const cancel_mutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setCancelModal({
        visible: false,
        order_id: '',
        order_number: '',
        cancellation_reason: '',
        issue_refund: false,
      });
    },
  });

  // Filter handlers
  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current_page: 1, offset: 0 }));
  };

  const handleOrderTypeFilterChange = (value: string | null) => {
    setOrderTypeFilter(value);
    setPagination(prev => ({ ...prev, current_page: 1, offset: 0 }));
  };

  const handlePaymentStatusFilterChange = (value: string | null) => {
    setPaymentStatusFilter(value);
    setPagination(prev => ({ ...prev, current_page: 1, offset: 0 }));
  };

  const handleDateRangeFilterChange = (value: string | null) => {
    setDateRangeFilter(value);
    setPagination(prev => ({ ...prev, current_page: 1, offset: 0 }));
  };

  const handleClearAllFilters = () => {
    setStatusFilter(null);
    setOrderTypeFilter(null);
    setPaymentStatusFilter(null);
    setDateRangeFilter(null);
    setCustomerSearchQuery('');
    setSearchInput('');
    setPagination(prev => ({ ...prev, current_page: 1, offset: 0 }));
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    const new_offset = (page - 1) * pagination.limit;
    setPagination(prev => ({
      ...prev,
      current_page: page,
      offset: new_offset,
    }));
    setSelectedOrders([]); // Clear selection when changing pages
  };

  // Sort handlers
  const handleSort = (column: string) => {
    if (sort_config.sort_by === column) {
      setSortConfig(prev => ({
        sort_by: column,
        sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc',
      }));
    } else {
      setSortConfig({
        sort_by: column,
        sort_order: 'desc',
      });
    }
  };

  // Selection handlers
  const handleSelectOrder = (order_id: string) => {
    setSelectedOrders(prev =>
      prev.includes(order_id)
        ? prev.filter(id => id !== order_id)
        : [...prev, order_id]
    );
  };

  const handleSelectAll = () => {
    if (selected_orders.length === orders_list.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders_list.map(order => order.order_id));
    }
  };

  // Status update handler
  const handleQuickStatusUpdate = (order_id: string, new_status: string) => {
    if (!auth_token) return;

    update_status_mutation.mutate({
      order_id,
      status: new_status,
      auth_token,
    });
  };

  // Refund handlers
  const handleOpenRefundModal = (order: Order) => {
    setRefundModal({
      visible: true,
      order_id: order.order_id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      refund_amount: order.total_amount,
      refund_reason: '',
    });
  };

  const handleConfirmRefund = () => {
    if (!auth_token || !refund_modal.refund_reason.trim()) return;

    refund_mutation.mutate({
      order_id: refund_modal.order_id,
      refund_amount: refund_modal.refund_amount,
      refund_reason: refund_modal.refund_reason,
      auth_token,
    });
  };

  // Cancel handlers
  const handleOpenCancelModal = (order: Order) => {
    setCancelModal({
      visible: true,
      order_id: order.order_id,
      order_number: order.order_number,
      cancellation_reason: '',
      issue_refund: order.payment_status === 'paid',
    });
  };

  const handleConfirmCancel = () => {
    if (!auth_token || !cancel_modal.cancellation_reason.trim()) return;

    cancel_mutation.mutate({
      order_id: cancel_modal.order_id,
      cancellation_reason: cancel_modal.cancellation_reason,
      issue_refund: cancel_modal.issue_refund,
      auth_token,
    });
  };

  // Active filters count
  const active_filters_count = [
    status_filter,
    order_type_filter,
    payment_status_filter,
    date_range_filter,
    customer_search_query,
  ].filter(Boolean).length;

  const error_message = error ? (error as any).response?.data?.message || (error as any).message || 'Failed to load orders' : null;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage and process all customer orders
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Stats Cards */}
            {orders_data && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{orders_data.total}</p>
                    </div>
                    <ShoppingBag className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by customer name or email..."
                      value={search_input}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {search_input && (
                      <button
                        onClick={() => {
                          setSearchInput('');
                          setCustomerSearchQuery('');
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!show_filters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                  {active_filters_count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      {active_filters_count}
                    </span>
                  )}
                  {show_filters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </button>

                {/* Refresh Button */}
                <button
                  onClick={() => refetch()}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* Export Button */}
                <button
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  onClick={() => alert('Export functionality requires backend endpoint implementation')}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Export
                </button>
              </div>

              {/* Expanded Filters */}
              {show_filters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order Status
                      </label>
                      <select
                        value={status_filter || ''}
                        onChange={(e) => handleStatusFilterChange(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                    {/* Order Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order Type
                      </label>
                      <select
                        value={order_type_filter || ''}
                        onChange={(e) => handleOrderTypeFilterChange(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Types</option>
                        <option value="collection">Collection</option>
                        <option value="delivery">Delivery</option>
                      </select>
                    </div>

                    {/* Payment Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Status
                      </label>
                      <select
                        value={payment_status_filter || ''}
                        onChange={(e) => handlePaymentStatusFilterChange(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Payment Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Range
                      </label>
                      <select
                        value={date_range_filter || ''}
                        onChange={(e) => handleDateRangeFilterChange(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Time</option>
                        <option value="today">Today</option>
                        <option value="last_7_days">Last 7 Days</option>
                        <option value="last_30_days">Last 30 Days</option>
                        <option value="this_month">This Month</option>
                      </select>
                    </div>
                  </div>

                  {/* Active Filters and Clear Button */}
                  {active_filters_count > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {status_filter && (
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            Status: {status_filter}
                            <button
                              onClick={() => handleStatusFilterChange(null)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        )}
                        {order_type_filter && (
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            Type: {order_type_filter}
                            <button
                              onClick={() => handleOrderTypeFilterChange(null)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        )}
                        {payment_status_filter && (
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            Payment: {payment_status_filter}
                            <button
                              onClick={() => handlePaymentStatusFilterChange(null)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        )}
                        {date_range_filter && (
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            Date: {date_range_filter}
                            <button
                              onClick={() => handleDateRangeFilterChange(null)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        )}
                        {customer_search_query && (
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            Search: "{customer_search_query}"
                            <button
                              onClick={() => {
                                setSearchInput('');
                                setCustomerSearchQuery('');
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleClearAllFilters}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selected_orders.length > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selected_orders.length} order{selected_orders.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedOrders([])}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error loading orders</h3>
                  <p className="text-sm text-red-700 mt-1">{error_message}</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected_orders.length === orders_list.length && orders_list.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('order_number')}
                    >
                      <div className="flex items-center">
                        Order #
                        {sort_config.sort_by === 'order_number' && (
                          sort_config.sort_order === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('customer_name')}
                    >
                      <div className="flex items-center">
                        Customer
                        {sort_config.sort_by === 'customer_name' && (
                          sort_config.sort_order === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_amount')}
                    >
                      <div className="flex items-center">
                        Total
                        {sort_config.sort_by === 'total_amount' && (
                          sort_config.sort_order === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Date
                        {sort_config.sort_by === 'created_at' && (
                          sort_config.sort_order === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      </tr>
                    ))
                  ) : orders_list.length === 0 ? (
                    // Empty state
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No orders found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {active_filters_count > 0
                            ? 'Try adjusting your filters'
                            : 'Orders will appear here once customers place them'}
                        </p>
                        {active_filters_count > 0 && (
                          <button
                            onClick={handleClearAllFilters}
                            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Clear all filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    // Order rows
                    orders_list.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selected_orders.includes(order.order_id)}
                            onChange={() => handleSelectOrder(order.order_id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/admin/orders/${order.order_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                            <div className="text-gray-500">{order.customer_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.order_type === 'delivery' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.order_type === 'delivery' ? <Truck className="w-3 h-3 mr-1" /> : <ShoppingBag className="w-3 h-3 mr-1" />}
                            {order.order_type === 'delivery' ? 'Delivery' : 'Collection'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) => handleQuickStatusUpdate(order.order_id, e.target.value)}
                            disabled={order.status === 'completed' || order.status === 'cancelled'}
                            className={`text-xs font-medium rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-blue-500 ${getStatusBadgeColor(order.status)} disabled:cursor-not-allowed`}
                          >
                            <option value="received">Received</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(order.payment_status)}`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          €{order.total_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/admin/orders/${order.order_id}`}
                              className="text-blue-600 hover:text-blue-700"
                              title="View Details"
                            >
                              <Eye className="w-5 h-5" />
                            </Link>
                            {order.status !== 'cancelled' && order.status !== 'completed' && (
                              <>
                                {order.payment_status === 'paid' && (
                                  <button
                                    onClick={() => handleOpenRefundModal(order)}
                                    className="text-orange-600 hover:text-orange-700"
                                    title="Refund Order"
                                  >
                                    <RotateCcw className="w-5 h-5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenCancelModal(order)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Cancel Order"
                                >
                                  <Ban className="w-5 h-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && orders_list.length > 0 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.total_pages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">{pagination.offset + 1}</span>
                        {' '}-{' '}
                        <span className="font-medium">
                          {Math.min(pagination.offset + pagination.limit, pagination.total)}
                        </span>
                        {' '}of{' '}
                        <span className="font-medium">{pagination.total}</span>
                        {' '}results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(pagination.current_page - 1)}
                          disabled={pagination.current_page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === pagination.total_pages ||
                            (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  page === pagination.current_page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === pagination.current_page - 2 ||
                            page === pagination.current_page + 2
                          ) {
                            return <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                          }
                          return null;
                        })}
                        <button
                          onClick={() => handlePageChange(pagination.current_page + 1)}
                          disabled={pagination.current_page === pagination.total_pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {refund_modal.visible && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setRefundModal({
              visible: false,
              order_id: '',
              order_number: '',
              total_amount: 0,
              refund_amount: 0,
              refund_reason: '',
            })}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                    <RotateCcw className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Refund Order #{refund_modal.order_number}
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="refund_amount" className="block text-sm font-medium text-gray-700 mb-1">
                          Refund Amount (€)
                        </label>
                        <input
                          type="number"
                          id="refund_amount"
                          step="0.01"
                          min="0"
                          max={refund_modal.total_amount}
                          value={refund_modal.refund_amount}
                          onChange={(e) => setRefundModal(prev => ({ ...prev, refund_amount: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Order total: €{refund_modal.total_amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <label htmlFor="refund_reason" className="block text-sm font-medium text-gray-700 mb-1">
                          Refund Reason <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="refund_reason"
                          value={refund_modal.refund_reason}
                          onChange={(e) => setRefundModal(prev => ({ ...prev, refund_reason: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a reason</option>
                          <option value="customer_request">Customer Request</option>
                          <option value="order_error">Order Error</option>
                          <option value="quality_issue">Quality Issue</option>
                          <option value="delivery_issue">Delivery Issue</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmRefund}
                  disabled={!refund_modal.refund_reason || refund_mutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refund_mutation.isPending ? 'Processing...' : 'Confirm Refund'}
                </button>
                <button
                  type="button"
                  onClick={() => setRefundModal({
                    visible: false,
                    order_id: '',
                    order_number: '',
                    total_amount: 0,
                    refund_amount: 0,
                    refund_reason: '',
                  })}
                  disabled={refund_mutation.isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancel_modal.visible && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setCancelModal({
              visible: false,
              order_id: '',
              order_number: '',
              cancellation_reason: '',
              issue_refund: false,
            })}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Ban className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Cancel Order #{cancel_modal.order_number}
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="cancellation_reason" className="block text-sm font-medium text-gray-700 mb-1">
                          Cancellation Reason <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="cancellation_reason"
                          value={cancel_modal.cancellation_reason}
                          onChange={(e) => setCancelModal(prev => ({ ...prev, cancellation_reason: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a reason</option>
                          <option value="customer_request">Customer Request</option>
                          <option value="out_of_stock">Out of Stock</option>
                          <option value="payment_issue">Payment Issue</option>
                          <option value="duplicate_order">Duplicate Order</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="issue_refund"
                          checked={cancel_modal.issue_refund}
                          onChange={(e) => setCancelModal(prev => ({ ...prev, issue_refund: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="issue_refund" className="ml-2 block text-sm text-gray-900">
                          Issue refund (if payment was received)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={!cancel_modal.cancellation_reason || cancel_mutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancel_mutation.isPending ? 'Processing...' : 'Confirm Cancellation'}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelModal({
                    visible: false,
                    order_id: '',
                    order_number: '',
                    cancellation_reason: '',
                    issue_refund: false,
                  })}
                  disabled={cancel_mutation.isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminOrders;