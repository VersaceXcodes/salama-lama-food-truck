import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  XCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  RefreshCw,
  Ban,
  Save,
  Printer,
  ArrowLeft,
  AlertCircle,
  DollarSign,
  CreditCard,
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface OrderItem {
  order_item_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  selected_customizations: Record<string, any> | null;
  line_total: number;
}

interface StatusHistoryEntry {
  history_id: string;
  status: string;
  changed_by_user_id: string;
  changed_at: string;
  notes: string | null;
}

interface OrderDetails {
  order_id: string;
  order_number: string;
  user_id: string;
  order_type: 'collection' | 'delivery';
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  collection_time_slot: string | null;
  delivery_address_snapshot: Record<string, any> | null;
  items: OrderItem[];
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number | null;
  tax_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method_type: string | null;
  sumup_transaction_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status_history: StatusHistoryEntry[];
  special_instructions: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
}

interface UpdateStatusPayload {
  status: string;
  internal_notes?: string;
}

interface RefundPayload {
  refund_amount: number;
  refund_reason: string;
}

interface CancelPayload {
  cancellation_reason: string;
  issue_refund: boolean;
}

// ===========================
// API Base URL Configuration
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ===========================
// API Functions
// ===========================

const fetchOrderDetails = async (order_id: string, token: string): Promise<OrderDetails> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/admin/orders/${order_id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const updateOrderStatus = async (
  order_id: string,
  payload: UpdateStatusPayload,
  token: string
): Promise<OrderDetails> => {
  const response = await axios.put(
    `${API_BASE_URL}/api/admin/orders/${order_id}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const refundOrder = async (
  order_id: string,
  payload: RefundPayload,
  token: string
): Promise<OrderDetails> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/admin/orders/${order_id}/refund`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const cancelOrder = async (
  order_id: string,
  payload: CancelPayload,
  token: string
): Promise<OrderDetails> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/admin/orders/${order_id}/cancel`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// ===========================
// Utility Functions
// ===========================

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '€0.00';
  return `€${Number(amount).toFixed(2)}`;
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800 border-blue-200',
    preparing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ready: 'bg-green-100 text-green-800 border-green-200',
    out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getPaymentStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    refunded: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusIcon = (status: string) => {
  const statusIcons: Record<string, React.ReactNode> = {
    received: <Clock className="w-5 h-5" />,
    preparing: <Package className="w-5 h-5" />,
    ready: <CheckCircle className="w-5 h-5" />,
    out_for_delivery: <Truck className="w-5 h-5" />,
    completed: <CheckCircle className="w-5 h-5" />,
    cancelled: <XCircle className="w-5 h-5" />,
  };
  return statusIcons[status] || <Clock className="w-5 h-5" />;
};

// ===========================
// Main Component
// ===========================

const UV_AdminOrderDetail: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  
  const queryClient = useQueryClient();

  // Zustand store access - CRITICAL: Individual selectors only
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  // const current_user = useAppStore(state => state.authentication_state.current_user);

  // Local state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [internalNotesInput, setInternalNotesInput] = useState('');
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [issueRefundOnCancel, setIssueRefundOnCancel] = useState(false);

  // Fetch order details
  const {
    data: orderData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<OrderDetails, Error>({
    queryKey: ['adminOrderDetail', order_id],
    queryFn: () => fetchOrderDetails(order_id!, auth_token!),
    enabled: !!order_id && !!auth_token,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Initialize state when data loads
  useEffect(() => {
    if (orderData) {
      setSelectedStatus(orderData.status);
      setInternalNotesInput(orderData.internal_notes || '');
      setRefundAmount(String(orderData.refund_amount || orderData.total_amount));
    }
  }, [orderData]);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (payload: UpdateStatusPayload) =>
      updateOrderStatus(order_id!, payload, auth_token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrderDetail', order_id] });
      alert('Order status updated successfully');
    },
    onError: (error: any) => {
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
    },
  });

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: (payload: RefundPayload) =>
      refundOrder(order_id!, payload, auth_token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrderDetail', order_id] });
      setRefundModalOpen(false);
      setRefundAmount('');
      setRefundReason('');
      alert('Refund processed successfully');
    },
    onError: (error: any) => {
      alert(`Failed to process refund: ${error.response?.data?.message || error.message}`);
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (payload: CancelPayload) =>
      cancelOrder(order_id!, payload, auth_token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrderDetail', order_id] });
      setCancelModalOpen(false);
      setCancelReason('');
      setIssueRefundOnCancel(false);
      alert('Order cancelled successfully');
    },
    onError: (error: any) => {
      alert(`Failed to cancel order: ${error.response?.data?.message || error.message}`);
    },
  });

  // Update internal notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) =>
      updateOrderStatus(order_id!, { status: orderData!.status, internal_notes: notes }, auth_token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrderDetail', order_id] });
      alert('Internal notes saved successfully');
    },
    onError: (error: any) => {
      alert(`Failed to save notes: ${error.response?.data?.message || error.message}`);
    },
  });

  // Event handlers
  const handleStatusUpdate = () => {
    if (selectedStatus !== orderData?.status) {
      updateStatusMutation.mutate({ status: selectedStatus });
    }
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }
    
    if (orderData && amount > orderData.total_amount) {
      alert('Refund amount cannot exceed order total');
      return;
    }
    
    if (!refundReason.trim()) {
      alert('Please provide a refund reason');
      return;
    }
    
    refundMutation.mutate({
      refund_amount: amount,
      refund_reason: refundReason.trim(),
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }
    
    cancelMutation.mutate({
      cancellation_reason: cancelReason.trim(),
      issue_refund: issueRefundOnCancel,
    });
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(internalNotesInput);
  };

  const handlePrintTicket = () => {
    window.print();
  };

  // Memoized calculations
  const canRefund = useMemo(() => {
    if (!orderData) return false;
    return orderData.payment_status === 'paid' && 
           orderData.status !== 'cancelled' && 
           !orderData.refund_amount;
  }, [orderData]);

  const canCancel = useMemo(() => {
    if (!orderData) return false;
    return orderData.status !== 'completed' && orderData.status !== 'cancelled';
  }, [orderData]);

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading order details...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (isError || !orderData) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Order</h2>
              <p className="text-gray-600 mb-6">
                {error?.message || 'Failed to load order details. Please try again.'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => refetch()}
                  className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Retry
                </button>
                <Link
                  to="/admin/orders"
                  className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back to Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to="/admin/orders"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Back to orders"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Order #{orderData.order_number}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Order ID: {orderData.order_id}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg border flex items-center space-x-2 ${getStatusColor(orderData.status)}`}>
                  {getStatusIcon(orderData.status)}
                  <span className="font-semibold capitalize">
                    {orderData.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrintTicket}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <Printer className="w-5 h-5" />
                  <span>Print</span>
                </button>
                
                {canRefund && (
                  <button
                    onClick={() => setRefundModalOpen(true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Refund</span>
                  </button>
                )}
                
                {canCancel && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Ban className="w-5 h-5" />
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-lg">
                            {orderData.customer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <Link
                            to={`/admin/customers/${orderData.user_id}`}
                            className="text-lg font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {orderData.customer_name}
                          </Link>
                          <p className="text-sm text-gray-500">Customer ID: {orderData.user_id}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pl-15">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <a 
                            href={`mailto:${orderData.customer_email}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {orderData.customer_email}
                          </a>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-700">
                          <Phone className="w-5 h-5 text-gray-400" />
                          <a 
                            href={`tel:${orderData.customer_phone}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {orderData.customer_phone}
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <a
                        href={`mailto:${orderData.customer_email}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center text-sm"
                      >
                        Send Email
                      </a>
                      <a
                        href={`tel:${orderData.customer_phone}`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-center text-sm"
                      >
                        Call Customer
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Type & Details */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Order Type</p>
                      <p className="text-base font-semibold text-gray-900 capitalize">
                        {orderData.order_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Created At</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatDateTime(orderData.created_at)}
                      </p>
                    </div>
                  </div>

                  {orderData.order_type === 'collection' && orderData.collection_time_slot && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-500 mb-1">Collection Time</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatDateTime(orderData.collection_time_slot)}
                      </p>
                    </div>
                  )}

                  {orderData.order_type === 'delivery' && orderData.delivery_address_snapshot && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-500 mb-2 flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>Delivery Address</span>
                      </p>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                        <p className="text-base font-semibold text-gray-900">
                          {orderData.delivery_address_snapshot.address_line1}
                        </p>
                        {orderData.delivery_address_snapshot.address_line2 && (
                          <p className="text-sm text-gray-700">
                            {orderData.delivery_address_snapshot.address_line2}
                          </p>
                        )}
                        <p className="text-sm text-gray-700">
                          {orderData.delivery_address_snapshot.city}, {orderData.delivery_address_snapshot.postal_code}
                        </p>
                        {orderData.delivery_address_snapshot.delivery_instructions && (
                          <p className="text-sm text-gray-600 italic mt-2 border-t border-gray-200 pt-2">
                            Instructions: {orderData.delivery_address_snapshot.delivery_instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {orderData.special_instructions && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-500 mb-2 flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Special Instructions</span>
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-gray-900">{orderData.special_instructions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Order Items</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orderData.items.map((item) => (
                        <tr key={item.order_item_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{item.item_name}</p>
                              {item.selected_customizations && Object.keys(item.selected_customizations).length > 0 && (
                                <div className="mt-1 text-sm text-gray-600 space-y-1">
                                  {Object.entries(item.selected_customizations).map(([key, value]) => (
                                    <p key={key} className="italic">
                                      {key}: {JSON.stringify(value)}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full font-semibold text-gray-900">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-900 font-medium">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-900 font-semibold">
                            {formatCurrency(item.line_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pricing Summary */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-3 max-w-md ml-auto">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(orderData.subtotal)}</span>
                    </div>
                    
                    {orderData.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>
                          Discount {orderData.discount_code && `(${orderData.discount_code})`}:
                        </span>
                        <span className="font-medium">-{formatCurrency(orderData.discount_amount)}</span>
                      </div>
                    )}
                    
                    {orderData.delivery_fee !== null && orderData.delivery_fee > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Delivery Fee:</span>
                        <span className="font-medium">{formatCurrency(orderData.delivery_fee)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-700">
                      <span>Tax (VAT):</span>
                      <span className="font-medium">{formatCurrency(orderData.tax_amount)}</span>
                    </div>
                    
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-300">
                      <span>Total:</span>
                      <span>{formatCurrency(orderData.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-teal-50 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Payment Information</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                      <div className={`inline-flex px-3 py-1 rounded-lg border font-semibold text-sm ${getPaymentStatusColor(orderData.payment_status)}`}>
                        {orderData.payment_status.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                      <p className="text-base font-semibold text-gray-900 capitalize flex items-center space-x-2">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <span>{orderData.payment_method_type || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {orderData.sumup_transaction_id && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-500 mb-1">Transaction ID</p>
                      <p className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded">
                        {orderData.sumup_transaction_id}
                      </p>
                    </div>
                  )}

                  {orderData.refund_amount && (
                    <div className="border-t border-gray-200 pt-4 bg-yellow-50 -mx-6 -mb-6 px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-yellow-900">Refund Amount:</p>
                          <p className="text-lg font-bold text-yellow-900">
                            {formatCurrency(orderData.refund_amount)}
                          </p>
                        </div>
                        {orderData.refund_reason && (
                          <div>
                            <p className="text-sm text-yellow-800 mb-1">Reason:</p>
                            <p className="text-sm text-yellow-900 italic">{orderData.refund_reason}</p>
                          </div>
                        )}
                        {orderData.refunded_at && (
                          <p className="text-xs text-yellow-700">
                            Refunded at: {formatDateTime(orderData.refunded_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {orderData.cancelled_at && orderData.cancellation_reason && (
                    <div className="border-t border-gray-200 pt-4 bg-red-50 -mx-6 -mb-6 px-6 py-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-red-900">Cancellation Reason:</p>
                        <p className="text-sm text-red-900 italic">{orderData.cancellation_reason}</p>
                        <p className="text-xs text-red-700">
                          Cancelled at: {formatDateTime(orderData.cancelled_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Status & Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Status Management */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden sticky top-6">
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Manage Status</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Update Order Status
                    </label>
                    <select
                      id="status-select"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      disabled={orderData.status === 'completed' || orderData.status === 'cancelled'}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="received">Received</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready for Collection</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <button
                    onClick={handleStatusUpdate}
                    disabled={
                      selectedStatus === orderData.status ||
                      updateStatusMutation.isPending ||
                      orderData.status === 'completed' ||
                      orderData.status === 'cancelled'
                    }
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {updateStatusMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Update Status</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status History */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Status History</h3>
                  <div className="space-y-3">
                    {orderData.status_history.map((entry, index) => (
                      <div 
                        key={entry.history_id}
                        className={`relative pl-6 ${index !== orderData.status_history.length - 1 ? 'pb-3 border-l-2 border-gray-300' : ''}`}
                      >
                        <div className="absolute left-0 top-0 w-3 h-3 bg-blue-600 rounded-full -translate-x-[7px]"></div>
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(entry.status)}`}>
                              {entry.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(entry.changed_at)}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-gray-600 mt-2 italic">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Internal Notes</h2>
                  <p className="text-xs text-gray-500 mt-1">Admin-only notes (not visible to customer)</p>
                </div>
                <div className="p-6 space-y-4">
                  <textarea
                    value={internalNotesInput}
                    onChange={(e) => setInternalNotesInput(e.target.value)}
                    placeholder="Add internal notes about this order..."
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 resize-none"
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={updateNotesMutation.isPending}
                    className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {updateNotesMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save Notes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Modal */}
        {refundModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Process Refund</h3>
              </div>
              <form onSubmit={handleRefundSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount (€)
                  </label>
                  <input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={orderData.total_amount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500"
                    placeholder="Enter refund amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Order total: {formatCurrency(orderData.total_amount)}
                  </p>
                </div>

                <div>
                  <label htmlFor="refund-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Reason
                  </label>
                  <textarea
                    id="refund-reason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 resize-none"
                    placeholder="Explain reason for refund..."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    <strong>Warning:</strong> This action will process a refund through the payment system and cannot be undone.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setRefundModalOpen(false);
                      setRefundAmount('');
                      setRefundReason('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={refundMutation.isPending}
                    className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {refundMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-5 h-5" />
                        <span>Process Refund</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {cancelModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
              </div>
              <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Reason
                  </label>
                  <textarea
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-500 resize-none"
                    placeholder="Explain reason for cancellation..."
                  />
                </div>

                {orderData.payment_status === 'paid' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={issueRefundOnCancel}
                        onChange={(e) => setIssueRefundOnCancel(e.target.checked)}
                        className="mt-1 w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Issue refund</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Automatically refund {formatCurrency(orderData.total_amount)} to customer
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900">
                    <strong>Warning:</strong> Cancelling this order cannot be undone. The customer will be notified.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModalOpen(false);
                      setCancelReason('');
                      setIssueRefundOnCancel(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={cancelMutation.isPending}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-5 h-5" />
                        <span>Cancel Order</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminOrderDetail;