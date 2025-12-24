import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { toast } from '@/hooks/use-toast';
import { 
  ClipboardList, 
  Clock, 
  Phone, 
  Printer, 
  RefreshCw, 
  Bell, 
  BellOff, 
  List as ListIcon, 
  Columns,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface OrderItem {
  order_item_id: string;
  item_name: string;
  quantity: number;
  selected_customizations: Record<string, any> | null;
}

interface Order {
  order_id: string;
  order_number: string;
  user_id: string;
  order_type: 'collection' | 'delivery';
  status: 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed';
  collection_time_slot: string | null;
  delivery_address_snapshot: Record<string, any> | null;
  items: OrderItem[];
  subtotal: number;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  special_instructions: string | null;
  created_at: string;
  time_since_received: number;
  estimated_ready_time: string | null;
}

interface QueueStats {
  total_active: number;
  new_count: number;
  preparing_count: number;
  ready_count: number;
  out_for_delivery_count: number;
}

interface FilterOptions {
  status: string | null;
  order_type: string | null;
  sort_by: string;
}

interface UpdateOrderStatusPayload {
  order_id: string;
  status: Order['status'];
  notes?: string;
}

// ===========================
// API Functions
// ===========================

const fetchStaffOrders = async (
  token: string,
  filters: FilterOptions
): Promise<{ orders: Order[]; stats: QueueStats }> => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.order_type) params.append('order_type', filters.order_type);
  params.append('sort_by', filters.sort_by);

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/orders?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const now = new Date();
  const rawOrders = Array.isArray(response.data.orders) ? response.data.orders : [];
  
  const orders = rawOrders.map((order: any) => ({
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
    time_since_received: Math.floor((now.getTime() - new Date(order.created_at).getTime()) / 60000),
  }));

  const stats: QueueStats = {
    total_active: orders.length,
    new_count: orders.filter((o: Order) => o.status === 'received').length,
    preparing_count: orders.filter((o: Order) => o.status === 'preparing').length,
    ready_count: orders.filter((o: Order) => o.status === 'ready').length,
    out_for_delivery_count: orders.filter((o: Order) => o.status === 'out_for_delivery').length,
  };

  return { orders, stats };
};

const updateOrderStatus = async (
  token: string,
  payload: UpdateOrderStatusPayload
): Promise<Order> => {
  const { order_id, status, notes } = payload;
  
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/staff/orders/${order_id}/status`,
    { status, notes },
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

const formatTimeAgo = (minutes: number): string => {
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
};

const formatCollectionTime = (timeSlot: string | null): string => {
  if (!timeSlot) return 'N/A';
  try {
    const date = new Date(timeSlot);
    return date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeSlot;
  }
};

const getMinutesUntilCollection = (timeSlot: string | null): number | null => {
  if (!timeSlot) return null;
  try {
    const targetTime = new Date(timeSlot);
    const now = new Date();
    return Math.floor((targetTime.getTime() - now.getTime()) / 60000);
  } catch {
    return null;
  }
};

const getStatusColor = (status: Order['status']): string => {
  switch (status) {
    case 'received':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'preparing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'ready':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'out_for_delivery':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusLabel = (status: Order['status']): string => {
  switch (status) {
    case 'received':
      return 'New';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};

const getNextStatusAction = (order: Order): { label: string; status: Order['status'] } | null => {
  switch (order.status) {
    case 'received':
      return { label: 'Start Preparing', status: 'preparing' };
    case 'preparing':
      return { label: 'Mark as Ready', status: 'ready' };
    case 'ready':
      if (order.order_type === 'collection') {
        return { label: 'Mark Completed', status: 'completed' };
      } else {
        return { label: 'Out for Delivery', status: 'out_for_delivery' };
      }
    case 'out_for_delivery':
      return { label: 'Mark Completed', status: 'completed' };
    default:
      return null;
  }
};

// Removed unused function playNotificationSound - can be re-added for WebSocket integration

const generateKitchenTicket = (order: Order): string => {
  const customizationsList = order.items.map(item => {
    let customizationsText = '';
    if (item.selected_customizations) {
      Object.entries(item.selected_customizations).forEach(([key, value]) => {
        customizationsText += `\n   - ${key}: ${value}`;
      });
    }
    return `${item.quantity}x ${item.item_name}${customizationsText}`;
  }).join('\n');

  return `
════════════════════════════════
  SALAMA LAMA FOOD TRUCK
════════════════════════════════

ORDER #${order.order_number}

[${order.order_type.toUpperCase()}]${order.collection_time_slot ? ` - ${formatCollectionTime(order.collection_time_slot)}` : ''}

Customer: ${order.customer_name}
Phone: ${order.customer_phone}

────────────────────────────────
ITEMS:
────────────────────────────────

${customizationsList}

${order.special_instructions ? `────────────────────────────────
⚠️  SPECIAL INSTRUCTIONS:
────────────────────────────────
${order.special_instructions}
` : ''}
════════════════════════════════
Received: ${new Date(order.created_at).toLocaleString('en-IE')}
════════════════════════════════
  `.trim();
};

const printKitchenTicket = (order: Order) => {
  const ticketContent = generateKitchenTicket(order);
  const printWindow = window.open('', '', 'width=600,height=800');
  
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Kitchen Ticket - ${order.order_number}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 20px;
              white-space: pre-wrap;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${ticketContent.replace(/\n/g, '<br>')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
};

// ===========================
// Main Component
// ===========================

const UV_StaffOrderQueue: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Zustand store - CRITICAL: Use individual selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const socketConnected = useAppStore(state => state.websocket_state.connected);
  const subscribeToStaffEvents = useAppStore(state => state.subscribe_to_staff_events);

  // Local state
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: searchParams.get('status') || null,
    order_type: searchParams.get('order_type') || null,
    sort_by: 'created_at',
  });

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    return (localStorage.getItem('staff_order_view_mode') as 'list' | 'kanban') || 'list';
  });

  const [notificationSettings, setNotificationSettings] = useState({
    audio_enabled: true,
    muted_until: null as string | null,
  });

  // Fetch orders query
  const {
    data: ordersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['staff', 'orders', filterOptions],
    queryFn: () => fetchStaffOrders(authToken!, filterOptions),
    enabled: !!authToken,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds auto-refresh
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const orders = Array.isArray(ordersData?.orders) ? ordersData.orders : [];
  const queueStats = ordersData?.stats || {
    total_active: 0,
    new_count: 0,
    preparing_count: 0,
    ready_count: 0,
    out_for_delivery_count: 0,
  };

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (payload: UpdateOrderStatusPayload) => updateOrderStatus(authToken!, payload),
    onMutate: async (payload) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['staff', 'orders'] });
      
      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData(['staff', 'orders', filterOptions]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['staff', 'orders', filterOptions], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          orders: old.orders.map((o: Order) =>
            o.order_id === payload.order_id ? { ...o, status: payload.status } : o
          ),
        };
      });

      return { previousData };
    },
    onError: (err, payload, context) => {
      // Rollback to previous data
      if (context?.previousData) {
        queryClient.setQueryData(['staff', 'orders', filterOptions], context.previousData);
      }
      
      // Extract error message
      const errorMessage = axios.isAxiosError(err) 
        ? err.response?.data?.message || err.message 
        : err instanceof Error 
        ? err.message 
        : 'Unknown error';
      
      console.error('[Order Status Update] Error:', {
        orderId: payload.order_id,
        targetStatus: payload.status,
        error: errorMessage,
        fullError: err,
      });
      
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to update order status',
        description: errorMessage,
      });
    },
    onSuccess: (data, payload) => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['staff', 'orders'] });
      
      console.log('[Order Status Update] Success:', {
        orderId: data.order_id,
        orderNumber: data.order_number,
        newStatus: payload.status,
      });
      
      // Show success toast
      toast({
        title: 'Order status updated',
        description: `Order #${data.order_number} moved to ${getStatusLabel(payload.status)}`,
      });
    },
  });

  // Handle status update
  const handleStatusUpdate = (order: Order, newStatus: Order['status']) => {
    console.log('[Order Status Update] Initiating update:', {
      orderId: order.order_id,
      orderNumber: order.order_number,
      currentStatus: order.status,
      targetStatus: newStatus,
    });
    
    updateStatusMutation.mutate({
      order_id: order.order_id,
      status: newStatus,
    });
  };

  // Subscribe to WebSocket events
  useEffect(() => {
    if (authToken && currentUser && (currentUser.role === 'staff' || currentUser.role === 'manager' || currentUser.role === 'admin')) {
      subscribeToStaffEvents();
    }
  }, [authToken, currentUser, subscribeToStaffEvents]);

  // Handle WebSocket new order event
  // Placeholder for WebSocket integration - currently not implemented
  useEffect(() => {
    // In a real implementation, this would be connected to the WebSocket event listener
    // Example:
    // const handleNewOrder = () => {
    //   queryClient.invalidateQueries({ queryKey: ['staff', 'orders'] });
    //   const isMuted = notificationSettings.muted_until && new Date(notificationSettings.muted_until) > new Date();
    //   if (notificationSettings.audio_enabled && !isMuted) {
    //     playNotificationSound();
    //   }
    //   toast({ title: 'New order received!' });
    // };
    
    return () => {
      // Cleanup
    };
  }, [queryClient, notificationSettings]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterOptions.status) params.set('status', filterOptions.status);
    if (filterOptions.order_type) params.set('order_type', filterOptions.order_type);
    setSearchParams(params, { replace: true });
  }, [filterOptions, setSearchParams]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('staff_order_view_mode', viewMode);
  }, [viewMode]);

  // Handle filter change
  const handleFilterChange = (key: keyof FilterOptions, value: string | null) => {
    setFilterOptions(prev => ({ ...prev, [key]: value }));
  };

  // Handle notification toggle
  const handleNotificationToggle = () => {
    setNotificationSettings(prev => ({
      ...prev,
      audio_enabled: !prev.audio_enabled,
    }));
  };

  // Handle temporary mute
  const handleTemporaryMute = () => {
    const mutedUntil = new Date();
    mutedUntil.setMinutes(mutedUntil.getMinutes() + 15);
    setNotificationSettings(prev => ({
      ...prev,
      muted_until: mutedUntil.toISOString(),
    }));
  };

  // Filter orders by status for kanban view
  const ordersByStatus = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    return {
      received: safeOrders.filter(o => o.status === 'received'),
      preparing: safeOrders.filter(o => o.status === 'preparing'),
      ready: safeOrders.filter(o => o.status === 'ready'),
      out_for_delivery: safeOrders.filter(o => o.status === 'out_for_delivery'),
    };
  }, [orders]);

  // Render order card
  const renderOrderCard = (order: Order) => {
    const nextAction = getNextStatusAction(order);
    const minutesUntilCollection = getMinutesUntilCollection(order.collection_time_slot);
    const isOverdue = minutesUntilCollection !== null && minutesUntilCollection < 0;
    const isUrgent = minutesUntilCollection !== null && minutesUntilCollection > 0 && minutesUntilCollection <= 10;

    return (
      <div
        key={order.order_id}
        className={`bg-white rounded-lg shadow-md border-l-4 p-4 space-y-3 ${
          order.status === 'received' ? 'border-l-gray-400' :
          order.status === 'preparing' ? 'border-l-yellow-400' :
          order.status === 'ready' ? 'border-l-green-400' :
          'border-l-blue-400'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">#{order.order_number}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                order.order_type === 'collection' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-orange-100 text-orange-800 border-orange-300'
              }`}>
                {order.order_type === 'collection' ? 'COLLECTION' : 'DELIVERY'}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-700">
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Phone className="w-4 h-4 mr-1" />
            {order.customer_phone}
          </a>
        </div>

        {/* Collection/Delivery time */}
        {order.order_type === 'collection' && order.collection_time_slot && (
          <div className={`flex items-center text-sm ${isOverdue ? 'text-red-600 font-semibold' : isUrgent ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>
            <Clock className="w-4 h-4 mr-1" />
            <span>Collection: {formatCollectionTime(order.collection_time_slot)}</span>
            {minutesUntilCollection !== null && (
              <span className="ml-2">
                ({minutesUntilCollection > 0 ? `in ${minutesUntilCollection} min` : `${Math.abs(minutesUntilCollection)} min overdue`})
              </span>
            )}
          </div>
        )}

        {order.order_type === 'delivery' && order.delivery_address_snapshot && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Delivery to:</span> {order.delivery_address_snapshot.address_line1}, {order.delivery_address_snapshot.city}
          </div>
        )}

        {/* Items */}
        <div className="border-t pt-3">
          <div className="space-y-2">
            {Array.isArray(order.items) && order.items.length > 0 ? (
              order.items.map((item) => (
                <div key={item.order_item_id} className="text-sm">
                  <div className="font-medium text-gray-900">
                    {item.quantity}x {item.item_name}
                  </div>
                  {item.selected_customizations && Object.keys(item.selected_customizations).length > 0 && (
                    <div className="ml-4 text-xs text-gray-600 space-y-0.5">
                      {Object.entries(item.selected_customizations).map(([key, value], idx) => (
                        <div key={idx}>- {key}: <span className="font-medium">{String(value)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">No items available</div>
            )}
          </div>
        </div>

        {/* Special instructions */}
        {order.special_instructions && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-800">
                <span className="font-semibold">Special:</span> {order.special_instructions}
              </div>
            </div>
          </div>
        )}

        {/* Time info */}
        <div className="flex items-center text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          Received {formatTimeAgo(order.time_since_received)}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          {nextAction && (
            <button
              onClick={() => handleStatusUpdate(order, nextAction.status)}
              disabled={updateStatusMutation.isPending}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                nextAction.status === 'preparing' ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' :
                nextAction.status === 'ready' ? 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500' :
                nextAction.status === 'completed' ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500' :
                nextAction.status === 'out_for_delivery' ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' :
                'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500'
              }`}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {nextAction.label}
                </>
              )}
            </button>
          )}
          <button
            onClick={() => printKitchenTicket(order)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <Printer className="w-4 h-4" />
          </button>
          <Link
            to={`/staff/orders/${order.order_id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <ClipboardList className="w-8 h-8 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Order Queue</h1>
                  <p className="text-sm text-gray-600">Real-time kitchen management</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* WebSocket status */}
                <div className="flex items-center space-x-2">
                  {socketConnected ? (
                    <>
                      <Wifi className="w-5 h-5 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5 text-red-600 animate-pulse" />
                      <span className="text-xs text-red-600 font-medium">Reconnecting...</span>
                    </>
                  )}
                </div>

                {/* Notification controls */}
                <button
                  onClick={handleNotificationToggle}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                  title={notificationSettings.audio_enabled ? 'Mute notifications' : 'Enable notifications'}
                >
                  {notificationSettings.audio_enabled ? (
                    <Bell className="w-5 h-5 text-gray-700" />
                  ) : (
                    <BellOff className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {notificationSettings.audio_enabled && (
                  <button
                    onClick={handleTemporaryMute}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                  >
                    Mute 15 min
                  </button>
                )}

                {/* Refresh button */}
                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  title="Refresh orders"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-700 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Queue statistics */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => handleFilterChange('status', null)}
              className={`bg-white rounded-lg shadow-sm border-2 p-4 text-center transition-all hover:shadow-md ${
                filterOptions.status === null ? 'border-orange-500' : 'border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900">{queueStats.total_active}</div>
              <div className="text-sm text-gray-600">All Active</div>
            </button>

            <button
              onClick={() => handleFilterChange('status', 'received')}
              className={`bg-white rounded-lg shadow-sm border-2 p-4 text-center transition-all hover:shadow-md ${
                filterOptions.status === 'received' ? 'border-gray-500' : 'border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-gray-800">{queueStats.new_count}</div>
              <div className="text-sm text-gray-600">New</div>
            </button>

            <button
              onClick={() => handleFilterChange('status', 'preparing')}
              className={`bg-white rounded-lg shadow-sm border-2 p-4 text-center transition-all hover:shadow-md ${
                filterOptions.status === 'preparing' ? 'border-yellow-500' : 'border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-yellow-700">{queueStats.preparing_count}</div>
              <div className="text-sm text-gray-600">Preparing</div>
            </button>

            <button
              onClick={() => handleFilterChange('status', 'ready')}
              className={`bg-white rounded-lg shadow-sm border-2 p-4 text-center transition-all hover:shadow-md ${
                filterOptions.status === 'ready' ? 'border-green-500' : 'border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-green-700">{queueStats.ready_count}</div>
              <div className="text-sm text-gray-600">Ready</div>
            </button>

            <button
              onClick={() => handleFilterChange('status', 'out_for_delivery')}
              className={`bg-white rounded-lg shadow-sm border-2 p-4 text-center transition-all hover:shadow-md ${
                filterOptions.status === 'out_for_delivery' ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <div className="text-2xl font-bold text-blue-700">{queueStats.out_for_delivery_count}</div>
              <div className="text-sm text-gray-600">Out for Delivery</div>
            </button>
          </div>
        </div>

        {/* Filters and view toggle */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <select
                value={filterOptions.order_type || ''}
                onChange={(e) => handleFilterChange('order_type', e.target.value || null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Order Types</option>
                <option value="collection">Collection Only</option>
                <option value="delivery">Delivery Only</option>
              </select>

              <select
                value={filterOptions.sort_by}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="created_at">Sort by: Oldest First</option>
                <option value="updated_at">Sort by: Recently Updated</option>
                <option value="order_number">Sort by: Order Number</option>
                <option value="total_amount">Sort by: Total Amount</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ListIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'kanban' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Columns className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading orders...</p>
              </div>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load orders</h3>
              <p className="text-red-700 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
              <button
                onClick={() => refetch()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !isError && orders.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders in queue</h3>
              <p className="text-gray-600">
                {filterOptions.status || filterOptions.order_type
                  ? 'Try adjusting your filters to see more orders'
                  : 'All orders are up to date!'}
              </p>
            </div>
          )}

          {!isLoading && !isError && orders.length > 0 && (
            <>
              {/* List view */}
              {viewMode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map(order => renderOrderCard(order))}
                </div>
              )}

              {/* Kanban view */}
              {viewMode === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                      New ({ordersByStatus.received.length})
                    </h3>
                    <div className="space-y-3">
                      {ordersByStatus.received.map(order => renderOrderCard(order))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                      Preparing ({ordersByStatus.preparing.length})
                    </h3>
                    <div className="space-y-3">
                      {ordersByStatus.preparing.map(order => renderOrderCard(order))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                      Ready ({ordersByStatus.ready.length})
                    </h3>
                    <div className="space-y-3">
                      {ordersByStatus.ready.map(order => renderOrderCard(order))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
                      Out for Delivery ({ordersByStatus.out_for_delivery.length})
                    </h3>
                    <div className="space-y-3">
                      {ordersByStatus.out_for_delivery.map(order => renderOrderCard(order))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_StaffOrderQueue;