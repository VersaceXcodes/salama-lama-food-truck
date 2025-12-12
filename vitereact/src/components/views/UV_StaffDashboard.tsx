import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Clock, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp,
  ShoppingBag,
  Users,
  Timer,
  ChevronRight,
  X
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface DashboardMetrics {
  total_orders_today: number;
  orders_in_progress: number;
  orders_completed_today: number;
  average_prep_time: number | null;
}

interface ActiveOrderPreview {
  order_id: string;
  order_number: string;
  order_type: 'collection' | 'delivery';
  customer_name: string;
  items_summary: string;
  collection_time_slot: string | null;
  time_remaining: number | null;
}

interface LowStockAlert {
  item_id: string;
  item_name: string;
  current_stock: number;
  low_stock_threshold: number;
  alert_level: 'warning' | 'critical';
}

interface DashboardResponse {
  total_orders_today: number;
  orders_in_progress: number;
  orders_completed_today: number;
  average_prep_time: number | null;
  low_stock_items: Array<{
    item_id: string;
    name: string;
    current_stock: number;
    low_stock_threshold: number;
  }>;
}

interface OrdersResponse {
  orders: Array<{
    order_id: string;
    order_number: string;
    order_type: 'collection' | 'delivery';
    customer_name: string;
    items: Array<{ item_name: string }>;
    collection_time_slot: string | null;
  }>;
}

// ===========================
// API Functions
// ===========================

const fetchDashboardMetrics = async (authToken: string): Promise<DashboardResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const fetchActiveOrders = async (authToken: string): Promise<OrdersResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/orders`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        status: 'received,preparing,ready',
        limit: 5,
        sort_by: 'collection_time_slot',
      },
    }
  );
  return response.data;
};

const updateOrderStatus = async (
  authToken: string,
  orderId: string,
  newStatus: string
): Promise<{ order_id: string; status: string }> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/orders/${orderId}/status`,
    {
      status: newStatus,
      notes: 'Updated from dashboard',
    },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// ===========================
// Helper Functions
// ===========================

const calculateTimeRemaining = (collectionTimeSlot: string | null): number | null => {
  if (!collectionTimeSlot) return null;
  const targetTime = new Date(collectionTimeSlot).getTime();
  const currentTime = new Date().getTime();
  const minutesRemaining = Math.floor((targetTime - currentTime) / 60000);
  return minutesRemaining;
};

const formatTimeRemaining = (minutes: number | null): string => {
  if (minutes === null) return 'N/A';
  if (minutes < 0) return 'Overdue';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const getTimeRemainingColor = (minutes: number | null): string => {
  if (minutes === null) return 'text-gray-500';
  if (minutes < 0) return 'text-red-600';
  if (minutes < 15) return 'text-orange-600';
  if (minutes < 30) return 'text-yellow-600';
  return 'text-green-600';
};

// ===========================
// Main Component
// ===========================

const UV_StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  // ===========================
  // React Query - Dashboard Metrics
  // ===========================

  const {
    data: metricsData,
    isLoading: metricsLoading,

    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['staffDashboardMetrics'],
    queryFn: () => fetchDashboardMetrics(authToken!),
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // ===========================
  // React Query - Active Orders
  // ===========================

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['staffActiveOrders'],
    queryFn: () => fetchActiveOrders(authToken!),
    enabled: !!authToken,
    staleTime: 15000, // 15 seconds
    refetchInterval: 15000, // Auto-refetch every 15 seconds
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // ===========================
  // React Query - Update Order Status Mutation
  // ===========================

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: string }) =>
      updateOrderStatus(authToken!, orderId, newStatus),
    onSuccess: () => {
      // Invalidate and refetch dashboard data
      queryClient.invalidateQueries({ queryKey: ['staffDashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['staffActiveOrders'] });
    },
  });

  // ===========================
  // Derived State
  // ===========================

  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    if (!metricsData) {
      return {
        total_orders_today: 0,
        orders_in_progress: 0,
        orders_completed_today: 0,
        average_prep_time: null,
      };
    }
    return {
      total_orders_today: metricsData.total_orders_today,
      orders_in_progress: metricsData.orders_in_progress,
      orders_completed_today: metricsData.orders_completed_today,
      average_prep_time: metricsData.average_prep_time,
    };
  }, [metricsData]);

  const activeOrdersPreview: ActiveOrderPreview[] = useMemo(() => {
    if (!ordersData?.orders) return [];
    
    return ordersData.orders.map(order => ({
      order_id: order.order_id,
      order_number: order.order_number,
      order_type: order.order_type,
      customer_name: order.customer_name,
      items_summary: `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`,
      collection_time_slot: order.collection_time_slot,
      time_remaining: calculateTimeRemaining(order.collection_time_slot),
    }));
  }, [ordersData]);

  const lowStockAlerts: LowStockAlert[] = useMemo(() => {
    if (!metricsData?.low_stock_items) return [];
    
    return metricsData.low_stock_items
      .filter(item => !acknowledgedAlerts.has(item.item_id))
      .map(item => ({
        item_id: item.item_id,
        item_name: item.name,
        current_stock: Number(item.current_stock || 0),
        low_stock_threshold: Number(item.low_stock_threshold || 0),
        alert_level: Number(item.current_stock || 0) === 0 ? 'critical' : 'warning',
      }));
  }, [metricsData, acknowledgedAlerts]);

  // ===========================
  // Effects
  // ===========================

  useEffect(() => {
    // Update last_updated timestamp when data refreshes
    if (metricsData || ordersData) {
      setLastUpdated(new Date().toISOString());
    }
  }, [metricsData, ordersData]);

  // ===========================
  // Event Handlers
  // ===========================

  const handleRefreshDashboard = () => {
    refetchMetrics();
    refetchOrders();
  };

  const handleQuickStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, newStatus });
  };

  const handleAcknowledgeAlert = (itemId: string) => {
    setAcknowledgedAlerts(prev => new Set(prev).add(itemId));
  };

  const handleNavigateToOrderQueue = () => {
    navigate('/staff/orders');
  };

  const handleNavigateToOrderDetail = (orderId: string) => {
    navigate(`/staff/orders/${orderId}`);
  };

  const handleNavigateToStock = () => {
    navigate('/staff/stock');
  };

  // ===========================
  // Render Helpers
  // ===========================

  const getOrderTypeDisplay = (orderType: 'collection' | 'delivery'): { text: string; color: string } => {
    return orderType === 'collection'
      ? { text: 'Collection', color: 'bg-blue-100 text-blue-800' }
      : { text: 'Delivery', color: 'bg-purple-100 text-purple-800' };
  };

  const _getNextStatusAction = (currentStatus: string): { status: string; label: string; color: string } | null => {
    const statusMap: Record<string, { status: string; label: string; color: string }> = {
      received: { status: 'preparing', label: 'Start Preparing', color: 'bg-blue-600 hover:bg-blue-700' },
      preparing: { status: 'ready', label: 'Mark Ready', color: 'bg-green-600 hover:bg-green-700' },
      ready: { status: 'completed', label: 'Complete', color: 'bg-gray-600 hover:bg-gray-700' },
    };
    return statusMap[currentStatus] || null;
  };
  // getNextStatusAction is defined but currently unused - placeholder for future feature

  // ===========================
  // Loading State
  // ===========================

  if (!authToken || !currentUser) {
    navigate('/staff/login');
    return null;
  }

  // ===========================
  // Main Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Staff Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome back, {currentUser.first_name}! Here's your operational overview.
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Last Updated */}
                <div className="text-right">
                  <p className="text-xs text-gray-500">Last updated</p>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(lastUpdated).toLocaleTimeString('en-IE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                
                {/* Refresh Button */}
                <button
                  onClick={handleRefreshDashboard}
                  disabled={metricsLoading || ordersLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  aria-label="Refresh dashboard"
                >
                  <RefreshCw className={`size-5 mr-2 ${(metricsLoading || ordersLoading) ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Orders Today */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 transition-all duration-200 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {metricsLoading ? (
                      <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      dashboardMetrics.total_orders_today
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Today</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingBag className="size-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Orders In Progress */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 transition-all duration-200 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {metricsLoading ? (
                      <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      dashboardMetrics.orders_in_progress
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Active orders</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="size-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Completed Today */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 transition-all duration-200 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {metricsLoading ? (
                      <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      dashboardMetrics.orders_completed_today
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Today</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="size-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Average Prep Time */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 transition-all duration-200 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Prep Time</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {metricsLoading ? (
                      <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                    ) : dashboardMetrics.average_prep_time !== null ? (
                      `${Math.round(dashboardMetrics.average_prep_time)}m`
                    ) : (
                      'N/A'
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Minutes</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Timer className="size-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Stock Alerts Section */}
          {lowStockAlerts.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="size-6 text-orange-600" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Stock Alerts
                      </h2>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {lowStockAlerts.length} alert{lowStockAlerts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={handleNavigateToStock}
                      className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      View Stock →
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {lowStockAlerts.map((alert) => (
                    <div
                      key={alert.item_id}
                      className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        alert.alert_level === 'critical' ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`p-2 rounded-lg ${
                          alert.alert_level === 'critical' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          <Package className={`size-5 ${
                            alert.alert_level === 'critical' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{alert.item_name}</h3>
                          <p className="text-sm text-gray-600 mt-0.5">
                            Current stock: <span className={`font-semibold ${
                              alert.alert_level === 'critical' ? 'text-red-600' : 'text-yellow-600'
                            }`}>{alert.current_stock}</span> / Threshold: {alert.low_stock_threshold}
                          </p>
                        </div>
                        
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          alert.alert_level === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.alert_level === 'critical' ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.item_id)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        aria-label="Acknowledge alert"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Orders Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="size-6 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Next Orders
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {activeOrdersPreview.length} active
                  </span>
                </div>
                <button
                  onClick={handleNavigateToOrderQueue}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  View All Orders
                  <ChevronRight className="size-4 ml-1" />
                </button>
              </div>
            </div>

            {/* Orders Content */}
            {ordersError ? (
              <div className="px-6 py-12 text-center">
                <AlertTriangle className="size-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Failed to load orders</p>
                <button
                  onClick={() => refetchOrders()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : ordersLoading ? (
              <div className="divide-y divide-gray-200">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-6 py-6 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-10 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeOrdersPreview.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle className="size-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">All caught up!</p>
                <p className="text-gray-500 text-sm mt-1">No active orders at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {activeOrdersPreview.map((order) => {
                  const orderTypeDisplay = getOrderTypeDisplay(order.order_type);
                  const timeRemainingColor = getTimeRemainingColor(order.time_remaining);
                  
                  return (
                    <div
                      key={order.order_id}
                      className="px-6 py-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        {/* Order Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              Order #{order.order_number}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${orderTypeDisplay.color}`}>
                              {orderTypeDisplay.text}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center text-sm text-gray-600">
                              <Users className="size-4 mr-2 flex-shrink-0" />
                              <span className="font-medium">{order.customer_name}</span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                              <Package className="size-4 mr-2 flex-shrink-0" />
                              <span>{order.items_summary}</span>
                            </div>
                            
                            {order.collection_time_slot && (
                              <div className="flex items-center text-sm">
                                <Clock className={`size-4 mr-2 flex-shrink-0 ${timeRemainingColor}`} />
                                <span className="text-gray-600">
                                  {new Date(order.collection_time_slot).toLocaleTimeString('en-IE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className={`ml-2 font-semibold ${timeRemainingColor}`}>
                                  ({formatTimeRemaining(order.time_remaining)})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3 ml-6">
                          <button
                            onClick={() => handleNavigateToOrderDetail(order.order_id)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                          >
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleQuickStatusUpdate(order.order_id, 'preparing')}
                            disabled={updateStatusMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            {updateStatusMutation.isPending ? (
                              <span className="flex items-center">
                                <RefreshCw className="size-4 mr-2 animate-spin" />
                                Updating...
                              </span>
                            ) : (
                              'Start Preparing'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default UV_StaffDashboard;