import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  order_id: string | null;
  catering_inquiry_id: string | null;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  line_items: Array<{
    item: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
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

interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
}

interface CreateInvoiceData {
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  line_items: Array<{
    item: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number | null;
  tax_amount: number;
  grand_total: number;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
}

// ===========================
// Main Component
// ===========================

const UV_AdminInvoices: React.FC = () => {
  // URL params management
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Auth token from global state - CRITICAL: Individual selector, no object destructuring
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  
  // Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // State variables
  const [filter_status, setFilterStatus] = useState<string>(searchParams.get('status') || 'all');
  const [date_range_filter, setDateRangeFilter] = useState<string>(searchParams.get('date_range') || 'all_time');
  const [customer_search_query, setCustomerSearchQuery] = useState<string>(searchParams.get('customer_search') || '');
  const [current_page, setCurrentPage] = useState<number>(1);
  const [custom_invoice_form_open, setCustomInvoiceFormOpen] = useState<boolean>(false);
  
  // Custom invoice form data
  const [custom_invoice_data, setCustomInvoiceData] = useState<CreateInvoiceData>({
    user_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: null,
    line_items: [],
    subtotal: 0,
    discount_amount: 0,
    delivery_fee: null,
    tax_amount: 0,
    grand_total: 0,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: null,
    notes: null,
  });
  
  // Line item form for custom invoice
  const [new_line_item, setNewLineItem] = useState({
    item: '',
    quantity: 1,
    unit_price: 0,
    total: 0,
  });

  // Pagination
  const items_per_page = 20;
  const offset = (current_page - 1) * items_per_page;

  // ===========================
  // Helper Functions
  // ===========================

  // Calculate date range
  const getDateRangeValues = (range: string): { date_from?: string; date_to?: string } => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    switch (range) {
      case 'today':
        return { date_from: formatDate(today), date_to: formatDate(today) };
      case 'this_week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { date_from: formatDate(weekStart), date_to: formatDate(today) };
      }
      case 'this_month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { date_from: formatDate(monthStart), date_to: formatDate(today) };
      }
      case 'last_month': {
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { date_from: formatDate(lastMonthStart), date_to: formatDate(lastMonthEnd) };
      }
      case 'all_time':
      default:
        return {};
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `€${Number(amount || 0).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Payment status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    const statusLabels = {
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges] || badges.pending}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  // Reset custom invoice form
  const resetCustomInvoiceForm = () => {
    setCustomInvoiceData({
      user_id: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: null,
      line_items: [],
      subtotal: 0,
      discount_amount: 0,
      delivery_fee: null,
      tax_amount: 0,
      grand_total: 0,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: null,
      notes: null,
    });
    setNewLineItem({
      item: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
    });
  };

  // ===========================
  // API Functions
  // ===========================

  // Fetch invoices
  const fetchInvoices = async (): Promise<InvoicesResponse> => {
    const { date_from, date_to } = getDateRangeValues(date_range_filter);
    
    const params: Record<string, any> = {
      limit: items_per_page,
      offset: offset,
    };
    
    if (filter_status !== 'all') {
      params.status = filter_status;
    }
    
    if (date_from) params.date_from = date_from;
    if (date_to) params.date_to = date_to;
    
    if (customer_search_query) {
      params.query = customer_search_query;
    }
    
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/invoices`,
      {
        params,
        headers: { Authorization: `Bearer ${auth_token}` },
      }
    );
    
    return response.data;
  };

  const {
    data: invoices_data,
    isLoading: loading_invoices,
    error: invoices_error,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['admin-invoices', filter_status, date_range_filter, customer_search_query, current_page],
    queryFn: fetchInvoices,
    staleTime: 30000,
    enabled: !!auth_token,
  });

  // Create custom invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/invoices`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth_token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      setCustomInvoiceFormOpen(false);
      resetCustomInvoiceForm();
    },
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoice_id: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/invoices/${invoice_id}/send`,
        {},
        {
          headers: { Authorization: `Bearer ${auth_token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
    },
  });

  // ===========================
  // Event Handlers
  // ===========================

  // Export to CSV
  const handleExportCSV = async () => {
    const { date_from, date_to } = getDateRangeValues(date_range_filter);
    
    const params: Record<string, any> = {
      format: 'csv',
    };
    
    if (filter_status !== 'all') {
      params.status = filter_status;
    }
    
    if (date_from) params.date_from = date_from;
    if (date_to) params.date_to = date_to;
    
    if (customer_search_query) {
      params.query = customer_search_query;
    }
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/invoices`,
        {
          params,
          headers: { Authorization: `Bearer ${auth_token}` },
          responseType: 'blob',
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('CSV export failed:', error);
    }
  };

  // Add line item to custom invoice
  const handleAddLineItem = () => {
    if (!new_line_item.item || new_line_item.quantity <= 0 || new_line_item.unit_price <= 0) {
      return;
    }
    
    const total = new_line_item.quantity * new_line_item.unit_price;
    const updated_line_items = [...custom_invoice_data.line_items, { ...new_line_item, total }];
    
    const subtotal = updated_line_items.reduce((sum, item) => sum + item.total, 0);
    const grand_total = subtotal - custom_invoice_data.discount_amount + (custom_invoice_data.delivery_fee || 0) + custom_invoice_data.tax_amount;
    
    setCustomInvoiceData({
      ...custom_invoice_data,
      line_items: updated_line_items,
      subtotal,
      grand_total,
    });
    
    setNewLineItem({ item: '', quantity: 1, unit_price: 0, total: 0 });
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    const updated_line_items = custom_invoice_data.line_items.filter((_, i) => i !== index);
    const subtotal = updated_line_items.reduce((sum, item) => sum + item.total, 0);
    const grand_total = subtotal - custom_invoice_data.discount_amount + (custom_invoice_data.delivery_fee || 0) + custom_invoice_data.tax_amount;
    
    setCustomInvoiceData({
      ...custom_invoice_data,
      line_items: updated_line_items,
      subtotal,
      grand_total,
    });
  };

  // Recalculate totals when discount, delivery fee, or tax changes
  const recalculateTotals = (updates: Partial<CreateInvoiceData>) => {
    const updated_data = { ...custom_invoice_data, ...updates };
    const subtotal = updated_data.line_items.reduce((sum, item) => sum + item.total, 0);
    const grand_total = subtotal - updated_data.discount_amount + (updated_data.delivery_fee || 0) + updated_data.tax_amount;
    
    setCustomInvoiceData({
      ...updated_data,
      subtotal,
      grand_total,
    });
  };

  // Handle custom invoice submit
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (custom_invoice_data.line_items.length === 0) {
      alert('Please add at least one line item');
      return;
    }
    
    if (!custom_invoice_data.customer_name || !custom_invoice_data.customer_email || !custom_invoice_data.customer_phone) {
      alert('Please fill in all required customer information');
      return;
    }
    
    createInvoiceMutation.mutate(custom_invoice_data);
  };

  // Update URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    
    if (filter_status !== 'all') {
      params.status = filter_status;
    }
    
    if (date_range_filter !== 'all_time') {
      params.date_range = date_range_filter;
    }
    
    if (customer_search_query) {
      params.customer_search = customer_search_query;
    }
    
    setSearchParams(params);
  }, [filter_status, date_range_filter, customer_search_query, setSearchParams]);

  // Total pages
  const total_pages = Math.ceil((invoices_data?.total || 0) / items_per_page);

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage invoices, track payments, and generate custom billing
            </p>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Payment Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  id="status-filter"
                  value={filter_status}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  id="date-range-filter"
                  value={date_range_filter}
                  onChange={(e) => {
                    setDateRangeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all_time">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                </select>
              </div>

              {/* Customer Search */}
              <div className="md:col-span-2">
                <label htmlFor="customer-search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Customer
                </label>
                <input
                  id="customer-search"
                  type="text"
                  value={customer_search_query}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, email, or phone..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setCustomInvoiceFormOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Custom Invoice
              </button>
              
              <button
                onClick={handleExportCSV}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center border border-gray-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to CSV
              </button>
              
              <button
                onClick={() => refetchInvoices()}
                disabled={loading_invoices}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center border border-gray-300 disabled:opacity-50"
              >
                <svg className={`w-5 h-5 mr-2 ${loading_invoices ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          {loading_invoices ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading invoices...</span>
              </div>
            </div>
          ) : invoices_error ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Invoices</h3>
                <p className="text-gray-600 mb-4">Failed to load invoices. Please try again.</p>
                <button
                  onClick={() => refetchInvoices()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !invoices_data?.invoices || invoices_data.invoices.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Found</h3>
                <p className="text-gray-600 mb-4">
                  {customer_search_query || filter_status !== 'all' || date_range_filter !== 'all_time'
                    ? 'No invoices match your current filters.'
                    : 'No invoices have been created yet.'}
                </p>
                <button
                  onClick={() => setCustomInvoiceFormOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Create First Invoice
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issue Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices_data.invoices.map((invoice) => (
                        <tr key={invoice.invoice_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              to={`/admin/invoices/${invoice.invoice_id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              {invoice.invoice_number}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.customer_name || 'Unknown customer'}
                              {!invoice.user_id && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  Guest
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{invoice.customer_email || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(invoice.issue_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.grand_total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(invoice.payment_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <Link
                                to={`/admin/invoices/${invoice.invoice_id}`}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View
                              </Link>
                              {invoice.payment_status === 'pending' && (
                                <button
                                  onClick={() => sendInvoiceMutation.mutate(invoice.invoice_id)}
                                  disabled={sendInvoiceMutation.isPending}
                                  className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                >
                                  Send
                                </button>
                              )}
                              {invoice.invoice_pdf_url && (
                                <a
                                  href={invoice.invoice_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 hover:text-gray-700 font-medium"
                                >
                                  PDF
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {total_pages > 1 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{offset + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(offset + items_per_page, invoices_data?.total || 0)}
                      </span>{' '}
                      of <span className="font-medium">{invoices_data?.total || 0}</span> invoices
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, current_page - 1))}
                        disabled={current_page === 1}
                        className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {current_page} of {total_pages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(total_pages, current_page + 1))}
                        disabled={current_page === total_pages}
                        className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Custom Invoice Form Modal */}
      {custom_invoice_form_open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white md:rounded-lg shadow-xl w-full md:max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center md:rounded-t-lg">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Create Custom Invoice</h2>
              <button
                type="button"
                onClick={() => {
                  setCustomInvoiceFormOpen(false);
                  resetCustomInvoiceForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
              <form id="create-invoice-form" onSubmit={handleCreateInvoice} className="space-y-8">
                {/* Customer Details Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Customer Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={custom_invoice_data.customer_name}
                        onChange={(e) => setCustomInvoiceData({ ...custom_invoice_data, customer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={custom_invoice_data.customer_email}
                        onChange={(e) => setCustomInvoiceData({ ...custom_invoice_data, customer_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={custom_invoice_data.customer_phone}
                        onChange={(e) => setCustomInvoiceData({ ...custom_invoice_data, customer_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="+353 1 234 5678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={custom_invoice_data.customer_address || ''}
                        onChange={(e) => setCustomInvoiceData({ ...custom_invoice_data, customer_address: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="123 Main Street, Dublin"
                      />
                    </div>
                  </div>
                </div>

                {/* Invoice Details Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Invoice Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Issue Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={custom_invoice_data.issue_date}
                        onChange={(e) => setCustomInvoiceData({ ...custom_invoice_data, issue_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={custom_invoice_data.due_date || ''}
                        onChange={(e) => setCustomInvoiceData({ ...custom_invoice_data, due_date: e.target.value || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Internal)</label>
                      <textarea
                        rows={3}
                        value={custom_invoice_data.notes || ''}
                        onChange={(e) => setCustomInvoiceData({ ...custom_invoice_data, notes: e.target.value || null })}
                        placeholder="Add any internal notes about this invoice..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Line Items Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Line Items
                    {custom_invoice_data.line_items.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        {custom_invoice_data.line_items.length}
                      </span>
                    )}
                  </h3>
                  
                  {/* Add Line Item Form */}
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Item</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Description</label>
                        <input
                          type="text"
                          value={new_line_item.item}
                          onChange={(e) => setNewLineItem({ ...new_line_item, item: e.target.value })}
                          placeholder="e.g., Catering Service, Consultation Fee"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={new_line_item.quantity}
                            onChange={(e) => setNewLineItem({ ...new_line_item, quantity: Math.max(1, Number(e.target.value)) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (€)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={new_line_item.unit_price}
                            onChange={(e) => setNewLineItem({ ...new_line_item, unit_price: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      disabled={!new_line_item.item.trim() || new_line_item.quantity < 1 || new_line_item.unit_price < 0}
                      className="mt-3 w-full md:w-auto bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Line Item
                    </button>
                  </div>

                  {/* Line Items List */}
                  {custom_invoice_data.line_items.length > 0 ? (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {custom_invoice_data.line_items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{item.item}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(item.total)}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLineItem(index)}
                                    className="text-red-600 hover:text-red-700 transition-colors"
                                    aria-label="Remove item"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3">
                        {custom_invoice_data.line_items.map((item, index) => (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.item}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(index)}
                                className="text-red-600 hover:text-red-700 ml-2"
                                aria-label="Remove item"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Qty:</span>
                                <p className="font-medium text-gray-900">{item.quantity}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Price:</span>
                                <p className="font-medium text-gray-900">{formatCurrency(item.unit_price)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Total:</span>
                                <p className="font-medium text-gray-900">{formatCurrency(item.total)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 text-sm">No line items added yet</p>
                      <p className="text-gray-400 text-xs mt-1">Add at least one item to continue</p>
                    </div>
                  )}
                </div>

                {/* Totals Summary Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Totals Summary
                  </h3>

                  {/* Optional Charges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={custom_invoice_data.delivery_fee || 0}
                        onChange={(e) => recalculateTotals({ delivery_fee: Number(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax/VAT (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={custom_invoice_data.tax_amount}
                        onChange={(e) => recalculateTotals({ tax_amount: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={custom_invoice_data.discount_amount}
                        onChange={(e) => recalculateTotals({ discount_amount: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(custom_invoice_data.subtotal)}</span>
                    </div>
                    
                    {custom_invoice_data.delivery_fee && custom_invoice_data.delivery_fee > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">Delivery Fee</span>
                        <span className="font-medium text-gray-900">{formatCurrency(custom_invoice_data.delivery_fee)}</span>
                      </div>
                    )}
                    
                    {custom_invoice_data.tax_amount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">Tax/VAT</span>
                        <span className="font-medium text-gray-900">{formatCurrency(custom_invoice_data.tax_amount)}</span>
                      </div>
                    )}
                    
                    {custom_invoice_data.discount_amount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">Discount</span>
                        <span className="font-medium text-red-600">-{formatCurrency(custom_invoice_data.discount_amount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-3 border-t-2 border-orange-200">
                      <span className="text-base font-bold text-gray-900">Grand Total</span>
                      <span className="text-xl font-bold text-orange-600">{formatCurrency(custom_invoice_data.grand_total)}</span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 md:px-6 py-4 md:rounded-b-lg">
              <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3">
                <div className="text-xs md:text-sm text-gray-500">
                  {custom_invoice_data.line_items.length === 0 ? (
                    <span className="text-red-600 font-medium">⚠️ Add at least one line item to continue</span>
                  ) : (
                    <span>
                      {custom_invoice_data.line_items.length} item{custom_invoice_data.line_items.length !== 1 ? 's' : ''} • 
                      Total: <span className="font-semibold">{formatCurrency(custom_invoice_data.grand_total)}</span>
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInvoiceFormOpen(false);
                      resetCustomInvoiceForm();
                    }}
                    className="flex-1 md:flex-none px-4 md:px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="create-invoice-form"
                    disabled={createInvoiceMutation.isPending || custom_invoice_data.line_items.length === 0}
                    className="flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {createInvoiceMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Create Invoice
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminInvoices;