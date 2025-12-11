import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Save, 
  FileText, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface InvoiceLineItem {
  item: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceDetail {
  invoice_id: string;
  invoice_number: string;
  order_id: string | null;
  catering_inquiry_id: string | null;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  line_items: InvoiceLineItem[];
  subtotal: number;
  discount_amount: number;
  delivery_fee: number | null;
  tax_amount: number;
  grand_total: number;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method: string | null;
  sumup_transaction_id: string | null;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  invoice_pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateInvoicePayload {
  payment_status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string | null;
}

// ===========================
// API Helper Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchInvoiceDetail = async (invoice_id: string, auth_token: string): Promise<InvoiceDetail> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/admin/invoices/${invoice_id}`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
  return response.data;
};

const updateInvoice = async (
  invoice_id: string,
  payload: UpdateInvoicePayload,
  auth_token: string
): Promise<InvoiceDetail> => {
  const response = await axios.put(
    `${API_BASE_URL}/api/admin/invoices/${invoice_id}`,
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

const sendInvoiceEmail = async (invoice_id: string, auth_token: string): Promise<void> => {
  await axios.post(
    `${API_BASE_URL}/api/admin/invoices/${invoice_id}/send`,
    {},
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
};

// ===========================
// Main Component
// ===========================

const UV_AdminInvoiceDetail: React.FC = () => {
  const { invoice_id } = useParams<{ invoice_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors (NO object destructuring)
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const add_notification = useAppStore(state => state.add_notification);

  // Local state
  const [payment_status_update, set_payment_status_update] = useState<'pending' | 'paid' | 'overdue' | 'cancelled'>('pending');
  const [invoice_notes_draft, set_invoice_notes_draft] = useState<string>('');
  const [error_message, set_error_message] = useState<string | null>(null);
  const [email_sending, set_email_sending] = useState(false);

  // ===========================
  // Data Fetching (React Query)
  // ===========================

  const {
    data: invoice_detail,
    isLoading: is_fetching,
    isError: fetch_error,
    error: fetch_error_obj,
  } = useQuery({
    queryKey: ['admin-invoice-detail', invoice_id],
    queryFn: () => fetchInvoiceDetail(invoice_id!, auth_token!),
    enabled: !!invoice_id && !!auth_token,
    staleTime: 30000,
    retry: 1,
  });

  // Initialize editable fields when data loads
  useEffect(() => {
    if (invoice_detail) {
      set_payment_status_update(invoice_detail.payment_status);
      set_invoice_notes_draft(invoice_detail.notes || '');
    }
  }, [invoice_detail]);

  // ===========================
  // Mutations (React Query)
  // ===========================

  const update_invoice_mutation = useMutation({
    mutationFn: (payload: UpdateInvoicePayload) => 
      updateInvoice(invoice_id!, payload, auth_token!),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-invoice-detail', invoice_id], data);
      add_notification({
        type: 'success',
        message: 'Invoice updated successfully',
      });
      set_error_message(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to update invoice';
      set_error_message(message);
      add_notification({
        type: 'error',
        message,
      });
    },
  });

  const send_email_mutation = useMutation({
    mutationFn: () => sendInvoiceEmail(invoice_id!, auth_token!),
    onSuccess: () => {
      add_notification({
        type: 'success',
        message: 'Invoice sent successfully to customer',
      });
      set_email_sending(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Failed to send invoice';
      set_error_message(message);
      add_notification({
        type: 'error',
        message,
      });
      set_email_sending(false);
    },
  });

  // ===========================
  // Event Handlers
  // ===========================

  const handle_save_changes = () => {
    if (!invoice_detail) return;

    const payload: UpdateInvoicePayload = {
      payment_status: payment_status_update,
      notes: invoice_notes_draft || null,
    };

    update_invoice_mutation.mutate(payload);
  };

  const handle_download_pdf = () => {
    if (invoice_detail?.invoice_pdf_url) {
      window.open(invoice_detail.invoice_pdf_url, '_blank');
    } else {
      set_error_message('Invoice PDF not available');
    }
  };

  const handle_send_email = () => {
    set_email_sending(true);
    send_email_mutation.mutate();
  };

  const handle_navigate_to_customer = () => {
    if (invoice_detail?.user_id) {
      navigate(`/admin/customers/${invoice_detail.user_id}`);
    }
  };

  const handle_navigate_to_order = () => {
    if (invoice_detail?.order_id) {
      navigate(`/admin/orders/${invoice_detail.order_id}`);
    }
  };

  // ===========================
  // Helper Functions
  // ===========================

  const get_payment_status_badge_color = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const get_payment_status_icon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const format_currency = (amount: number): string => {
    return `€${Number(amount || 0).toFixed(2)}`;
  };

  const format_date = (date_string: string | null): string => {
    if (!date_string) return 'N/A';
    return new Date(date_string).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const format_date_time = (date_string: string | null): string => {
    if (!date_string) return 'N/A';
    return new Date(date_string).toLocaleString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ===========================
  // Render Component
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/admin/invoices"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="font-medium">Back to Invoices</span>
              </Link>
            </div>

            {/* Loading State */}
            {is_fetching && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            )}

            {/* Error State */}
            {fetch_error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900 mb-1">
                      Failed to Load Invoice
                    </h3>
                    <p className="text-red-700">
                      {(fetch_error_obj as any)?.response?.data?.message || 
                       (fetch_error_obj as any)?.message || 
                       'An error occurred while loading the invoice.'}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="/admin/invoices"
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Return to Invoices List
                  </Link>
                </div>
              </div>
            )}

            {/* Error Message Banner */}
            {error_message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-700 text-sm">{error_message}</p>
                  <button
                    onClick={() => set_error_message(null)}
                    className="ml-auto text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Invoice Header */}
            {invoice_detail && (
              <>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Invoice {invoice_detail.invoice_number}
                    </h1>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${get_payment_status_badge_color(invoice_detail.payment_status)}`}>
                        {get_payment_status_icon(invoice_detail.payment_status)}
                        <span className="ml-2 capitalize">{invoice_detail.payment_status}</span>
                      </span>
                      {invoice_detail.order_id && (
                        <button
                          onClick={handle_navigate_to_order}
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Related Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
                    <button
                      onClick={handle_download_pdf}
                      disabled={!invoice_detail.invoice_pdf_url}
                      className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download PDF
                    </button>

                    <button
                      onClick={handle_send_email}
                      disabled={email_sending || send_email_mutation.isPending}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {email_sending || send_email_mutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5 mr-2" />
                          Email Invoice
                        </>
                      )}
                    </button>

                    <button
                      onClick={handle_save_changes}
                      disabled={update_invoice_mutation.isPending}
                      className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {update_invoice_mutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Main Invoice Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Customer Information Card */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                          <User className="w-5 h-5 mr-2 text-gray-600" />
                          Customer Information
                        </h2>
                        <button
                          onClick={handle_navigate_to_customer}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View Profile →
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Customer Name</p>
                          <button
                            onClick={handle_navigate_to_customer}
                            className="text-lg font-semibold text-blue-600 hover:text-blue-700"
                          >
                            {invoice_detail.customer_name}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Email</p>
                            <a
                              href={`mailto:${invoice_detail.customer_email}`}
                              className="text-gray-900 hover:text-blue-600 flex items-center"
                            >
                              <Mail className="w-4 h-4 mr-2 text-gray-500" />
                              {invoice_detail.customer_email}
                            </a>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Phone</p>
                            <a
                              href={`tel:${invoice_detail.customer_phone}`}
                              className="text-gray-900 hover:text-blue-600 flex items-center"
                            >
                              <Phone className="w-4 h-4 mr-2 text-gray-500" />
                              {invoice_detail.customer_phone}
                            </a>
                          </div>
                        </div>

                        {invoice_detail.customer_address && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Address</p>
                            <p className="text-gray-900 flex items-start">
                              <MapPin className="w-4 h-4 mr-2 text-gray-500 mt-0.5" />
                              {invoice_detail.customer_address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Invoice Dates Card */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                        Dates & Timeline
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Issue Date</p>
                          <p className="text-gray-900 font-medium">{format_date(invoice_detail.issue_date)}</p>
                        </div>

                        {invoice_detail.due_date && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Due Date</p>
                            <p className="text-gray-900 font-medium">{format_date(invoice_detail.due_date)}</p>
                          </div>
                        )}

                        {invoice_detail.paid_at && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Paid At</p>
                            <p className="text-gray-900 font-medium">{format_date_time(invoice_detail.paid_at)}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Created</p>
                          <p className="text-gray-900 font-medium">{format_date_time(invoice_detail.created_at)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                          <p className="text-gray-900 font-medium">{format_date_time(invoice_detail.updated_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Line Items</h2>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Description
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
                            {invoice_detail.line_items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm text-gray-900">
                                  {item.item}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 text-right">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 text-right">
                                  {format_currency(item.unit_price)}
                                </td>
                                <td className="px-4 py-4 text-sm font-semibold text-gray-900 text-right">
                                  {format_currency(item.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pricing Summary */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-900 font-medium">{format_currency(invoice_detail.subtotal)}</span>
                          </div>

                          {invoice_detail.discount_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Discount</span>
                              <span className="text-green-600 font-medium">-{format_currency(invoice_detail.discount_amount)}</span>
                            </div>
                          )}

                          {invoice_detail.delivery_fee !== null && invoice_detail.delivery_fee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Delivery Fee</span>
                              <span className="text-gray-900 font-medium">{format_currency(invoice_detail.delivery_fee)}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax (VAT)</span>
                            <span className="text-gray-900 font-medium">{format_currency(invoice_detail.tax_amount)}</span>
                          </div>

                          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                            <span className="text-gray-900">Grand Total</span>
                            <span className="text-orange-600">{format_currency(invoice_detail.grand_total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Payment & Notes */}
                  <div className="space-y-6">
                    {/* Payment Information Card */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                        Payment Information
                      </h2>

                      <div className="space-y-4">
                        {/* Payment Status Selector */}
                        <div>
                          <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Status
                          </label>
                          <select
                            id="payment_status"
                            value={payment_status_update}
                            onChange={(e) => set_payment_status_update(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Payment Method */}
                        {invoice_detail.payment_method && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                            <p className="text-gray-900 font-medium capitalize">{invoice_detail.payment_method}</p>
                          </div>
                        )}

                        {/* Transaction ID */}
                        {invoice_detail.sumup_transaction_id && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                            <p className="text-gray-900 font-mono text-sm">{invoice_detail.sumup_transaction_id}</p>
                          </div>
                        )}

                        {/* Amount */}
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Amount</p>
                          <p className="text-2xl font-bold text-gray-900">{format_currency(invoice_detail.grand_total)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Internal Notes</h2>

                      <div>
                        <label htmlFor="invoice_notes" className="block text-sm font-medium text-gray-700 mb-2">
                          Notes (Admin Only)
                        </label>
                        <textarea
                          id="invoice_notes"
                          value={invoice_notes_draft}
                          onChange={(e) => set_invoice_notes_draft(e.target.value)}
                          rows={6}
                          placeholder="Add internal notes about this invoice..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {invoice_notes_draft.length} characters
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600 italic">
                          Notes are for internal use only and will not be visible to customers on the invoice.
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Invoice Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Status</span>
                          <span className="font-semibold text-gray-900 capitalize">{invoice_detail.payment_status}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Total Amount</span>
                          <span className="font-semibold text-gray-900">{format_currency(invoice_detail.grand_total)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Items</span>
                          <span className="font-semibold text-gray-900">{invoice_detail.line_items.length}</span>
                        </div>
                        {invoice_detail.order_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Order-Based</span>
                            <span className="font-semibold text-green-600">Yes</span>
                          </div>
                        )}
                        {invoice_detail.catering_inquiry_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Catering</span>
                            <span className="font-semibold text-blue-600">Yes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminInvoiceDetail;