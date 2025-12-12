import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ArrowLeft, 
  Printer, 
  Phone, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp
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
  status: string;
  changed_at: string;
  changed_by_user_id: string;
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
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  status_history: OrderStatusHistory[];
}

interface UpdateStatusPayload {
  order_id: string;
  status: 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  notes?: string;
}

// ===========================
// API Functions
// ===========================

const fetchOrderDetails = async (order_id: string, auth_token: string): Promise<Order> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/orders/${order_id}`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return {
    ...response.data,
    status_history: response.data.status_history || []
  };
};

const updateOrderStatus = async (payload: UpdateStatusPayload, auth_token: string): Promise<Order> => {
  const { order_id, ...body } = payload;
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/orders/${order_id}/status`,
    body,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return {
    ...response.data,
    status_history: response.data.status_history || []
  };
};

// ===========================
// Utility Functions
// ===========================

const formatCurrency = (amount: number): string => {
  return `€${Number(amount || 0).toFixed(2)}`;
};

const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const formatDateTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'received': return 'bg-gray-100 text-gray-800';
    case 'preparing': return 'bg-yellow-100 text-yellow-800';
    case 'ready': return 'bg-green-100 text-green-800';
    case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'received': return 'Received';
    case 'preparing': return 'Preparing';
    case 'ready': return 'Ready for Collection';
    case 'out_for_delivery': return 'Out for Delivery';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'refunded': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// ===========================
// Main Component
// ===========================

const UV_StaffOrderDetail: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand state - CRITICAL: Individual selectors, no object destructuring
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  // const current_user = useAppStore(state => state.authentication_state.current_user);
  const socket = useAppStore(state => state.websocket_state.socket);
  const add_notification = useAppStore(state => state.add_notification);

  // Local state
  const [show_status_history, set_show_status_history] = useState(false);
  const [status_notes, set_status_notes] = useState('');

  // Data fetching with React Query
  const {
    data: order_details,
    isLoading: loading_state,
    error: query_error,
    refetch: refetch_order
  } = useQuery({
    queryKey: ['staff-order-detail', order_id],
    queryFn: () => fetchOrderDetails(order_id!, auth_token!),
    enabled: !!order_id && !!auth_token,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 1
  });

  const error_message = query_error ? (query_error as any).response?.data?.message || (query_error as any).message || 'Failed to load order' : null;

  // Status update mutation
  const status_update_mutation = useMutation({
    mutationFn: (payload: UpdateStatusPayload) => updateOrderStatus(payload, auth_token!),
    onSuccess: (data) => {
      queryClient.setQueryData(['staff-order-detail', order_id], data);
      add_notification({
        type: 'order_status_update',
        message: `Order status updated to ${getStatusLabel(data.status)}`
      });
      set_status_notes('');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update status';
      add_notification({
        type: 'error',
        message: errorMsg
      });
    }
  });

  const status_update_loading = status_update_mutation.isPending;

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket || !order_id) return;

    const handleOrderStatusUpdate = (data: any) => {
      if (data.data.order_id === order_id) {
        refetch_order();
        add_notification({
          type: 'order_status_update',
          message: `Order status updated by ${data.data.changed_by_name || 'another staff member'}`
        });
      }
    };

    socket.on('order_status_updated', handleOrderStatusUpdate);

    return () => {
      socket.off('order_status_updated', handleOrderStatusUpdate);
    };
  }, [socket, order_id, refetch_order, add_notification]);

  // Navigation handlers
  const handle_back = () => {
    navigate('/staff/orders');
  };

  const handle_contact_customer = () => {
    if (order_details?.customer_phone) {
      window.location.href = `tel:${order_details.customer_phone}`;
    }
  };

  // Print kitchen ticket
  const handle_print_ticket = () => {
    if (!order_details) return;

    const print_content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kitchen Ticket - ${order_details.order_number}</title>
        <style>
          @media print {
            @page { margin: 0.5cm; }
            body { 
              font-family: monospace; 
              font-size: 12pt; 
              line-height: 1.4;
              color: #000;
            }
          }
          body {
            font-family: monospace;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .order-number {
            font-size: 24pt;
            font-weight: bold;
            margin: 10px 0;
          }
          .section {
            margin: 15px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .item {
            margin: 10px 0;
          }
          .item-name {
            font-weight: bold;
            font-size: 14pt;
          }
          .customization {
            margin-left: 20px;
            font-size: 11pt;
          }
          .instructions {
            border: 2px solid #000;
            padding: 10px;
            margin: 15px 0;
            font-weight: bold;
          }
          .phone {
            font-size: 14pt;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>SALAMA LAMA FOOD TRUCK</div>
          <div class="order-number">#${order_details.order_number}</div>
        </div>
        
        <div class="section">
          <div><strong>TYPE:</strong> ${order_details.order_type.toUpperCase()}</div>
          ${order_details.order_type === 'collection' && order_details.collection_time_slot 
            ? `<div><strong>TIME:</strong> ${formatDateTime(order_details.collection_time_slot)}</div>`
            : ''}
          ${order_details.order_type === 'delivery' && order_details.delivery_address_snapshot
            ? `<div><strong>ADDRESS:</strong> ${order_details.delivery_address_snapshot.address_line1}, ${order_details.delivery_address_snapshot.city}</div>`
            : ''}
        </div>
        
        <div class="section">
          <div><strong>ITEMS:</strong></div>
          ${order_details.items.map(item => `
            <div class="item">
              <div class="item-name">${item.quantity}x ${item.item_name}</div>
              ${item.selected_customizations ? Object.entries(item.selected_customizations).map(([key, value]) => `
                <div class="customization">• ${key}: ${value}</div>
              `).join('') : ''}
            </div>
          `).join('')}
        </div>
        
        ${order_details.special_instructions ? `
          <div class="instructions">
            <div><strong>SPECIAL INSTRUCTIONS:</strong></div>
            <div>${order_details.special_instructions}</div>
          </div>
        ` : ''}
        
        <div class="section">
          <div class="phone">Customer: ${order_details.customer_phone}</div>
          <div><strong>Received:</strong> ${formatDateTime(order_details.created_at)}</div>
        </div>
      </body>
      </html>
    `;

    const print_window = window.open('', '_blank');
    if (print_window) {
      print_window.document.write(print_content);
      print_window.document.close();
      print_window.focus();
      setTimeout(() => {
        print_window.print();
        print_window.close();
      }, 250);
    }
  };

  // Status update handler
  const handle_status_update = (new_status: 'preparing' | 'ready' | 'out_for_delivery' | 'completed') => {
    if (!order_details) return;

    status_update_mutation.mutate({
      order_id: order_details.order_id,
      status: new_status,
      notes: status_notes.trim() || undefined
    });
  };

  // Determine next status button
  const get_next_status_button = () => {
    if (!order_details) return null;

    const current_status = order_details.status;

    if (current_status === 'received') {
      return (
        <button
          onClick={() => handle_status_update('preparing')}
          disabled={status_update_loading}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {status_update_loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Updating...</span>
            </>
          ) : (
            <span>Start Preparing</span>
          )}
        </button>
      );
    }

    if (current_status === 'preparing') {
      return (
        <button
          onClick={() => handle_status_update(order_details.order_type === 'delivery' ? 'out_for_delivery' : 'ready')}
          disabled={status_update_loading}
          className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {status_update_loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Updating...</span>
            </>
          ) : (
            <span>{order_details.order_type === 'delivery' ? 'Mark Out for Delivery' : 'Mark as Ready'}</span>
          )}
        </button>
      );
    }

    if (current_status === 'ready' || current_status === 'out_for_delivery') {
      return (
        <button
          onClick={() => handle_status_update('completed')}
          disabled={status_update_loading}
          className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {status_update_loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Updating...</span>
            </>
          ) : (
            <span>Mark as Completed</span>
          )}
        </button>
      );
    }

    return null;
  };

  // Status timeline component
  const StatusTimeline: React.FC<{ current_status: string; order_type: string }> = ({ current_status, order_type }) => {
    const statuses = order_type === 'delivery'
      ? ['received', 'preparing', 'out_for_delivery', 'completed']
      : ['received', 'preparing', 'ready', 'completed'];

    const status_labels = {
      'received': 'Received',
      'preparing': 'Preparing',
      'ready': 'Ready',
      'out_for_delivery': 'Out for Delivery',
      'completed': 'Completed'
    };

    const current_index = statuses.indexOf(current_status);

    return (
      <div className="flex items-center justify-between w-full">
        {statuses.map((status, index) => {
          const is_current = status === current_status;
          const is_past = index < current_index;

          return (
            <React.Fragment key={status}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                  is_current ? 'bg-blue-600 text-white scale-110' :
                  is_past ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {is_past ? <CheckCircle className="w-5 h-5" /> : <div className="w-3 h-3 rounded-full bg-current"></div>}
                </div>
                <span className={`text-xs mt-2 text-center ${
                  is_current ? 'text-blue-700 font-semibold' :
                  is_past ? 'text-green-700 font-medium' :
                  'text-gray-400'
                }`}>
                  {status_labels[status as keyof typeof status_labels]}
                </span>
              </div>
              {index < statuses.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded transition-all duration-200 ${
                  index < current_index ? 'bg-green-600' : 'bg-gray-200'
                }`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Loading state
  if (loading_state) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading order details...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error_message || !order_details) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Order</h3>
                  <p className="text-red-700 mb-4">{error_message || 'Order not found'}</p>
                  <Link
                    to="/staff/orders"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Order Queue
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handle_back}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Back to order queue"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Order Number</div>
                  <h1 className="text-2xl font-bold text-gray-900">#{order_details.order_number}</h1>
                </div>
              </div>
              <button
                onClick={handle_print_ticket}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ticket</span>
              </button>
            </div>

            {/* Status Badge and Timeline */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order_details.status)}`}>
                  {getStatusLabel(order_details.status)}
                </span>
                <span className="text-sm text-gray-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatRelativeTime(order_details.created_at)}
                </span>
              </div>
              <StatusTimeline current_status={order_details.status} order_type={order_details.order_type} />
            </div>
          </div>

          {/* Customer Contact Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="text-base font-medium text-gray-900">{order_details.customer_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <button
                  onClick={handle_contact_customer}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{order_details.customer_phone}</span>
                </button>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="text-base text-gray-700">{order_details.customer_email}</div>
              </div>
            </div>
          </div>

          {/* Order Type & Timing Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  order_details.order_type === 'collection' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {order_details.order_type.toUpperCase()}
                </span>
              </div>
              
              {order_details.order_type === 'collection' && order_details.collection_time_slot && (
                <div className="flex items-start space-x-3 bg-blue-50 p-4 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Collection Time</div>
                    <div className="text-lg font-bold text-blue-700">{formatDateTime(order_details.collection_time_slot)}</div>
                  </div>
                </div>
              )}

              {order_details.order_type === 'delivery' && order_details.delivery_address_snapshot && (
                <div className="flex items-start space-x-3 bg-blue-50 p-4 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-900 mb-1">Delivery Address</div>
                    <div className="text-base text-blue-800">
                      {order_details.delivery_address_snapshot.address_line1}
                      {order_details.delivery_address_snapshot.address_line2 && `, ${order_details.delivery_address_snapshot.address_line2}`}
                    </div>
                    <div className="text-base text-blue-800">
                      {order_details.delivery_address_snapshot.city}, {order_details.delivery_address_snapshot.postal_code}
                    </div>
                    {order_details.delivery_address_snapshot.delivery_instructions && (
                      <div className="mt-2 text-sm text-blue-700 italic">
                        Note: {order_details.delivery_address_snapshot.delivery_instructions}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Items Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-6">
              {order_details.items.map((item) => (
                <div key={item.order_item_id} className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-lg font-bold text-gray-900">
                        {item.quantity}× {item.item_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(item.unit_price)} each
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(item.line_total)}
                    </div>
                  </div>

                  {/* Customizations - HIGHLIGHTED */}
                  {item.selected_customizations && Object.keys(item.selected_customizations).length > 0 && (
                    <div className="mt-3 bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                      <div className="text-sm font-semibold text-orange-900 mb-2">Customizations:</div>
                      <div className="space-y-1">
                        {Object.entries(item.selected_customizations).map(([key, value]) => (
                          <div key={key} className="text-sm font-medium text-orange-800">
                            • {key}: <span className="font-bold">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions - PROMINENTLY DISPLAYED */}
          {order_details.special_instructions && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-yellow-900 mb-2">Special Instructions</h3>
                  <p className="text-base font-medium text-yellow-800 leading-relaxed">
                    {order_details.special_instructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(order_details.subtotal)}</span>
              </div>
              
              {order_details.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {order_details.discount_code && `(${order_details.discount_code})`}</span>
                  <span className="font-medium">-{formatCurrency(order_details.discount_amount)}</span>
                </div>
              )}
              
              {order_details.delivery_fee && order_details.delivery_fee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Delivery Fee</span>
                  <span className="font-medium">{formatCurrency(order_details.delivery_fee)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-gray-700">
                <span>Tax (VAT)</span>
                <span className="font-medium">{formatCurrency(order_details.tax_amount)}</span>
              </div>
              
              <div className="pt-3 border-t-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(order_details.total_amount)}</span>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Payment Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(order_details.payment_status)}`}>
                    {order_details.payment_status.toUpperCase()}
                  </span>
                </div>
                {order_details.payment_method_type && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500">Payment Method</span>
                    <span className="text-sm font-medium text-gray-700">{order_details.payment_method_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Update Controls */}
          {order_details.status !== 'completed' && order_details.status !== 'cancelled' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Order Status</h2>
              
              <div className="space-y-4">
                {/* Optional status notes */}
                <div>
                  <label htmlFor="status_notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="status_notes"
                    value={status_notes}
                    onChange={(e) => set_status_notes(e.target.value)}
                    placeholder="Add any notes about this status update..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status update button */}
                <div>
                  {get_next_status_button()}
                </div>
              </div>
            </div>
          )}

          {/* Status History */}
          {order_details.status_history.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => set_show_status_history(!show_status_history)}
                className="flex items-center justify-between w-full text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900">Status History</h2>
                {show_status_history ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {show_status_history && (
                <div className="mt-4 space-y-4">
                  {order_details.status_history.map((history) => (
                    <div key={history.history_id} className="flex items-start space-x-3 border-l-2 border-gray-300 pl-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(history.status)}`}>
                            {getStatusLabel(history.status)}
                          </span>
                          <span className="text-sm text-gray-500">{formatRelativeTime(history.changed_at)}</span>
                        </div>
                        {history.notes && (
                          <p className="mt-1 text-sm text-gray-600 italic">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_StaffOrderDetail;