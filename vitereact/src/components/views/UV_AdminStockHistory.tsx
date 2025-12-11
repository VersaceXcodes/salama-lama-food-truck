import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ArrowLeftIcon, 
  DownloadIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PackageIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshCwIcon,
  AlertCircleIcon
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface ItemDetails {
  item_id: string;
  name: string;
  current_stock: number | null;
  category_name: string;
}

interface StockHistoryEntry {
  history_id: string;
  change_type: 'restock' | 'sale' | 'adjustment' | 'waste';
  previous_stock: number;
  new_stock: number;
  quantity_changed: number;
  reason: string | null;
  notes: string | null;
  changed_by_user_id: string;
  changed_by_name: string;
  changed_at: string;
}

interface StockHistoryResponse {
  history: Array<{
    history_id: string;
    change_type: string;
    previous_stock: number;
    new_stock: number;
    quantity_changed: number;
    reason: string | null;
    notes: string | null;
    changed_by_user_id: string;
    changed_at: string;
  }>;
  total: number;
}

interface ItemDetailsResponse {
  item_id: string;
  name: string;
  current_stock: number | null;
  category_id: string;
  [key: string]: any;
}

interface CategoryResponse {
  category_id: string;
  name: string;
  [key: string]: any;
}

// ===========================
// Main Component
// ===========================

const UV_AdminStockHistory: React.FC = () => {
  // ===========================
  // URL Parameters & Auth
  // ===========================
  
  const { item_id } = useParams<{ item_id: string }>();
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // ===========================
  // Local State
  // ===========================

  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });

  // ===========================
  // API Base URL
  // ===========================

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // Data Fetching: Item Details
  // ===========================

  const {
    data: itemDetailsData,
    isLoading: isLoadingItem,
    isError: isErrorItem,
    error: itemError,
    refetch: refetchItem
  } = useQuery<ItemDetails>({
    queryKey: ['admin', 'menu-item', item_id],
    queryFn: async () => {
      const response = await axios.get<ItemDetailsResponse>(
        `${API_BASE_URL}/api/admin/menu/items/${item_id}`,
        {
          headers: {
            'Authorization': `Bearer ${auth_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch category name separately
      let category_name = 'Unknown Category';
      if (response.data.category_id) {
        try {
          const categoryResponse = await axios.get<CategoryResponse>(
            `${API_BASE_URL}/api/admin/menu/categories/${response.data.category_id}`,
            {
              headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          category_name = categoryResponse.data.name;
        } catch (error) {
          console.error('Failed to fetch category name:', error);
        }
      }

      return {
        item_id: response.data.item_id,
        name: response.data.name,
        current_stock: response.data.current_stock !== undefined ? response.data.current_stock : null,
        category_name
      };
    },
    enabled: !!item_id && !!auth_token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // ===========================
  // Data Fetching: Stock History
  // ===========================

  const {
    data: stockHistoryData,
    isLoading: isLoadingHistory,
    isError: isErrorHistory,
    error: historyError,
    refetch: refetchHistory
  } = useQuery<{ history: StockHistoryEntry[]; total: number }>({
    queryKey: ['admin', 'stock-history', item_id, pagination.limit, pagination.offset],
    queryFn: async () => {
      const response = await axios.get<StockHistoryResponse>(
        `${API_BASE_URL}/api/admin/stock/${item_id}/history`,
        {
          headers: {
            'Authorization': `Bearer ${auth_token}`,
            'Content-Type': 'application/json'
          },
          params: {
            limit: pagination.limit,
            offset: pagination.offset
          }
        }
      );

      // Map response to include changed_by_name (in real implementation, this would come from the backend)
      const historyWithNames = response.data.history.map(entry => ({
        history_id: entry.history_id,
        change_type: entry.change_type as 'restock' | 'sale' | 'adjustment' | 'waste',
        previous_stock: Number(entry.previous_stock || 0),
        new_stock: Number(entry.new_stock || 0),
        quantity_changed: entry.quantity_changed,
        reason: entry.reason,
        notes: entry.notes,
        changed_by_user_id: entry.changed_by_user_id,
        changed_by_name: entry.changed_by_user_id, // Backend should provide actual name
        changed_at: entry.changed_at
      }));

      // Update pagination total
      setPagination(prev => ({ ...prev, total: response.data.total }));

      return {
        history: historyWithNames,
        total: response.data.total
      };
    },
    enabled: !!item_id && !!auth_token,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1
  });

  // ===========================
  // Computed Values
  // ===========================

  const currentPage = useMemo(() => {
    return Math.floor(pagination.offset / pagination.limit) + 1;
  }, [pagination.offset, pagination.limit]);

  const totalPages = useMemo(() => {
    return Math.ceil(pagination.total / pagination.limit);
  }, [pagination.total, pagination.limit]);

  const hasNextPage = useMemo(() => {
    return pagination.offset + pagination.limit < pagination.total;
  }, [pagination.offset, pagination.limit, pagination.total]);

  const hasPreviousPage = useMemo(() => {
    return pagination.offset > 0;
  }, [pagination.offset]);

  // ===========================
  // Event Handlers
  // ===========================

  const handleNextPage = () => {
    if (hasNextPage) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }));
    }
  };

  const handleExportToCSV = () => {
    if (!stockHistoryData || !itemDetailsData) return;

    // Define CSV headers
    const headers = [
      'Date',
      'Time',
      'Change Type',
      'Previous Stock',
      'New Stock',
      'Quantity Changed',
      'Reason',
      'Changed By',
      'Notes'
    ];

    // Convert history data to CSV rows
    const rows = stockHistoryData.history.map(entry => {
      const date = new Date(entry.changed_at);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        entry.change_type,
        entry.previous_stock.toString(),
        entry.new_stock.toString(),
        entry.quantity_changed.toString(),
        entry.reason || '',
        entry.changed_by_name,
        entry.notes || ''
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `stock-history-${itemDetailsData.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ===========================
  // Helper Functions
  // ===========================

  const getChangeTypeBadgeColors = (changeType: string): { bg: string; text: string; border: string } => {
    switch (changeType) {
      case 'restock':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
      case 'sale':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      case 'adjustment':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
      case 'waste':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
    }
  };

  const formatChangeType = (changeType: string): string => {
    return changeType.charAt(0).toUpperCase() + changeType.slice(1);
  };

  const formatDateTime = (dateString: string): { date: string; time: string; relative: string } => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    let relative = '';
    if (diffInDays === 0) {
      if (diffInHours === 0) {
        relative = 'Less than an hour ago';
      } else if (diffInHours === 1) {
        relative = '1 hour ago';
      } else {
        relative = `${diffInHours} hours ago`;
      }
    } else if (diffInDays === 1) {
      relative = 'Yesterday';
    } else if (diffInDays < 7) {
      relative = `${diffInDays} days ago`;
    } else {
      relative = date.toLocaleDateString();
    }

    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative
    };
  };

  // ===========================
  // Loading State
  // ===========================

  if (isLoadingItem || isLoadingHistory) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Skeleton */}
            <div className="mb-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Error State
  // ===========================

  if (isErrorItem || isErrorHistory) {
    const errorMessage = isErrorItem
      ? (itemError as any)?.response?.data?.message || 'Failed to load item details'
      : (historyError as any)?.response?.data?.message || 'Failed to load stock history';

    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to="/admin/stock"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Stock Management
            </Link>

            <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
              <AlertCircleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Stock History</h3>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <button
                onClick={() => {
                  refetchItem();
                  refetchHistory();
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCwIcon className="w-5 h-5 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Empty State
  // ===========================

  if (!stockHistoryData?.history || stockHistoryData.history.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
              <Link
                to="/admin/stock"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Stock Management
              </Link>

              {/* Item Context Card */}
              {itemDetailsData && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {itemDetailsData.name}
                      </h1>
                      <p className="text-gray-600 text-sm">
                        {itemDetailsData.category_name} • Current Stock: {' '}
                        <span className="font-semibold">
                          {itemDetailsData.current_stock !== null ? itemDetailsData.current_stock : 'N/A'}
                        </span>
                      </p>
                    </div>
                    <PackageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Empty State */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
              <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Stock History</h3>
              <p className="text-gray-600">
                There are no stock movements recorded for this item yet.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===========================
  // Main Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/admin/stock"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Stock Management
            </Link>

            {/* Item Context Card */}
            {itemDetailsData && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Stock History: {itemDetailsData.name}
                    </h1>
                    <div className="flex items-center space-x-6 text-sm">
                      <span className="text-gray-700">
                        <span className="font-medium">Category:</span> {itemDetailsData.category_name}
                      </span>
                      <span className="text-gray-700">
                        <span className="font-medium">Current Stock:</span>{' '}
                        <span className={`font-bold ${
                          itemDetailsData.current_stock === null
                            ? 'text-gray-500'
                            : itemDetailsData.current_stock === 0
                            ? 'text-red-600'
                            : itemDetailsData.current_stock < 10
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}>
                          {itemDetailsData.current_stock !== null ? itemDetailsData.current_stock : 'N/A'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleExportToCSV}
                    className="flex items-center px-4 py-2 bg-white text-blue-700 font-medium rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors shadow-md"
                  >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Export to CSV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stock History Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Stock Movement History ({stockHistoryData.total} records)
              </h2>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Previous
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Changed By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockHistoryData.history.map((entry) => {
                    const changeColors = getChangeTypeBadgeColors(entry.change_type);
                    const dateTime = formatDateTime(entry.changed_at);
                    const quantityIsPositive = entry.quantity_changed > 0;

                    return (
                      <tr key={entry.history_id} className="hover:bg-gray-50 transition-colors">
                        {/* Date & Time */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{dateTime.date}</div>
                            <div className="text-gray-500">{dateTime.time}</div>
                            <div className="text-xs text-gray-400 mt-1">{dateTime.relative}</div>
                          </div>
                        </td>

                        {/* Change Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${changeColors.bg} ${changeColors.text} ${changeColors.border}`}>
                            {formatChangeType(entry.change_type)}
                          </span>
                        </td>

                        {/* Previous Stock */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {entry.previous_stock}
                          </span>
                        </td>

                        {/* New Stock */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {entry.new_stock}
                          </span>
                        </td>

                        {/* Quantity Change */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            {quantityIsPositive ? (
                              <>
                                <TrendingUpIcon className="w-4 h-4 text-green-600 mr-1" />
                                <span className="text-sm font-bold text-green-600">
                                  +{entry.quantity_changed}
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingDownIcon className="w-4 h-4 text-red-600 mr-1" />
                                <span className="text-sm font-bold text-red-600">
                                  {entry.quantity_changed}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {entry.reason || 'No reason provided'}
                            </div>
                            {entry.notes && (
                              <div className="text-gray-500 text-xs mt-1 italic">
                                {entry.notes}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Changed By */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.changed_by_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {stockHistoryData.history.map((entry) => {
                const changeColors = getChangeTypeBadgeColors(entry.change_type);
                const dateTime = formatDateTime(entry.changed_at);
                const quantityIsPositive = entry.quantity_changed > 0;

                return (
                  <div key={entry.history_id} className="p-4 hover:bg-gray-50 transition-colors">
                    {/* Change Type Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${changeColors.bg} ${changeColors.text} ${changeColors.border}`}>
                        {formatChangeType(entry.change_type)}
                      </span>
                      <span className="text-xs text-gray-500">{dateTime.relative}</span>
                    </div>

                    {/* Stock Changes */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Previous</div>
                        <div className="text-lg font-semibold text-gray-900">{entry.previous_stock}</div>
                      </div>
                      <div className="text-center flex items-center justify-center">
                        {quantityIsPositive ? (
                          <div className="flex flex-col items-center">
                            <TrendingUpIcon className="w-5 h-5 text-green-600 mb-1" />
                            <span className="text-sm font-bold text-green-600">
                              +{entry.quantity_changed}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <TrendingDownIcon className="w-5 h-5 text-red-600 mb-1" />
                            <span className="text-sm font-bold text-red-600">
                              {entry.quantity_changed}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">New</div>
                        <div className="text-lg font-semibold text-gray-900">{entry.new_stock}</div>
                      </div>
                    </div>

                    {/* Reason and Details */}
                    <div className="text-sm border-t border-gray-200 pt-3">
                      <div className="mb-2">
                        <span className="text-gray-500 font-medium">Reason:</span>{' '}
                        <span className="text-gray-900">{entry.reason || 'No reason provided'}</span>
                      </div>
                      {entry.notes && (
                        <div className="mb-2">
                          <span className="text-gray-500 font-medium">Notes:</span>{' '}
                          <span className="text-gray-900 italic">{entry.notes}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Changed by: {entry.changed_by_name}</span>
                        <span>{dateTime.date} {dateTime.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{pagination.offset + 1}</span>
                  {' '}-{' '}
                  <span className="font-medium">
                    {Math.min(pagination.offset + pagination.limit, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}records
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={!hasPreviousPage}
                    className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      hasPreviousPage
                        ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeftIcon className="w-5 h-5 mr-1" />
                    Previous
                  </button>

                  <span className="text-sm text-gray-700 px-3">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </span>

                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      hasNextPage
                        ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                    <ChevronRightIcon className="w-5 h-5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminStockHistory;