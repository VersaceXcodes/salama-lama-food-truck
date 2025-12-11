import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
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
  created_at: string;
}

interface FetchDiscountCodesParams {
  status?: string | null;
  query?: string;
  limit: number;
  offset: number;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

interface FetchDiscountCodesResponse {
  discount_codes: DiscountCode[];
  total: number;
}

// ===========================
// API Functions
// ===========================

const fetchDiscountCodes = async (
  params: FetchDiscountCodesParams,
  token: string
): Promise<FetchDiscountCodesResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.query) queryParams.append('query', params.query);
  queryParams.append('limit', params.limit.toString());
  queryParams.append('offset', params.offset.toString());
  queryParams.append('sort_by', params.sort_by);
  queryParams.append('sort_order', params.sort_order);

  const response = await axios.get(
    `${API_BASE_URL}/api/admin/discounts?${queryParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return {
    discount_codes: response.data.discount_codes || [],
    total: response.data.total || 0,
  };
};

const updateDiscountStatus = async (
  code_id: string,
  status: 'active' | 'inactive',
  token: string
): Promise<void> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  await axios.put(
    `${API_BASE_URL}/api/admin/discounts/${code_id}`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

const deleteDiscountCode = async (
  code_id: string,
  token: string
): Promise<void> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  await axios.delete(
    `${API_BASE_URL}/api/admin/discounts/${code_id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

// ===========================
// Helper Functions
// ===========================

const formatDiscountValue = (type: string, value: number): string => {
  if (type === 'percentage') {
    return `${value}%`;
  } else if (type === 'fixed') {
    return `€${value.toFixed(2)}`;
  } else if (type === 'delivery_fee') {
    return 'Free Delivery';
  }
  return `€${value.toFixed(2)}`;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'No expiry';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusBadgeClasses = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getDiscountTypeLabel = (type: string): string => {
  switch (type) {
    case 'percentage':
      return 'Percentage';
    case 'fixed':
      return 'Fixed Amount';
    case 'delivery_fee':
      return 'Free Delivery';
    default:
      return type;
  }
};

// ===========================
// Main Component
// ===========================

const UV_AdminDiscounts: React.FC = () => {
  // Global state access (individual selectors)
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // URL params management
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state
  const [filter_status, setFilterStatus] = useState<string | null>(
    searchParams.get('status') || null
  );
  const [search_query, setSearchQuery] = useState<string>('');
  const [selected_codes, setSelectedCodes] = useState<string[]>([]);
  const [sort_by, setSortBy] = useState<string>('created_at');
  const [sort_order, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<DiscountCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // React Query
  const queryClient = useQueryClient();

  // Fetch discount codes
  const {
    data: discountCodesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'admin-discount-codes',
      filter_status,
      search_query,
      pagination.limit,
      pagination.offset,
      sort_by,
      sort_order,
    ],
    queryFn: () =>
      fetchDiscountCodes(
        {
          status: filter_status,
          query: search_query,
          limit: pagination.limit,
          offset: pagination.offset,
          sort_by,
          sort_order,
        },
        auth_token || ''
      ),
    enabled: !!auth_token,
    staleTime: 60000, // 1 minute
  });

  // Update pagination total when data changes
  useEffect(() => {
    if (discountCodesData) {
      setPagination(prev => ({
        ...prev,
        total: discountCodesData.total,
      }));
    }
  }, [discountCodesData]);

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ code_id, status }: { code_id: string; status: 'active' | 'inactive' }) =>
      updateDiscountStatus(code_id, status, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discount-codes'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (code_id: string) => deleteDiscountCode(code_id, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discount-codes'] });
      setDeleteModalOpen(false);
      setCodeToDelete(null);
    },
  });

  // Handlers
  const handleFilterChange = (status: string | null) => {
    setFilterStatus(status);
    setPagination(prev => ({ ...prev, offset: 0 }));
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (status) {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    setSearchParams(newParams);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleToggleStatus = (code: DiscountCode) => {
    const newStatus = code.status === 'active' ? 'inactive' : 'active';
    toggleStatusMutation.mutate({ code_id: code.code_id, status: newStatus });
  };

  const handleDeleteClick = (code: DiscountCode) => {
    setCodeToDelete(code);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (codeToDelete) {
      deleteMutation.mutate(codeToDelete.code_id);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && discountCodesData) {
      setSelectedCodes(discountCodesData.discount_codes.map(c => c.code_id));
    } else {
      setSelectedCodes([]);
    }
  };

  const handleSelectCode = (code_id: string) => {
    setSelectedCodes(prev =>
      prev.includes(code_id)
        ? prev.filter(id => id !== code_id)
        : [...prev, code_id]
    );
  };

  const handlePageChange = (newOffset: number) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  };

  // Memoized values
  const discount_codes = useMemo(
    () => discountCodesData?.discount_codes || [],
    [discountCodesData]
  );

  const totalPages = useMemo(
    () => Math.ceil(pagination.total / pagination.limit),
    [pagination.total, pagination.limit]
  );

  const currentPage = useMemo(
    () => Math.floor(pagination.offset / pagination.limit) + 1,
    [pagination.offset, pagination.limit]
  );

  // Status filter tabs
  const statusTabs = [
    { label: 'All', value: null },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Expired', value: 'expired' },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
                <p className="mt-2 text-gray-600">
                  Manage promotional codes and track campaign performance
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Link
                  to="/admin/discounts/code"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Discount Code
                </Link>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {statusTabs.map(tab => (
                <button
                  key={tab.label}
                  onClick={() => handleFilterChange(tab.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    filter_status === tab.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search discount codes..."
                value={search_query}
                onChange={handleSearchChange}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Discount Codes Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 font-medium">Loading discount codes...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 text-red-500 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load discount codes</h3>
                  <p className="text-gray-600 mb-4">
                    {error instanceof Error ? error.message : 'An error occurred'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : discount_codes.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {search_query || filter_status
                      ? 'No discount codes found'
                      : 'No discount codes yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {search_query || filter_status
                      ? 'Try adjusting your filters or search term'
                      : 'Create your first discount code to start promoting your business'}
                  </p>
                  {!search_query && !filter_status && (
                    <Link
                      to="/admin/discounts/code"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create First Discount Code
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={selected_codes.length === discount_codes.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Type & Value
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Min Order
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Usage
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Validity
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {discount_codes.map(code => (
                        <tr key={code.code_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selected_codes.includes(code.code_id)}
                              onChange={() => handleSelectCode(code.code_id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-gray-900">{code.code}</span>
                              <button
                                onClick={() => handleCopyCode(code.code)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Copy code"
                              >
                                {copiedCode === code.code ? (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatDiscountValue(code.discount_type, code.discount_value)}
                              </div>
                              <div className="text-xs text-gray-500">{getDiscountTypeLabel(code.discount_type)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {code.minimum_order_value ? `€${code.minimum_order_value.toFixed(2)}` : 'None'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {code.total_used_count} {code.total_usage_limit ? `/ ${code.total_usage_limit}` : ''}
                            </div>
                            <div className="text-xs text-gray-500">
                              {code.total_usage_limit ? 'uses' : 'unlimited'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{formatDate(code.valid_from)}</div>
                            <div className="text-xs text-gray-500">to {formatDate(code.valid_until)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(
                                code.status
                              )}`}
                            >
                              {code.status.charAt(0).toUpperCase() + code.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/admin/discounts/code?code_id=${code.code_id}`}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </Link>
                              <Link
                                to={`/admin/discounts/${code.code_id}/usage`}
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                title="View Usage"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                  />
                                </svg>
                              </Link>
                              {code.status !== 'expired' && (
                                <button
                                  onClick={() => handleToggleStatus(code)}
                                  disabled={toggleStatusMutation.isPending}
                                  className={`${
                                    code.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                                  } transition-colors disabled:opacity-50`}
                                  title={code.status === 'active' ? 'Deactivate' : 'Activate'}
                                >
                                  {toggleStatusMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                  ) : code.status === 'active' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(code)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden">
                  {discount_codes.map(code => (
                    <div
                      key={code.code_id}
                      className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selected_codes.includes(code.code_id)}
                            onChange={() => handleSelectCode(code.code_id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-gray-900">{code.code}</span>
                              <button
                                onClick={() => handleCopyCode(code.code)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                {copiedCode === code.code ? (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <span
                              className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(
                                code.status
                              )}`}
                            >
                              {code.status.charAt(0).toUpperCase() + code.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/discounts/code?code_id=${code.code_id}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(code)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Discount:</span>
                          <div className="font-medium text-gray-900">
                            {formatDiscountValue(code.discount_type, code.discount_value)}
                          </div>
                          <div className="text-xs text-gray-500">{getDiscountTypeLabel(code.discount_type)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Usage:</span>
                          <div className="font-medium text-gray-900">
                            {code.total_used_count} {code.total_usage_limit ? `/ ${code.total_usage_limit}` : ''}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Min Order:</span>
                          <div className="font-medium text-gray-900">
                            {code.minimum_order_value ? `€${code.minimum_order_value.toFixed(2)}` : 'None'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Valid Until:</span>
                          <div className="font-medium text-gray-900">{formatDate(code.valid_until)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">{pagination.offset + 1}</span>
                        {' '}-{' '}
                        <span className="font-medium">
                          {Math.min(pagination.offset + pagination.limit, pagination.total)}
                        </span>
                        {' '}of{' '}
                        <span className="font-medium">{pagination.total}</span>
                        {' '}results
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && codeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Discount Code</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete the discount code <strong>{codeToDelete.code}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setCodeToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminDiscounts;