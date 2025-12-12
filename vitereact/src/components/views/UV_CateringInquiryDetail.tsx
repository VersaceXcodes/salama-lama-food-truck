import React, { useMemo } from 'react';
import { useParams, Link, } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Calendar, Clock, MapPin, Users, FileText, CheckCircle, XCircle, Download, AlertCircle, ArrowLeft } from 'lucide-react';

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
  event_type: 'corporate' | 'wedding' | 'birthday' | 'meeting' | 'other';
  event_type_other: string | null;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_location_address: string;
  event_location_city: string;
  event_location_postal_code: string;
  event_location_type: 'office' | 'home' | 'venue' | 'outdoor' | 'other';
  guest_count: number;
  guest_count_min: number | null;
  guest_count_max: number | null;
  dietary_requirements: string[] | null;
  dietary_notes: string | null;
  menu_preferences: string | null;
  preferred_package: 'standard' | 'premium' | 'luxury' | null;
  budget_range: string | null;
  additional_details: string | null;
  attached_files: string[] | null;
  marketing_opt_in: boolean;
  status: 'new' | 'in_progress' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
  admin_notes: string | null;
  submitted_at: string;
  updated_at: string;
  quotes?: CateringQuote[];
}

interface CateringQuote {
  quote_id: string;
  inquiry_id: string;
  quote_number: string;
  line_items: Array<{
    item: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  additional_fees: Array<{
    name: string;
    amount: number;
  }> | null;
  tax_amount: number;
  grand_total: number;
  valid_until: string;
  terms: string | null;
  quote_pdf_url: string | null;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
}

// ===========================
// API Functions
// ===========================

const fetchCateringInquiryDetail = async (
  inquiry_id: string,
  auth_token: string | null
): Promise<CateringInquiry> => {
  if (!auth_token) {
    throw new Error('Authentication required');
  }

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/catering/inquiries/${inquiry_id}`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );

  return response.data;
};

const acceptQuoteApi = async (
  inquiry_id: string,
  auth_token: string | null
): Promise<CateringInquiry> => {
  if (!auth_token) {
    throw new Error('Authentication required');
  }

  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/catering/inquiries/${inquiry_id}/accept-quote`,
    {},
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );

  return response.data;
};

const cancelInquiryApi = async (
  inquiry_id: string,
  auth_token: string | null
): Promise<CateringInquiry> => {
  if (!auth_token) {
    throw new Error('Authentication required');
  }

  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/catering/inquiries/${inquiry_id}/cancel`,
    {},
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );

  return response.data;
};

// ===========================
// Utility Functions
// ===========================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (timeString: string): string => {
  // timeString is in HH:mm format
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

const formatDateTime = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  return date.toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-IE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatCurrency = (amount: number): string => {
  return `€${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const getEventTypeDisplay = (type: string, other: string | null): string => {
  const typeMap: Record<string, string> = {
    corporate: 'Corporate Event',
    wedding: 'Wedding',
    birthday: 'Birthday Party',
    meeting: 'Meeting',
    other: other || 'Other',
  };
  return typeMap[type] || type;
};

const getStatusBadgeClass = (status: string): string => {
  const statusClasses: Record<string, string> = {
    new: 'bg-gray-100 text-gray-800 border-gray-300',
    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    quoted: 'bg-blue-100 text-blue-800 border-blue-300',
    confirmed: 'bg-green-100 text-green-800 border-green-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };
  return statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-300';
};

const getStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    new: 'Pending Review',
    in_progress: 'Under Review',
    quoted: 'Quote Sent',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
};

const isQuoteExpired = (validUntil: string): boolean => {
  return new Date(validUntil) < new Date();
};

// ===========================
// Main Component
// ===========================

const UV_CateringInquiryDetail: React.FC = () => {
  const { inquiry_id } = useParams<{ inquiry_id: string }>();

  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors - no object destructuring
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Fetch catering inquiry details
  const {
    data: catering_inquiry,
    isLoading: loading_state,
    error: error_state,
  } = useQuery({
    queryKey: ['catering-inquiry', inquiry_id],
    queryFn: () => fetchCateringInquiryDetail(inquiry_id!, auth_token),
    enabled: !!inquiry_id && !!auth_token,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Extract active quote (quote that hasn't been accepted yet)
  const active_quote = useMemo(() => {
    if (!catering_inquiry?.quotes || catering_inquiry.quotes.length === 0) {
      return null;
    }
    return catering_inquiry.quotes.find(quote => quote.accepted_at === null) || null;
  }, [catering_inquiry]);

  // Accept quote mutation
  const acceptQuoteMutation = useMutation({
    mutationFn: () => acceptQuoteApi(inquiry_id!, auth_token),
    onSuccess: (updatedInquiry) => {
      queryClient.setQueryData(['catering-inquiry', inquiry_id], updatedInquiry);
      queryClient.invalidateQueries({ queryKey: ['catering-inquiries'] });
      alert('Quote accepted successfully! We will contact you shortly to finalize details.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to accept quote';
      alert(`Error: ${errorMessage}`);
    },
  });

  // Cancel inquiry mutation
  const cancelInquiryMutation = useMutation({
    mutationFn: () => cancelInquiryApi(inquiry_id!, auth_token),
    onSuccess: (updatedInquiry) => {
      queryClient.setQueryData(['catering-inquiry', inquiry_id], updatedInquiry);
      queryClient.invalidateQueries({ queryKey: ['catering-inquiries'] });
      alert('Inquiry cancelled successfully.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel inquiry';
      alert(`Error: ${errorMessage}`);
    },
  });

  // Handle accept quote
  const handleAcceptQuote = () => {
    if (!active_quote) return;

    const confirmAccept = window.confirm(
      'Are you sure you want to accept this quote? This will confirm your booking.'
    );

    if (confirmAccept) {
      acceptQuoteMutation.mutate();
    }
  };

  // Handle cancel inquiry
  const handleCancelInquiry = () => {
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this inquiry? This action cannot be undone.'
    );

    if (confirmCancel) {
      cancelInquiryMutation.mutate();
    }
  };

  // Handle download quote PDF
  const handleDownloadQuotePdf = () => {
    if (active_quote?.quote_pdf_url) {
      window.open(active_quote.quote_pdf_url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Quote PDF not available yet. Please contact support if this issue persists.');
    }
  };

  // Check if actions are allowed based on status
  const canAcceptQuote = catering_inquiry?.status === 'quoted' && active_quote && !active_quote.accepted_at;
  const canCancelInquiry = catering_inquiry?.status &&
    ['new', 'in_progress', 'quoted'].includes(catering_inquiry.status);

  // Check if quote is expired
  const isExpired = active_quote ? isQuoteExpired(active_quote.valid_until) : false;

  // Loading state
  if (loading_state) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
              <div className="bg-white rounded-xl shadow-lg p-8 space-y-4">
                <div className="h-6 bg-gray-300 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error_state) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Failed to Load Inquiry</h2>
              <p className="text-red-700 mb-6">
                {(error_state as any)?.response?.data?.message || (error_state as any)?.message || 'Could not load inquiry details'}
              </p>
              <Link
                to="/catering/inquiries"
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to My Inquiries
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // No inquiry data
  if (!catering_inquiry) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
              <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-yellow-900 mb-2">Inquiry Not Found</h2>
              <p className="text-yellow-700 mb-6">
                The catering inquiry you're looking for doesn't exist or you don't have access to it.
              </p>
              <Link
                to="/catering/inquiries"
                className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to My Inquiries
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              to="/catering/inquiries"
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to My Inquiries
            </Link>
          </div>

          {/* Page Title and Status */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Inquiry #{catering_inquiry.inquiry_number}
                </h1>
                <p className="text-gray-600">
                  Submitted on {formatDateTime(catering_inquiry.submitted_at)}
                </p>
              </div>
              <div>
                <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getStatusBadgeClass(catering_inquiry.status)}`}>
                  {getStatusDisplay(catering_inquiry.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Inquiry Progress</h2>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 md:left-1/2 md:transform md:-translate-x-1/2"></div>
              <div className="space-y-8">
                {/* Submitted */}
                <div className="relative flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 ${['new', 'in_progress', 'quoted', 'confirmed', 'completed'].includes(catering_inquiry.status) ? 'bg-green-500 border-green-200' : 'bg-gray-300 border-gray-200'}`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">Submitted</p>
                    <p className="text-sm text-gray-600">{formatDateTime(catering_inquiry.submitted_at)}</p>
                  </div>
                </div>

                {/* Under Review */}
                <div className="relative flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 ${['in_progress', 'quoted', 'confirmed', 'completed'].includes(catering_inquiry.status) ? 'bg-green-500 border-green-200' : catering_inquiry.status === 'new' ? 'bg-gray-300 border-gray-200' : 'bg-gray-300 border-gray-200'}`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">Under Review</p>
                    <p className="text-sm text-gray-600">
                      {['in_progress', 'quoted', 'confirmed', 'completed'].includes(catering_inquiry.status) ? 'Reviewed by admin' : 'Awaiting review'}
                    </p>
                  </div>
                </div>

                {/* Quote Sent */}
                <div className="relative flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 ${['quoted', 'confirmed', 'completed'].includes(catering_inquiry.status) ? 'bg-green-500 border-green-200' : 'bg-gray-300 border-gray-200'}`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">Quote Sent</p>
                    <p className="text-sm text-gray-600">
                      {['quoted', 'confirmed', 'completed'].includes(catering_inquiry.status) && active_quote?.sent_at
                        ? formatDateTime(active_quote.sent_at)
                        : 'Quote pending'}
                    </p>
                  </div>
                </div>

                {/* Confirmed */}
                <div className="relative flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 ${['confirmed', 'completed'].includes(catering_inquiry.status) ? 'bg-green-500 border-green-200' : 'bg-gray-300 border-gray-200'}`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">Confirmed</p>
                    <p className="text-sm text-gray-600">
                      {['confirmed', 'completed'].includes(catering_inquiry.status) && active_quote?.accepted_at
                        ? formatDateTime(active_quote.accepted_at)
                        : 'Awaiting confirmation'}
                    </p>
                  </div>
                </div>

                {/* Completed */}
                <div className="relative flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 ${catering_inquiry.status === 'completed' ? 'bg-green-500 border-green-200' : 'bg-gray-300 border-gray-200'}`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">Completed</p>
                    <p className="text-sm text-gray-600">
                      {catering_inquiry.status === 'completed' ? 'Event completed' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Event Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Type */}
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Event Type</p>
                  <p className="text-gray-900">{getEventTypeDisplay(catering_inquiry.event_type, catering_inquiry.event_type_other)}</p>
                </div>
              </div>

              {/* Event Date */}
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Event Date</p>
                  <p className="text-gray-900">{formatDate(catering_inquiry.event_date)}</p>
                </div>
              </div>

              {/* Event Time */}
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Event Time</p>
                  <p className="text-gray-900">
                    {formatTime(catering_inquiry.event_start_time)} - {formatTime(catering_inquiry.event_end_time)}
                  </p>
                </div>
              </div>

              {/* Guest Count */}
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Guest Count</p>
                  <p className="text-gray-900">
                    {catering_inquiry.guest_count_min && catering_inquiry.guest_count_max
                      ? `${catering_inquiry.guest_count_min} - ${catering_inquiry.guest_count_max} guests`
                      : `${catering_inquiry.guest_count} guests`}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start space-x-3 md:col-span-2">
                <MapPin className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Location</p>
                  <p className="text-gray-900">
                    {catering_inquiry.event_location_address}, {catering_inquiry.event_location_city}, {catering_inquiry.event_location_postal_code}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{catering_inquiry.event_location_type} venue</p>
                </div>
              </div>
            </div>

            {/* Dietary Requirements */}
            {catering_inquiry.dietary_requirements && catering_inquiry.dietary_requirements.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Dietary Requirements</p>
                <div className="flex flex-wrap gap-2">
                  {catering_inquiry.dietary_requirements.map((requirement, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200"
                    >
                      {requirement}
                    </span>
                  ))}
                </div>
                {catering_inquiry.dietary_notes && (
                  <p className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold">Additional notes:</span> {catering_inquiry.dietary_notes}
                  </p>
                )}
              </div>
            )}

            {/* Menu Preferences */}
            {catering_inquiry.menu_preferences && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Menu Preferences</p>
                <p className="text-gray-900">{catering_inquiry.menu_preferences}</p>
              </div>
            )}

            {/* Budget Range */}
            {catering_inquiry.budget_range && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Budget Range</p>
                <p className="text-gray-900">{catering_inquiry.budget_range}</p>
              </div>
            )}

            {/* Additional Details */}
            {catering_inquiry.additional_details && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Additional Details</p>
                <p className="text-gray-900 whitespace-pre-wrap">{catering_inquiry.additional_details}</p>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-700">Name</p>
                <p className="text-gray-900">{catering_inquiry.contact_name}</p>
              </div>
              {catering_inquiry.company_name && (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Company</p>
                  <p className="text-gray-900">{catering_inquiry.company_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-700">Email</p>
                <p className="text-gray-900">{catering_inquiry.contact_email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Phone</p>
                <p className="text-gray-900">{catering_inquiry.contact_phone}</p>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          {catering_inquiry.admin_notes && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 lg:p-8">
              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                Message from Admin
              </h2>
              <p className="text-blue-900 whitespace-pre-wrap">{catering_inquiry.admin_notes}</p>
            </div>
          )}

          {/* Quote Section */}
          {active_quote && (
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Quote Details</h2>
                {active_quote.quote_pdf_url && (
                  <button
                    onClick={handleDownloadQuotePdf}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PDF
                  </button>
                )}
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">Quote Number: <span className="font-semibold text-gray-900">{active_quote.quote_number}</span></p>
                <p className="text-sm text-gray-600">
                  Valid Until: <span className={`font-semibold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatDate(active_quote.valid_until)}
                  </span>
                </p>
                {isExpired && (
                  <p className="text-sm text-red-600 font-semibold mt-1">⚠️ This quote has expired. Please contact us for an updated quote.</p>
                )}
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {active_quote.line_items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.item}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(Number(item.unit_price || 0))}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{formatCurrency(Number(item.total || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Subtotal</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(Number(active_quote.subtotal || 0))}</span>
                </div>

                {active_quote.additional_fees && active_quote.additional_fees.length > 0 && (
                  <>
                    {active_quote.additional_fees.map((fee, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">{fee.name}</span>
                        <span className="text-gray-900 font-semibold">{formatCurrency(Number(fee.amount || 0))}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">VAT (23%)</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(Number(active_quote.tax_amount || 0))}</span>
                </div>

                <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-300">
                  <span className="text-gray-900">Grand Total</span>
                  <span className="text-orange-600">{formatCurrency(Number(active_quote.grand_total || 0))}</span>
                </div>
              </div>

              {/* Terms */}
              {active_quote.terms && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{active_quote.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* No Quote Message */}
          {!active_quote && catering_inquiry.status === 'in_progress' && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Quote Pending</h3>
              <p className="text-yellow-700">
                Our team is currently reviewing your inquiry. You'll receive a quote within 24-48 hours.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {(canAcceptQuote || canCancelInquiry) && (
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row gap-4">
                {canAcceptQuote && !isExpired && (
                  <button
                    onClick={handleAcceptQuote}
                    disabled={acceptQuoteMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acceptQuoteMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Accept Quote & Confirm Booking
                      </>
                    )}
                  </button>
                )}

                {canCancelInquiry && (
                  <button
                    onClick={handleCancelInquiry}
                    disabled={cancelInquiryMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelInquiryMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 mr-2" />
                        Cancel Inquiry
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Confirmed Status Message */}
          {catering_inquiry.status === 'confirmed' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Booking Confirmed!</h3>
              <p className="text-green-700">
                Your catering booking has been confirmed. We will contact you shortly to finalize all details.
              </p>
            </div>
          )}

          {/* Cancelled Status Message */}
          {catering_inquiry.status === 'cancelled' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Inquiry Cancelled</h3>
              <p className="text-red-700">
                This catering inquiry has been cancelled. If you have any questions, please contact us.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_CateringInquiryDetail;