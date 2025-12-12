import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Download, 
  DollarSign, 
  ShoppingBag, 
  Award,
  Calendar,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface SalesAnalytics {
  success: boolean;
  summary: {
    orders: number;
    revenue: number;
    average_order_value: number;
  };
  breakdown_by_type: Array<{
    order_type: string;
    orders: number;
    revenue: number;
  }>;
  revenue_by_day?: Array<{ date: string; revenue: number }>;
  top_items: Array<{
    item_id?: string;
    item_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
}

interface CustomerAnalytics {
  new_customers: number;
  repeat_customer_rate: number;
  customer_lifetime_value: number;
  top_customers: Array<{
    user_id: string;
    customer_name: string;
    total_orders: number;
    total_spend: number;
  }>;
  loyalty_engagement: {
    active_participants: number;
    points_issued: number;
    points_redeemed: number;
  };
}

interface TimeAnalytics {
  peak_order_hours: Array<{ hour: number; order_count: number }>;
  average_fulfillment_time: number;
  orders_by_day_of_week: Array<{ day: string; order_count: number }>;
}

// ===========================
// API Functions
// ===========================

const fetchSalesAnalytics = async (
  authToken: string,
  dateRange: string,
  reportType: string
): Promise<SalesAnalytics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/sales`,
    {
      params: { date_range: dateRange, report_type: reportType },
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  return response.data;
};

const fetchCustomerAnalytics = async (
  authToken: string,
  dateRange: string
): Promise<CustomerAnalytics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/customers`,
    {
      params: { date_range: dateRange },
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  return response.data;
};

const fetchTimeAnalytics = async (
  authToken: string,
  dateRange: string
): Promise<TimeAnalytics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/time-analysis`,
    {
      params: { date_range: dateRange },
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  return response.data;
};

// ===========================
// Helper Components
// ===========================

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
}> = ({ title, value, icon, trend, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isPositive ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const SimpleLineChart: React.FC<{ data: Array<{ date: string; revenue: number }> }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const width = 800;
  const height = 250;
  const padding = 40;

  const points = data.map((d, i) => ({
    x: padding + (i * (width - 2 * padding)) / (data.length - 1),
    y: height - padding - ((d.revenue / maxRevenue) * (height - 2 * padding)),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + fraction * (height - 2 * padding)}
            x2={width - padding}
            y2={padding + fraction * (height - 2 * padding)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        
        {/* Revenue line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="3" />
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" />
        ))}
        
        {/* Labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={points[i].x}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </svg>
    </div>
  );
};

const SimpleBarChart: React.FC<{ data: Array<{ label: string; value: number }> }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = 60;
  const spacing = 20;
  const width = data.length * (barWidth + spacing) + 40;
  const height = 250;
  const padding = 40;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
        {data.map((d, i) => {
          const barHeight = ((d.value / maxValue) * (height - 2 * padding));
          const x = padding + i * (barWidth + spacing);
          const y = height - padding - barHeight;
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#1f2937"
                fontWeight="600"
              >
                {d.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ===========================
// Main Component
// ===========================

const UV_AdminAnalytics: React.FC = () => {
  // URL params management
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State from URL params
  const [selectedDateRange, setSelectedDateRange] = useState<string>(
    searchParams.get('date_range') || 'last_30_days'
  );
  const [activeReportType, setActiveReportType] = useState<string>(
    searchParams.get('report_type') || 'overview'
  );
  const [exportLoading, setExportLoading] = useState(false);

  // CRITICAL: Individual Zustand selectors (NO object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Update URL when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedDateRange !== 'last_30_days') {
      params.date_range = selectedDateRange;
    }
    if (activeReportType !== 'overview') {
      params.report_type = activeReportType;
    }
    setSearchParams(params, { replace: true });
  }, [selectedDateRange, activeReportType, setSearchParams]);

  // React Query: Sales Analytics
  const {
    data: salesAnalytics,
    isLoading: salesLoading,
    error: salesError,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ['admin-analytics-sales', selectedDateRange, activeReportType],
    queryFn: () => fetchSalesAnalytics(authToken!, selectedDateRange, activeReportType),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  // React Query: Customer Analytics (only when customers tab active)
  const {
    data: customerAnalytics,
    isLoading: customerLoading,
    error: customerError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ['admin-analytics-customers', selectedDateRange],
    queryFn: () => fetchCustomerAnalytics(authToken!, selectedDateRange),
    enabled: !!authToken && activeReportType === 'customers',
    staleTime: 5 * 60 * 1000,
  });

  // React Query: Time Analytics (only when time tab active)
  const {
    data: timeAnalytics,
    isLoading: timeLoading,
    error: timeError,
    refetch: refetchTime,
  } = useQuery({
    queryKey: ['admin-analytics-time', selectedDateRange],
    queryFn: () => fetchTimeAnalytics(authToken!, selectedDateRange),
    enabled: !!authToken && activeReportType === 'time',
    staleTime: 5 * 60 * 1000,
  });

  // Handle date range change
  const handleDateRangeChange = (newRange: string) => {
    setSelectedDateRange(newRange);
  };

  // Handle report type change
  const handleReportTypeChange = (newType: string) => {
    setActiveReportType(newType);
  };

  // Export to CSV
  const handleExport = async () => {
    if (!authToken) return;
    
    setExportLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/sales`,
        {
          params: { date_range: selectedDateRange, format: 'csv' },
          headers: { Authorization: `Bearer ${authToken}` },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${selectedDateRange}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export analytics data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Check authentication
  if (!authToken || !currentUser || currentUser.role !== 'admin') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">You need admin privileges to view analytics.</p>
            <Link
              to="/admin/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Business Analytics</h1>
                <p className="text-gray-600 mt-2">Comprehensive insights into your business performance</p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Date Range Selector */}
                <select
                  value={selectedDateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Year</option>
                </select>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={exportLoading || salesLoading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Report Type Tabs */}
            <div className="flex space-x-2 border-b border-gray-200">
              <button
                onClick={() => handleReportTypeChange('overview')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeReportType === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-5 h-5 inline-block mr-2" />
                Sales Overview
              </button>
              
              <button
                onClick={() => handleReportTypeChange('customers')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeReportType === 'customers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-5 h-5 inline-block mr-2" />
                Customer Insights
              </button>
              
              <button
                onClick={() => handleReportTypeChange('time')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeReportType === 'time'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-5 h-5 inline-block mr-2" />
                Time Analysis
              </button>
            </div>
          </div>

          {/* Sales Overview Content */}
          {activeReportType === 'overview' && (
            <>
              {salesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading analytics...</span>
                </div>
              ) : salesError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700 mb-4">Failed to load sales analytics</p>
                  <button
                    onClick={() => refetchSales()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : salesAnalytics ? (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="Total Revenue"
                      value={formatCurrency(salesAnalytics.summary?.revenue || 0)}
                      icon={<DollarSign className="w-6 h-6 text-green-600" />}
                      color="bg-green-50"
                    />
                    
                    <MetricCard
                      title="Total Orders"
                      value={(salesAnalytics.summary?.orders || 0).toLocaleString()}
                      icon={<ShoppingBag className="w-6 h-6 text-blue-600" />}
                      color="bg-blue-50"
                    />
                    
                    <MetricCard
                      title="Average Order Value"
                      value={formatCurrency(salesAnalytics.summary?.average_order_value || 0)}
                      icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
                      color="bg-purple-50"
                    />
                  </div>

                  {/* Revenue Trend Chart */}
                  {salesAnalytics.revenue_by_day && salesAnalytics.revenue_by_day.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                      <SimpleLineChart data={salesAnalytics.revenue_by_day} />
                    </div>
                  )}

                  {/* Orders Breakdown & Top Items */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Orders Breakdown */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Breakdown</h3>
                      <div className="space-y-4">
                        {salesAnalytics.breakdown_by_type?.map((breakdown) => (
                          <div key={breakdown.order_type} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded mr-3 ${
                                breakdown.order_type === 'collection' ? 'bg-blue-600' : 'bg-green-600'
                              }`}></div>
                              <span className="text-gray-700 capitalize">{breakdown.order_type}</span>
                            </div>
                            <span className="font-semibold text-gray-900">
                              {breakdown.orders} orders
                            </span>
                          </div>
                        ))}

                        {salesAnalytics.breakdown_by_type && salesAnalytics.breakdown_by_type.length > 0 && (
                          <div className="pt-4 border-t border-gray-200">
                            {salesAnalytics.breakdown_by_type.map((breakdown) => (
                              <div key={breakdown.order_type} className="flex items-center justify-between text-sm text-gray-600 mt-2 first:mt-0">
                                <span className="capitalize">{breakdown.order_type} Rate</span>
                                <span className="font-medium">
                                  {salesAnalytics.summary?.orders 
                                    ? ((breakdown.orders / salesAnalytics.summary.orders) * 100).toFixed(1)
                                    : '0.0'}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Selling Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Items</h3>
                      <div className="space-y-3">
                        {salesAnalytics.top_items?.slice(0, 5).map((item, index) => (
                          <div key={item.item_id || item.item_name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">{item.item_name}</p>
                                <p className="text-sm text-gray-500">{item.quantity_sold} sold</p>
                              </div>
                            </div>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(item.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}

          {/* Customer Analytics Content */}
          {activeReportType === 'customers' && (
            <>
              {customerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading customer analytics...</span>
                </div>
              ) : customerError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700 mb-4">Failed to load customer analytics</p>
                  <button
                    onClick={() => refetchCustomers()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : customerAnalytics ? (
                <>
                  {/* Customer Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="New Customers"
                      value={customerAnalytics.new_customers.toLocaleString()}
                      icon={<Users className="w-6 h-6 text-blue-600" />}
                      color="bg-blue-50"
                    />
                    
                    <MetricCard
                      title="Repeat Customer Rate"
                      value={formatPercentage(customerAnalytics.repeat_customer_rate)}
                      icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                      color="bg-green-50"
                    />
                    
                    <MetricCard
                      title="Customer Lifetime Value"
                      value={formatCurrency(customerAnalytics.customer_lifetime_value)}
                      icon={<Award className="w-6 h-6 text-purple-600" />}
                      color="bg-purple-50"
                    />
                  </div>

                  {/* Top Customers & Loyalty Engagement */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Top Customers */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
                      <div className="space-y-3">
                        {customerAnalytics.top_customers.slice(0, 5).map((customer, index) => (
                          <div key={customer.user_id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-600 font-semibold text-sm">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">{customer.customer_name}</p>
                                <p className="text-sm text-gray-500">{customer.total_orders} orders</p>
                              </div>
                            </div>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(customer.total_spend)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Loyalty Engagement */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Program Engagement</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Active Participants</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {customerAnalytics.loyalty_engagement.active_participants.toLocaleString()}
                            </p>
                          </div>
                          <Award className="w-8 h-8 text-blue-600" />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Points Issued</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {customerAnalytics.loyalty_engagement.points_issued.toLocaleString()}
                            </p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-600" />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Points Redeemed</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {customerAnalytics.loyalty_engagement.points_redeemed.toLocaleString()}
                            </p>
                          </div>
                          <ShoppingBag className="w-8 h-8 text-purple-600" />
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Redemption Rate</span>
                            <span className="font-medium">
                              {((customerAnalytics.loyalty_engagement.points_redeemed / customerAnalytics.loyalty_engagement.points_issued) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}

          {/* Time Analytics Content */}
          {activeReportType === 'time' && (
            <>
              {timeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading time analytics...</span>
                </div>
              ) : timeError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700 mb-4">Failed to load time analytics</p>
                  <button
                    onClick={() => refetchTime()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : timeAnalytics ? (
                <>
                  {/* Average Fulfillment Time */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <MetricCard
                      title="Average Fulfillment Time"
                      value={`${timeAnalytics.average_fulfillment_time} min`}
                      icon={<Clock className="w-6 h-6 text-blue-600" />}
                      color="bg-blue-50"
                    />
                    
                    <MetricCard
                      title="Peak Order Hour"
                      value={`${timeAnalytics.peak_order_hours[0]?.hour || 0}:00`}
                      icon={<Calendar className="w-6 h-6 text-orange-600" />}
                      color="bg-orange-50"
                    />
                    
                    <MetricCard
                      title="Busiest Day"
                      value={timeAnalytics.orders_by_day_of_week[0]?.day || 'N/A'}
                      icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                      color="bg-green-50"
                    />
                  </div>

                  {/* Peak Order Hours Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Order Hours</h3>
                    <SimpleBarChart 
                      data={timeAnalytics.peak_order_hours.map(h => ({
                        label: `${h.hour}:00`,
                        value: h.order_count,
                      }))}
                    />
                  </div>

                  {/* Orders by Day of Week */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Day of Week</h3>
                    <SimpleBarChart 
                      data={timeAnalytics.orders_by_day_of_week.map(d => ({
                        label: d.day,
                        value: d.order_count,
                      }))}
                    />
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AdminAnalytics;