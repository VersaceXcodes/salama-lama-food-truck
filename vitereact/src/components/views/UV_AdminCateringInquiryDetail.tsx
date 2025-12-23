import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Phone, 
  Mail, 
  FileText, 
  Plus, 
  Trash2, 
  Send, 
  Download, 
  Save, 
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

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
  status: 'new' | 'in_progress' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
  admin_notes: string | null;
  submitted_at: string;
  updated_at: string;
  quotes: CateringQuote[];
}

interface CateringQuote {
  quote_id: string;
  inquiry_id: string;
  quote_number: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  additional_fees: QuoteFee[] | null;
  tax_amount: number;
  grand_total: number;
  valid_until: string;
  terms: string | null;
  quote_pdf_url: string | null;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
}

interface QuoteLineItem {
  item: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteFee {
  name: string;
  amount: number;
}

interface QuoteFormData {
  line_items: QuoteLineItem[];
  subtotal: number;
  additional_fees: QuoteFee[] | null;
  tax_amount: number;
  grand_total: number;
  valid_until: string;
  terms: string | null;
}

// ===========================
// API Functions
// ===========================

const fetchInquiryDetail = async (inquiry_id: string, auth_token: string): Promise<CateringInquiry> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/catering/inquiries/${inquiry_id}`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
  // Backend returns { inquiry: {...}, quotes: [...] } - merge them
  const { inquiry, quotes } = response.data;
  return { ...inquiry, quotes };
};

const updateInquiryStatus = async (
  inquiry_id: string,
  data: { status: string; admin_notes: string | null },
  auth_token: string
): Promise<CateringInquiry> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/catering/inquiries/${inquiry_id}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const generateQuote = async (
  inquiry_id: string,
  quote_data: Omit<QuoteFormData, 'subtotal' | 'tax_amount' | 'grand_total'> & {
    line_items: QuoteLineItem[];
    additional_fees: QuoteFee[] | null;
  },
  auth_token: string
): Promise<{ quote_id: string; quote_number: string; quote_pdf_url: string | null }> => {
  // Calculate totals
  const subtotal = quote_data.line_items.reduce((sum, item) => sum + item.total, 0);
  const additional_total = quote_data.additional_fees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
  const tax_amount = (subtotal + additional_total) * 0.23; // VAT 23%
  const grand_total = subtotal + additional_total + tax_amount;

  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/catering/inquiries/${inquiry_id}/quote`,
    {
      ...quote_data,
      subtotal,
      tax_amount,
      grand_total,
    },
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const sendQuoteToCustomer = async (quote_id: string, auth_token: string): Promise<{ sent_at: string }> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/catering/quotes/${quote_id}/send`,
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
// Main Component
// ===========================

const UV_AdminCateringInquiryDetail: React.FC = () => {
  const { inquiry_id } = useParams<{ inquiry_id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Zustand store - CRITICAL: Individual selectors only
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [admin_notes_draft, set_admin_notes_draft] = useState<string>('');
  const [selected_status, set_selected_status] = useState<string>('');
  const [show_quote_form, set_show_quote_form] = useState<boolean>(false);
  const [quote_form_data, set_quote_form_data] = useState<QuoteFormData>({
    line_items: [],
    subtotal: 0,
    additional_fees: [],
    tax_amount: 0,
    grand_total: 0,
    valid_until: '',
    terms: null,
  });

  // React Query - Fetch inquiry detail
  const {
    data: inquiry_data,
    isLoading: is_loading,
    isError: is_error,
    error,
  } = useQuery({
    queryKey: ['admin', 'catering', 'inquiry', inquiry_id],
    queryFn: () => fetchInquiryDetail(inquiry_id!, auth_token!),
    enabled: !!inquiry_id && !!auth_token,
    staleTime: 30000,
    retry: 1,
  });

  // Initialize states when data loads
  useEffect(() => {
    if (inquiry_data) {
      set_admin_notes_draft(inquiry_data.admin_notes || '');
      set_selected_status(inquiry_data.status);
    }
  }, [inquiry_data]);

  // Mutation - Update inquiry status
  const update_status_mutation = useMutation({
    mutationFn: (data: { status: string; admin_notes: string | null }) =>
      updateInquiryStatus(inquiry_id!, data, auth_token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catering', 'inquiry', inquiry_id] });
      toast({
        title: 'Changes Saved',
        description: 'Inquiry status and notes have been updated successfully.',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      console.error('Failed to update inquiry:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update inquiry';
      toast({
        title: 'Failed to Save Changes',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Mutation - Generate quote
  const generate_quote_mutation = useMutation({
    mutationFn: (data: Omit<QuoteFormData, 'subtotal' | 'tax_amount' | 'grand_total'> & {
      line_items: QuoteLineItem[];
      additional_fees: QuoteFee[] | null;
    }) => generateQuote(inquiry_id!, data, auth_token!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catering', 'inquiry', inquiry_id] });
      set_show_quote_form(false);
      set_quote_form_data({
        line_items: [],
        subtotal: 0,
        additional_fees: [],
        tax_amount: 0,
        grand_total: 0,
        valid_until: '',
        terms: null,
      });
      
      // Show success toast
      toast({
        title: 'Quote Generated Successfully',
        description: `Quote ${data.quote_number} has been created and the inquiry has been marked as quoted.`,
        variant: 'default',
      });
      
      // Scroll to top to see the quote
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      console.error('Failed to generate quote:', error);
      
      // Show error toast with detailed message
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate quote';
      toast({
        title: 'Failed to Generate Quote',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Mutation - Send quote
  const send_quote_mutation = useMutation({
    mutationFn: (quote_id: string) => sendQuoteToCustomer(quote_id, auth_token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catering', 'inquiry', inquiry_id] });
      toast({
        title: 'Quote Sent',
        description: 'Quote has been sent to the customer via email.',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      console.error('Failed to send quote:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send quote';
      toast({
        title: 'Failed to Send Quote',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // ===========================
  // Event Handlers
  // ===========================

  const handle_status_change = (new_status: string) => {
    set_selected_status(new_status);
  };

  const handle_save_notes_and_status = () => {
    update_status_mutation.mutate({
      status: selected_status,
      admin_notes: admin_notes_draft || null,
    });
  };

  const handle_add_line_item = () => {
    set_quote_form_data(prev => ({
      ...prev,
      line_items: [...prev.line_items, { item: '', quantity: 1, unit_price: 0, total: 0 }],
    }));
  };

  const handle_update_line_item = (index: number, field: keyof QuoteLineItem, value: string | number) => {
    set_quote_form_data(prev => {
      const updated_items = [...prev.line_items];
      updated_items[index] = {
        ...updated_items[index],
        [field]: value,
      };

      // Recalculate total for this item
      if (field === 'quantity' || field === 'unit_price') {
        updated_items[index].total = updated_items[index].quantity * updated_items[index].unit_price;
      }

      return recalculate_quote_totals({ ...prev, line_items: updated_items });
    });
  };

  const handle_remove_line_item = (index: number) => {
    set_quote_form_data(prev => {
      const updated_items = prev.line_items.filter((_, i) => i !== index);
      return recalculate_quote_totals({ ...prev, line_items: updated_items });
    });
  };

  const handle_add_fee = () => {
    set_quote_form_data(prev => ({
      ...prev,
      additional_fees: [...(prev.additional_fees || []), { name: '', amount: 0 }],
    }));
  };

  const handle_update_fee = (index: number, field: 'name' | 'amount', value: string | number) => {
    set_quote_form_data(prev => {
      const updated_fees = [...(prev.additional_fees || [])];
      updated_fees[index] = {
        ...updated_fees[index],
        [field]: value,
      };
      return recalculate_quote_totals({ ...prev, additional_fees: updated_fees });
    });
  };

  const handle_remove_fee = (index: number) => {
    set_quote_form_data(prev => {
      const updated_fees = (prev.additional_fees || []).filter((_, i) => i !== index);
      return recalculate_quote_totals({ ...prev, additional_fees: updated_fees });
    });
  };

  const recalculate_quote_totals = (data: QuoteFormData): QuoteFormData => {
    const subtotal = data.line_items.reduce((sum, item) => sum + item.total, 0);
    const fees_total = (data.additional_fees || []).reduce((sum, fee) => sum + Number(fee.amount), 0);
    const tax_amount = (subtotal + fees_total) * 0.23; // VAT 23%
    const grand_total = subtotal + fees_total + tax_amount;

    return {
      ...data,
      subtotal,
      tax_amount,
      grand_total,
    };
  };

  const handle_generate_quote = () => {
    // Validate form
    if (quote_form_data.line_items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one line item to the quote.',
        variant: 'destructive',
      });
      return;
    }

    // Validate line items
    const invalidItems = quote_form_data.line_items.filter(
      item => !item.item.trim() || item.quantity <= 0 || item.unit_price <= 0
    );
    if (invalidItems.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'All line items must have a name, quantity greater than 0, and a unit price greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    if (!quote_form_data.valid_until) {
      toast({
        title: 'Validation Error',
        description: 'Please set a valid until date for the quote.',
        variant: 'destructive',
      });
      return;
    }

    // Validate valid_until is in the future
    const validUntilDate = new Date(quote_form_data.valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (validUntilDate < today) {
      toast({
        title: 'Validation Error',
        description: 'Valid until date must be today or in the future.',
        variant: 'destructive',
      });
      return;
    }

    generate_quote_mutation.mutate({
      line_items: quote_form_data.line_items,
      additional_fees: quote_form_data.additional_fees,
      valid_until: quote_form_data.valid_until,
      terms: quote_form_data.terms,
    });
  };

  // ===========================
  // Helper Functions
  // ===========================

  const get_status_badge_color = (status: string): string => {
    switch (status) {
      case 'new':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'quoted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'completed':
        return 'bg-green-200 text-green-900 border-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const format_event_type = (type: string): string => {
    const types: Record<string, string> = {
      corporate: 'Corporate Event',
      wedding: 'Wedding',
      birthday: 'Birthday Party',
      meeting: 'Meeting',
      other: 'Other',
    };
    return types[type] || type;
  };

  const format_date = (date_string: string): string => {
    return new Date(date_string).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const format_currency = (amount: number): string => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // ===========================
  // Render States
  // ===========================

  if (is_loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading catering inquiry...</p>
          </div>
        </div>
      </>
    );
  }

  if (is_error) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Inquiry</h2>
              <p className="text-gray-600 mb-6">
                {error instanceof Error ? error.message : 'Failed to load inquiry details'}
              </p>
              <Link
                to="/admin/catering"
                className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Back to Inquiries
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!inquiry_data) {
    return null;
  }

  const current_quote = inquiry_data.quotes && inquiry_data.quotes.length > 0 ? inquiry_data.quotes[0] : null;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/admin/catering"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back to Inquiries
            </Link>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Inquiry #{inquiry_data.inquiry_number}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${get_status_badge_color(inquiry_data.status)}`}>
                    {inquiry_data.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-gray-500 text-sm">
                    Submitted {format_date(inquiry_data.submitted_at)}
                  </span>
                </div>
              </div>

              <button
                onClick={handle_save_notes_and_status}
                disabled={update_status_mutation.isPending}
                className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {update_status_mutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-6 w-6 mr-2 text-orange-600" />
                  Customer Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Contact Name</label>
                    <p className="text-gray-900 font-medium">{inquiry_data.contact_name}</p>
                  </div>
                  
                  {inquiry_data.company_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Company</label>
                      <p className="text-gray-900 font-medium">{inquiry_data.company_name}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <a href={`mailto:${inquiry_data.contact_email}`} className="text-orange-600 hover:text-orange-700 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {inquiry_data.contact_email}
                    </a>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                    <a href={`tel:${inquiry_data.contact_phone}`} className="text-orange-600 hover:text-orange-700 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {inquiry_data.contact_phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-6 w-6 mr-2 text-orange-600" />
                  Event Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Event Type</label>
                    <p className="text-gray-900 font-medium">
                      {format_event_type(inquiry_data.event_type)}
                      {inquiry_data.event_type_other && ` - ${inquiry_data.event_type_other}`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Event Date</label>
                    <p className="text-gray-900 font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {format_date(inquiry_data.event_date)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Event Time</label>
                    <p className="text-gray-900 font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {inquiry_data.event_start_time} - {inquiry_data.event_end_time}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Guest Count</label>
                    <p className="text-gray-900 font-medium flex items-center">
                      <Users className="h-4 w-4 mr-1 text-gray-400" />
                      {inquiry_data.guest_count_min && inquiry_data.guest_count_max
                        ? `${inquiry_data.guest_count_min} - ${inquiry_data.guest_count_max}`
                        : inquiry_data.guest_count}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                    <p className="text-gray-900 flex items-start">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400 mt-0.5" />
                      <span>
                        {inquiry_data.event_location_address}<br />
                        {inquiry_data.event_location_city}, {inquiry_data.event_location_postal_code}<br />
                        <span className="text-gray-500 text-sm capitalize">({inquiry_data.event_location_type})</span>
                      </span>
                    </p>
                  </div>

                  {inquiry_data.dietary_requirements && inquiry_data.dietary_requirements.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Dietary Requirements</label>
                      <div className="flex flex-wrap gap-2">
                        {inquiry_data.dietary_requirements.map((req, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {inquiry_data.dietary_notes && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Dietary Notes</label>
                      <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3">
                        {inquiry_data.dietary_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Menu Preferences */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-6 w-6 mr-2 text-orange-600" />
                  Menu Preferences
                </h2>
                <div className="space-y-4">
                  {inquiry_data.preferred_package && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Preferred Package</label>
                      <p className="text-gray-900 font-medium capitalize">{inquiry_data.preferred_package}</p>
                    </div>
                  )}

                  {inquiry_data.budget_range && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Budget Range</label>
                      <p className="text-gray-900 font-medium">{inquiry_data.budget_range}</p>
                    </div>
                  )}

                  {inquiry_data.menu_preferences && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Menu Preferences</label>
                      <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                        {inquiry_data.menu_preferences}
                      </p>
                    </div>
                  )}

                  {inquiry_data.additional_details && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Additional Details</label>
                      <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                        {inquiry_data.additional_details}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Quote */}
              {current_quote && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <FileText className="h-6 w-6 mr-2 text-orange-600" />
                      Quote #{current_quote.quote_number}
                    </h2>
                    <div className="flex items-center space-x-2">
                      {current_quote.quote_pdf_url && (
                        <a
                          href={current_quote.quote_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </a>
                      )}
                      {!current_quote.sent_at && (
                        <button
                          onClick={() => send_quote_mutation.mutate(current_quote.quote_id)}
                          disabled={send_quote_mutation.isPending}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {send_quote_mutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send to Customer
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {current_quote.sent_at && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 text-sm font-medium">
                        Sent to customer on {format_date(current_quote.sent_at)}
                      </span>
                    </div>
                  )}

                  {current_quote.accepted_at && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-blue-800 text-sm font-medium">
                        Accepted by customer on {format_date(current_quote.accepted_at)}
                      </span>
                    </div>
                  )}

                  {/* Line Items */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {current_quote.line_items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.item}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{format_currency(item.unit_price)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{format_currency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900 font-medium">{format_currency(current_quote.subtotal)}</span>
                    </div>

                    {current_quote.additional_fees && current_quote.additional_fees.length > 0 && (
                      <>
                        {current_quote.additional_fees.map((fee, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{fee.name}</span>
                            <span className="text-gray-900 font-medium">{format_currency(fee.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT (23%)</span>
                      <span className="text-gray-900 font-medium">{format_currency(current_quote.tax_amount)}</span>
                    </div>

                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-gray-900">Grand Total</span>
                        <span className="text-lg font-bold text-gray-900">{format_currency(current_quote.grand_total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>Valid Until:</strong> {format_date(current_quote.valid_until)}
                    </p>
                    {current_quote.terms && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Terms & Conditions:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                          {current_quote.terms}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quote Generation Form */}
              {!current_quote && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Generate Quote</h2>
                    {!show_quote_form && (
                      <button
                        onClick={() => set_show_quote_form(true)}
                        className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Quote
                      </button>
                    )}
                  </div>

                  {show_quote_form && (
                    <div className="space-y-6">
                      {/* Line Items */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">Line Items</label>
                          <button
                            onClick={handle_add_line_item}
                            className="inline-flex items-center text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </button>
                        </div>

                        {quote_form_data.line_items.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <p className="text-gray-500">No line items added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {quote_form_data.line_items.map((item, index) => (
                              <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                                <div className="col-span-5">
                                  <input
                                    type="text"
                                    placeholder="Item name"
                                    value={item.item}
                                    onChange={(e) => handle_update_line_item(index, 'item', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => handle_update_line_item(index, 'quantity', Number(e.target.value))}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    placeholder="Price"
                                    value={item.unit_price}
                                    onChange={(e) => handle_update_line_item(index, 'unit_price', Number(e.target.value))}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="col-span-2 flex items-center justify-end">
                                  <span className="text-sm font-medium text-gray-900">{format_currency(item.total)}</span>
                                </div>
                                <div className="col-span-1 flex items-center justify-end">
                                  <button
                                    onClick={() => handle_remove_line_item(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Additional Fees */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">Additional Fees</label>
                          <button
                            onClick={handle_add_fee}
                            className="inline-flex items-center text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Fee
                          </button>
                        </div>

                        {quote_form_data.additional_fees && quote_form_data.additional_fees.length > 0 && (
                          <div className="space-y-3">
                            {quote_form_data.additional_fees.map((fee, index) => (
                              <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                                <input
                                  type="text"
                                  placeholder="Fee name (e.g., Service Fee)"
                                  value={fee.name}
                                  onChange={(e) => handle_update_fee(index, 'name', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                                <input
                                  type="number"
                                  placeholder="Amount"
                                  value={fee.amount}
                                  onChange={(e) => handle_update_fee(index, 'amount', Number(e.target.value))}
                                  min="0"
                                  step="0.01"
                                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => handle_remove_fee(index)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quote Totals */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900 font-medium">{format_currency(quote_form_data.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">VAT (23%)</span>
                          <span className="text-gray-900 font-medium">{format_currency(quote_form_data.tax_amount)}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 flex justify-between">
                          <span className="font-bold text-gray-900">Grand Total</span>
                          <span className="font-bold text-gray-900">{format_currency(quote_form_data.grand_total)}</span>
                        </div>
                      </div>

                      {/* Valid Until */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                        <input
                          type="date"
                          value={quote_form_data.valid_until}
                          onChange={(e) => set_quote_form_data(prev => ({ ...prev, valid_until: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>

                      {/* Terms */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                        <textarea
                          value={quote_form_data.terms || ''}
                          onChange={(e) => set_quote_form_data(prev => ({ ...prev, terms: e.target.value }))}
                          rows={4}
                          placeholder="Enter quote terms and conditions..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            set_show_quote_form(false);
                            set_quote_form_data({
                              line_items: [],
                              subtotal: 0,
                              additional_fees: [],
                              tax_amount: 0,
                              grand_total: 0,
                              valid_until: '',
                              terms: null,
                            });
                          }}
                          className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handle_generate_quote}
                          disabled={generate_quote_mutation.isPending}
                          className="inline-flex items-center px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generate_quote_mutation.isPending ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate Quote'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status Management */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Inquiry Status</h3>
                <select
                  value={selected_status}
                  onChange={(e) => handle_status_change(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="quoted">Quoted</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Admin Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Admin Notes</h3>
                <textarea
                  value={admin_notes_draft}
                  onChange={(e) => set_admin_notes_draft(e.target.value)}
                  rows={6}
                  placeholder="Add internal notes about this inquiry..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  These notes are only visible to admin and staff
                </p>
              </div>

              {/* Quick Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inquiry ID</span>
                    <span className="text-gray-900 font-medium">{inquiry_data.inquiry_id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted</span>
                    <span className="text-gray-900 font-medium">{format_date(inquiry_data.submitted_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="text-gray-900 font-medium">{format_date(inquiry_data.updated_at)}</span>
                  </div>
                  {inquiry_data.user_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer Account</span>
                      <Link 
                        to={`/admin/customers/${inquiry_data.user_id}`}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        View Profile
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminCateringInquiryDetail;