import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// TypeScript Interfaces
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
  event_location_address: string;
  event_location_city: string;
  guest_count: number;
  guest_count_min: number | null;
  guest_count_max: number | null;
  status: 'new' | 'in_progress' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
  submitted_at: string;
  updated_at: string;
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  quoted: { label: 'Quote Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  confirmed: { label: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-100' },
  completed: { label: 'Completed', color: 'text-green-800', bgColor: 'bg-green-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  corporate: 'Corporate Event',
  wedding: 'Wedding',
  birthday: 'Birthday Party',
  meeting: 'Meeting',
  other: 'Other',
};

const UV_MyCateringInquiries: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();

  // Zustand store access - INDIVIDUAL SELECTORS (CRITICAL PATTERN)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Local state
  const [cancelingInquiryId, setCancelingInquiryId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Get filter from URL params
  const filterStatus = searchParams.get('status') || null;

  // Fetch catering inquiries
  const {
    data: inquiriesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['catering-inquiries', filterStatus],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterStatus) {
        params.status = filterStatus;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/catering/inquiries`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          params,
        }
      );

      return response.data;
    },
    enabled: !!authToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const inquiries: CateringInquiry[] = inquiriesData?.inquiries || [];

  // Cancel inquiry mutation
  const cancelMutation = useMutation({
    mutationFn: async (inquiryId: string) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/catering/inquiries/${inquiryId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch inquiries
      queryClient.invalidateQueries({ queryKey: ['catering-inquiries'] });
      setShowCancelModal(false);
      setCancelingInquiryId(null);
    },
  });

  // Filter handlers
  const handleFilterChange = (status: string | null) => {
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  // Cancel handlers
  const handleCancelClick = (inquiryId: string) => {
    setCancelingInquiryId(inquiryId);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (cancelingInquiryId) {
      cancelMutation.mutate(cancelingInquiryId);
    }
  };

  const handleCancelModalClose = () => {
    setShowCancelModal(false);
    setCancelingInquiryId(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
  };

  // Check if inquiry can be cancelled
  const canCancelInquiry = (status: string) => {
    return status === 'new' || status === 'in_progress';
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Catering Inquiries</h1>
                <p className="mt-2 text-gray-600">
                  Track and manage your catering requests
                </p>
              </div>
              <Link
                to="/catering/inquiry"
                className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Inquiry
              </Link>
            </div>

            {/* Status Filter Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex space-x-8 min-w-max" aria-label="Filter by status">
                <button
                  onClick={() => handleFilterChange(null)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    !filterStatus
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Inquiries
                </button>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => handleFilterChange(status)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      filterStatus === status
                        ? 'border-orange-600 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading your inquiries...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading inquiries</h3>
                  <p className="mt-1 text-sm text-red-700">
                    {error instanceof Error ? error.message : 'An unexpected error occurred'}
                  </p>
                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['catering-inquiries'] })}
                    className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && inquiries.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                {filterStatus ? 'No inquiries found' : 'No catering inquiries yet'}
              </h3>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                {filterStatus
                  ? `You don't have any ${STATUS_CONFIG[filterStatus]?.label.toLowerCase()} inquiries.`
                  : "You haven't submitted any catering inquiries yet. Let us help make your event special!"}
              </p>
              <div className="mt-6">
                {filterStatus ? (
                  <button
                    onClick={() => handleFilterChange(null)}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    View All Inquiries
                  </button>
                ) : (
                  <Link
                    to="/catering/inquiry"
                    className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Submit Your First Inquiry
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Inquiries Grid */}
          {!isLoading && !error && inquiries.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.inquiry_id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-200"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {inquiry.inquiry_number}
                          </h3>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              STATUS_CONFIG[inquiry.status]?.color
                            } ${STATUS_CONFIG[inquiry.status]?.bgColor}`}
                          >
                            {STATUS_CONFIG[inquiry.status]?.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Submitted {formatRelativeTime(inquiry.submitted_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Event Type */}
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {EVENT_TYPE_LABELS[inquiry.event_type] || inquiry.event_type}
                          </p>
                          {inquiry.company_name && (
                            <p className="text-sm text-gray-600">{inquiry.company_name}</p>
                          )}
                        </div>
                      </div>

                      {/* Event Date */}
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(inquiry.event_date)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {inquiry.event_start_time}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-gray-900">{inquiry.event_location_city}</p>
                        </div>
                      </div>

                      {/* Guest Count */}
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-gray-900">
                            {inquiry.guest_count_min && inquiry.guest_count_max
                              ? `${inquiry.guest_count_min} - ${inquiry.guest_count_max} guests`
                              : `${inquiry.guest_count} guests`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between space-x-3">
                      <Link
                        to={`/catering/inquiries/${inquiry.inquiry_id}`}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </Link>
                      {canCancelInquiry(inquiry.status) && (
                        <button
                          onClick={() => handleCancelClick(inquiry.inquiry_id)}
                          disabled={cancelMutation.isPending}
                          className="inline-flex justify-center items-center px-4 py-2 bg-white border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={handleCancelModalClose}
            ></div>

            {/* Center modal */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Cancel Inquiry
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to cancel this catering inquiry? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  disabled={cancelMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Inquiry'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelModalClose}
                  disabled={cancelMutation.isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  No, Keep It
                </button>
              </div>
              {cancelMutation.isError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700">
                    Failed to cancel inquiry. Please try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_MyCateringInquiries;