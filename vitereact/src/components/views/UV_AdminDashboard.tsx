import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';

// ===========================
// Type Definitions
// ===========================

interface DashboardMetrics {
  orders_today: number;
  revenue_today: number;
  new_customers_today: number;
  collection_count: number;
  delivery_count: number;
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

interface ContentSettings {
  [key: string]: string;
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

  // Handle both flat and nested response structures
  const data = response.data;
  const orders_today = Number(data.orders_today ?? data.today?.orders_today ?? 0);
  const revenue_today = Number(data.revenue_today ?? data.today?.revenue_today ?? 0);
  const new_customers_today = Number(data.new_customers_today ?? data.today?.new_customers_today ?? 0);
  const collection_count = Number(data.collection_count ?? data.today?.collection_count ?? data.orders_breakdown?.collection_count ?? 0);
  const delivery_count = Number(data.delivery_count ?? data.today?.delivery_count ?? data.orders_breakdown?.delivery_count ?? 0);
  
  // Get percentages from response or calculate them
  let collection_percentage = Number(data.orders_breakdown?.collection_percentage ?? 0);
  let delivery_percentage = Number(data.orders_breakdown?.delivery_percentage ?? 0);
  
  // If percentages are 0 but we have counts, calculate them
  if (collection_percentage === 0 && delivery_percentage === 0 && orders_today > 0) {
    collection_percentage = (collection_count / orders_today) * 100;
    delivery_percentage = (delivery_count / orders_today) * 100;
  }

  return {
    orders_today: isNaN(orders_today) ? 0 : orders_today,
    revenue_today: isNaN(revenue_today) ? 0 : revenue_today,
    new_customers_today: isNaN(new_customers_today) ? 0 : new_customers_today,
    collection_count: isNaN(collection_count) ? 0 : collection_count,
    delivery_count: isNaN(delivery_count) ? 0 : delivery_count,
    collection_percentage: isNaN(collection_percentage) ? 0 : Math.round(collection_percentage * 100) / 100,
    delivery_percentage: isNaN(delivery_percentage) ? 0 : Math.round(delivery_percentage * 100) / 100,
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

  // Helper function to decode and sanitize customer names
  const sanitizeCustomerName = (name: string): string => {
    if (!name) return 'Unknown';
    try {
      // Decode HTML entities and fix common encoding issues
      const textarea = document.createElement('textarea');
      textarea.innerHTML = name;
      let decoded = textarea.value;
      
      // Fix common UTF-8 encoding issues
      decoded = decoded.replace(/=\s/g, ' '); // Fix "Moh= Als=" to "Moh Als"
      decoded = decoded.replace(/â€™/g, "'"); // Fix smart quotes
      decoded = decoded.replace(/â€"/g, "-"); // Fix dashes
      decoded = decoded.trim();
      
      return decoded;
    } catch {
      return name;
    }
  };

  return (response.data.orders || []).map((order: any) => ({
    order_id: order.order_id,
    order_number: order.order_number,
    customer_name: sanitizeCustomerName(order.customer_name),
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
  try {
    // Use the new dedicated revenue-trend endpoint
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/dashboard/revenue-trend`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { range: dateRange },
      }
    );

    // Handle the new endpoint response structure
    const revenue_trend = response.data.revenue_trend || [];
    return revenue_trend.map((item: { date: string; revenue: number }) => ({
      date: item.date,
      value: Number(item.revenue ?? 0),
    }));
  } catch (error) {
    // Fallback to the old analytics/sales endpoint if new one fails
    console.warn('Revenue trend endpoint failed, falling back to analytics/sales:', error);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/sales`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { date_range: dateRange },
        }
      );
      return (response.data.revenue_by_day || []).map((item: { date: string; revenue: number }) => ({
        date: item.date,
        value: Number(item.revenue ?? 0),
      }));
    } catch {
      // Return empty array if both fail
      return [];
    }
  }
};

// Fetch content settings for editable labels
const fetchContentSettings = async (token: string): Promise<ContentSettings> => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/content-settings`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { category: 'dashboard' },
      }
    );
    return response.data.settings || {};
  } catch {
    // Return empty object if fetch fails - will use defaults
    return {};
  }
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
}> = ({ data, height = 280, color = '#10b981' }) => {
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    index: number;
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-base font-medium">No revenue data for this period</p>
        <p className="text-sm text-gray-400 mt-1">Revenue data will appear here once orders are completed</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const valueRange = maxValue - minValue || 1;
  
  // Improved chart dimensions with more space for labels
  const viewBoxWidth = 600;
  const viewBoxHeight = height;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 50;
  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

  // Generate Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * (4 - i)) / 4;
    return Math.round(value);
  });

  // Calculate points for polyline
  const points = data
    .map((point, index) => {
      const x = data.length === 1 
        ? paddingLeft + chartWidth / 2 
        : (index / (data.length - 1)) * chartWidth + paddingLeft;
      const normalizedValue = (point.value - minValue) / valueRange;
      const y = paddingTop + chartHeight - (normalizedValue * chartHeight);
      return `${x},${y}`;
    })
    .join(' ');

  // Calculate gradient fill area
  const areaPath = data.length > 0 ? (() => {
    const firstX = data.length === 1 
      ? paddingLeft + chartWidth / 2 
      : paddingLeft;
    const lastX = data.length === 1 
      ? paddingLeft + chartWidth / 2 
      : (data.length - 1) / (data.length - 1) * chartWidth + paddingLeft;
    
    let path = `M ${firstX} ${paddingTop + chartHeight}`;
    data.forEach((point, index) => {
      const x = data.length === 1 
        ? paddingLeft + chartWidth / 2 
        : (index / (data.length - 1)) * chartWidth + paddingLeft;
      const normalizedValue = (point.value - minValue) / valueRange;
      const y = paddingTop + chartHeight - (normalizedValue * chartHeight);
      path += ` L ${x} ${y}`;
    });
    path += ` L ${lastX} ${paddingTop + chartHeight} Z`;
    return path;
  })() : '';

  // Format currency for tooltip and axis
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyFull = (amount: number): string => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date for axis and tooltip
  const formatDate = (dateString: string): string => {
    try {
      return new Intl.DateTimeFormat('en-IE', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const formatDateFull = (dateString: string): string => {
    try {
      return new Intl.DateTimeFormat('en-IE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  // Calculate which X labels to show (max 7-10 labels)
  const maxLabels = data.length <= 10 ? data.length : 7;
  const labelStep = Math.ceil(data.length / maxLabels);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: height }}>
      <svg 
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Background grid */}
        {yTicks.map((_, i) => {
          const y = paddingTop + (chartHeight * i) / (yTicks.length - 1);
          return (
            <line
              key={`grid-${i}`}
              x1={paddingLeft}
              y1={y}
              x2={viewBoxWidth - paddingRight}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => {
          const y = paddingTop + (chartHeight * i) / (yTicks.length - 1);
          return (
            <text
              key={`y-label-${i}`}
              x={paddingLeft - 12}
              y={y}
              textAnchor="end"
              alignmentBaseline="middle"
              fontSize="14"
              fontWeight="500"
              fill="#6b7280"
            >
              {formatCurrency(tick)}
            </text>
          );
        })}

        {/* X-axis labels */}
        {data.map((point, index) => {
          if (index % labelStep !== 0 && index !== data.length - 1) return null;
          const x = data.length === 1 
            ? paddingLeft + chartWidth / 2 
            : (index / (data.length - 1)) * chartWidth + paddingLeft;
          return (
            <text
              key={`x-label-${index}`}
              x={x}
              y={viewBoxHeight - paddingBottom + 25}
              textAnchor="middle"
              fontSize="12"
              fontWeight="500"
              fill="#6b7280"
            >
              {formatDate(point.date)}
            </text>
          );
        })}

        {/* Area fill */}
        {areaPath && (
          <path
            d={areaPath}
            fill="url(#areaGradient)"
          />
        )}

        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = data.length === 1 
            ? paddingLeft + chartWidth / 2 
            : (index / (data.length - 1)) * chartWidth + paddingLeft;
          const normalizedValue = (point.value - minValue) / valueRange;
          const y = paddingTop + chartHeight - (normalizedValue * chartHeight);
          const isHovered = hoveredPoint?.index === index;
          
          return (
            <g key={`point-${index}`}>
              {/* Invisible larger circle for better hover detection */}
              <circle
                cx={x}
                cy={y}
                r="20"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setHoveredPoint({ 
                    index, 
                    x, 
                    y,
                    clientX: e.clientX,
                    clientY: e.clientY 
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* Outer glow on hover */}
              {isHovered && (
                <circle
                  cx={x}
                  cy={y}
                  r="12"
                  fill={color}
                  opacity="0.2"
                />
              )}
              {/* White border circle */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? "8" : "6"}
                fill="white"
                stroke={color}
                strokeWidth="3"
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && data[hoveredPoint.index] && (
        <div
          className="absolute z-50 px-4 py-3 bg-gray-900 text-white rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2"
          style={{
            left: `${((hoveredPoint.x - paddingLeft) / chartWidth) * 100}%`,
            top: `${Math.max(10, ((hoveredPoint.y - paddingTop) / chartHeight) * 100 - 20)}%`,
            minWidth: '140px',
          }}
        >
          <div className="text-lg font-bold text-green-400">
            {formatCurrencyFull(data[hoveredPoint.index].value)}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            {formatDateFull(data[hoveredPoint.index].date)}
          </div>
          {/* Arrow */}
          <div 
            className="absolute w-3 h-3 bg-gray-900 transform rotate-45"
            style={{ bottom: '-6px', left: 'calc(50% - 6px)' }}
          />
        </div>
      )}
    </div>
  );
};

// ===========================
// Main Component
// ===========================

const UV_AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Zustand store - CRITICAL: Individual selectors only
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const deliveryEnabled = useAppStore(state => state.business_settings.delivery_enabled);
  const updateBusinessSettings = useAppStore(state => state.update_business_settings);

  // Local state
  const [selectedDateRange, setSelectedDateRange] = useState<string>(
    searchParams.get('date_range') || 'today'
  );
  const [chartDateRange, setChartDateRange] = useState<string>('last_7_days');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // React Query - Content Settings for editable labels
  const { data: contentSettings } = useQuery({
    queryKey: ['admin-content-settings'],
    queryFn: () => fetchContentSettings(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper to get content setting with fallback
  const getLabel = (key: string, fallback: string): string => {
    return contentSettings?.[key] || fallback;
  };

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
    queryKey: ['admin-revenue-chart', chartDateRange],
    queryFn: () => fetchRevenueChartData(authToken!, chartDateRange),
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
      <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 w-full">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Dashboard</h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 truncate">
                  Welcome back, {currentUser?.first_name} {currentUser?.last_name}
                </p>
              </div>
              
              <div className="flex flex-row items-center gap-2 sm:gap-4 flex-shrink-0">
                {/* Date Range Selector */}
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="px-2 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm flex-shrink-0"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7_days">7 Days</option>
                  <option value="last_30_days">30 Days</option>
                  <option value="this_month">Month</option>
                </select>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center p-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
                  aria-label="Refresh"
                >
                  <svg
                    className={`w-4 h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`}
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
                  <span className="hidden sm:inline">Refresh</span>
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
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 overflow-hidden">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            {/* Orders Today Card */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    {getLabel('dashboard_label_orders_today', 'Orders')}
                  </p>
                  {metricsLoading ? (
                    <div className="mt-1 sm:mt-2 h-8 sm:h-10 w-16 sm:w-20 bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse rounded"></div>
                  ) : metricsError ? (
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">Error</p>
                  ) : (
                    <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      {dashboardMetrics?.orders_today ?? 0}
                    </p>
                  )}
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Revenue Today Card */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    {getLabel('dashboard_label_revenue_today', 'Revenue')}
                  </p>
                  {metricsLoading ? (
                    <div className="mt-1 sm:mt-2 h-8 sm:h-10 w-16 sm:w-24 bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse rounded"></div>
                  ) : metricsError ? (
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">Error</p>
                  ) : (
                    <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-4xl font-bold text-green-600 truncate">
                      {formatCurrency(dashboardMetrics?.revenue_today ?? 0)}
                    </p>
                  )}
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* New Customers Card */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    {getLabel('dashboard_label_new_customers', 'New Customers')}
                  </p>
                  {metricsLoading ? (
                    <div className="mt-1 sm:mt-2 h-8 sm:h-10 w-12 sm:w-16 bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse rounded"></div>
                  ) : metricsError ? (
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">Error</p>
                  ) : (
                    <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      {dashboardMetrics?.new_customers_today ?? 0}
                    </p>
                  )}
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Collection vs Delivery Card */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-shadow duration-200">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2 sm:mb-4">
                {getLabel('dashboard_label_order_types', 'Order Types')}
              </p>
              {metricsLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse rounded"></div>
                </div>
              ) : metricsError ? (
                <p className="text-sm text-red-600">Error loading</p>
              ) : (
                <>
                  {(dashboardMetrics?.orders_today ?? 0) === 0 ? (
                    <div className="flex items-center justify-center h-20 text-center">
                      <p className="text-xs text-gray-400 italic">No orders yet today</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Collection</span>
                          <span className="text-xs font-semibold text-gray-900">
                            {dashboardMetrics?.collection_count ?? 0} ({(dashboardMetrics?.collection_percentage ?? 0).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(dashboardMetrics?.collection_percentage ?? 0, 0)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600">Delivery</span>
                          <span className="text-xs font-semibold text-gray-900">
                            {dashboardMetrics?.delivery_count ?? 0} ({(dashboardMetrics?.delivery_percentage ?? 0).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-orange-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(dashboardMetrics?.delivery_percentage ?? 0, 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Alerts Section */}
          {(pendingAlerts && (pendingAlerts.low_stock_items_count > 0 || pendingAlerts.new_catering_inquiries_count > 0)) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8 rounded-lg">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    {getLabel('dashboard_title_pending_alerts', 'Pending Alerts')}
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
            {/* Revenue Chart - Takes more space */}
            <div className="xl:col-span-2 bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6">
              <div className="flex flex-row items-center justify-between mb-3 sm:mb-4 lg:mb-6 gap-2 sm:gap-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
                  {getLabel('dashboard_title_revenue_trend', 'Revenue Trend')}
                </h2>
                <select
                  value={chartDateRange}
                  onChange={(e) => setChartDateRange(e.target.value)}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  <option value="today">Today</option>
                  <option value="last_7_days">7 Days</option>
                  <option value="last_30_days">30 Days</option>
                  <option value="this_month">Month</option>
                </select>
              </div>
              {chartLoading ? (
                <div className="h-80 bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                  <div className="text-gray-400">Loading chart data...</div>
                </div>
              ) : chartError ? (
                <div className="h-80 flex flex-col items-center justify-center text-red-500 bg-red-50 rounded-lg">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">Failed to load chart data</p>
                  <button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-revenue-chart'] })}
                    className="mt-3 px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="h-80 min-h-[320px]">
                  <LineChart
                    data={revenueChartData || []}
                    height={320}
                    color="#10b981"
                  />
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg border border-gray-100 p-3 sm:p-4 lg:p-6">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                {getLabel('dashboard_title_quick_actions', 'Quick Actions')}
              </h2>
              <div className="space-y-2 sm:space-y-4">
                {/* Toggle Delivery with Clear Status Label */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Delivery Status
                    </span>
                    <button
                      onClick={() => toggleDeliveryMutation.mutate(!deliveryEnabled)}
                      disabled={toggleDeliveryMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        deliveryEnabled ? 'bg-green-600' : 'bg-gray-300'
                      } ${toggleDeliveryMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={`Turn delivery ${deliveryEnabled ? 'off' : 'on'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          deliveryEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${deliveryEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className={`text-xs font-medium ${deliveryEnabled ? 'text-green-700' : 'text-gray-600'}`}>
                      {deliveryEnabled ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons with Clear Hierarchy */}
                <Link
                  to="/admin/menu/item"
                  className="block w-full px-4 py-3 text-center text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors duration-200 shadow-sm"
                >
                  {getLabel('quick_action_add_menu_item', 'Add Menu Item')}
                </Link>
                <Link
                  to="/admin/discounts/code"
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  {getLabel('quick_action_create_discount', 'Create Discount')}
                </Link>
                <Link
                  to="/admin/analytics"
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  {getLabel('quick_action_view_analytics', 'View Analytics')}
                </Link>
                
                {/* Link to Content Settings */}
                <Link
                  to="/admin/content"
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200 border border-blue-200"
                >
                  Edit Dashboard Labels
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-lg border border-gray-100 overflow-hidden w-full max-w-full">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
                {getLabel('dashboard_title_recent_orders', 'Recent Orders')}
              </h2>
              <Link
                to="/admin/orders"
                className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 flex-shrink-0"
              >
                View All →
              </Link>
            </div>
            <div className="overflow-x-auto w-full">
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
                        <div className="flex items-center cursor-pointer hover:text-gray-700 transition-colors group">
                          Amount
                          <svg className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center cursor-pointer hover:text-gray-700 transition-colors group">
                          Status
                          <svg className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center cursor-pointer hover:text-gray-700 transition-colors group">
                          Time
                          <svg className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </div>
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