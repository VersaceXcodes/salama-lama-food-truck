import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// TypeScript Interfaces
// ===========================

interface DailyReportData {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  top_items: Array<{
    item_name: string;
    quantity_sold: number;
  }>;
}

interface WeeklyReportData {
  total_orders: number;
  total_revenue: number;
  daily_breakdown: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

// ===========================
// Main Component
// ===========================

const UV_StaffReports: React.FC = () => {
  // URL params and local state
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(searchParams.get('period') || 'today');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Sync URL params with state
  useEffect(() => {
    const periodParam = searchParams.get('period');
    if (periodParam) {
      setSelectedPeriod(periodParam);
    }
  }, [searchParams]);

  // ===========================
  // Helper Functions
  // ===========================

  const calculateDateParam = (period: string): string => {
    const today = new Date();
    switch (period) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
      }
      case 'last_7_days':
        return 'last_7_days';
      default:
        return today.toISOString().split('T')[0];
    }
  };

  const formatCurrency = (amount: number): string => {
    return `€${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // ===========================
  // Data Fetching Queries
  // ===========================

  // Fetch daily report
  const {
    data: dailyData,
    isLoading: dailyLoading,
    error: dailyError,
    refetch: refetchDaily
  } = useQuery<DailyReportData>({
    queryKey: ['staff-daily-report', selectedPeriod],
    queryFn: async () => {
      const dateParam = calculateDateParam(selectedPeriod);
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/reports/daily`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: { date: dateParam }
        }
      );

      // Transform response according to dataMapper specification
      return {
        total_orders: response.data.total_orders || 0,
        total_revenue: Number(response.data.total_revenue || 0),
        average_order_value: Number(response.data.average_order_value || 0),
        top_items: (response.data.top_items || []).map((item: any) => ({
          item_name: item.item_name || item.name || '',
          quantity_sold: Number(item.quantity_sold || item.quantity || 0)
        }))
      };
    },
    enabled: !!authToken && activeTab === 'daily',
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Fetch weekly report
  const {
    data: weeklyData,
    isLoading: weeklyLoading,
    error: weeklyError,
    refetch: refetchWeekly
  } = useQuery<WeeklyReportData>({
    queryKey: ['staff-weekly-report'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/reports/daily`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: { period: 'last_7_days' }
        }
      );

      // Transform response according to dataMapper specification
      return {
        total_orders: response.data.total_orders || 0,
        total_revenue: Number(response.data.total_revenue || 0),
        daily_breakdown: response.data.daily_data || response.data.daily_breakdown || []
      };
    },
    enabled: !!authToken && activeTab === 'weekly',
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // ===========================
  // Event Handlers
  // ===========================

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setSearchParams({ period });
  };

  const handleTabChange = (tab: 'daily' | 'weekly') => {
    setActiveTab(tab);
  };

  // ===========================
  // Computed Values
  // ===========================

  const isLoading = activeTab === 'daily' ? dailyLoading : weeklyLoading;
  const error = activeTab === 'daily' ? dailyError : weeklyError;

  // ===========================
  // Single Render Block
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Performance Reports</h1>
            <p className="mt-2 text-gray-600">View daily and weekly operational metrics</p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8" role="tablist">
              <button
                onClick={() => handleTabChange('daily')}
                role="tab"
                aria-selected={activeTab === 'daily'}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'daily'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Daily Report
              </button>
              <button
                onClick={() => handleTabChange('weekly')}
                role="tab"
                aria-selected={activeTab === 'weekly'}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'weekly'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Weekly Report
              </button>
            </nav>
          </div>

          {/* Period Selector (Daily only) */}
          {activeTab === 'daily' && (
            <div className="mb-6 flex flex-wrap gap-2">
              {[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'last_7_days', label: 'Last 7 Days' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handlePeriodChange(value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedPeriod === value
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-800 font-medium">
                    Failed to load report data.
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    {error instanceof Error ? error.message : 'Please try again later.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => activeTab === 'daily' ? refetchDaily() : refetchWeekly()}
                className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading report data...</p>
              </div>
            </div>
          )}

          {/* Daily Report Content */}
          {activeTab === 'daily' && !isLoading && dailyData && (
            <>
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Orders Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Orders</h3>
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{dailyData.total_orders}</p>
                  <p className="text-sm text-gray-500 mt-1">Orders processed</p>
                </div>

                {/* Total Revenue Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</h3>
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{formatCurrency(dailyData.total_revenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">Sales generated</p>
                </div>

                {/* Average Order Value Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Average Order Value</h3>
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{formatCurrency(dailyData.average_order_value)}</p>
                  <p className="text-sm text-gray-500 mt-1">Per order</p>
                </div>
              </div>

              {/* Top Selling Items */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Top Selling Items</h2>
                {dailyData.top_items.length > 0 ? (
                  <div className="space-y-3">
                    {dailyData.top_items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-3 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-200 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-50 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-900 text-lg">{item.item_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-900">{item.quantity_sold}</span>
                          <span className="text-sm text-gray-500 ml-1">sold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 font-medium">No item sales data available for this period</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Weekly Report Content */}
          {activeTab === 'weekly' && !isLoading && weeklyData && (
            <>
              {/* Weekly Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Weekly Total Orders Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Orders (7 Days)</h3>
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{weeklyData.total_orders}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Average: <span className="font-semibold text-gray-700">{(weeklyData.total_orders / 7).toFixed(1)}</span> orders/day
                  </p>
                </div>

                {/* Weekly Total Revenue Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Revenue (7 Days)</h3>
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{formatCurrency(weeklyData.total_revenue)}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Average: <span className="font-semibold text-gray-700">{formatCurrency(weeklyData.total_revenue / 7)}</span>/day
                  </p>
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Daily Breakdown</h2>
                {weeklyData.daily_breakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">Date</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">Orders</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyData.daily_breakdown.map((day, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-gray-900 font-medium">
                              {formatDate(day.date)}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-900 font-semibold text-lg">
                              {day.orders}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-900 font-semibold text-lg">
                              {formatCurrency(Number(day.revenue || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                          <td className="py-4 px-4 font-bold text-gray-900 uppercase tracking-wide">Total</td>
                          <td className="py-4 px-4 text-right font-bold text-gray-900 text-xl">
                            {weeklyData.total_orders}
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-gray-900 text-xl">
                            {formatCurrency(weeklyData.total_revenue)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No daily breakdown data available</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty State (when no data and not loading/error) */}
          {!isLoading && !error && (
            <>
              {activeTab === 'daily' && !dailyData && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-16 text-center">
                  <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Report Data</h3>
                  <p className="text-gray-500">No data available for the selected period</p>
                </div>
              )}
              {activeTab === 'weekly' && !weeklyData && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-16 text-center">
                  <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Report Data</h3>
                  <p className="text-gray-500">No weekly data available</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_StaffReports;