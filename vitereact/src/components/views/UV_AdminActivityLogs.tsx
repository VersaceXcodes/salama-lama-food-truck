import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Activity, User, FileText, RefreshCw, Filter, Download } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface ActivityLog {
  log_id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  description: string | null;
  changes: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface FetchLogsParams {
  limit: number;
  offset: number;
  user_id?: string;
  action_type?: string;
  entity_type?: string;
}

interface FetchLogsResponse {
  logs: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}

// ===========================
// API Function
// ===========================

const fetchActivityLogs = async (
  params: FetchLogsParams,
  token: string
): Promise<FetchLogsResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const queryParams = new URLSearchParams();
  queryParams.append('limit', params.limit.toString());
  queryParams.append('offset', params.offset.toString());
  if (params.user_id) queryParams.append('user_id', params.user_id);
  if (params.action_type) queryParams.append('action_type', params.action_type);
  if (params.entity_type) queryParams.append('entity_type', params.entity_type);

  const response = await axios.get(
    `${API_BASE_URL}/api/admin/activity-logs?${queryParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ===========================
// Helper Functions
// ===========================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getActionBadgeColor = (action: string): string => {
  const colors: { [key: string]: string } = {
    create: 'bg-green-100 text-green-800 border-green-200',
    update: 'bg-blue-100 text-blue-800 border-blue-200',
    delete: 'bg-red-100 text-red-800 border-red-200',
    login: 'bg-purple-100 text-purple-800 border-purple-200',
    logout: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[action.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getEntityIcon = (entityType: string): React.ReactNode => {
  const icons: { [key: string]: React.ReactNode } = {
    user: <User className="w-4 h-4" />,
    order: <FileText className="w-4 h-4" />,
    menu_item: <FileText className="w-4 h-4" />,
    discount: <FileText className="w-4 h-4" />,
    default: <Activity className="w-4 h-4" />,
  };
  return icons[entityType] || icons.default;
};

// ===========================
// Main Component
// ===========================

const UV_AdminActivityLogs: React.FC = () => {
  // Global state
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
  });
  const [filters, setFilters] = useState({
    user_id: '',
    action_type: '',
    entity_type: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Fetch logs
  const {
    data: logsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'admin-activity-logs',
      pagination.limit,
      pagination.offset,
      appliedFilters.user_id,
      appliedFilters.action_type,
      appliedFilters.entity_type,
    ],
    queryFn: () =>
      fetchActivityLogs(
        {
          limit: pagination.limit,
          offset: pagination.offset,
          user_id: appliedFilters.user_id || undefined,
          action_type: appliedFilters.action_type || undefined,
          entity_type: appliedFilters.entity_type || undefined,
        },
        auth_token || ''
      ),
    enabled: !!auth_token,
    staleTime: 30000, // 30 seconds
  });

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  // Handlers
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({
      user_id: '',
      action_type: '',
      entity_type: '',
    });
    setAppliedFilters({
      user_id: '',
      action_type: '',
      entity_type: '',
    });
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (newOffset: number) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  };

  const handleExportLogs = () => {
    if (!logs.length) return;
    
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP Address'].join(','),
      ...logs.map(log => [
        log.created_at,
        log.user_name,
        log.action_type,
        log.entity_type,
        log.entity_id,
        log.description || '',
        log.ip_address || '',
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Activity className="w-8 h-8 mr-3 text-blue-600" />
                Activity Logs
              </h1>
              <p className="mt-2 text-gray-600">
                Monitor and audit all administrative actions
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                value={filters.action_type}
                onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity Type
              </label>
              <select
                value={filters.entity_type}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Entities</option>
                <option value="user">User</option>
                <option value="order">Order</option>
                <option value="menu_item">Menu Item</option>
                <option value="discount">Discount</option>
                <option value="category">Category</option>
                <option value="catering">Catering</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                placeholder="Filter by user ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Activity Logs Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading activity logs...</p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load activity logs</h3>
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
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity logs found</h3>
                <p className="text-gray-600">
                  {appliedFilters.action_type || appliedFilters.entity_type || appliedFilters.user_id
                    ? 'Try adjusting your filters'
                    : 'Activity logs will appear here as actions are performed'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Entity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                              <div className="text-xs text-gray-500">{log.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeColor(
                              log.action_type
                            )}`}
                          >
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            {getEntityIcon(log.entity_type)}
                            <span className="ml-2">{log.entity_type}</span>
                          </div>
                          <div className="text-xs text-gray-500">{log.entity_id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                          {log.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.ip_address || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {logs.map((log) => (
                  <div key={log.log_id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                          <div className="text-xs text-gray-500">{formatDate(log.created_at)}</div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeColor(
                          log.action_type
                        )}`}
                      >
                        {log.action_type}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        {getEntityIcon(log.entity_type)}
                        <span className="ml-2">{log.entity_type}: {log.entity_id}</span>
                      </div>
                      {log.description && (
                        <div className="text-gray-600">{log.description}</div>
                      )}
                      {log.ip_address && (
                        <div className="text-xs text-gray-500">IP: {log.ip_address}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{pagination.offset + 1}</span> -{' '}
                      <span className="font-medium">
                        {Math.min(pagination.offset + pagination.limit, total)}
                      </span>{' '}
                      of <span className="font-medium">{total}</span> results
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
  );
};

export default UV_AdminActivityLogs;
