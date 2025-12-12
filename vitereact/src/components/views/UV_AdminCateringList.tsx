import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  CalendarIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// ===========================
// Type Definitions
// ===========================

interface CateringInquiry {
  inquiry_id: string;
  inquiry_number: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name: string | null;
  event_type: string;
  event_type_other: string | null;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_location_address: string;
  event_location_city: string;
  event_location_postal_code: string;
  event_location_type: string;
  guest_count: number;
  guest_count_min: number | null;
  guest_count_max: number | null;
  dietary_requirements: string[] | null;
  dietary_notes: string | null;
  menu_preferences: string | null;
  preferred_package: string | null;
  budget_range: string | null;
  additional_details: string | null;
  attached_files: string[] | null;
  marketing_opt_in: boolean;
  status: string;
  admin_notes: string | null;
  submitted_at: string;
  updated_at: string;
  quotes?: any[];
}

interface InquiriesResponse {
  inquiries: CateringInquiry[];
  total?: number;
}

interface UpdateStatusPayload {
  status: string;
  admin_notes?: string;
}

// ===========================
// API Functions
// ===========================

const fetchCateringInquiries = async (
  auth_token: string,
  filters: {
    status?: string;
    event_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<InquiriesResponse> => {
  const params = new URLSearchParams();
  
  if (filters.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters.event_type && filters.event_type !== 'all') {
    params.append('event_type', filters.event_type);
  }
  if (filters.date_from) {
    params.append('date_from', filters.date_from);
  }
  if (filters.date_to) {
    params.append('date_to', filters.date_to);
  }
  if (filters.limit) {
    params.append('limit', filters.limit.toString());
  }
  if (filters.offset) {
    params.append('offset', filters.offset.toString());
  }

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/catering/inquiries${params.toString() ? `?${params.toString()}` : ''}`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );

  return response.data;
};

const updateInquiryStatus = async (
  auth_token: string,
  inquiry_id: string,
  payload: UpdateStatusPayload
): Promise<CateringInquiry> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/catering/inquiries/${inquiry_id}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

// ===========================
// Helper Functions
// ===========================

const getStatusBadgeClasses = (status: string): string => {
  const statusMap: Record<string, string> = {
    new: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    quoted: 'bg-purple-100 text-purple-800 border-purple-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const formatEventType = (type: string): string => {
  const typeMap: Record<string, string> = {
    corporate: 'Corporate',
    wedding: 'Wedding',
    birthday: 'Birthday',
    meeting: 'Meeting',
    other: 'Other',
  };
  return typeMap[type] || type;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IE', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ===========================
// Main Component
// ===========================

const UV_AdminCateringList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Global state access - CRITICAL: Individual selectors
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [filter_status, setFilterStatus] = useState<string>(searchParams.get('status') || 'all');
  const [filter_event_type, setFilterEventType] = useState<string>(searchParams.get('event_type') || 'all');
  const [filter_date_range, setFilterDateRange] = useState<string>(searchParams.get('date_range') || 'all');
  const [current_page, setCurrentPage] = useState<number>(1);
  const [selected_inquiry_ids, setSelectedInquiryIds] = useState<string[]>([]);
  const [bulk_action_selected, setBulkActionSelected] = useState<string>('');
  const items_per_page = 20;

  // Calculate date range for filtering
  const getDateRange = (range: string): { date_from?: string; date_to?: string } => {
    const today = new Date();
    let date_from: Date | undefined;
    let date_to: Date | undefined;

    switch (range) {
      case 'next_month':
        date_from = today;
        date_to = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        break;
      case 'next_3_months':
        date_from = today;
        date_to = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
        break;
      default:
        return {};
    }

    return {
      date_from: date_from?.toISOString().split('T')[0],
      date_to: date_to?.toISOString().split('T')[0],
    };
  };

  const dateRange = getDateRange(filter_date_range);

  // Fetch inquiries with React Query
  const { data: inquiries_data, isLoading: loading_inquiries, error, refetch } = useQuery({
    queryKey: ['admin-catering-inquiries', filter_status, filter_event_type, filter_date_range, current_page],
    queryFn: () => fetchCateringInquiries(auth_token!, {
      status: filter_status !== 'all' ? filter_status : undefined,
      event_type: filter_event_type !== 'all' ? filter_event_type : undefined,
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
      limit: items_per_page,
      offset: (current_page - 1) * items_per_page,
    }),
    enabled: !!auth_token,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const inquiries_list = inquiries_data?.inquiries || [];
  const total_inquiries = inquiries_data?.total || inquiries_list.length;
  const total_pages = Math.ceil(total_inquiries / items_per_page);

  // Calculate new inquiries count
  const new_inquiries_count = inquiries_list.filter(inq => inq.status === 'new').length;

  // Update inquiry status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ inquiry_id, payload }: { inquiry_id: string; payload: UpdateStatusPayload }) =>
      updateInquiryStatus(auth_token!, inquiry_id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-catering-inquiries'] });
    },
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter_status !== 'all') params.set('status', filter_status);
    if (filter_event_type !== 'all') params.set('event_type', filter_event_type);
    if (filter_date_range !== 'all') params.set('date_range', filter_date_range);
    setSearchParams(params);
  }, [filter_status, filter_event_type, filter_date_range, setSearchParams]);

  // Handle filter changes
  const handleStatusFilterChange = (status: string) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleEventTypeFilterChange = (eventType: string) => {
    setFilterEventType(eventType);
    setCurrentPage(1);
  };

  const handleDateRangeFilterChange = (dateRange: string) => {
    setFilterDateRange(dateRange);
    setCurrentPage(1);
  };

  // Handle checkbox selection
  const handleSelectInquiry = (inquiry_id: string) => {
    setSelectedInquiryIds(prev =>
      prev.includes(inquiry_id)
        ? prev.filter(id => id !== inquiry_id)
        : [...prev, inquiry_id]
    );
  };

  const handleSelectAll = () => {
    if (selected_inquiry_ids.length === inquiries_list.length) {
      setSelectedInquiryIds([]);
    } else {
      setSelectedInquiryIds(inquiries_list.map(inq => inq.inquiry_id));
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulk_action_selected || selected_inquiry_ids.length === 0) {
      return;
    }

    const confirmAction = window.confirm(
      `Are you sure you want to update ${selected_inquiry_ids.length} inquiries to status: ${bulk_action_selected}?`
    );

    if (!confirmAction) return;

    try {
      // Execute multiple PUT requests
      await Promise.all(
        selected_inquiry_ids.map(inquiry_id =>
          updateStatusMutation.mutateAsync({
            inquiry_id,
            payload: { status: bulk_action_selected },
          })
        )
      );

      // Reset selections
      setSelectedInquiryIds([]);
      setBulkActionSelected('');
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  // Handle individual status update
  const handleQuickStatusUpdate = async (inquiry_id: string, new_status: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        inquiry_id,
        payload: { status: new_status },
      });
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  // Handle navigation to detail
  const handleViewDetails = (inquiry_id: string) => {
    navigate(`/admin/catering/${inquiry_id}`);
  };

  // Handle export (note: endpoint missing)
  const handleExport = () => {
    alert('Export functionality requires backend endpoint implementation.\nEndpoint: GET /api/admin/catering/inquiries/export');
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (current_page > 1) {
      setCurrentPage(current_page - 1);
    }
  };

  const handleNextPage = () => {
    if (current_page < total_pages) {
      setCurrentPage(current_page + 1);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Catering Inquiries</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage catering inquiries and generate quotes
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                {new_inquiries_count > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                    <span className="mr-1">{new_inquiries_count}</span> New
                  </span>
                )}
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center mb-4">
                <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={filter_status}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="quoted">Quoted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Event Type Filter */}
                <div>
                  <label htmlFor="event-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    id="event-type-filter"
                    value={filter_event_type}
                    onChange={(e) => handleEventTypeFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="corporate">Corporate</option>
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date
                  </label>
                  <select
                    id="date-range-filter"
                    value={filter_date_range}
                    onChange={(e) => handleDateRangeFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Dates</option>
                    <option value="next_month">Next Month</option>
                    <option value="next_3_months">Next 3 Months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selected_inquiry_ids.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-blue-900">
                      {selected_inquiry_ids.length} inquiries selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={bulk_action_selected}
                      onChange={(e) => setBulkActionSelected(e.target.value)}
                      className="block w-48 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select action...</option>
                      <option value="in_progress">Mark as In Progress</option>
                      <option value="cancelled">Cancel Inquiries</option>
                    </select>
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulk_action_selected || updateStatusMutation.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {updateStatusMutation.isPending ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inquiries List */}
            {loading_inquiries ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading inquiries...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12">
                <div className="flex flex-col items-center justify-center">
                  <XCircleIcon className="h-12 w-12 text-red-500 mb-4" />
                  <p className="text-red-700 font-medium mb-2">Failed to load inquiries</p>
                  <p className="text-gray-600 text-sm mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
                  <button
                    onClick={() => refetch()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : inquiries_list.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                <div className="flex flex-col items-center justify-center">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium mb-2">No inquiries found</p>
                  <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selected_inquiry_ids.length === inquiries_list.length && inquiries_list.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Inquiry #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Guests
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inquiries_list.map((inquiry) => (
                        <tr 
                          key={inquiry.inquiry_id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleViewDetails(inquiry.inquiry_id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected_inquiry_ids.includes(inquiry.inquiry_id)}
                              onChange={() => handleSelectInquiry(inquiry.inquiry_id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">
                              {inquiry.inquiry_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{inquiry.contact_name}</div>
                              {inquiry.company_name && (
                                <div className="text-gray-500">{inquiry.company_name}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                              {formatEventType(inquiry.event_type)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                              {formatDate(inquiry.event_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                              {inquiry.guest_count}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={inquiry.status}
                              onChange={(e) => handleQuickStatusUpdate(inquiry.inquiry_id, e.target.value)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(inquiry.status)} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                            >
                              <option value="new">New</option>
                              <option value="in_progress">In Progress</option>
                              <option value="quoted">Quoted</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {formatDateTime(inquiry.submitted_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleViewDetails(inquiry.inquiry_id)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {inquiries_list.map((inquiry) => (
                    <div
                      key={inquiry.inquiry_id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selected_inquiry_ids.includes(inquiry.inquiry_id)}
                            onChange={() => handleSelectInquiry(inquiry.inquiry_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-blue-600">
                              {inquiry.inquiry_number}
                            </span>
                            <div className={`inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(inquiry.status)}`}>
                              {inquiry.status.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-900 mr-2">{inquiry.contact_name}</span>
                          {inquiry.company_name && (
                            <span className="text-gray-500">• {inquiry.company_name}</span>
                          )}
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {formatEventType(inquiry.event_type)}
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(inquiry.event_date)}
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {inquiry.guest_count} guests
                        </div>

                        <div className="flex items-center text-sm text-gray-500">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          Submitted {formatDateTime(inquiry.submitted_at)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 pt-3 border-t border-gray-200">
                        <select
                          value={inquiry.status}
                          onChange={(e) => handleQuickStatusUpdate(inquiry.inquiry_id, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In Progress</option>
                          <option value="quoted">Quoted</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => handleViewDetails(inquiry.inquiry_id)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {total_pages > 1 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={handlePreviousPage}
                        disabled={current_page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={current_page === total_pages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{(current_page - 1) * items_per_page + 1}</span>
                          {' '}-{' '}
                          <span className="font-medium">
                            {Math.min(current_page * items_per_page, total_inquiries)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{total_inquiries}</span>
                          {' '}inquiries
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={handlePreviousPage}
                            disabled={current_page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeftIcon className="h-5 w-5" />
                          </button>
                          
                          {Array.from({ length: total_pages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === current_page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            onClick={handleNextPage}
                            disabled={current_page === total_pages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRightIcon className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminCateringList;