import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Download, 
  ShoppingCart, 
  XCircle, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Truck,
  ChefHat
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

interface OrderStatusHistory {
  history_id: string;
  order_id: string;
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  changed_by_user_id: string;
  changed_at: string;
  notes: string | null;
}

interface Order {
  order_id: string;
  order_number: string;
  user_id: string;
  order_type: 'collection' | 'delivery';
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  collection_time_slot: string | null;
  delivery_address_snapshot: Record<string, any> | null;
  delivery_fee: number | null;
  estimated_delivery_time: string | null;
  items: OrderItem[];
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method_type: string | null;
  sumup_transaction_id: string | null;
  invoice_url: string | null;
  loyalty_points_awarded: number;
  special_instructions: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  status_history: OrderStatusHistory[];
}

interface CancelOrderPayload {
  cancellation_reason: string;
}

interface InvoiceResponse {
  invoice_url: string;
}

// ===========================
// API Functions
// ===========================

const fetchOrderDetails = async (order_id: string, auth_token: string): Promise<Order> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
      },
    }
  );
  return response.data;
};

const cancelOrder = async (
  order_id: string,
  payload: CancelOrderPayload,
  auth_token: string
): Promise<Order> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/cancel`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const fetchOrderInvoice = async (order_id: string, auth_token: string): Promise<InvoiceResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/invoice`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
      },
    }
  );
  return response.data;
};

// ===========================
// Utility Functions
// ===========================

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number): string => {
  return `€${Number(amount || 0).toFixed(2)}`;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    received: 'bg-gray-100 text-gray-800',
    preparing: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-blue-100 text-blue-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    received: 'Received',
    preparing: 'Preparing',
    ready: 'Ready',
    out_for_delivery: 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

const checkCanCancel = (order: Order): boolean => {
  if (order.status !== 'received') return false;
  
  const createdTime = new Date(order.created_at).getTime();
  const currentTime = new Date().getTime();
  const fiveMinutes = 5 * 60 * 1000;
  
  return (currentTime - createdTime) < fiveMinutes;
};

// ===========================
// Main Component
// ===========================

const UV_OrderDetail: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Global state - CRITICAL: Individual selectors
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  // const current_user = useAppStore(state => state.authentication_state.current_user);
  const add_to_cart = useAppStore(state => state.add_to_cart);

  // Local state
  const [show_cancel_modal, setShowCancelModal] = useState(false);
  const [cancellation_reason, setCancellationReason] = useState('');

  // Fetch order details
  const {
    data: order_data,
    isLoading: is_loading,
    isError,
    error,
  } = useQuery({
    queryKey: ['order', order_id],
    queryFn: () => fetchOrderDetails(order_id!, auth_token!),
    enabled: !!order_id && !!auth_token,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });

  // Cancel order mutation
  const cancel_mutation = useMutation({
    mutationFn: (payload: CancelOrderPayload) => cancelOrder(order_id!, payload, auth_token!),
    onSuccess: (updated_order) => {
      queryClient.setQueryData(['order', order_id], updated_order);
      setShowCancelModal(false);
      setCancellationReason('');
    },
  });

  // Computed values
  const can_cancel = order_data ? checkCanCancel(order_data) : false;
  const order_items = order_data?.items || [];
  const status_history = order_data?.status_history || [];

  // Handlers
  const handleDownloadInvoice = useCallback(async () => {
    if (!order_id || !auth_token) return;

    try {
      const response = await fetchOrderInvoice(order_id, auth_token);
      window.open(response.invoice_url, '_blank');
    } catch (error) {
      console.error('Failed to download invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  }, [order_id, auth_token]);

  const handleReorder = useCallback(() => {
    if (!order_data) return;

    // Add all items to cart
    order_data.items.forEach((item) => {
      const customizations = item.selected_customizations
        ? Object.entries(item.selected_customizations).map(([group_name, option]) => ({
            group_name,
            option_name: typeof option === 'string' ? option : (option as any).name || '',
            additional_price: 0, // Can't retrieve from order history
          }))
        : [];

      add_to_cart({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        customizations,
        line_total: item.line_total,
      });
    });

    // Navigate to cart
    navigate('/cart');
  }, [order_data, add_to_cart, navigate]);

  const handleTrackOrder = useCallback(() => {
    navigate(`/orders/${order_id}/track`);
  }, [order_id, navigate]);

  const handleCancelOrder = useCallback(() => {
    if (!cancellation_reason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    cancel_mutation.mutate({ cancellation_reason });
  }, [cancellation_reason, cancel_mutation]);

  // Render loading state
  if (is_loading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="bg-white rounded-xl shadow-lg p-8 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render error state
  if (isError || !order_data) {
    const errorMessage = axios.isAxiosError(error) && error.response?.status === 404
      ? 'Order not found'
      : axios.isAxiosError(error) && error.response?.status === 403
      ? "You don't have permission to view this order"
      : 'Failed to load order details';

    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{errorMessage}</h2>
              <p className="text-gray-600 mb-6">
                {errorMessage === 'Order not found'
                  ? 'The order you are looking for does not exist or may have been deleted.'
                  : 'Please try again or contact support if the problem persists.'}
              </p>
              <Link
                to="/orders"
                className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Status timeline steps
  const timeline_steps = order_data.order_type === 'collection'
    ? ['received', 'preparing', 'ready', 'completed']
    : ['received', 'preparing', 'out_for_delivery', 'completed'];

  const current_step_index = timeline_steps.indexOf(order_data.status);
  const is_cancelled = order_data.status === 'cancelled';

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/orders"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Orders
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Order #{order_data.order_number}
                </h1>
                <p className="text-gray-600 mt-1">
                  Placed on {formatDateTime(order_data.created_at)}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(order_data.status)}`}>
                {getStatusLabel(order_data.status)}
              </span>
            </div>
          </div>

          {/* Status Timeline */}
          {!is_cancelled && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Progress</h2>
              <div className="relative">
                {/* Progress bar */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
                  <div
                    className="h-full bg-orange-600 transition-all duration-500"
                    style={{
                      width: `${((current_step_index + 1) / timeline_steps.length) * 100}%`,
                    }}
                  ></div>
                </div>

                {/* Steps */}
                <div className="relative flex justify-between">
                  {timeline_steps.map((step, index) => {
                    const is_completed = index <= current_step_index;
                    const step_label = getStatusLabel(step);

                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                            is_completed
                              ? 'bg-orange-600 border-orange-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {is_completed ? (
                            <CheckCircle className="h-6 w-6 text-white" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                          )}
                        </div>
                        <span
                          className={`mt-2 text-sm font-medium ${
                            is_completed ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {step_label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Order Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Package className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Order Type</p>
                    <p className="text-base text-gray-900 capitalize">{order_data.order_type}</p>
                  </div>
                </div>

                {order_data.order_type === 'collection' && order_data.collection_time_slot && (
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Collection Time</p>
                      <p className="text-base text-gray-900">
                        {formatDateTime(order_data.collection_time_slot)}
                      </p>
                    </div>
                  </div>
                )}

                {order_data.order_type === 'delivery' && order_data.delivery_address_snapshot && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Delivery Address</p>
                      <p className="text-base text-gray-900">
                        {order_data.delivery_address_snapshot.address_line1}
                        {order_data.delivery_address_snapshot.address_line2 && (
                          <>, {order_data.delivery_address_snapshot.address_line2}</>
                        )}
                      </p>
                      <p className="text-base text-gray-900">
                        {order_data.delivery_address_snapshot.city},{' '}
                        {order_data.delivery_address_snapshot.postal_code}
                      </p>
                      {order_data.delivery_address_snapshot.delivery_instructions && (
                        <p className="text-sm text-gray-600 mt-1">
                          Note: {order_data.delivery_address_snapshot.delivery_instructions}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <a
                      href={`tel:${order_data.customer_phone}`}
                      className="text-base text-orange-600 hover:text-orange-700"
                    >
                      {order_data.customer_phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <a
                      href={`mailto:${order_data.customer_email}`}
                      className="text-base text-orange-600 hover:text-orange-700"
                    >
                      {order_data.customer_email}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {order_data.special_instructions && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-900 mb-1">Special Instructions</p>
                <p className="text-sm text-yellow-800">{order_data.special_instructions}</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order_items.map((item) => (
                <div
                  key={item.order_item_id}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    {item.selected_customizations &&
                      Object.keys(item.selected_customizations).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(item.selected_customizations).map(([group, option]) => (
                            <p key={group} className="text-sm text-gray-600">
                              <span className="font-medium">{group}:</span>{' '}
                              {typeof option === 'string' ? option : (option as any).name || option}
                            </p>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.line_total)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.unit_price)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order_data.subtotal)}</span>
              </div>

              {order_data.discount_code && order_data.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount ({order_data.discount_code})
                  </span>
                  <span>-{formatCurrency(order_data.discount_amount)}</span>
                </div>
              )}

              {order_data.delivery_fee && order_data.delivery_fee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order_data.delivery_fee)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Tax (VAT)</span>
                <span>{formatCurrency(order_data.tax_amount)}</span>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(order_data.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <CreditCard className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Method</p>
                  <p className="text-base text-gray-900">
                    {order_data.payment_method_type || 'Cash on Collection'}
                  </p>
                </div>
              </div>

              {order_data.sumup_transaction_id && (
                <div className="flex items-start">
                  <Package className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Transaction ID</p>
                    <p className="text-base text-gray-900 font-mono text-sm">
                      {order_data.sumup_transaction_id}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Status</p>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                      order_data.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : order_data.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order_data.payment_status === 'refunded'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {order_data.payment_status.charAt(0).toUpperCase() +
                      order_data.payment_status.slice(1)}
                  </span>
                </div>
              </div>

              {order_data.loyalty_points_awarded > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-900">
                    You earned {order_data.loyalty_points_awarded} loyalty points from this order!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status History */}
          {status_history.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
              <div className="space-y-4">
                {status_history
                  .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                  .map((history) => (
                    <div key={history.history_id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(
                            history.status
                          )}`}
                        >
                          {history.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : history.status === 'cancelled' ? (
                            <XCircle className="h-5 w-5" />
                          ) : history.status === 'preparing' ? (
                            <ChefHat className="h-5 w-5" />
                          ) : history.status === 'out_for_delivery' ? (
                            <Truck className="h-5 w-5" />
                          ) : (
                            <Package className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {getStatusLabel(history.status)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDateTime(history.changed_at)}
                        </p>
                        {history.notes && (
                          <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Track Order */}
              {order_data.status !== 'completed' && order_data.status !== 'cancelled' && (
                <button
                  onClick={handleTrackOrder}
                  className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Track Order
                </button>
              )}

              {/* Download Invoice */}
              <button
                onClick={handleDownloadInvoice}
                className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Invoice
              </button>

              {/* Reorder */}
              <button
                onClick={handleReorder}
                className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Reorder
              </button>

              {/* Cancel Order */}
              {can_cancel && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center justify-center px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Cancel
                </button>
              )}
            </div>

            {/* Cancelled Order Notice */}
            {order_data.status === 'cancelled' && order_data.cancellation_reason && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900 mb-1">Cancellation Reason</p>
                <p className="text-sm text-red-800">{order_data.cancellation_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {show_cancel_modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowCancelModal(false)}
            ></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Cancel Order</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-4">
                      Are you sure you want to cancel order #{order_data.order_number}? This action
                      cannot be undone.
                    </p>
                    <div>
                      <label
                        htmlFor="cancellation_reason"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Reason for cancellation <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        id="cancellation_reason"
                        rows={3}
                        value={cancellation_reason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        placeholder="Please tell us why you're cancelling..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    {cancel_mutation.isError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          Failed to cancel order. Please try again or contact support.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancel_mutation.isPending || !cancellation_reason.trim()}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancel_mutation.isPending ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Cancelling...
                    </span>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancel_mutation.isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_OrderDetail;