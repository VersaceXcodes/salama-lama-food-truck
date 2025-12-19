import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  EnvelopeIcon,
  EnvelopeOpenIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// ===========================
// Type Definitions
// ===========================

interface ContactMessage {
  message_id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
}

interface MessagesResponse {
  messages: ContactMessage[];
  total: number;
  limit: number;
  offset: number;
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchContactMessages = async (
  auth_token: string,
  filters: {
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }
): Promise<MessagesResponse> => {
  const params = new URLSearchParams();
  
  if (filters.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters.q) {
    params.append('q', filters.q);
  }
  if (filters.limit) {
    params.append('limit', filters.limit.toString());
  }
  if (filters.offset) {
    params.append('offset', filters.offset.toString());
  }

  const response = await axios.get(
    `${API_BASE_URL}/api/admin/contact-messages${params.toString() ? `?${params.toString()}` : ''}`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );

  return response.data;
};

const updateMessageStatus = async (
  auth_token: string,
  message_id: string,
  status: 'new' | 'read' | 'archived'
): Promise<ContactMessage> => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/admin/contact-messages/${message_id}`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.message;
};

// ===========================
// Helper Functions
// ===========================

const getStatusBadgeClasses = (status: string): string => {
  const statusMap: Record<string, string> = {
    new: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    read: 'bg-blue-100 text-blue-800 border-blue-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
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

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDateTime(dateString);
};

// ===========================
// Main Component
// ===========================

const UV_AdminContactMessages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Global state access
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [filter_status, setFilterStatus] = useState<string>(searchParams.get('status') || 'all');
  const [search_query, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [current_page, setCurrentPage] = useState<number>(1);
  const [selected_message, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [show_detail_modal, setShowDetailModal] = useState<boolean>(false);
  const items_per_page = 20;

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter_status !== 'all') params.set('status', filter_status);
    if (search_query) params.set('q', search_query);
    if (current_page > 1) params.set('page', current_page.toString());
    setSearchParams(params, { replace: true });
  }, [filter_status, search_query, current_page, setSearchParams]);

  // Fetch messages query
  const {
    data: messages_data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-contact-messages', filter_status, search_query, current_page],
    queryFn: () =>
      fetchContactMessages(auth_token || '', {
        status: filter_status !== 'all' ? filter_status : undefined,
        q: search_query || undefined,
        limit: items_per_page,
        offset: (current_page - 1) * items_per_page,
      }),
    enabled: !!auth_token,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ message_id, status }: { message_id: string; status: 'new' | 'read' | 'archived' }) =>
      updateMessageStatus(auth_token || '', message_id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-summary'] });
    },
  });

  // Handlers
  const handleViewMessage = async (message: ContactMessage) => {
    setSelectedMessage(message);
    setShowDetailModal(true);
    
    // Auto-mark as read if new
    if (message.status === 'new') {
      updateStatusMutation.mutate({ message_id: message.message_id, status: 'read' });
    }
  };

  const handleMarkAsRead = (message_id: string) => {
    updateStatusMutation.mutate({ message_id, status: 'read' });
  };

  const handleMarkAsNew = (message_id: string) => {
    updateStatusMutation.mutate({ message_id, status: 'new' });
  };

  const handleArchive = (message_id: string) => {
    updateStatusMutation.mutate({ message_id, status: 'archived' });
    if (selected_message?.message_id === message_id) {
      setShowDetailModal(false);
      setSelectedMessage(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination
  const total_messages = messages_data?.total || 0;
  const total_pages = Math.ceil(total_messages / items_per_page);
  const messages = messages_data?.messages || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact Messages</h1>
            <p className="text-gray-600 mt-1">Manage customer contact form submissions</p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2 text-gray-600" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, subject..."
                value={search_query}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <select
              value={filter_status}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Messages</option>
              <option value="new">New / Unread</option>
              <option value="read">Read</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(filter_status !== 'all' || search_query) && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              <XMarkIcon className="h-5 w-5 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-red-600">Error loading messages. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <EnvelopeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No messages found</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {messages.map((message) => (
                    <tr
                      key={message.message_id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        message.status === 'new' ? 'bg-yellow-50/50' : ''
                      }`}
                      onClick={() => handleViewMessage(message)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(
                            message.status
                          )}`}
                        >
                          {message.status === 'new' && (
                            <EnvelopeIcon className="h-3 w-3 mr-1" />
                          )}
                          {message.status === 'read' && (
                            <EnvelopeOpenIcon className="h-3 w-3 mr-1" />
                          )}
                          {message.status === 'archived' && (
                            <ArchiveBoxIcon className="h-3 w-3 mr-1" />
                          )}
                          {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-3">
                            <p className={`text-sm ${message.status === 'new' ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                              {message.name}
                            </p>
                            <p className="text-sm text-gray-500">{message.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-sm ${message.status === 'new' ? 'font-semibold' : ''} text-gray-900 max-w-xs truncate`}>
                          {message.subject}
                        </p>
                        <p className="text-sm text-gray-500 max-w-xs truncate">
                          {message.message.substring(0, 60)}...
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {getRelativeTime(message.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {message.status === 'new' && (
                            <button
                              onClick={() => handleMarkAsRead(message.message_id)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Mark as read"
                            >
                              <EnvelopeOpenIcon className="h-5 w-5" />
                            </button>
                          )}
                          {message.status === 'read' && (
                            <button
                              onClick={() => handleMarkAsNew(message.message_id)}
                              className="text-yellow-600 hover:text-yellow-800 p-1"
                              title="Mark as unread"
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </button>
                          )}
                          {message.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(message.message_id)}
                              className="text-gray-600 hover:text-gray-800 p-1"
                              title="Archive"
                            >
                              <ArchiveBoxIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total_pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(current_page - 1) * items_per_page + 1} to{' '}
                  {Math.min(current_page * items_per_page, total_messages)} of {total_messages} messages
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={current_page === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {current_page} of {total_pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(total_pages, p + 1))}
                    disabled={current_page === total_pages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {show_detail_modal && selected_message && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowDetailModal(false)}
            ></div>

            {/* Modal */}
            <div className="relative inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selected_message.subject}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(
                        selected_message.status
                      )}`}
                    >
                      {selected_message.status.charAt(0).toUpperCase() + selected_message.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(selected_message.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Sender Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selected_message.name}</p>
                    <p className="text-sm text-gray-600">{selected_message.email}</p>
                    {selected_message.phone && (
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        {selected_message.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Message</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{selected_message.message}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  {selected_message.status !== 'archived' && (
                    <button
                      onClick={() => handleArchive(selected_message.message_id)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <ArchiveBoxIcon className="h-5 w-5 mr-2" />
                      Archive
                    </button>
                  )}
                  {selected_message.status === 'read' && (
                    <button
                      onClick={() => {
                        handleMarkAsNew(selected_message.message_id);
                        setSelectedMessage({ ...selected_message, status: 'new' });
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <EnvelopeIcon className="h-5 w-5 mr-2" />
                      Mark Unread
                    </button>
                  )}
                </div>
                <a
                  href={`mailto:${selected_message.email}?subject=Re: ${selected_message.subject}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Reply via Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UV_AdminContactMessages;
