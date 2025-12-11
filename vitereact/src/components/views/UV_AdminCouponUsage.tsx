import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  ShoppingCart,
  AlertCircle,
  Copy,
  Check,
  FileText
} from 'lucide-react';

// ===========================
// TypeScript Interfaces
// ===========================

interface DiscountCode {
  code_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed' | 'delivery_fee';
  discount_value: number;
  minimum_order_value: number | null;
  total_usage_limit: number | null;
  total_used_count: number;
  valid_from: string;
  valid_until: string | null;
  status: 'active' | 'inactive' | 'expired';
}

interface UsageAnalytics {
  total_uses: number;
  total_discount_given: number;
  remaining_uses: number | null;
  conversion_rate: number;
  average_order_value: number;
}

interface UsageDetail {
  usage_id: string;
  order_id: string;
  user_id: string;
  discount_amount_applied: number;
  used_at: string;
  customer_email: string;
  order_total: number;
}

interface DateFilter {
  from: string | null;
  to: string | null;
}

// ===========================
// API Functions
// ===========================

const fetchDiscountCodeDetails = async (code_id: string, token: string): Promise<DiscountCode> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/discounts/${code_id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const fetchUsageAnalytics = async (
  code_id: string, 
  token: string,
  date_filter?: DateFilter
): Promise<{ usage_analytics: UsageAnalytics; usage_details: UsageDetail[] }> => {
  const params = new URLSearchParams();
  if (date_filter?.from) params.append('date_from', date_filter.from);
  if (date_filter?.to) params.append('date_to', date_filter.to);

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/discounts/${code_id}/usage${params.toString() ? '?' + params.toString() : ''}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Transform response to match expected structure
  const usage_limit = response.data.total_usage_limit;
  const remaining = usage_limit ? usage_limit - response.data.total_uses : null;

  return {
    usage_analytics: {
      total_uses: response.data.total_uses || 0,
      total_discount_given: Number(response.data.total_discount_given || 0),
      remaining_uses: remaining,
      conversion_rate: Number(response.data.conversion_rate || 0),
      average_order_value: Number(response.data.average_order_value || 0),
    },
    usage_details: (response.data.usage_details || []).map((detail: any) => ({
      usage_id: detail.usage_id,
      order_id: detail.order_id,
      user_id: detail.user_id,
      discount_amount_applied: Number(detail.discount_amount_applied || 0),
      used_at: detail.used_at,
      customer_email: detail.customer_email || '',
      order_total: Number(detail.order_total || 0),
    })),
  };
};

// ===========================
// Utility Functions
// ===========================

const formatCurrency = (amount: number): string => {
  return `€${amount.toFixed(2)}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const exportToCSV = (data: UsageDetail[], discount_code: DiscountCode): void => {
  const headers = ['Date/Time', 'Order ID', 'Customer Email', 'Discount Applied (€)', 'Order Total (€)'];
  const rows = data.map(detail => [
    formatDateTime(detail.used_at),
    detail.order_id,
    detail.customer_email,
    detail.discount_amount_applied.toFixed(2),
    detail.order_total.toFixed(2),
  ]);

  const csvContent = [
    [`Discount Code: ${discount_code.code}`],
    [`Export Date: ${new Date().toLocaleDateString('en-IE')}`],
    [],
    headers,
    ...rows,
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `discount_${discount_code.code}_usage_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ===========================
// Main Component
// ===========================

const UV_AdminCouponUsage: React.FC = () => {
  const { code_id } = useParams<{ code_id: string }>();
  const navigate = useNavigate();

  // CRITICAL: Individual Zustand selectors
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const current_user = useAppStore(state => state.authentication_state.current_user);

  // Local state
  const [date_filter, set_date_filter] = useState<DateFilter>({ from: null, to: null });
  const [temp_date_filter, set_temp_date_filter] = useState<DateFilter>({ from: null, to: null });
  const [is_code_copied, set_is_code_copied] = useState(false);

  // Redirect if not authenticated or not admin
  React.useEffect(() => {
    if (!auth_token || current_user?.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [auth_token, current_user, navigate]);

  // Fetch discount code details
  const {
    data: discount_code,
    isLoading: is_loading_code,
    isError: is_error_code,
    error: error_code,
  } = useQuery<DiscountCode, Error>({
    queryKey: ['admin-discount-code', code_id],
    queryFn: () => fetchDiscountCodeDetails(code_id!, auth_token!),
    enabled: !!code_id && !!auth_token,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch usage analytics
  const {
    data: usage_data,
    isLoading: is_loading_usage,
    isError: is_error_usage,
    error: error_usage,
    refetch: refetch_usage,
  } = useQuery<{ usage_analytics: UsageAnalytics; usage_details: UsageDetail[] }, Error>({
    queryKey: ['admin-discount-usage', code_id, date_filter],
    queryFn: () => fetchUsageAnalytics(code_id!, auth_token!, date_filter),
    enabled: !!code_id && !!auth_token,
    staleTime: 2 * 60 * 1000,
  });

  // Loading state
  const is_loading = is_loading_code || is_loading_usage;

  // Error state
  if (is_error_code || is_error_usage) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
              <p className="text-gray-600 mb-6">
                {(error_code as Error)?.message || (error_usage as Error)?.message || 'Failed to load discount code analytics'}
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/admin/discounts')}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition-colors"
                >
                  Back to Discounts
                </button>
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Handle copy code
  const handle_copy_code = () => {
    if (discount_code) {
      navigator.clipboard.writeText(discount_code.code);
      set_is_code_copied(true);
      setTimeout(() => set_is_code_copied(false), 2000);
    }
  };

  // Handle date filter apply
  const handle_apply_filter = () => {
    set_date_filter(temp_date_filter);
  };

  // Handle date filter clear
  const handle_clear_filter = () => {
    set_temp_date_filter({ from: null, to: null });
    set_date_filter({ from: null, to: null });
  };

  // Handle export
  const handle_export = () => {
    if (discount_code && usage_data?.usage_details) {
      exportToCSV(usage_data.usage_details, discount_code);
    }
  };

  // Determine status color
  const get_status_color = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to="/admin/discounts"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Discount Code Analytics</h1>
                  {discount_code && (
                    <p className="text-sm text-gray-600 mt-1">
                      Performance insights for <span className="font-semibold">{discount_code.code}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handle_export}
                disabled={!usage_data?.usage_details || usage_data.usage_details.length === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-5 w-5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {is_loading ? (
            // Loading Skeleton
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Discount Code Summary Card */}
              {discount_code && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Code Details</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${get_status_color(discount_code.status)}`}>
                          {discount_code.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Code */}
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Discount Code</p>
                          <div className="flex items-center space-x-2">
                            <code className="text-2xl font-mono font-bold text-blue-600 bg-white px-4 py-2 rounded-lg">
                              {discount_code.code}
                            </code>
                            <button
                              onClick={handle_copy_code}
                              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                              title="Copy code"
                            >
                              {is_code_copied ? (
                                <Check className="h-5 w-5 text-green-600" />
                              ) : (
                                <Copy className="h-5 w-5 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Type & Value */}
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Discount Type & Value</p>
                          <p className="text-xl font-bold text-gray-900">
                            {discount_code.discount_type === 'percentage'
                              ? `${discount_code.discount_value}% OFF`
                              : discount_code.discount_type === 'fixed'
                              ? `€${discount_code.discount_value.toFixed(2)} OFF`
                              : 'Free Delivery'}
                          </p>
                        </div>

                        {/* Minimum Order Value */}
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Minimum Order Value</p>
                          <p className="text-xl font-bold text-gray-900">
                            {discount_code.minimum_order_value
                              ? formatCurrency(discount_code.minimum_order_value)
                              : 'None'}
                          </p>
                        </div>

                        {/* Validity Period */}
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Valid From</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatDate(discount_code.valid_from)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Valid Until</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {discount_code.valid_until ? formatDate(discount_code.valid_until) : 'No expiry'}
                          </p>
                        </div>

                        {/* Usage Limit */}
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Usage Limit</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {discount_code.total_usage_limit
                              ? `${discount_code.total_used_count} / ${discount_code.total_usage_limit}`
                              : 'Unlimited'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Summary Cards */}
              {usage_data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Total Uses */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      {usage_data.usage_analytics.total_uses > 0 && (
                        <span className="text-green-600 text-sm font-semibold flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Uses</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {usage_data.usage_analytics.total_uses.toLocaleString()}
                    </p>
                    {discount_code?.total_usage_limit && (
                      <p className="text-xs text-gray-500 mt-1">
                        of {discount_code.total_usage_limit.toLocaleString()} limit
                      </p>
                    )}
                  </div>

                  {/* Total Discount Given */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Discount Given</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(usage_data.usage_analytics.total_discount_given)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Savings for customers</p>
                  </div>

                  {/* Remaining Uses */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <TrendingDown className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Remaining Uses</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {usage_data.usage_analytics.remaining_uses !== null
                        ? usage_data.usage_analytics.remaining_uses.toLocaleString()
                        : '∞'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {usage_data.usage_analytics.remaining_uses !== null ? 'Left before limit' : 'Unlimited'}
                    </p>
                  </div>

                  {/* Average Order Value */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <ShoppingCart className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Average Order Value</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(usage_data.usage_analytics.average_order_value)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">With this code</p>
                  </div>
                </div>
              )}

              {/* Date Filter */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Filter by Date Range</h3>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">From:</label>
                      <input
                        type="date"
                        value={temp_date_filter.from || ''}
                        onChange={(e) => set_temp_date_filter({ ...temp_date_filter, from: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">To:</label>
                      <input
                        type="date"
                        value={temp_date_filter.to || ''}
                        onChange={(e) => set_temp_date_filter({ ...temp_date_filter, to: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handle_apply_filter}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={handle_clear_filter}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Usage Details Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Usage Details</h3>
                    </div>
                    {usage_data?.usage_details && (
                      <span className="text-sm text-gray-600">
                        {usage_data.usage_details.length} {usage_data.usage_details.length === 1 ? 'use' : 'uses'}
                      </span>
                    )}
                  </div>
                </div>

                {usage_data?.usage_details && usage_data.usage_details.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date/Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Discount Applied
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {usage_data.usage_details.map((detail) => (
                          <tr key={detail.usage_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDateTime(detail.used_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link
                                to={`/admin/orders/${detail.order_id}`}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {detail.order_id}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link
                                to={`/admin/customers/${detail.user_id}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {detail.customer_email}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                              -{formatCurrency(detail.discount_amount_applied)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(detail.order_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Usage Data</h3>
                    <p className="text-gray-600">
                      This discount code hasn't been used yet{date_filter.from || date_filter.to ? ' in the selected date range' : ''}.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AdminCouponUsage;