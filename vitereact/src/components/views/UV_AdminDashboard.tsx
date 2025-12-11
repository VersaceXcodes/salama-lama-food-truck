import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface DashboardMetrics {
  orders_today: number;
  revenue_today: number;
  new_customers_today: number;
  collection_percentage: number;
  delivery_percentage: number;
}

interface PendingAlerts {
  low_stock_items_count: number;
  new_catering_inquiries_count: number;
  low_stock_items: Array<{
    item_id: string;
    item_name: string;
    current_stock: number;
  }>;
}

interface RecentOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  order_type: 'collection' | 'delivery';
  total_amount: number;
  status: string;
  created_at: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
}

// ===========================
// API Functions
// ===========================

const fetchDashboardMetrics = async (
  token: string,
  dateRange: string
): Promise<DashboardMetrics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/dashboard`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { date_range: dateRange },
    }
  );

  return {
    orders_today: response.data.orders_today || 0,
    revenue_today: response.data.revenue_today || 0,
    new_customers_today: response.data.new_customers_today || 0,
    collection_percentage: response.data.orders_breakdown?.collection_percentage || 0,
    delivery_percentage: response.data.orders_breakdown?.delivery_percentage || 0,
  };
};

const fetchPendingAlerts = async (token: string): Promise<PendingAlerts> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/dashboard/alerts`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return {
    low_stock_items_count: response.data.low_stock_items_count || 0,
    new_catering_inquiries_count: response.data.new_catering_inquiries_count || 0,
    low_stock_items: response.data.low_stock_items || [],
  };
};

const fetchRecentOrders = async (token: string): Promise<RecentOrder[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/orders`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    }
  );

  return (response.data.orders || []).map((order: any) => ({
    order_id: order.order_id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    order_type: order.order_type,
    total_amount: Number(order.total_amount || 0),
    status: order.status,
    created_at: order.created_at,
  }));
};

const fetchRevenueChartData = async (
  token: string,
  dateRange: string
): Promise<ChartDataPoint[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/sales`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        date_range: dateRange,
        report_type: 'revenue_trend',
      },
    }
  );

  return (response.data.revenue_by_day || []).map((item: any) => ({
    date: item.date,
    value: Number(item.revenue || 0),
  }));
};

const toggleDeliveryService = async (
  token: string,
  enabled: boolean
): Promise<void> => {
  await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/delivery/settings`,
    { delivery_enabled: enabled },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// ===========================
// Chart Components
// ===========================

const LineChart: React.FC<{
  data: ChartDataPoint[];
  height?: number;
  color?: string;
}> = ({ data, height = 200, color = '#3b82f6' }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const padding = 10;

  const points = data
    .map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
      const y = height - (point.value / maxValue) * (height - padding * 2) - padding;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
      {data.map((point, index) => {
        const x = (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
        const y = height - (point.value / maxValue) * (height - padding * 2) - padding;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
          />
        );
      })}
    </svg>
  );
};

// ===========================
// Main Component
// ===========================

const UV_AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Zustand store - CRITICAL: Individual selectors only
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const deliveryEnabled = useAppStore(state => state.business_settings.delivery_enabled);
  const updateBusinessSettings = useAppStore(state => state.update_business_settings);

  // Local state
  const [selectedDateRange, setSelectedDateRange] = useState<string>(
    searchParams.get('date_range') || 'today'
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Update URL when date range changes
  useEffect(() => {
    if (selectedDateRange !== 'today') {
      setSearchParams({ date_range: selectedDateRange });
    } else {
      setSearchParams({});
    }
  }, [selectedDateRange, setSearchParams]);

  // React Query - Dashboard Metrics
  const {
    data: dashboardMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['admin-dashboard-metrics', selectedDateRange],
    queryFn: () => fetchDashboardMetrics(authToken!, selectedDateRange),
    enabled: !!authToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // React Query - Pending Alerts
  const {
    data: pendingAlerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['admin-dashboard-alerts'],
    queryFn: () => fetchPendingAlerts(authToken!),
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: false,
  });

  // React Query - Recent Orders
  const {
    data: recentOrders,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => fetchRecentOrders(authToken!),
    enabled: !!authToken,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // React Query - Revenue Chart Data
  const {
    data: revenueChartData,
    isLoading: chartLoading,
    error: chartError,
  } = useQuery({
    queryKey: ['admin-revenue-chart', selectedDateRange],
    queryFn: () => fetchRevenueChartData(authToken!, selectedDateRange),
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Mutation - Toggle Delivery Service
  const toggleDeliveryMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleDeliveryService(authToken!, enabled),
    onSuccess: (_, enabled) => {
      updateBusinessSettings({ delivery_enabled: enabled });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
    },
  });

  // Handle manual refresh
  const handleRefresh = () => {
    refetchMetrics();
    refetchAlerts();
    refetchOrders();
    setLastUpdatedAt(new Date().toISOString());
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format date/time
  const formatDateTime = (dateString: string): string => {
    return new Intl.DateTimeFormat('en-IE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  // Loading state
  const isLoading = metricsLoading || alertsLoading || ordersLoading || chartLoading;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome back, {currentUser?.first_name} {currentUser?.last_name}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Date Range Selector */}
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                </select>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <svg
                    className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {lastUpdatedAt && (
              <p className="mt-2 text-xs text-gray-500">
                Last updated: {formatDateTime(lastUpdatedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Orders Today Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Orders Today</p>
                  {metricsLoading ? (
                    <div className="mt-2 h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : metricsError ? (
                    <p className="mt-2 text-sm text-red-600">Error loading</p>
                  ) : (
                    <p className="mt-2 text-4xl font-bold text-gray-900">
                      {dashboardMetrics?.orders_today || 0}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Revenue Today Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                  {metricsLoading ? (
                    <div className="mt-2 h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                  ) : metricsError ? (
                    <p className="mt-2 text-sm text-red-600">Error loading</p>
                  ) : (
                    <p className="mt-2 text-4xl font-bold text-green-600">
                      {formatCurrency(dashboardMetrics?.revenue_today || 0)}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* New Customers Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Customers</p>
                  {metricsLoading ? (
                    <div className="mt-2 h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                  ) : metricsError ? (
                    <p className="mt-2 text-sm text-red-600">Error loading</p>
                  ) : (
                    <p className="mt-2 text-4xl font-bold text-gray-900">
                      {dashboardMetrics?.new_customers_today || 0}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Collection vs Delivery Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <p className="text-sm font-medium text-gray-600 mb-4">Order Types</p>
              {metricsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
                </div>
              ) : metricsError ? (
                <p className="text-sm text-red-600">Error loading</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">Collection</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {dashboardMetrics?.collection_percentage.toFixed(0) || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dashboardMetrics?.collection_percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">Delivery</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {dashboardMetrics?.delivery_percentage.toFixed(0) || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dashboardMetrics?.delivery_percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alerts Section */}
          {(pendingAlerts && (pendingAlerts.low_stock_items_count > 0 || pendingAlerts.new_catering_inquiries_count > 0)) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-lg">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    Pending Alerts
                  </h3>
                  <div className="space-y-2">
                    {pendingAlerts.low_stock_items_count > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-yellow-700">
                          <span className="font-semibold">{pendingAlerts.low_stock_items_count}</span> items are low in stock
                        </p>
                        <Link
                          to="/admin/stock?status=low_stock"
                          className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                        >
                          View Stock
                        </Link>
                      </div>
                    )}
                    {pendingAlerts.new_catering_inquiries_count > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-yellow-700">
                          <span className="font-semibold">{pendingAlerts.new_catering_inquiries_count}</span> new catering inquiries
                        </p>
                        <Link
                          to="/admin/catering?status=new"
                          className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                        >
                          View Inquiries
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts and Recent Orders Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Revenue Trend
              </h2>
              {chartLoading ? (
                <div className="h-64 bg-gray-200 animate-pulse rounded"></div>
              ) : chartError ? (
                <div className="h-64 flex items-center justify-center text-red-600">
                  Failed to load chart data
                </div>
              ) : (
                <div className="h-64">
                  <LineChart
                    data={revenueChartData || []}
                    height={200}
                    color="#10b981"
                  />
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-4">
                {/* Toggle Delivery */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    Delivery Service
                  </span>
                  <button
                    onClick={() => toggleDeliveryMutation.mutate(!deliveryEnabled)}
                    disabled={toggleDeliveryMutation.isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      deliveryEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    } ${toggleDeliveryMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        deliveryEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Action Buttons */}
                <Link
                  to="/admin/menu/item"
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                  Add Menu Item
                </Link>
                <Link
                  to="/admin/discounts/code"
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                >
                  Create Discount
                </Link>
                <Link
                  to="/admin/analytics"
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  View Analytics
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
              <Link
                to="/admin/orders"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View All →
              </Link>
            </div>
            <div className="overflow-x-auto">
              {ordersLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : ordersError ? (
                <div className="p-6 text-center text-red-600">
                  Failed to load recent orders
                </div>
              ) : recentOrders && recentOrders.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/admin/orders/${order.order_id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customer_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.order_type === 'delivery'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {order.order_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/admin/orders/${order.order_id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No recent orders
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminDashboard;