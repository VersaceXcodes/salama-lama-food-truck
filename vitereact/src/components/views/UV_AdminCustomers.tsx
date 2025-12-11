import React, { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  UserCircle,
  Mail,
  Phone,
  ShoppingBag,
  TrendingUp,
  Award,
  ExternalLink
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface CustomerRecord {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  total_orders: number;
  total_spend: number;
  current_points_balance: number;
  status: 'active' | 'inactive' | 'suspended';
}

interface CustomersResponse {
  customers: Array<{
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    created_at: string;
    status: string;
    stats?: {
      total_orders?: number;
      total_spent?: number;
    };
    loyalty_account?: {
      current_points_balance?: number;
    };
  }>;
  total: number;
}

// ===========================
// Main Component
// ===========================

const UV_AdminCustomers: React.FC = () => {
  // ===========================
  // Zustand Store (Individual Selectors - CRITICAL)
  // ===========================
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const current_user = useAppStore(state => state.authentication_state.current_user);

  // ===========================
  // Router Hooks
  // ===========================
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ===========================
  // URL Params → State Initialization
  // ===========================
  const [search_query, setSearchQuery] = useState(searchParams.get('search') || '');
  const [registration_date_filter, setRegistrationDateFilter] = useState(
    searchParams.get('registration_date') || 'all_time'
  );
  const [total_orders_filter, setTotalOrdersFilter] = useState(
    searchParams.get('total_orders') || 'all'
  );
  const [pagination_limit] = useState(
    parseInt(searchParams.get('limit') || '50', 10)
  );
  const [pagination_offset, setPaginationOffset] = useState(
    parseInt(searchParams.get('offset') || '0', 10)
  );

  // ===========================
  // Component Local State
  // ===========================
  const [selected_customers, setSelectedCustomers] = useState<string[]>([]);
  const [debounced_search, setDebouncedSearch] = useState(search_query);

  // ===========================
  // Search Debouncing Effect
  // ===========================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search_query);
    }, 500);

    return () => clearTimeout(timer);
  }, [search_query]);

  // ===========================
  // Update URL Params When Filters Change
  // ===========================
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debounced_search) params.set('search', debounced_search);
    if (registration_date_filter !== 'all_time') params.set('registration_date', registration_date_filter);
    if (total_orders_filter !== 'all') params.set('total_orders', total_orders_filter);
    params.set('limit', pagination_limit.toString());
    params.set('offset', pagination_offset.toString());

    setSearchParams(params, { replace: true });
  }, [debounced_search, registration_date_filter, total_orders_filter, pagination_limit, pagination_offset, setSearchParams]);

  // ===========================
  // API Data Fetching
  // ===========================
  const fetchCustomers = async (): Promise<{ customers_list: CustomerRecord[], total_customers_count: number }> => {
    const params = new URLSearchParams();
    
    if (debounced_search) params.append('search', debounced_search);
    if (registration_date_filter !== 'all_time') params.append('registration_date', registration_date_filter);
    if (total_orders_filter !== 'all') params.append('total_orders', total_orders_filter);
    params.append('limit', pagination_limit.toString());
    params.append('offset', pagination_offset.toString());

    const response = await axios.get<CustomersResponse>(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/customers?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${auth_token}`
        }
      }
    );

    // Transform response data as per dataMapper
    const customers_list = response.data.customers.map(customer => ({
      user_id: customer.user_id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      created_at: customer.created_at,
      total_orders: customer.stats?.total_orders || 0,
      total_spend: customer.stats?.total_spent || 0,
      current_points_balance: customer.loyalty_account?.current_points_balance || 0,
      status: customer.status as 'active' | 'inactive' | 'suspended'
    }));

    return {
      customers_list,
      total_customers_count: response.data.total
    };
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'customers', searchParams.toString()],
    queryFn: fetchCustomers,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const customers_list = data?.customers_list || [];
  const total_customers_count = data?.total_customers_count || 0;

  // ===========================
  // Filter Handlers
  // ===========================
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPaginationOffset(0); // Reset to first page
  }, []);

  const handleRegistrationDateFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegistrationDateFilter(e.target.value);
    setPaginationOffset(0);
  }, []);

  const handleTotalOrdersFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTotalOrdersFilter(e.target.value);
    setPaginationOffset(0);
  }, []);

  // ===========================
  // Selection Handlers
  // ===========================
  const handleSelectCustomer = useCallback((customer_id: string) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customer_id)) {
        return prev.filter(id => id !== customer_id);
      } else {
        return [...prev, customer_id];
      }
    });
  }, []);

  const handleSelectAllCustomers = useCallback(() => {
    if (selected_customers.length === customers_list.length && customers_list.length > 0) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers_list.map(c => c.user_id));
    }
  }, [customers_list, selected_customers.length]);

  const isCustomerSelected = useCallback((customer_id: string) => {
    return selected_customers.includes(customer_id);
  }, [selected_customers]);

  const isAllSelected = customers_list.length > 0 && selected_customers.length === customers_list.length;
  const isSomeSelected = selected_customers.length > 0 && selected_customers.length < customers_list.length;

  // ===========================
  // Pagination Handlers
  // ===========================
  const handlePreviousPage = useCallback(() => {
    if (pagination_offset > 0) {
      setPaginationOffset(prev => Math.max(0, prev - pagination_limit));
    }
  }, [pagination_offset, pagination_limit]);

  const handleNextPage = useCallback(() => {
    if (pagination_offset + pagination_limit < total_customers_count) {
      setPaginationOffset(prev => prev + pagination_limit);
    }
  }, [pagination_offset, pagination_limit, total_customers_count]);

  const handlePageClick = useCallback((page_number: number) => {
    setPaginationOffset((page_number - 1) * pagination_limit);
  }, [pagination_limit]);

  // ===========================
  // Export Handler
  // ===========================
  const handleExportCSV = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (debounced_search) params.append('query', debounced_search);
      if (registration_date_filter !== 'all_time') params.append('registration_date', registration_date_filter);
      if (total_orders_filter !== 'all') params.append('total_orders', total_orders_filter);
      params.append('format', 'csv');

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/customers/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${auth_token}`
          },
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export customer data. Please try again.');
    }
  }, [auth_token, debounced_search, registration_date_filter, total_orders_filter]);

  // ===========================
  // Navigation Handler
  // ===========================
  const handleNavigateToCustomerProfile = useCallback((customer_id: string) => {
    navigate(`/admin/customers/${customer_id}`);
  }, [navigate]);

  // ===========================
  // Utility Functions
  // ===========================
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // ===========================
  // Pagination Calculations
  // ===========================
  const current_page = Math.floor(pagination_offset / pagination_limit) + 1;
  const total_pages = Math.ceil(total_customers_count / pagination_limit);
  const has_previous_page = pagination_offset > 0;
  const has_next_page = pagination_offset + pagination_limit < total_customers_count;

  const getPageNumbers = () => {
    const pages: number[] = [];
    const max_visible_pages = 5;
    
    if (total_pages <= max_visible_pages) {
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      if (current_page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(total_pages);
      } else if (current_page >= total_pages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = total_pages - 3; i <= total_pages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        pages.push(current_page - 1);
        pages.push(current_page);
        pages.push(current_page + 1);
        pages.push(-1);
        pages.push(total_pages);
      }
    }
    
    return pages;
  };

  // ===========================
  // Render Component
  // ===========================
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage customer relationships, view profiles, and track loyalty status
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-md"
              >
                <Download className="w-5 h-5 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="md:col-span-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Customers
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    value={search_query}
                    onChange={handleSearchChange}
                    placeholder="Name, email, or phone..."
                    className="block w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Registration Date Filter */}
              <div className="md:col-span-1">
                <label htmlFor="registration_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Date
                </label>
                <select
                  id="registration_date"
                  value={registration_date_filter}
                  onChange={handleRegistrationDateFilterChange}
                  className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white"
                >
                  <option value="all_time">All Time</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_90_days">Last 90 Days</option>
                </select>
              </div>

              {/* Total Orders Filter */}
              <div className="md:col-span-1">
                <label htmlFor="total_orders" className="block text-sm font-medium text-gray-700 mb-2">
                  Order Count
                </label>
                <select
                  id="total_orders"
                  value={total_orders_filter}
                  onChange={handleTotalOrdersFilterChange}
                  className="block w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white"
                >
                  <option value="all">All Customers</option>
                  <option value="more_than_10">10+ Orders</option>
                  <option value="more_than_50">50+ Orders</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCircle className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Total Customers:</span>
                <span className="text-sm font-bold text-gray-900">{total_customers_count}</span>
              </div>
              {selected_customers.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selected_customers.length} customer{selected_customers.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading customers...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading customers</h3>
                  <p className="mt-1 text-sm text-red-700">{error instanceof Error ? error.message : 'An error occurred'}</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && customers_list.length === 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 p-12">
              <div className="text-center">
                <UserCircle className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No customers found</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {debounced_search || registration_date_filter !== 'all_time' || total_orders_filter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'No customers have registered yet.'}
                </p>
              </div>
            </div>
          )}

          {/* Customers Table */}
          {!isLoading && !isError && customers_list.length > 0 && (
            <>
              <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = isSomeSelected;
                              }
                            }}
                            onChange={handleSelectAllCustomers}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Orders
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total Spend
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Loyalty Points
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customers_list.map((customer) => (
                        <tr
                          key={customer.user_id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isCustomerSelected(customer.user_id)}
                              onChange={() => handleSelectCustomer(customer.user_id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                  {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                                </div>
                              </div>
                              <div className="ml-4">
                                <button
                                  onClick={() => handleNavigateToCustomerProfile(customer.user_id)}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:underline transition-colors"
                                >
                                  {customer.first_name} {customer.last_name}
                                </button>
                                <div className="text-xs text-gray-500">
                                  Joined {formatDate(customer.created_at)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center text-sm text-gray-900">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                {customer.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                {customer.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ShoppingBag className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {customer.total_orders}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(customer.total_spend)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Award className="w-4 h-4 mr-2 text-yellow-500" />
                              <span className="text-sm font-medium text-gray-900">
                                {customer.current_points_balance}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyles(customer.status)}`}>
                              {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/admin/customers/${customer.user_id}`}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              View Details
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {total_pages > 1 && (
                <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{pagination_offset + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination_offset + pagination_limit, total_customers_count)}
                      </span>{' '}
                      of <span className="font-medium">{total_customers_count}</span> customers
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={!has_previous_page}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      
                      <div className="hidden sm:flex items-center space-x-1">
                        {getPageNumbers().map((page_num, index) => (
                          page_num === -1 ? (
                            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                              ...
                            </span>
                          ) : (
                            <button
                              key={page_num}
                              onClick={() => handlePageClick(page_num)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                current_page === page_num
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {page_num}
                            </button>
                          )
                        ))}
                      </div>

                      <button
                        onClick={handleNextPage}
                        disabled={!has_next_page}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
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

export default UV_AdminCustomers;